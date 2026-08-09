import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { officialCatalogAdapter } from "../../scripts/adapters/official-catalog.mjs";
import { publishCatalog } from "../../scripts/publish/catalog-publisher.mjs";
import { MemoryCatalogRepository } from "../../scripts/publish/memory-catalog.mjs";
const root = path.resolve("data-import");
const config = JSON.parse(
  await readFile(
    path.join(root, "config/sources/us/official-program-catalog.json"),
    "utf8",
  ),
);
async function load() {
  const snapshot = await officialCatalogAdapter.acquire({ config });
  return {
    snapshot,
    records: await officialCatalogAdapter.normalize({ config, snapshot }),
  };
}
const manifest = {
  runId: "official-test",
  createdAt: "2026-08-09T12:00:00.000Z",
  gitCommit: "abc1234",
  versions: { pipeline: "1.1.0" },
  source: { releaseVersion: "2026-08-09" },
};
test("official facts normalize deterministically with valid relationships", async () => {
  const a = await load(),
    b = await load();
  assert.deepEqual(a.records, b.records);
  assert.equal(a.records.filter((r) => r.entityType === "program").length, 10);
  assert.equal(
    a.records.filter((r) => r.entityType === "intake" && r.status === "open")
      .length,
    2,
  );
  assert.equal(
    (
      await officialCatalogAdapter.validate({
        records: a.records,
        runId: "test",
        snapshot: a.snapshot,
      })
    ).valid,
    true,
  );
});
test("extended publication is idempotent and dry-run is write-free", async () => {
  const { records } = await load();
  const repository = new MemoryCatalogRepository();
  const first = await publishCatalog({ repository, records, manifest });
  const repeat = await publishCatalog({ repository, records, manifest });
  assert.equal(first.report.counts.insert, 53);
  assert.equal(repeat.report.counts.unchanged, 53);
  const before = structuredClone(repository.state);
  const dry = await publishCatalog({
    repository,
    records,
    manifest,
    dryRun: true,
  });
  assert.equal(dry.report.counts.unchanged, 53);
  assert.deepEqual(repository.state, before);
});
