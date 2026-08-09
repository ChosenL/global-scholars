export async function createPostgresCatalogRepository(connectionString) {
  if (!connectionString)
    throw new Error(
      "SUPABASE_DB_URL is required for a non-dry-run preview publication.",
    );
  const { default: postgres } = await import("postgres");
  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 5,
  });
  return {
    async transaction(callback, { dryRun = false } = {}) {
      let result;
      const rollback = Symbol("dry-run-rollback");
      try {
        await sql.begin(async (tx) => {
          result = await callback(catalog(tx));
          if (dryRun) throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      }
      return result;
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}

function catalog(sql) {
  return {
    async find(type, desired) {
      let rows;
      if (type === "country")
        rows =
          await sql`select id, iso_code, name, default_currency, is_active from crm.countries where iso_code = ${desired.iso_code} or lower(name) = lower(${desired.name}) order by (iso_code = ${desired.iso_code}) desc limit 1`;
      else if (type === "university")
        rows =
          await sql`select id, country_id, name, slug, institution_type, website_url, is_active from crm.universities where country_id = ${desired.country_id} and (slug = ${desired.slug} or lower(name) = lower(${desired.name})) order by (slug = ${desired.slug}) desc limit 1`;
      else
        rows =
          await sql`select id, university_id, name, city, region, is_primary, is_active from crm.campuses where university_id = ${desired.university_id} and lower(name) = lower(${desired.name}) limit 1`;
      return rows[0] ?? null;
    },
    async insert(type, row) {
      if (type === "country")
        await sql`insert into crm.countries ${sql(row, "id", "iso_code", "name", "default_currency", "is_active")}`;
      else if (type === "university")
        await sql`insert into crm.universities ${sql(row, "id", "country_id", "name", "slug", "institution_type", "website_url", "is_active")}`;
      else
        await sql`insert into crm.campuses ${sql(row, "id", "university_id", "name", "city", "region", "is_primary", "is_active")}`;
    },
    async update(type, id, values) {
      if (type === "country")
        await sql`update crm.countries set ${sql(values, "iso_code", "name", "default_currency", "is_active")} where id = ${id}`;
      else if (type === "university")
        await sql`update crm.universities set ${sql(values, "country_id", "name", "slug", "institution_type", "website_url", "is_active")} where id = ${id}`;
      else
        await sql`update crm.campuses set ${sql(values, "university_id", "name", "city", "region", "is_primary", "is_active")} where id = ${id}`;
    },
    async verify({ expected, actions, dryRun }) {
      if (dryRun) {
        const effective = actions.filter(
          ({ operation }) => operation !== "skipped",
        );
        return {
          rowCounts: Object.fromEntries(
            ["country", "university", "campus"].map((type) => [
              type,
              effective.filter((action) => action.entityType === type).length,
            ]),
          ),
          foreignKeyIntegrity: true,
          identityConsistency: effective.every(
            ({ catalogId }) => typeof catalogId === "string",
          ),
        };
      }
      const ids = actions
        .filter(({ operation }) => operation !== "skipped")
        .map(({ catalogId }) => catalogId);
      const [
        countries,
        universities,
        campuses,
        brokenUniversity,
        brokenCampus,
      ] = await Promise.all([
        sql`select count(*)::int as count from crm.countries where id = any(${ids})`,
        sql`select count(*)::int as count from crm.universities where id = any(${ids})`,
        sql`select count(*)::int as count from crm.campuses where id = any(${ids})`,
        sql`select count(*)::int as count from crm.universities u left join crm.countries c on c.id = u.country_id where u.id = any(${ids}) and c.id is null`,
        sql`select count(*)::int as count from crm.campuses ca left join crm.universities u on u.id = ca.university_id where ca.id = any(${ids}) and u.id is null`,
      ]);
      const rowCounts = {
        country: countries[0].count,
        university: universities[0].count,
        campus: campuses[0].count,
      };
      const expectedCounts = Object.fromEntries(
        ["country", "university", "campus"].map((type) => [
          type,
          expected.filter((record) => record.entityType === type).length,
        ]),
      );
      return {
        rowCounts,
        foreignKeyIntegrity:
          brokenUniversity[0].count === 0 && brokenCampus[0].count === 0,
        identityConsistency: Object.keys(expectedCounts).every(
          (type) => rowCounts[type] === expectedCounts[type],
        ),
      };
    },
  };
}
