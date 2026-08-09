import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  canadaDliAdapter,
  parseDliHtml,
} from "../../scripts/adapters/canada-dli.mjs";
import { partitionByInstitution } from "../../scripts/publish/batched-publisher.mjs";

test("Canada DLI parser preserves authoritative identity and campus fields", () => {
  const rows = parseDliHtml(`
    <table><tr><td>Alberta</td><td>Example University</td><td>O12345678901</td><td>Calgary</td><td>Main Campus</td><td>Yes</td><td>Public institution</td></tr></table>
  `);
  assert.deepEqual(rows, [
    {
      province: "Alberta",
      name: "Example University",
      dliNumber: "O12345678901",
      city: "Calgary",
      campus: "Main Campus",
      institutionType: "Public institution",
    },
  ]);
});

test("Canada DLI designation does not infer direct admissions eligibility", async () => {
  const config = JSON.parse(
    await readFile("data-import/config/sources/ca/ircc-dli.json", "utf8"),
  );
  const snapshot = await canadaDliAdapter.acquire({
    config,
    rawDirectory: "data-import/raw/ca/ircc_dli",
  });
  const records = await canadaDliAdapter.normalize({ config, snapshot });
  const universities = records.filter(
    ({ entityType }) => entityType === "university",
  );
  assert.equal(universities.length, 927);
  assert.equal(
    universities.filter(({ searchEligible }) => searchEligible).length,
    0,
  );
  assert.ok(
    universities.every(
      ({ acceptsDirectApplications, internationalStudentStatus }) =>
        acceptsDirectApplications === null &&
        internationalStudentStatus === "designated",
    ),
  );
});

test("full U.S. foundation is bounded, conservative, and deterministic", async () => {
  const normalized = JSON.parse(
    await readFile("data-import/normalized/us/ipeds/2024/records.json", "utf8"),
  );
  const universities = normalized.records.filter(
    ({ entityType }) => entityType === "university",
  );
  assert.equal(universities.length, 2825);
  assert.equal(
    universities.filter(({ searchEligible }) => searchEligible).length,
    2514,
  );
  assert.equal(
    universities.filter(
      ({ catalogClassification }) =>
        catalogClassification === "classification_unknown",
    ).length,
    0,
  );
  assert.equal(
    universities.filter(
      ({ searchEligibilityEvidence }) =>
        searchEligibilityEvidence === "inferred_from_authoritative_structure",
    ).length,
    2467,
  );
  assert.ok(
    universities.every(({ classificationEvidence, classificationRule }) =>
      Boolean(classificationEvidence?.sourceFields && classificationRule),
    ),
  );
});

test("institution batches retain complete dependency groups and stable boundaries", async () => {
  const normalized = JSON.parse(
    await readFile(
      "data-import/normalized/us/official_catalog/2026-08-09/records.json",
      "utf8",
    ),
  );
  const first = partitionByInstitution(normalized.records, 250);
  const repeat = partitionByInstitution(normalized.records, 250);
  assert.deepEqual(first, repeat);
  assert.equal(first.length, 12);
  const seenUniversities = new Set();
  for (const batch of first) {
    const universityIds = new Set(
      batch
        .filter(({ entityType }) => entityType === "university")
        .map(({ canonicalId }) => canonicalId),
    );
    for (const university of universityIds) {
      assert.equal(seenUniversities.has(university), false);
      seenUniversities.add(university);
    }
    assert.ok(
      batch
        .filter(({ entityType }) => entityType === "campus")
        .every(({ universityCanonicalId }) =>
          universityIds.has(universityCanonicalId),
        ),
    );
  }
  assert.equal(seenUniversities.size, 2825);
});
