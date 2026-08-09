import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deterministicIdentity, recordHash } from "./identity.mjs";

export const CATEGORIES = [
  "structural",
  "identity",
  "relationship",
  "business-rule",
];
export const SEVERITIES = ["info", "warning", "error", "fatal"];
export const ENTITY_TYPES = [
  "country",
  "university",
  "campus",
  "faculty",
  "program",
  "program-campus",
  "intake",
  "scholarship",
];
const HASH = /^[a-f0-9]{64}$/;
const REQUIRED = {
  country: ["isoCode", "name", "isActive"],
  university: ["countryCanonicalId", "name", "slug", "isActive"],
  campus: ["universityCanonicalId", "name", "city", "isPrimary", "isActive"],
  faculty: ["universityCanonicalId", "name", "isActive"],
  program: ["universityCanonicalId", "name", "credentialLevel", "isActive"],
  "program-campus": ["programCanonicalId", "campusCanonicalId"],
  intake: [
    "programCanonicalId",
    "campusCanonicalId",
    "name",
    "startDatePrecision",
    "status",
  ],
  scholarship: [
    "universityCanonicalId",
    "name",
    "awardType",
    "eligibility",
    "isActive",
  ],
};
const CREDENTIALS = new Set([
  "certificate",
  "diploma",
  "associate",
  "bachelor",
  "postgraduate_certificate",
  "master",
  "doctorate",
  "other",
]);

export function issue({
  runId = "unassigned",
  category,
  severity,
  code,
  message,
  record,
  fieldPath = null,
  quarantine = true,
}) {
  if (!CATEGORIES.includes(category) || !SEVERITIES.includes(severity))
    throw new TypeError("Invalid validation issue classification");
  return {
    runId,
    category,
    severity,
    code,
    message,
    entityType: record?.entityType ?? "unknown",
    sourceEntityId: record?.provenance?.sourceEntityId ?? null,
    fieldPath,
    quarantine,
  };
}

export function validateCanonicalRecord(record, { runId } = {}) {
  const issues = [];
  if (
    !record ||
    typeof record !== "object" ||
    !ENTITY_TYPES.includes(record.entityType)
  ) {
    return [
      issue({
        runId,
        category: "structural",
        severity: "fatal",
        code: "INVALID_ENTITY_TYPE",
        message: "Record has no supported entityType.",
        record,
      }),
    ];
  }
  for (const field of [
    "canonicalId",
    "recordHash",
    "provenance",
    ...REQUIRED[record.entityType],
  ]) {
    if (
      record[field] === undefined ||
      record[field] === null ||
      record[field] === ""
    )
      issues.push(
        issue({
          runId,
          category: "structural",
          severity: "error",
          code: "REQUIRED_FIELD",
          message: `Required field is missing: ${field}.`,
          record,
          fieldPath: field,
        }),
      );
  }
  if (record.canonicalId && !HASH.test(record.canonicalId))
    issues.push(
      issue({
        runId,
        category: "identity",
        severity: "error",
        code: "INVALID_CANONICAL_ID",
        message: "canonicalId must be a SHA-256 digest.",
        record,
        fieldPath: "canonicalId",
      }),
    );
  if (record.recordHash && !HASH.test(record.recordHash))
    issues.push(
      issue({
        runId,
        category: "identity",
        severity: "error",
        code: "INVALID_RECORD_HASH",
        message: "recordHash must be a SHA-256 digest.",
        record,
        fieldPath: "recordHash",
      }),
    );
  if (
    record.entityType === "country" &&
    !/^[A-Z]{2}$/.test(record.isoCode ?? "")
  )
    issues.push(
      issue({
        runId,
        category: "business-rule",
        severity: "error",
        code: "INVALID_COUNTRY_CODE",
        message: "isoCode must be uppercase ISO alpha-2.",
        record,
        fieldPath: "isoCode",
      }),
    );
  if (
    record.entityType === "program" &&
    record.credentialLevel &&
    !CREDENTIALS.has(record.credentialLevel)
  )
    issues.push(
      issue({
        runId,
        category: "business-rule",
        severity: "error",
        code: "INVALID_CREDENTIAL",
        message: "credentialLevel is not supported by the catalog.",
        record,
        fieldPath: "credentialLevel",
      }),
    );
  if (
    record.entityType === "intake" &&
    record.applicationDeadline &&
    record.startDate &&
    record.applicationDeadline > record.startDate
  )
    issues.push(
      issue({
        runId,
        category: "business-rule",
        severity: "error",
        code: "DEADLINE_AFTER_START",
        message: "Application deadline cannot follow start date.",
        record,
        fieldPath: "applicationDeadline",
      }),
    );
  if (
    record.entityType === "intake" &&
    ((record.startDatePrecision === "exact" && !record.startDate) ||
      (record.startDatePrecision === "term" && record.startDate !== null))
  )
    issues.push(
      issue({
        runId,
        category: "business-rule",
        severity: "error",
        code: "INVALID_START_DATE_PRECISION",
        message:
          "Exact intakes require a date and term-only intakes must not carry one.",
        record,
        fieldPath: "startDatePrecision",
      }),
    );
  return issues;
}

export function validateRelationships(records, { runId } = {}) {
  const byId = new Map(records.map((record) => [record.canonicalId, record]));
  return records.flatMap((record) => {
    const refs = Object.entries(record).filter(
      ([key, value]) =>
        key.endsWith("CanonicalId") && key !== "canonicalId" && value,
    );
    return refs.flatMap(([field, value]) =>
      byId.has(value)
        ? []
        : [
            issue({
              runId,
              category: "relationship",
              severity: "error",
              code: "UNRESOLVED_REFERENCE",
              message: `Reference cannot be resolved: ${field}.`,
              record,
              fieldPath: field,
            }),
          ],
    );
  });
}

export function validateDuplicates(records, { runId } = {}) {
  const seenIds = new Set();
  const seenSources = new Set();
  const issues = [];
  for (const record of records) {
    const sourceKey = `${record.entityType}:${record.provenance?.sourceSystem}:${record.provenance?.sourceEntityId}`;
    if (seenIds.has(record.canonicalId) || seenSources.has(sourceKey))
      issues.push(
        issue({
          runId,
          category: "identity",
          severity: "error",
          code: "DUPLICATE_INSTITUTION",
          message: "Duplicate canonical or source identity detected.",
          record,
        }),
      );
    seenIds.add(record.canonicalId);
    seenSources.add(sourceKey);
  }
  return issues;
}

export function validateDeterministicRecords(records, { runId } = {}) {
  return records.flatMap((record) => {
    let expected;
    if (record.entityType === "country")
      expected = deterministicIdentity("country", { isoCode: record.isoCode });
    else if (record.entityType === "university")
      expected = deterministicIdentity("university", {
        sourceSystem: record.provenance?.sourceSystem,
        sourceEntityId: record.provenance?.sourceEntityId,
      });
    else if (record.entityType === "campus")
      expected = deterministicIdentity("campus", {
        universityCanonicalId: record.universityCanonicalId,
        sourceEntityId: record.provenance?.sourceEntityId,
      });
    else if (record.entityType === "faculty")
      expected = deterministicIdentity("faculty", {
        universityCanonicalId: record.universityCanonicalId,
        sourceSystem: record.provenance?.sourceSystem,
        sourceEntityId: record.provenance?.sourceEntityId,
      });
    else if (record.entityType === "program")
      expected = deterministicIdentity("program", {
        universityCanonicalId: record.universityCanonicalId,
        sourceSystem: record.provenance?.sourceSystem,
        sourceEntityId: record.provenance?.sourceEntityId,
      });
    else if (record.entityType === "program-campus")
      expected = deterministicIdentity("program-campus", {
        programCanonicalId: record.programCanonicalId,
        campusCanonicalId: record.campusCanonicalId,
      });
    else if (record.entityType === "intake")
      expected = deterministicIdentity("intake", {
        programCanonicalId: record.programCanonicalId,
        campusCanonicalId: record.campusCanonicalId,
        sourceSystem: record.provenance?.sourceSystem,
        sourceEntityId: record.provenance?.sourceEntityId,
      });
    const expectedHash = recordHash(record);
    return [
      expected && expected !== record.canonicalId
        ? issue({
            runId,
            category: "identity",
            severity: "error",
            code: "NONDETERMINISTIC_IDENTITY",
            message: "canonicalId does not match its natural key.",
            record,
            fieldPath: "canonicalId",
          })
        : null,
      expectedHash !== record.recordHash
        ? issue({
            runId,
            category: "identity",
            severity: "error",
            code: "RECORD_HASH_MISMATCH",
            message: "recordHash does not match canonical content.",
            record,
            fieldPath: "recordHash",
          })
        : null,
    ].filter(Boolean);
  });
}

export async function writeQuarantine(filePath, records, issues) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify({ records, issues }, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
}
