import { sha256, stableStringify } from "../lib/identity.mjs";

const ENTITY_ORDER = [
  "country",
  "university",
  "campus",
  "faculty",
  "program",
  "program-campus",
  "intake",
  "scholarship",
];
const IMPLEMENTED = new Set([
  "country",
  "university",
  "campus",
  "faculty",
  "program",
  "program-campus",
  "intake",
  "scholarship",
]);

export function deterministicUuid(canonicalId) {
  const hex = sha256(`crm-catalog:${canonicalId}`).slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function comparable(entityType, record, ids) {
  if (entityType === "country")
    return {
      iso_code: record.isoCode,
      name: record.name,
      default_currency: record.defaultCurrency,
      is_active: record.isActive,
    };
  if (entityType === "university")
    return {
      country_id: ids.get(record.countryCanonicalId),
      name: record.name,
      slug: record.slug,
      institution_type: record.institutionType ?? null,
      website_url: record.websiteUrl ?? null,
      catalog_classification: record.catalogClassification,
      degree_granting: record.degreeGranting ?? null,
      accepts_direct_applications: record.acceptsDirectApplications ?? null,
      search_eligible: record.searchEligible,
      classification_rule: record.classificationRule,
      classification_evidence: record.classificationEvidence,
      search_eligibility_evidence: record.searchEligibilityEvidence,
      international_student_status:
        record.internationalStudentStatus ?? "unknown",
      dli_number: record.dliNumber ?? null,
      is_active: record.isActive,
    };
  if (entityType === "campus")
    return {
      university_id: ids.get(record.universityCanonicalId),
      name: record.name,
      city: record.city,
      region: record.region ?? null,
      is_primary: record.isPrimary,
      is_active: record.isActive,
    };
  if (entityType === "faculty")
    return {
      university_id:
        ids.get(record.universityCanonicalId) ??
        deterministicUuid(record.universityCanonicalId),
      name: record.name,
      is_active: record.isActive,
    };
  if (entityType === "program")
    return {
      university_id:
        ids.get(record.universityCanonicalId) ??
        deterministicUuid(record.universityCanonicalId),
      faculty_id: record.facultyCanonicalId
        ? (ids.get(record.facultyCanonicalId) ??
          deterministicUuid(record.facultyCanonicalId))
        : null,
      name: record.name,
      program_code: record.programCode ?? null,
      credential_level: record.credentialLevel,
      duration_months: record.durationMonths ?? null,
      description: record.description ?? null,
      is_active: record.isActive,
    };
  if (entityType === "program-campus")
    return {
      program_id:
        ids.get(record.programCanonicalId) ??
        deterministicUuid(record.programCanonicalId),
      campus_id:
        ids.get(record.campusCanonicalId) ??
        deterministicUuid(record.campusCanonicalId),
    };
  if (entityType === "intake")
    return {
      program_id:
        ids.get(record.programCanonicalId) ??
        deterministicUuid(record.programCanonicalId),
      campus_id:
        ids.get(record.campusCanonicalId) ??
        deterministicUuid(record.campusCanonicalId),
      name: record.name,
      start_date: record.startDate,
      start_date_precision: record.startDatePrecision,
      application_deadline: record.applicationDeadline ?? null,
      international_deadline: record.internationalDeadline ?? null,
      capacity: record.capacity ?? null,
      open_status_evidence_url: record.openStatusEvidenceUrl,
      term_evidence_url: record.termEvidenceUrl,
      deadline_evidence_url: record.deadlineEvidenceUrl ?? null,
      last_verified_at: record.lastVerifiedAt,
      status: record.status,
    };
  if (entityType === "scholarship")
    return {
      university_id:
        ids.get(record.universityCanonicalId) ??
        deterministicUuid(record.universityCanonicalId),
      program_id: record.programCanonicalId
        ? (ids.get(record.programCanonicalId) ??
          deterministicUuid(record.programCanonicalId))
        : null,
      intake_id: record.intakeCanonicalId
        ? (ids.get(record.intakeCanonicalId) ??
          deterministicUuid(record.intakeCanonicalId))
        : null,
      name: record.name,
      award_type: record.awardType,
      amount: record.amount ?? null,
      currency: record.currency ?? null,
      percentage: record.percentage ?? null,
      eligibility: record.eligibility,
      application_deadline: record.applicationDeadline ?? null,
      international_eligibility: record.internationalEligibility,
      verification_status: record.verificationStatus,
      last_verified_at: record.lastVerifiedAt,
      source_url: record.sourceUrl,
      is_active: record.isActive,
    };
  return null;
}
function same(left, right) {
  return Object.entries(right).every(([key, value]) =>
    value && typeof value === "object"
      ? stableStringify(left?.[key]) === stableStringify(value)
      : left?.[key] === value,
  );
}
function counts(actions) {
  return Object.fromEntries(
    ["insert", "update", "unchanged", "skipped"].map((action) => [
      action,
      actions.filter((item) => item.operation === action).length,
    ]),
  );
}

export async function publishCatalog({
  repository,
  records,
  manifest,
  dryRun = false,
  environment = "preview",
  failAfterAction,
} = {}) {
  if (!repository?.transaction)
    throw new TypeError("A transactional catalog repository is required.");
  if (
    !manifest?.runId ||
    !manifest?.gitCommit ||
    !manifest?.versions?.pipeline ||
    !manifest?.source?.releaseVersion
  )
    throw new Error("Publication requires a complete import manifest.");
  const ordered = [...records].sort(
    (a, b) =>
      ENTITY_ORDER.indexOf(a.entityType) - ENTITY_ORDER.indexOf(b.entityType) ||
      a.canonicalId.localeCompare(b.canonicalId),
  );
  const manifestId = sha256(
    stableStringify({
      runId: manifest.runId,
      createdAt: manifest.createdAt,
      source: manifest.source,
      versions: manifest.versions,
      gitCommit: manifest.gitCommit,
    }),
  );
  const metadata = {
    runId: manifest.runId,
    manifestId,
    gitCommit: manifest.gitCommit,
    pipelineVersion: manifest.versions.pipeline,
    sourceVersion: manifest.source.releaseVersion,
    timestamp: manifest.createdAt,
    environment,
    dryRun,
  };
  return repository.transaction(
    async (catalog) => {
      const ids = new Map();
      const actions = [];
      for (const record of ordered) {
        if (!IMPLEMENTED.has(record.entityType)) {
          actions.push({
            ...metadata,
            entityType: record.entityType,
            canonicalId: record.canonicalId,
            catalogId: null,
            operation: "skipped",
            before: null,
            after: null,
            recordHash: record.recordHash,
            reason: "Entity publisher is reserved for a future step.",
          });
          continue;
        }
        const parentId = record.countryCanonicalId
          ? ids.get(record.countryCanonicalId)
          : record.universityCanonicalId
            ? ids.get(record.universityCanonicalId)
            : record.programCanonicalId
              ? (ids.get(record.programCanonicalId) ??
                deterministicUuid(record.programCanonicalId))
              : true;
        if (!parentId)
          throw new Error(
            `Unresolved publication dependency for ${record.entityType}:${record.canonicalId}`,
          );
        const desired = comparable(record.entityType, record, ids);
        const deterministicId = deterministicUuid(record.canonicalId);
        const existing = await catalog.find(
          record.entityType,
          desired,
          deterministicId,
        );
        const catalogId = existing?.id ?? deterministicId;
        ids.set(record.canonicalId, catalogId);
        let operation = "unchanged";
        let before = existing ? { ...existing } : null;
        if (!existing) {
          operation = "insert";
          if (!dryRun)
            await catalog.insert(record.entityType, {
              id: catalogId,
              ...desired,
            });
        } else if (!same(existing, desired)) {
          operation = "update";
          if (!dryRun)
            await catalog.update(record.entityType, catalogId, desired);
        }
        actions.push({
          ...metadata,
          entityType: record.entityType,
          canonicalId: record.canonicalId,
          catalogId,
          operation,
          before,
          after: { id: catalogId, ...desired },
          recordHash: record.recordHash,
          reason: null,
        });
        if (failAfterAction && actions.length === failAfterAction)
          throw new Error(
            `Injected publication failure after action ${failAfterAction}`,
          );
      }
      const verification = await catalog.verify({
        ids,
        expected: ordered.filter((record) =>
          IMPLEMENTED.has(record.entityType),
        ),
        dryRun,
        actions,
      });
      if (
        !verification.foreignKeyIntegrity ||
        !verification.identityConsistency
      )
        throw new Error("Post-publication reconciliation failed.");
      const actionCounts = counts(actions);
      const report = {
        ...metadata,
        status: dryRun ? "dry-run" : "published",
        counts: { total: actions.length, ...actionCounts },
        actions,
        checksum: sha256(stableStringify(actions)),
      };
      const reconciliation = {
        ...metadata,
        status: "reconciled",
        expectedCounts: Object.fromEntries(
          ENTITY_ORDER.filter(
            (type) =>
              IMPLEMENTED.has(type) &&
              ordered.some((record) => record.entityType === type),
          ).map((type) => [
            type,
            ordered.filter((record) => record.entityType === type).length,
          ]),
        ),
        ...verification,
      };
      return {
        report,
        reconciliation,
        summary: {
          ...metadata,
          status: report.status,
          counts: report.counts,
          reconciliationPassed: true,
          reportChecksum: report.checksum,
        },
      };
    },
    { dryRun },
  );
}

export { ENTITY_ORDER };
