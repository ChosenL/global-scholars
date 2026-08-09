#!/usr/bin/env node
import path from "node:path";
import { ROOT } from "../lib/config.mjs";
import { readJson, writeJson } from "../lib/artifacts.mjs";
import { sha256, stableStringify } from "../lib/identity.mjs";
import { publishCatalog } from "./catalog-publisher.mjs";
import { createPostgresCatalogRepository } from "./postgres-catalog.mjs";
import { MemoryCatalogRepository } from "./memory-catalog.mjs";

const SOURCES = {
  us_official_catalog: {
    normalized: ["us", "official_catalog", "2026-08-09", "records.json"],
    manifest: "us_official_catalog-2026-08-09.json",
  },
  ca_ircc_dli: {
    normalized: ["ca", "ircc_dli", "2026-08-09", "records.json"],
    manifest: "ca_ircc_dli-2026-08-09.json",
  },
};

export function partitionByInstitution(records, batchSize = 250) {
  const country = records.filter(({ entityType }) => entityType === "country");
  const universities = records
    .filter(({ entityType }) => entityType === "university")
    .sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  const batches = [];
  for (let offset = 0; offset < universities.length; offset += batchSize) {
    const selected = universities.slice(offset, offset + batchSize);
    const universityIds = new Set(
      selected.map(({ canonicalId }) => canonicalId),
    );
    const campuses = records.filter(
      ({ entityType, universityCanonicalId }) =>
        entityType === "campus" && universityIds.has(universityCanonicalId),
    );
    const faculties = records.filter(
      ({ entityType, universityCanonicalId }) =>
        entityType === "faculty" && universityIds.has(universityCanonicalId),
    );
    const programs = records.filter(
      ({ entityType, universityCanonicalId }) =>
        entityType === "program" && universityIds.has(universityCanonicalId),
    );
    const programIds = new Set(programs.map(({ canonicalId }) => canonicalId));
    const relations = records.filter(
      ({ entityType, programCanonicalId }) =>
        entityType === "program-campus" && programIds.has(programCanonicalId),
    );
    const intakes = records.filter(
      ({ entityType, programCanonicalId }) =>
        entityType === "intake" && programIds.has(programCanonicalId),
    );
    const scholarships = records.filter(
      ({ entityType, universityCanonicalId }) =>
        entityType === "scholarship" &&
        universityIds.has(universityCanonicalId),
    );
    batches.push([
      ...country,
      ...selected,
      ...campuses,
      ...faculties,
      ...programs,
      ...relations,
      ...intakes,
      ...scholarships,
    ]);
  }
  return batches;
}

export async function publishScale({
  connectionString = process.env.SUPABASE_DB_URL,
  dryRun = false,
  batchSize = 250,
  source = "us_official_catalog",
} = {}) {
  const sourcePaths = SOURCES[source];
  if (!sourcePaths) throw new Error(`Unsupported scale source: ${source}`);
  const checkpointPath = path.join(
    ROOT,
    "validation",
    "reports",
    `${source}-scale-checkpoint.json`,
  );
  const reportPath = path.join(
    ROOT,
    "validation",
    "reports",
    `${source}-scale-publication.json`,
  );
  const normalized = await readJson(
    path.join(ROOT, "normalized", ...sourcePaths.normalized),
  );
  const manifest = await readJson(
    path.join(ROOT, "manifests", sourcePaths.manifest),
  );
  const batches = partitionByInstitution(normalized.records, batchSize);
  const fingerprint = sha256(
    stableStringify({
      manifestId: manifest.manifestId,
      batchSize,
      batches: batches.length,
    }),
  );
  let start = 0;
  if (!dryRun) {
    try {
      const checkpoint = await readJson(checkpointPath);
      if (
        checkpoint.fingerprint === fingerprint &&
        checkpoint.nextBatch > 0 &&
        checkpoint.nextBatch < batches.length
      )
        start = checkpoint.nextBatch;
    } catch {}
  }
  const repository = dryRun
    ? new MemoryCatalogRepository()
    : await createPostgresCatalogRepository(connectionString);
  const reports = [];
  try {
    for (let index = start; index < batches.length; index += 1) {
      const result = await publishCatalog({
        repository,
        records: batches[index],
        manifest,
        // The in-memory repository is already a no-write boundary. Committing
        // each simulated batch preserves cross-batch identity resolution, so
        // the dry-run aggregate matches a real first publication.
        dryRun: false,
      });
      reports.push({
        batch: index + 1,
        records: batches[index].length,
        ...result.report,
      });
      if (!dryRun)
        await writeJson(checkpointPath, {
          fingerprint,
          manifestId: manifest.manifestId,
          batchSize,
          totalBatches: batches.length,
          nextBatch: index + 1,
          updatedAt: new Date().toISOString(),
        });
    }
  } finally {
    await repository.close?.();
  }
  const counts = Object.fromEntries(
    ["insert", "update", "unchanged", "skipped"].map((operation) => [
      operation,
      reports.reduce((sum, report) => sum + report.counts[operation], 0),
    ]),
  );
  const report = {
    manifestId: manifest.manifestId,
    source,
    dryRun,
    batchSize,
    totalBatches: batches.length,
    resumedAtBatch: start + 1,
    counts,
    batches: reports,
    checksum: sha256(stableStringify(reports.map(({ checksum }) => checksum))),
  };
  await writeJson(reportPath, report);
  return report;
}

if (
  import.meta.url ===
  new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href
) {
  const dryRun = process.argv.includes("--dry-run");
  const batchFlag = process.argv.indexOf("--batch-size");
  const batchSize = batchFlag >= 0 ? Number(process.argv[batchFlag + 1]) : 250;
  const sourceFlag = process.argv.indexOf("--source");
  const source =
    sourceFlag >= 0 ? process.argv[sourceFlag + 1] : "us_official_catalog";
  publishScale({ dryRun, batchSize, source })
    .then((report) =>
      console.log(
        `SCALE_PUBLISH batches=${report.totalBatches} insert=${report.counts.insert} update=${report.counts.update} unchanged=${report.counts.unchanged} skipped=${report.counts.skipped} checksum=${report.checksum}`,
      ),
    )
    .catch((error) => {
      console.error(`ERROR ${error.message}`);
      process.exitCode = 1;
    });
}
