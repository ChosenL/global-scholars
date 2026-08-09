import { readFile } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "./config.mjs";

export async function loadScholarshipGovernance() {
  return JSON.parse(
    await readFile(
      path.join(ROOT, "config", "governance", "scholarships.json"),
      "utf8",
    ),
  );
}
export function validateScholarshipEvidence(
  record,
  governance,
  { now = new Date() } = {},
) {
  const issues = [];
  for (const field of governance.requiredPublicationFields)
    if (
      record[field] === undefined ||
      record[field] === null ||
      record[field] === ""
    )
      issues.push(`MISSING_${field.toUpperCase()}`);
  if (!governance.authoritativeTiers.includes(record.sourceTier))
    issues.push("NON_AUTHORITATIVE_SOURCE");
  if (
    !governance.internationalEligibilityStates.includes(
      record.internationalEligibility,
    )
  )
    issues.push("INVALID_INTERNATIONAL_ELIGIBILITY");
  if (!governance.verificationStatuses.includes(record.verificationStatus))
    issues.push("INVALID_VERIFICATION_STATUS");
  if (record.verificationStatus !== "current" && record.isActive)
    issues.push("UNVERIFIED_ACTIVE_AWARD");
  const age = (now - new Date(record.lastVerifiedAt)) / 86400000;
  if (
    !Number.isFinite(age) ||
    age < 0 ||
    age > governance.maximumVerificationAgeDays
  )
    issues.push("STALE_EVIDENCE");
  if (
    record.awardType === "fixed" &&
    (!(record.amount > 0) || !record.currency)
  )
    issues.push("INVALID_FIXED_AMOUNT");
  return issues;
}
