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
  const publication = await readJson(
    path.join(ROOT, "validation", "reports", "us_ipeds-2024-publication.json"),
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
    ] = await Promise.all([
      sql`select count(*)::int as count from crm.countries where id in ${sql(ids)}`,
      sql`select count(*)::int as count from crm.universities where id in ${sql(ids)}`,
      sql`select count(*)::int as count from crm.campuses where id in ${sql(ids)}`,
      sql`select count(*)::int as count from crm.universities u left join crm.countries c on c.id = u.country_id where u.id in ${sql(ids)} and c.id is null`,
      sql`select count(*)::int as count from crm.campuses ca left join crm.universities u on u.id = ca.university_id where ca.id in ${sql(ids)} and u.id is null`,
      sql`select count(*)::int as count from (select id,is_active from crm.countries union all select id,is_active from crm.universities union all select id,is_active from crm.campuses) entity where id in ${sql(ids)} and not is_active`,
      sql`select count(*)::int as count from (select country_id,slug from crm.universities group by country_id,slug having count(*) > 1) duplicate`,
      sql`select count(*)::int as count from (select university_id,name from crm.campuses group by university_id,name having count(*) > 1) duplicate`,
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
      expectedCounts: { country: 1, university: 50, campus: 50 },
      identityCount: ids.length,
      brokenForeignKeys: brokenUniversities[0].count + brokenCampuses[0].count,
      inactivePilotRows: inactive[0].count,
      duplicateNaturalKeys:
        duplicateUniversities[0].count + duplicateCampuses[0].count,
      publicationChecksum: publication.checksum,
      checksumVerified:
        publication.checksum === sha256(stableStringify(publication.actions)),
    };
    report.accepted =
      stableStringify(report.counts) ===
        stableStringify(report.expectedCounts) &&
      report.identityCount === 101 &&
      report.brokenForeignKeys === 0 &&
      report.inactivePilotRows === 0 &&
      report.duplicateNaturalKeys === 0 &&
      report.checksumVerified;
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

if (
  process.argv[1] &&
  import.meta.url ===
    new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href
)
  verifyPreview()
    .then((report) => {
      console.log(
        `PREVIEW_VERIFY accepted=${report.accepted} country=${report.counts.country} university=${report.counts.university} campus=${report.counts.campus} checksum=${report.checksumVerified}`,
      );
      if (!report.accepted) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`ERROR ${error.message}`);
      process.exitCode = 1;
    });
