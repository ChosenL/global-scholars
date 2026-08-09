import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ipedsAdapter } from "../../scripts/adapters/ipeds.mjs";
import { publishCatalog } from "../../scripts/publish/catalog-publisher.mjs";
import { MemoryCatalogRepository } from "../../scripts/publish/memory-catalog.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const fixture = (name) => path.join(root, "tests", "fixtures", "ipeds", name);
const snapshot = {
  releaseVersion: "2024",
  retrievedAt: "2026-08-02T12:00:00.000Z",
  artifacts: [
    {
      name: "directory",
      url: "https://nces.ed.gov/HD2024.zip",
      sha256: "a".repeat(64),
      csv: fixture("HD2024.csv"),
    },
    {
      name: "institutional-characteristics",
      url: "https://nces.ed.gov/IC2024.zip",
      sha256: "b".repeat(64),
      csv: fixture("IC2024.csv"),
    },
  ],
};
const manifest = {
  runId: "20260802T120000Z-us_ipeds-aaaaaaaaaaaa",
  createdAt: "2026-08-02T12:00:00.000Z",
  gitCommit: "abcdef1234567",
  versions: { adapter: "us_ipeds", mapping: "1.0.0", pipeline: "1.0.0" },
  source: { releaseVersion: "2024" },
};
async function records() {
  return ipedsAdapter.normalize({
    config: { releaseVersion: "2024", pilotLimit: 50 },
    snapshot,
  });
}

test("initial publish inserts in dependency order and reconciles", async () => {
  const repository = new MemoryCatalogRepository();
  const result = await publishCatalog({
    repository,
    records: await records(),
    manifest,
  });
  assert.deepEqual(result.report.counts, {
    total: 7,
    insert: 7,
    update: 0,
    unchanged: 0,
    skipped: 0,
  });
  assert.deepEqual(
    result.report.actions.map(({ entityType }) => entityType),
    [
      "country",
      "university",
      "university",
      "university",
      "campus",
      "campus",
      "campus",
    ],
  );
  assert.equal(result.reconciliation.foreignKeyIntegrity, true);
  assert.deepEqual(result.reconciliation.rowCounts, {
    country: 1,
    university: 3,
    campus: 3,
  });
});

test("repeat publication is idempotent", async () => {
  const repository = new MemoryCatalogRepository();
  const canonical = await records();
  await publishCatalog({ repository, records: canonical, manifest });
  const repeat = await publishCatalog({
    repository,
    records: canonical,
    manifest,
  });
  assert.deepEqual(repeat.report.counts, {
    total: 7,
    insert: 0,
    update: 0,
    unchanged: 7,
    skipped: 0,
  });
});

test("partial publication failure rolls back every action", async () => {
  const repository = new MemoryCatalogRepository();
  await assert.rejects(
    publishCatalog({
      repository,
      records: await records(),
      manifest,
      failAfterAction: 3,
    }),
    /Injected publication failure/,
  );
  assert.deepEqual(repository.state, {
    countries: [],
    universities: [],
    campuses: [],
  });
});

test("existing records are updated without duplication", async () => {
  const repository = new MemoryCatalogRepository();
  const canonical = await records();
  await publishCatalog({ repository, records: canonical, manifest });
  const university = canonical.find(
    (record) => record.entityType === "university",
  );
  university.name = `${university.name} Updated`;
  const result = await publishCatalog({
    repository,
    records: canonical,
    manifest,
  });
  assert.equal(result.report.counts.update, 1);
  assert.equal(repository.state.universities.length, 3);
  assert.equal(
    result.report.actions
      .find(({ operation }) => operation === "update")
      .before.name.endsWith("Updated"),
    false,
  );
});

test("dry-run reports are stable and leave catalog unchanged", async () => {
  const repository = new MemoryCatalogRepository();
  const canonical = await records();
  const first = await publishCatalog({
    repository,
    records: canonical,
    manifest,
    dryRun: true,
  });
  const second = await publishCatalog({
    repository,
    records: [...canonical].reverse(),
    manifest,
    dryRun: true,
  });
  assert.deepEqual(first, second);
  assert.deepEqual(repository.state, {
    countries: [],
    universities: [],
    campuses: [],
  });
  assert.equal(first.summary.reconciliationPassed, true);
});
