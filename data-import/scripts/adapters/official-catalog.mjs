import { readFile } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "../lib/config.mjs";
import {
  deterministicIdentity,
  recordHash,
  sha256,
  stableStringify,
} from "../lib/identity.mjs";
import {
  validateCanonicalRecord,
  validateDuplicates,
  validateDeterministicRecords,
  validateRelationships,
} from "../lib/validation.mjs";
import {
  loadScholarshipGovernance,
  validateScholarshipEvidence,
} from "../lib/scholarship-governance.mjs";

const SOURCE_SYSTEM = "official_university_catalog";
const VERSION = "us_official_catalog@1.0.0";
const entity = (entityType, naturalKey, material) => {
  const record = {
    entityType,
    canonicalId: deterministicIdentity(entityType, naturalKey),
    ...material,
  };
  return { ...record, recordHash: recordHash(record) };
};
const sourceFile = (config) =>
  path.join(ROOT, "config", "sources", "us", config.datasetFile);
const provenance = (config, snapshot, sourceEntityId, sourceUrl) => ({
  sourceSystem: SOURCE_SYSTEM,
  sourceEntityId,
  sourceUrl,
  sourceVersion: config.releaseVersion,
  retrievedAt: snapshot.retrievedAt,
  rawChecksum: snapshot.artifacts[0].sha256,
  mappingVersion: config.mappingVersion,
});

export const officialCatalogAdapter = {
  name: "us_official_catalog",
  version: VERSION,
  async acquire({ config }) {
    const governance = await loadScholarshipGovernance();
    if (
      governance.rules?.tier2MayPublishAlone !== false ||
      governance.rules?.unspecifiedMeansEligible !== false
    )
      throw new Error("Scholarship governance gate is not safely configured.");
    const file = sourceFile(config);
    const bytes = await readFile(file);
    const dataset = JSON.parse(bytes);
    return {
      sourceName: config.sourceName,
      releaseVersion: config.releaseVersion,
      retrievedAt: dataset.retrievedAt,
      artifacts: [
        {
          name: "curated-evidence",
          fileName: config.datasetFile,
          url: config.sourceUrl,
          sha256: sha256(bytes),
          bytes: bytes.length,
          file,
        },
      ],
    };
  },
  async normalize({ config, snapshot }) {
    const dataset = JSON.parse(await readFile(sourceFile(config), "utf8"));
    const base = JSON.parse(
      await readFile(
        path.join(ROOT, "normalized", "us", "ipeds", "2024", "records.json"),
        "utf8",
      ),
    ).records;
    const parents = base.filter(
      (r) =>
        r.entityType === "country" ||
        r.entityType === "university" ||
        r.entityType === "campus",
    );
    const records = [...parents];
    for (const item of dataset.programs) {
      const university = parents.find(
        (r) =>
          r.entityType === "university" &&
          r.provenance.sourceEntityId === item.unitid,
      );
      const campus = parents.find(
        (r) =>
          r.entityType === "campus" &&
          r.universityCanonicalId === university?.canonicalId,
      );
      if (!university || !campus)
        throw new Error(
          `Pilot institution ${item.unitid} is unavailable in the IPEDS baseline.`,
        );
      const faculty = entity(
        "faculty",
        {
          universityCanonicalId: university.canonicalId,
          sourceSystem: SOURCE_SYSTEM,
          sourceEntityId: `${item.sourceId}:faculty`,
        },
        {
          provenance: provenance(
            config,
            snapshot,
            `${item.sourceId}:faculty`,
            item.programUrl,
          ),
          universityCanonicalId: university.canonicalId,
          name: item.faculty,
          isActive: true,
        },
      );
      const program = entity(
        "program",
        {
          universityCanonicalId: university.canonicalId,
          sourceSystem: SOURCE_SYSTEM,
          sourceEntityId: item.sourceId,
        },
        {
          provenance: provenance(
            config,
            snapshot,
            item.sourceId,
            item.programUrl,
          ),
          universityCanonicalId: university.canonicalId,
          facultyCanonicalId: faculty.canonicalId,
          name: item.name,
          programCode: null,
          credentialLevel: item.credentialLevel,
          durationMonths: null,
          description: null,
          isActive: true,
        },
      );
      const relation = entity(
        "program-campus",
        {
          programCanonicalId: program.canonicalId,
          campusCanonicalId: campus.canonicalId,
        },
        {
          provenance: provenance(
            config,
            snapshot,
            `${item.sourceId}:main-campus`,
            item.programUrl,
          ),
          programCanonicalId: program.canonicalId,
          campusCanonicalId: campus.canonicalId,
        },
      );
      records.push(faculty, program, relation);
      if (item.intake)
        records.push(
          entity(
            "intake",
            {
              programCanonicalId: program.canonicalId,
              campusCanonicalId: campus.canonicalId,
              sourceSystem: SOURCE_SYSTEM,
              sourceEntityId: item.intake.sourceId,
            },
            {
              provenance: provenance(
                config,
                snapshot,
                item.intake.sourceId,
                item.intake.admissionsUrl,
              ),
              programCanonicalId: program.canonicalId,
              campusCanonicalId: campus.canonicalId,
              name: item.intake.name,
              startDate: item.intake.startDate ?? null,
              startDatePrecision: item.intake.startDate ? "exact" : "term",
              applicationDeadline: item.intake.applicationDeadline ?? null,
              internationalDeadline: item.intake.internationalDeadline ?? null,
              capacity: null,
              openStatusEvidenceUrl: item.intake.admissionsUrl,
              termEvidenceUrl:
                item.intake.calendarUrl ?? item.intake.admissionsUrl,
              deadlineEvidenceUrl:
                item.intake.applicationDeadline ||
                item.intake.internationalDeadline
                  ? item.intake.admissionsUrl
                  : null,
              lastVerifiedAt: snapshot.retrievedAt,
              status: item.intake.status,
            },
          ),
        );
    }
    for (const item of dataset.scholarships ?? []) {
      const university = parents.find(
        (r) =>
          r.entityType === "university" &&
          r.provenance.sourceEntityId === item.unitid,
      );
      if (!university)
        throw new Error(
          `Scholarship institution ${item.unitid} is unavailable in the pilot.`,
        );
      records.push(
        entity(
          "scholarship",
          {
            universityCanonicalId: university.canonicalId,
            sourceSystem: SOURCE_SYSTEM,
            sourceEntityId: item.sourceId,
          },
          {
            provenance: provenance(
              config,
              snapshot,
              item.sourceId,
              item.sourceUrl,
            ),
            universityCanonicalId: university.canonicalId,
            programCanonicalId: null,
            intakeCanonicalId: null,
            name: item.name,
            awardType: item.awardType,
            amount: item.amount ?? null,
            currency: item.currency ?? null,
            percentage: null,
            eligibility: item.eligibility,
            internationalEligibility: item.internationalEligibility,
            verificationStatus: item.verificationStatus,
            lastVerifiedAt: snapshot.retrievedAt,
            sourceUrl: item.sourceUrl,
            applicationDeadline: item.applicationDeadline ?? null,
            isActive: item.isActive,
          },
        ),
      );
    }
    return records.sort(
      (a, b) =>
        a.entityType.localeCompare(b.entityType) ||
        a.canonicalId.localeCompare(b.canonicalId),
    );
  },
  async validate({ config, records, runId, snapshot }) {
    const issues = [
      ...records.flatMap((r) => validateCanonicalRecord(r, { runId })),
      ...validateRelationships(records, { runId }),
      ...validateDuplicates(records, { runId }),
      ...validateDeterministicRecords(records, { runId }),
    ];
    if (!snapshot?.artifacts?.every((a) => /^[a-f0-9]{64}$/.test(a.sha256)))
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
    const evidence = JSON.parse(await readFile(sourceFile(config), "utf8"));
    const governance = await loadScholarshipGovernance();
    for (const record of evidence.scholarships ?? []) {
      const evidenceIssues = validateScholarshipEvidence(
        {
          ...record,
          sourceEntityId: record.sourceId,
          retrievedAt: snapshot.retrievedAt,
          lastVerifiedAt: snapshot.retrievedAt,
          rawChecksum: snapshot.artifacts[0].sha256,
          mappingVersion: config.mappingVersion,
        },
        governance,
        { now: new Date(snapshot.retrievedAt) },
      );
      for (const code of evidenceIssues)
        issues.push({
          runId,
          category: "business-rule",
          severity: "error",
          code,
          message: `Scholarship evidence failed governance: ${code}.`,
          entityType: "scholarship",
          sourceEntityId: record.sourceId,
          fieldPath: null,
          quarantine: true,
        });
    }
    for (const candidate of evidence.quarantine ?? [])
      issues.push({
        runId,
        category: "business-rule",
        severity: "warning",
        code: "SOURCE_EVIDENCE_QUARANTINED",
        message: candidate.reason,
        entityType: candidate.entityType,
        sourceEntityId: candidate.unitid,
        fieldPath: null,
        quarantine: true,
      });
    const errors = issues.filter((i) =>
      ["error", "fatal"].includes(i.severity),
    ).length;
    return {
      valid: errors === 0,
      counts: {
        records: records.length,
        errors,
        warnings: issues.filter((i) => i.severity === "warning").length,
      },
      issues,
    };
  },
  async plan({ records, runId }) {
    const order = [
      "country",
      "university",
      "campus",
      "faculty",
      "program",
      "program-campus",
      "intake",
      "scholarship",
    ];
    const operations = records
      .map((after) => ({
        runId,
        entityType: after.entityType,
        canonicalId: after.canonicalId,
        catalogId: null,
        operation: "insert",
        before: null,
        after,
        recordHash: after.recordHash,
      }))
      .sort(
        (a, b) =>
          order.indexOf(a.entityType) - order.indexOf(b.entityType) ||
          a.canonicalId.localeCompare(b.canonicalId),
      );
    return {
      runId,
      mode: "offline",
      writesPerformed: false,
      operationCounts: Object.fromEntries(
        order.map((t) => [
          t,
          operations.filter((o) => o.entityType === t).length,
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
      missingFromPlan: [],
      unexpectedOperations: [],
      planChecksum: plan.checksum,
    };
  },
};
export const officialCatalogVersions = {
  adapter: "us_official_catalog",
  mapping: "1.0.0",
  pipeline: "1.1.0",
};
