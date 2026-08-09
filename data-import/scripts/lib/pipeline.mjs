import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ROOT } from "./config.mjs";
import { readJson, writeJson } from "./artifacts.mjs";
import { createManifest, updateStage } from "./manifest.mjs";
import { sha256, stableStringify } from "./identity.mjs";
import { assertAdapter } from "../adapters/adapter.mjs";
import { ipedsAdapter, ipedsVersions } from "../adapters/ipeds.mjs";
import { publishCatalog } from "../publish/catalog-publisher.mjs";
import { MemoryCatalogRepository } from "../publish/memory-catalog.mjs";
import { createPostgresCatalogRepository } from "../publish/postgres-catalog.mjs";

const execFileAsync = promisify(execFile);
const adapters = new Map([[ipedsAdapter.name, assertAdapter(ipedsAdapter)]]);
const pathsFor = (config) => {
  const base = path.join(
    config.jurisdiction.toLowerCase(),
    config.adapterName.replace(`${config.jurisdiction.toLowerCase()}_`, ""),
    config.releaseVersion,
  );
  return {
    raw: path.join(ROOT, "raw", path.dirname(base)),
    snapshot: path.join(ROOT, "raw", base, "snapshot.json"),
    normalized: path.join(ROOT, "normalized", base, "records.json"),
    manifest: path.join(
      ROOT,
      "manifests",
      `${config.adapterName}-${config.releaseVersion}.json`,
    ),
    validation: path.join(
      ROOT,
      "validation",
      "reports",
      `${config.adapterName}-${config.releaseVersion}.json`,
    ),
    plan: path.join(
      ROOT,
      "checkpoints",
      `${config.adapterName}-${config.releaseVersion}-publication-plan.json`,
    ),
    reconciliation: path.join(
      ROOT,
      "checkpoints",
      `${config.adapterName}-${config.releaseVersion}-reconciliation.json`,
    ),
    publicationReport: path.join(
      ROOT,
      "validation",
      "reports",
      `${config.adapterName}-${config.releaseVersion}-publication.json`,
    ),
    publicationReconciliation: path.join(
      ROOT,
      "validation",
      "reports",
      `${config.adapterName}-${config.releaseVersion}-publication-reconciliation.json`,
    ),
    publicationSummary: path.join(
      ROOT,
      "validation",
      "reports",
      `${config.adapterName}-${config.releaseVersion}-publication-summary.json`,
    ),
  };
};
async function gitCommit() {
  try {
    return (
      await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: ROOT })
    ).stdout.trim();
  } catch {
    return "0000000";
  }
}
function adapterFor(config) {
  const adapter = adapters.get(config.adapterName);
  if (!adapter)
    throw new Error(`No implementation for adapter: ${config.adapterName}`);
  return adapter;
}

export async function acquire(config, options = {}) {
  const adapter = adapterFor(config);
  const paths = pathsFor(config);
  const snapshot = await adapter.acquire({
    config,
    rawDirectory: paths.raw,
    ...options,
  });
  await writeJson(paths.snapshot, snapshot);
  return { snapshot, paths };
}
export async function normalize(config, { limit } = {}) {
  const adapter = adapterFor(config);
  const paths = pathsFor(config);
  const snapshot = await readJson(paths.snapshot);
  const combinedChecksum = sha256(
    stableStringify(
      snapshot.artifacts.map(({ name, sha256: checksum }) => ({
        name,
        sha256: checksum,
      })),
    ),
  );
  let manifest = createManifest({
    createdAt: snapshot.retrievedAt,
    source: {
      name: config.sourceName,
      jurisdiction: config.jurisdiction,
      url: config.sourceUrl,
      releaseVersion: config.releaseVersion,
      retrievedAt: snapshot.retrievedAt,
      sha256: combinedChecksum,
      artifacts: snapshot.artifacts.map(
        ({ name, fileName, sha256: checksum, bytes }) => ({
          name,
          fileName,
          sha256: checksum,
          bytes,
        }),
      ),
    },
    versions: ipedsVersions,
    gitCommit: await gitCommit(),
    targetEnvironment: "local",
  });
  manifest = updateStage(
    updateStage(manifest, "acquire", "completed", {
      artifacts: snapshot.artifacts.length,
    }),
    "normalize",
    "running",
  );
  const records = await adapter.normalize({ config, snapshot, limit });
  manifest = updateStage(manifest, "normalize", "completed", {
    records: records.length,
  });
  await writeJson(paths.normalized, { runId: manifest.runId, records });
  await writeJson(paths.manifest, manifest);
  return { records, manifest, paths };
}
export async function validate(config) {
  const adapter = adapterFor(config);
  const paths = pathsFor(config);
  const snapshot = await readJson(paths.snapshot);
  const normalized = await readJson(paths.normalized);
  let manifest = await readJson(paths.manifest);
  const report = await adapter.validate({
    records: normalized.records,
    runId: normalized.runId,
    snapshot,
  });
  manifest = updateStage(
    manifest,
    "validate",
    report.valid ? "completed" : "failed",
    report.counts,
  );
  await writeJson(paths.validation, { runId: normalized.runId, ...report });
  await writeJson(paths.manifest, manifest);
  return { report, manifest, paths };
}
export async function plan(config) {
  const adapter = adapterFor(config);
  const paths = pathsFor(config);
  const normalized = await readJson(paths.normalized);
  const validation = await readJson(paths.validation);
  let manifest = await readJson(paths.manifest);
  if (!validation.valid)
    throw new Error(
      "Publication planning blocked: validation report contains errors.",
    );
  const publicationPlan = await adapter.plan({
    records: normalized.records,
    runId: normalized.runId,
  });
  const reconciliation = await adapter.reconcile({
    records: normalized.records,
    plan: publicationPlan,
  });
  manifest = updateStage(manifest, "plan", "completed", {
    operations: publicationPlan.operations.length,
  });
  await writeJson(paths.plan, publicationPlan);
  await writeJson(paths.reconciliation, reconciliation);
  await writeJson(paths.manifest, manifest);
  return { publicationPlan, reconciliation, manifest, paths };
}

export async function publish(
  config,
  { dryRun = false, environment = "preview", repository } = {},
) {
  const paths = pathsFor(config);
  const normalized = await readJson(paths.normalized);
  const validation = await readJson(paths.validation);
  let manifest = await readJson(paths.manifest);
  if (!validation.valid || validation.runId !== normalized.runId)
    throw new Error(
      "Publication blocked: a matching successful validation report is required.",
    );
  const ownsRepository = !repository;
  const selectedRepository =
    repository ??
    (dryRun && !process.env.SUPABASE_DB_URL
      ? new MemoryCatalogRepository()
      : await createPostgresCatalogRepository(process.env.SUPABASE_DB_URL));
  try {
    const result = await publishCatalog({
      repository: selectedRepository,
      records: normalized.records,
      manifest,
      dryRun,
      environment,
    });
    await writeJson(paths.publicationReport, result.report);
    await writeJson(paths.publicationReconciliation, result.reconciliation);
    await writeJson(paths.publicationSummary, result.summary);
    if (!dryRun) {
      manifest = updateStage(
        manifest,
        "publish",
        "completed",
        result.report.counts,
      );
      await writeJson(paths.manifest, manifest);
    }
    return { ...result, manifest, paths };
  } finally {
    if (ownsRepository && selectedRepository.close)
      await selectedRepository.close();
  }
}

export { pathsFor };
