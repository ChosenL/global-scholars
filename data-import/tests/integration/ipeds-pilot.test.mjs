import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ipedsAdapter } from "../../scripts/adapters/ipeds.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const fixture = (name) => path.join(root, "tests", "fixtures", "ipeds", name);
const config = {
  sourceName: "US IPEDS",
  releaseVersion: "2024",
  pilotLimit: 50,
};
const checksum = "a".repeat(64);
const snapshot = {
  releaseVersion: "2024",
  retrievedAt: "2026-08-02T12:00:00.000Z",
  artifacts: [
    {
      name: "directory",
      fileName: "HD2024.zip",
      url: "https://nces.ed.gov/ipeds/HD2024.zip",
      sha256: checksum,
      bytes: 100,
      csv: fixture("HD2024.csv"),
    },
    {
      name: "institutional-characteristics",
      fileName: "IC2024.zip",
      url: "https://nces.ed.gov/ipeds/IC2024.zip",
      sha256: checksum,
      bytes: 100,
      csv: fixture("IC2024.csv"),
    },
  ],
};
const runId = "20260802T120000Z-us_ipeds-aaaaaaaaaaaa";

test("successful pilot import produces canonical countries, universities, and campuses", async () => {
  const records = await ipedsAdapter.normalize({ config, snapshot });
  assert.deepEqual(
    Object.fromEntries(
      ["country", "university", "campus"].map((type) => [
        type,
        records.filter((record) => record.entityType === type).length,
      ]),
    ),
    { country: 1, university: 3, campus: 3 },
  );
  assert.deepEqual(
    (await ipedsAdapter.validate({ records, runId, snapshot })).issues,
    [],
  );
  const university = records.find(
    (record) =>
      record.entityType === "university" &&
      record.provenance.sourceEntityId === "100001",
  );
  assert.equal(university.institutionType, "Public institution");
  assert.deepEqual(university.degreeLevels, [
    "certificate",
    "associate",
    "bachelor",
    "master",
    "doctorate",
  ]);
});

test("duplicate institutions are rejected", async () => {
  const records = await ipedsAdapter.normalize({ config, snapshot });
  const duplicate = {
    ...records.find((record) => record.entityType === "university"),
  };
  const report = await ipedsAdapter.validate({
    records: [...records, duplicate],
    runId,
    snapshot,
  });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(({ code }) => code === "DUPLICATE_INSTITUTION"));
});

test("malformed records fail required-field and deterministic hash validation", async () => {
  const records = await ipedsAdapter.normalize({ config, snapshot });
  const target = records.find((record) => record.entityType === "university");
  const malformed = { ...target, name: "", recordHash: "b".repeat(64) };
  const report = await ipedsAdapter.validate({
    records: records.map((record) => (record === target ? malformed : record)),
    runId,
    snapshot,
  });
  assert.equal(report.valid, false);
  assert.ok(report.issues.some(({ code }) => code === "REQUIRED_FIELD"));
  assert.ok(report.issues.some(({ code }) => code === "RECORD_HASH_MISMATCH"));
});

test("normalization is deterministically repeatable", async () => {
  assert.deepEqual(
    await ipedsAdapter.normalize({ config, snapshot }),
    await ipedsAdapter.normalize({ config, snapshot }),
  );
});

test("publication plans are stable and reconcile without writes", async () => {
  const records = await ipedsAdapter.normalize({ config, snapshot });
  const first = await ipedsAdapter.plan({ records, runId });
  const second = await ipedsAdapter.plan({
    records: [...records].reverse(),
    runId,
  });
  assert.deepEqual(first, second);
  assert.equal(first.writesPerformed, false);
  assert.deepEqual(first.operationCounts, {
    country: 1,
    university: 3,
    campus: 3,
  });
  const reconciliation = await ipedsAdapter.reconcile({ records, plan: first });
  assert.equal(reconciliation.status, "not-published");
  assert.deepEqual(reconciliation.missingFromPlan, []);
});
