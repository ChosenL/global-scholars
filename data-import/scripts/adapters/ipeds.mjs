import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseCsv } from "../lib/csv.mjs";
import {
  deterministicIdentity,
  recordHash,
  sha256,
  stableStringify,
} from "../lib/identity.mjs";
import {
  validateCanonicalRecord,
  validateRelationships,
  validateDuplicates,
  validateDeterministicRecords,
} from "../lib/validation.mjs";

const execFileAsync = promisify(execFile);
const SOURCE_SYSTEM = "ipeds";
const ADAPTER_VERSION = "us_ipeds@1.0.0";
const PIPELINE_VERSION = "1.0.0";
const CLASSIFICATIONS = JSON.parse(
  await readFile(
    new URL(
      "../../config/mappings/institution-classifications.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const CERTIFIED_SEARCH_ELIGIBLE = new Set(
  CLASSIFICATIONS.certifiedSearchEligibleUnitids,
);
const CONTROL = {
  1: "Public institution",
  2: "Private nonprofit institution",
  3: "Private for-profit institution",
};
const DEGREE_FLAGS = {
  PEO1ISTR: "certificate",
  PEO2ISTR: "associate",
  PEO3ISTR: "bachelor",
  PEO4ISTR: "postgraduate_certificate",
  PEO5ISTR: "master",
  PEO6ISTR: "doctorate",
  PEO7ISTR: "doctorate",
};

function slug(value, unitid) {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "institution"}-${unitid}`;
}
function url(value) {
  const clean = value?.trim();
  return clean
    ? /^https?:\/\//i.test(clean)
      ? clean
      : `https://${clean}`
    : null;
}
function withIdentity(entityType, naturalKey, material) {
  const canonicalId = deterministicIdentity(entityType, naturalKey);
  const record = { entityType, canonicalId, ...material };
  return { ...record, recordHash: recordHash(record) };
}
function provenance(config, snapshot, sourceEntityId, artifact = "directory") {
  const source =
    snapshot.artifacts.find((item) => item.name === artifact) ??
    snapshot.artifacts[0];
  return {
    sourceSystem: SOURCE_SYSTEM,
    sourceEntityId: String(sourceEntityId),
    sourceUrl: source.url,
    sourceVersion: config.releaseVersion,
    retrievedAt: snapshot.retrievedAt,
    rawChecksum: source.sha256,
    mappingVersion: "1.0.0",
  };
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
async function extractZip(zip, destination) {
  await mkdir(destination, { recursive: true });
  if (process.platform === "win32")
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-Command",
      "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
      zip,
      destination,
    ]);
  else await execFileAsync("unzip", ["-o", zip, "-d", destination]);
}

export const ipedsAdapter = {
  name: "us_ipeds",
  version: ADAPTER_VERSION,
  async acquire({
    config,
    rawDirectory,
    retrievedAt = new Date().toISOString(),
    fetchImpl = fetch,
  }) {
    const releaseDirectory = path.join(rawDirectory, config.releaseVersion);
    const extractedDirectory = path.join(releaseDirectory, "extracted");
    await mkdir(extractedDirectory, { recursive: true });
    const artifacts = [];
    for (const artifact of config.artifacts) {
      const file = path.join(releaseDirectory, artifact.fileName);
      if (!(await exists(file))) {
        const response = await fetchImpl(artifact.url);
        if (!response.ok)
          throw new Error(
            `IPEDS acquisition failed (${response.status}): ${artifact.url}`,
          );
        await writeFile(file, Buffer.from(await response.arrayBuffer()), {
          flag: "wx",
        });
      }
      const bytes = await readFile(file);
      const actual = sha256(bytes);
      if (actual !== artifact.sha256)
        throw new Error(
          `Checksum mismatch for ${artifact.fileName}: expected ${artifact.sha256}, received ${actual}`,
        );
      const csv = path.join(
        extractedDirectory,
        artifact.fileName.replace(/\.zip$/i, ".csv"),
      );
      if (!(await exists(csv))) await extractZip(file, extractedDirectory);
      artifacts.push({
        ...artifact,
        sha256: actual,
        bytes: (await stat(file)).size,
        csv,
      });
    }
    return {
      sourceName: config.sourceName,
      releaseVersion: config.releaseVersion,
      retrievedAt: new Date(retrievedAt).toISOString(),
      artifacts,
    };
  },
  async normalize({ config, snapshot, limit = config.pilotLimit ?? 50 }) {
    const directoryArtifact = snapshot.artifacts.find(
      ({ name }) => name === "directory",
    );
    const characteristicsArtifact = snapshot.artifacts.find(
      ({ name }) => name === "institutional-characteristics",
    );
    const hd = parseCsv(await readFile(directoryArtifact.csv, "utf8"));
    const ic = new Map(
      parseCsv(await readFile(characteristicsArtifact.csv, "utf8")).map(
        (row) => [row.UNITID.trim(), row],
      ),
    );
    const selected = hd
      .filter(
        (row) =>
          row.UNITID.trim() &&
          row.CYACTIVE === "1" &&
          row.POSTSEC === "1" &&
          row.DEGGRANT === "1" &&
          row.ICLEVEL === "1",
      )
      .sort((a, b) => Number(a.UNITID) - Number(b.UNITID));
    const rows = limit === "all" ? selected : selected.slice(0, Number(limit));
    const country = withIdentity(
      "country",
      { isoCode: "US" },
      {
        provenance: provenance(config, snapshot, "US"),
        isoCode: "US",
        name: "United States",
        defaultCurrency: "USD",
        isActive: true,
      },
    );
    const records = [country];
    for (const row of rows) {
      const unitid = row.UNITID.trim();
      const characteristic = ic.get(unitid) ?? {};
      const classification = {
        ...CLASSIFICATIONS.default,
        ...(CERTIFIED_SEARCH_ELIGIBLE.has(unitid)
          ? {
              classification: "degree_granting_institution",
              degreeGranting: true,
              acceptsDirectApplications: true,
              searchEligible: true,
            }
          : {}),
        ...(CLASSIFICATIONS.overrides[unitid] ?? {}),
      };
      const university = withIdentity(
        "university",
        { sourceSystem: SOURCE_SYSTEM, sourceEntityId: unitid },
        {
          provenance: provenance(config, snapshot, unitid),
          countryCanonicalId: country.canonicalId,
          name: row.INSTNM.trim(),
          slug: slug(row.INSTNM, unitid),
          institutionType: CONTROL[row.CONTROL] ?? "Other institution",
          websiteUrl: url(row.WEBADDR),
          catalogClassification: classification.classification,
          degreeGranting: classification.degreeGranting,
          acceptsDirectApplications: classification.acceptsDirectApplications,
          searchEligible: classification.searchEligible,
          degreeLevels: [
            ...new Set(
              Object.entries(DEGREE_FLAGS)
                .filter(([flag]) => characteristic[flag] === "1")
                .map(([, level]) => level),
            ),
          ],
          isActive: true,
        },
      );
      const campus = withIdentity(
        "campus",
        {
          universityCanonicalId: university.canonicalId,
          sourceEntityId: `${unitid}:main`,
        },
        {
          provenance: provenance(config, snapshot, `${unitid}:main`),
          universityCanonicalId: university.canonicalId,
          name: `${row.INSTNM.trim()} Main Campus`,
          city: row.CITY.trim(),
          region: row.STABBR.trim() || null,
          isPrimary: true,
          isActive: true,
        },
      );
      records.push(university, campus);
    }
    return records.sort(
      (a, b) =>
        a.entityType.localeCompare(b.entityType) ||
        a.canonicalId.localeCompare(b.canonicalId),
    );
  },
  async validate({ records, runId, snapshot }) {
    const issues = [
      ...records.flatMap((record) =>
        validateCanonicalRecord(record, { runId }),
      ),
      ...validateRelationships(records, { runId }),
      ...validateDuplicates(records, { runId }),
      ...validateDeterministicRecords(records, { runId }),
    ];
    if (
      !snapshot?.retrievedAt ||
      !snapshot?.releaseVersion ||
      !snapshot?.artifacts?.every(
        (item) => item.name && item.url && /^[a-f0-9]{64}$/.test(item.sha256),
      )
    )
      issues.push({
        runId,
        category: "structural",
        severity: "fatal",
        code: "INVALID_SOURCE_METADATA",
        message: "Source snapshot metadata is incomplete.",
        entityType: "unknown",
        sourceEntityId: null,
        fieldPath: null,
        quarantine: true,
      });
    const counts = {
      records: records.length,
      errors: issues.filter(
        ({ severity }) => severity === "error" || severity === "fatal",
      ).length,
      warnings: issues.filter(({ severity }) => severity === "warning").length,
    };
    return { valid: counts.errors === 0, counts, issues };
  },
  async plan({ records, runId }) {
    const order = new Map(
      ["country", "university", "campus"].map((type, index) => [type, index]),
    );
    const operations = records
      .map((record) => ({
        runId,
        entityType: record.entityType,
        canonicalId: record.canonicalId,
        catalogId: null,
        operation: "insert",
        before: null,
        after: record,
        recordHash: record.recordHash,
      }))
      .sort(
        (a, b) =>
          order.get(a.entityType) - order.get(b.entityType) ||
          a.canonicalId.localeCompare(b.canonicalId),
      );
    return {
      runId,
      mode: "offline",
      writesPerformed: false,
      operationCounts: Object.fromEntries(
        ["country", "university", "campus"].map((type) => [
          type,
          operations.filter((item) => item.entityType === type).length,
        ]),
      ),
      operations,
      checksum: sha256(stableStringify(operations)),
    };
  },
  async reconcile({ records, plan }) {
    return {
      runId: plan.runId,
      status: "not-published",
      writesPerformed: false,
      normalizedRecords: records.length,
      plannedOperations: plan.operations.length,
      missingFromPlan: records
        .filter(
          (record) =>
            !plan.operations.some(
              (item) => item.canonicalId === record.canonicalId,
            ),
        )
        .map((record) => record.canonicalId),
      unexpectedOperations: plan.operations
        .filter(
          (item) =>
            !records.some((record) => record.canonicalId === item.canonicalId),
        )
        .map((item) => item.canonicalId),
      planChecksum: plan.checksum,
    };
  },
};

export const ipedsVersions = {
  adapter: "us_ipeds",
  mapping: "1.0.0",
  pipeline: PIPELINE_VERSION,
};
