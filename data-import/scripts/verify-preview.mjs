#!/usr/bin/env node
import path from "node:path";
import postgres from "postgres";
import { ROOT } from "./lib/config.mjs";
import { readJson, writeJson } from "./lib/artifacts.mjs";
import { sha256, stableStringify } from "./lib/identity.mjs";
import { deterministicUuid } from "./publish/catalog-publisher.mjs";

export async function verifyPreview({
  connectionString = process.env.SUPABASE_DB_URL,
} = {}) {
  if (!connectionString)
    throw new Error("SUPABASE_DB_URL is required for Preview verification.");
  const normalized = await readJson(
    path.join(ROOT, "normalized", "us", "ipeds", "2024", "records.json"),
  );
  const byType = Object.fromEntries(
    ["country", "university", "campus"].map((type) => [
      type,
      normalized.records.filter((record) => record.entityType === type),
    ]),
  );
  const ids = normalized.records.map((record) =>
    deterministicUuid(record.canonicalId),
  );
  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 5,
  });
  try {
    const [
      countries,
      universities,
      campuses,
      brokenUniversities,
      brokenCampuses,
      inactive,
      duplicateUniversities,
      duplicateCampuses,
      searchEligible,
      exposedAdministrativeOffices,
    ] = await Promise.all([
      sql`select count(*)::int as count from crm.countries where id in ${sql(ids)}`,
      sql`select count(*)::int as count from crm.universities where id in ${sql(ids)}`,
      sql`select count(*)::int as count from crm.campuses where id in ${sql(ids)}`,
      sql`select count(*)::int as count from crm.universities u left join crm.countries c on c.id = u.country_id where u.id in ${sql(ids)} and c.id is null`,
      sql`select count(*)::int as count from crm.campuses ca left join crm.universities u on u.id = ca.university_id where ca.id in ${sql(ids)} and u.id is null`,
      sql`select count(*)::int as count from (select id,is_active from crm.countries union all select id,is_active from crm.universities union all select id,is_active from crm.campuses) entity where id in ${sql(ids)} and not is_active`,
      sql`select count(*)::int as count from (select country_id,slug from crm.universities group by country_id,slug having count(*) > 1) duplicate`,
      sql`select count(*)::int as count from (select university_id,name from crm.campuses group by university_id,name having count(*) > 1) duplicate`,
      sql`select count(*)::int as count from crm.universities where id in ${sql(ids)} and is_active and search_eligible`,
      sql`select count(*)::int as count from crm.universities where id in ${sql(ids)} and is_active and search_eligible and catalog_classification='system_or_administrative_office'`,
    ]);
    const report = {
      runId: normalized.runId,
      verifiedAt: new Date().toISOString(),
      environment: "preview",
      counts: {
        country: countries[0].count,
        university: universities[0].count,
        campus: campuses[0].count,
      },
      expectedCounts: Object.fromEntries(
        Object.entries(byType).map(([type, records]) => [type, records.length]),
      ),
      identityCount: ids.length,
      brokenForeignKeys: brokenUniversities[0].count + brokenCampuses[0].count,
      inactivePilotRows: inactive[0].count,
      duplicateNaturalKeys:
        duplicateUniversities[0].count + duplicateCampuses[0].count,
      searchEligibleUniversities: searchEligible[0].count,
      exposedAdministrativeOffices: exposedAdministrativeOffices[0].count,
      searchEligibleExpected: byType.university.filter(
        ({ isActive, searchEligible }) => isActive && searchEligible,
      ).length,
    };
    report.accepted =
      stableStringify(report.counts) ===
        stableStringify(report.expectedCounts) &&
      report.identityCount === normalized.records.length &&
      report.brokenForeignKeys === 0 &&
      report.inactivePilotRows === 0 &&
      report.duplicateNaturalKeys === 0 &&
      report.searchEligibleUniversities === report.searchEligibleExpected &&
      report.exposedAdministrativeOffices === 0;
    await writeJson(
      path.join(
        ROOT,
        "validation",
        "reports",
        "us_ipeds-2024-preview-verification.json",
      ),
      report,
    );
    return report;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function verifyCanadaFoundation({
  connectionString = process.env.SUPABASE_DB_URL,
} = {}) {
  if (!connectionString)
    throw new Error("SUPABASE_DB_URL is required for Preview verification.");
  const normalized = await readJson(
    path.join(
      ROOT,
      "normalized",
      "ca",
      "ircc_dli",
      "2026-08-09",
      "records.json",
    ),
  );
  const publication = await readJson(
    path.join(
      ROOT,
      "validation",
      "reports",
      "ca_ircc_dli-scale-publication.json",
    ),
  );
  const universities = normalized.records.filter(
    ({ entityType }) => entityType === "university",
  );
  const campuses = normalized.records.filter(
    ({ entityType }) => entityType === "campus",
  );
  const ids = normalized.records.map(({ canonicalId }) =>
    deterministicUuid(canonicalId),
  );
  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 5,
  });
  try {
    const [
      countries,
      universityRows,
      campusRows,
      designated,
      searchEligible,
      missingDli,
      broken,
      duplicates,
    ] = await Promise.all([
      sql`select count(*)::int as count from crm.countries where id in ${sql(ids)}`,
      sql`select count(*)::int as count from crm.universities where id in ${sql(ids)}`,
      sql`select count(*)::int as count from crm.campuses where id in ${sql(ids)}`,
      sql`select count(*)::int as count from crm.universities where id in ${sql(ids)} and is_active and international_student_status='designated'`,
      sql`select count(*)::int as count from crm.universities where id in ${sql(ids)} and is_active and search_eligible`,
      sql`select count(*)::int as count from crm.universities where id in ${sql(ids)} and dli_number is null`,
      sql`select count(*)::int as count from crm.campuses c left join crm.universities u on u.id=c.university_id where c.id in ${sql(ids)} and u.id is null`,
      sql`select count(*)::int as count from (select dli_number from crm.universities where dli_number is not null group by dli_number having count(*)>1) d`,
    ]);
    const report = {
      runId: normalized.runId,
      verifiedAt: new Date().toISOString(),
      environment: "preview",
      counts: {
        country: countries[0].count,
        university: universityRows[0].count,
        campus: campusRows[0].count,
      },
      expectedCounts: {
        country: 1,
        university: universities.length,
        campus: campuses.length,
      },
      designatedInstitutions: designated[0].count,
      expectedDesignatedInstitutions: universities.filter(
        ({ isActive, internationalStudentStatus }) =>
          isActive && internationalStudentStatus === "designated",
      ).length,
      searchEligibleInstitutions: searchEligible[0].count,
      expectedSearchEligibleInstitutions: universities.filter(
        ({ isActive, searchEligible }) => isActive && searchEligible,
      ).length,
      missingDliNumbers: missingDli[0].count,
      brokenForeignKeys: broken[0].count,
      duplicateDliIdentities: duplicates[0].count,
      publicationChecksum: publication.checksum,
      checksumVerified:
        publication.checksum ===
        sha256(
          stableStringify(publication.batches.map(({ checksum }) => checksum)),
        ),
    };
    report.accepted =
      stableStringify(report.counts) ===
        stableStringify(report.expectedCounts) &&
      report.designatedInstitutions === report.expectedDesignatedInstitutions &&
      report.searchEligibleInstitutions ===
        report.expectedSearchEligibleInstitutions &&
      report.missingDliNumbers === 0 &&
      report.brokenForeignKeys === 0 &&
      report.duplicateDliIdentities === 0 &&
      report.checksumVerified;
    await writeJson(
      path.join(
        ROOT,
        "validation",
        "reports",
        "ca_ircc_dli-2026-08-09-preview-verification.json",
      ),
      report,
    );
    return report;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function verifyOfficialCatalog({
  connectionString = process.env.SUPABASE_DB_URL,
} = {}) {
  if (!connectionString)
    throw new Error("SUPABASE_DB_URL is required for Preview verification.");
  const normalized = await readJson(
    path.join(
      ROOT,
      "normalized",
      "us",
      "official_catalog",
      "2026-08-09",
      "records.json",
    ),
  );
  const publication = await readJson(
    path.join(
      ROOT,
      "validation",
      "reports",
      "us_official_catalog-2026-08-09-publication.json",
    ),
  );
  const byType = Object.fromEntries(
    ["faculty", "program", "program-campus", "intake", "scholarship"].map(
      (type) => [
        type,
        normalized.records.filter((record) => record.entityType === type),
      ],
    ),
  );
  const ids = Object.fromEntries(
    Object.entries(byType).map(([type, records]) => [
      type,
      records.map((record) => deterministicUuid(record.canonicalId)),
    ]),
  );
  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 5,
  });
  try {
    const [
      faculties,
      programs,
      relations,
      intakes,
      openIntakes,
      exactIntakes,
      termIntakes,
      scholarships,
      eligibleScholarships,
      unsafeActiveScholarships,
      coverage,
      broken,
      brokenScholarships,
      duplicatePrograms,
      duplicateIntakes,
      duplicateScholarships,
    ] = await Promise.all([
      sql`select count(*)::int as count from crm.faculties where id in ${sql(ids.faculty)}`,
      sql`select count(*)::int as count from crm.programs where id in ${sql(ids.program)} and is_active`,
      sql`select count(*)::int as count from crm.program_campuses where program_id in ${sql(ids.program)}`,
      sql`select count(*)::int as count from crm.intakes where id in ${sql(ids.intake)}`,
      sql`select count(*)::int as count from crm.intakes where id in ${sql(ids.intake)} and status = 'open'`,
      sql`select count(*)::int as count from crm.intakes where id in ${sql(ids.intake)} and start_date_precision='exact'`,
      sql`select count(*)::int as count from crm.intakes where id in ${sql(ids.intake)} and start_date_precision='term'`,
      sql`select count(*)::int as count from crm.scholarships where id in ${sql(ids.scholarship)}`,
      sql`select count(*)::int as count from crm.scholarships where id in ${sql(ids.scholarship)} and international_eligibility='confirmed_eligible'`,
      sql`select count(*)::int as count from crm.scholarships where id in ${sql(ids.scholarship)} and is_active and verification_status <> 'current'`,
      sql`select count(distinct university_id)::int as count from crm.programs where id in ${sql(ids.program)} and is_active`,
      sql`select count(*)::int as count from crm.intakes i left join crm.programs p on p.id=i.program_id left join crm.campuses c on c.id=i.campus_id left join crm.program_campuses pc on pc.program_id=i.program_id and pc.campus_id=i.campus_id where i.id in ${sql(ids.intake)} and (p.id is null or c.id is null or pc.program_id is null)`,
      sql`select count(*)::int as count from crm.scholarships s left join crm.universities u on u.id=s.university_id left join crm.programs p on p.id=s.program_id left join crm.intakes i on i.id=s.intake_id where s.id in ${sql(ids.scholarship)} and (u.id is null or (s.program_id is not null and p.id is null) or (s.intake_id is not null and i.id is null))`,
      sql`select count(*)::int as count from (select university_id,lower(name) from crm.programs where id in ${sql(ids.program)} group by university_id,lower(name) having count(*)>1) duplicate`,
      sql`select count(*)::int as count from (select program_id,campus_id,start_date from crm.intakes where id in ${sql(ids.intake)} group by program_id,campus_id,start_date having count(*)>1) duplicate`,
      sql`select count(*)::int as count from (select university_id,lower(name) from crm.scholarships where id in ${sql(ids.scholarship)} group by university_id,lower(name) having count(*)>1) duplicate`,
    ]);
    const report = {
      runId: normalized.runId,
      verifiedAt: new Date().toISOString(),
      environment: "preview",
      counts: {
        faculty: faculties[0].count,
        program: programs[0].count,
        "program-campus": relations[0].count,
        intake: intakes[0].count,
        openIntake: openIntakes[0].count,
        exactIntake: exactIntakes[0].count,
        termIntake: termIntakes[0].count,
        scholarship: scholarships[0].count,
        internationallyEligibleScholarship: eligibleScholarships[0].count,
        unsafeActiveScholarship: unsafeActiveScholarships[0].count,
        universitiesCovered: coverage[0].count,
      },
      expectedCounts: {
        faculty: byType.faculty.length,
        program: byType.program.length,
        "program-campus": byType["program-campus"].length,
        intake: byType.intake.length,
        openIntake: byType.intake.filter(({ status }) => status === "open")
          .length,
        exactIntake: byType.intake.filter(
          ({ startDatePrecision }) => startDatePrecision === "exact",
        ).length,
        termIntake: byType.intake.filter(
          ({ startDatePrecision }) => startDatePrecision === "term",
        ).length,
        scholarship: byType.scholarship.length,
        internationallyEligibleScholarship: byType.scholarship.filter(
          ({ internationalEligibility }) =>
            internationalEligibility === "confirmed_eligible",
        ).length,
        unsafeActiveScholarship: 0,
        universitiesCovered: new Set(
          byType.program.map(
            ({ universityCanonicalId }) => universityCanonicalId,
          ),
        ).size,
      },
      brokenForeignKeys: broken[0].count + brokenScholarships[0].count,
      duplicateNaturalKeys:
        duplicatePrograms[0].count +
        duplicateIntakes[0].count +
        duplicateScholarships[0].count,
      publicationChecksum: publication.checksum,
      checksumVerified:
        publication.checksum === sha256(stableStringify(publication.actions)),
    };
    report.accepted =
      stableStringify(report.counts) ===
        stableStringify(report.expectedCounts) &&
      report.brokenForeignKeys === 0 &&
      report.duplicateNaturalKeys === 0 &&
      report.checksumVerified;
    await writeJson(
      path.join(
        ROOT,
        "validation",
        "reports",
        "us_official_catalog-2026-08-09-preview-verification.json",
      ),
      report,
    );
    return report;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

if (
  process.argv[1] &&
  import.meta.url ===
    new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href
)
  Promise.all([
    verifyPreview(),
    verifyOfficialCatalog(),
    verifyCanadaFoundation(),
  ])
    .then(([report, official, canada]) => {
      console.log(
        `PREVIEW_VERIFY accepted=${report.accepted} country=${report.counts.country} university=${report.counts.university} campus=${report.counts.campus} checksum=${report.checksumVerified}`,
      );
      console.log(
        `PHASE_E_VERIFY accepted=${official.accepted} universities=${official.counts.universitiesCovered} programs=${official.counts.program} openIntakes=${official.counts.openIntake} scholarships=${official.counts.scholarship} checksum=${official.checksumVerified}`,
      );
      console.log(
        `CANADA_VERIFY accepted=${canada.accepted} university=${canada.counts.university} campus=${canada.counts.campus} designated=${canada.designatedInstitutions} searchEligible=${canada.searchEligibleInstitutions} checksum=${canada.checksumVerified}`,
      );
      if (!report.accepted || !official.accepted || !canada.accepted)
        process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`ERROR ${error.message}`);
      process.exitCode = 1;
    });
