import test from "node:test";
import assert from "node:assert/strict";
import {
  loadScholarshipGovernance,
  validateScholarshipEvidence,
} from "../../scripts/lib/scholarship-governance.mjs";
const base = {
  name: "Award",
  provider: "University",
  sourceUrl: "https://example.edu/award",
  sourceEntityId: "award",
  retrievedAt: "2026-08-09T12:00:00.000Z",
  rawChecksum: "a".repeat(64),
  mappingVersion: "1.0.0",
  sourceTier: "official_university",
  internationalEligibility: "confirmed_eligible",
  verificationStatus: "current",
  lastVerifiedAt: "2026-08-09T12:00:00.000Z",
  awardType: "other",
  isActive: true,
};
test("governance accepts complete authoritative evidence", async () =>
  assert.deepEqual(
    validateScholarshipEvidence(base, await loadScholarshipGovernance(), {
      now: new Date("2026-08-09T13:00:00Z"),
    }),
    [],
  ));
test("governance rejects discovery-only, unspecified-as-eligible, and stale active evidence", async () => {
  const g = await loadScholarshipGovernance();
  const issues = validateScholarshipEvidence(
    {
      ...base,
      sourceTier: "aggregator",
      internationalEligibility: "maybe",
      verificationStatus: "unknown",
    },
    g,
    { now: new Date("2027-08-09T12:00:00Z") },
  );
  assert.ok(issues.includes("NON_AUTHORITATIVE_SOURCE"));
  assert.ok(issues.includes("INVALID_INTERNATIONAL_ELIGIBILITY"));
  assert.ok(issues.includes("UNVERIFIED_ACTIVE_AWARD"));
  assert.ok(issues.includes("STALE_EVIDENCE"));
});
