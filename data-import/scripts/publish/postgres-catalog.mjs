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
    async find(type, desired, deterministicId) {
      let rows;
      if (type === "country")
        rows =
          await sql`select id, iso_code, name, default_currency, is_active from crm.countries where iso_code = ${desired.iso_code} or lower(name) = lower(${desired.name}) order by (iso_code = ${desired.iso_code}) desc limit 1`;
      else if (type === "university")
        rows =
          await sql`select id, country_id, name, slug, institution_type, website_url, is_active from crm.universities where country_id = ${desired.country_id} and (slug = ${desired.slug} or lower(name) = lower(${desired.name})) order by (slug = ${desired.slug}) desc limit 1`;
      else if (type === "campus")
        rows =
          await sql`select id, university_id, name, city, region, is_primary, is_active from crm.campuses where university_id = ${desired.university_id} and lower(name) = lower(${desired.name}) limit 1`;
      else if (type === "faculty")
        rows =
          await sql`select id, university_id, name, is_active from crm.faculties where id=${deterministicId} or (university_id=${desired.university_id} and lower(name)=lower(${desired.name})) order by (id=${deterministicId}) desc limit 1`;
      else if (type === "program")
        rows =
          await sql`select id, university_id, faculty_id, name, program_code, credential_level, duration_months, description, is_active from crm.programs where id=${deterministicId} or (university_id=${desired.university_id} and lower(name)=lower(${desired.name})) order by (id=${deterministicId}) desc limit 1`;
      else if (type === "program-campus")
        rows =
          await sql`select program_id, campus_id from crm.program_campuses where program_id=${desired.program_id} and campus_id=${desired.campus_id} limit 1`;
      else
        rows =
          await sql`select id, program_id, campus_id, name, start_date::text, start_date_precision, application_deadline::text, international_deadline::text, capacity, status from crm.intakes where id=${deterministicId} or (program_id=${desired.program_id} and campus_id=${desired.campus_id} and ((start_date_precision='exact' and start_date=${desired.start_date}) or (start_date_precision='term' and lower(name)=lower(${desired.name})))) order by (id=${deterministicId}) desc limit 1`;
      return rows[0] ?? null;
    },
    async insert(type, row) {
      if (type === "country")
        await sql`insert into crm.countries ${sql(row, "id", "iso_code", "name", "default_currency", "is_active")}`;
      else if (type === "university")
        await sql`insert into crm.universities ${sql(row, "id", "country_id", "name", "slug", "institution_type", "website_url", "is_active")}`;
      else if (type === "campus")
        await sql`insert into crm.campuses ${sql(row, "id", "university_id", "name", "city", "region", "is_primary", "is_active")}`;
      else if (type === "faculty")
        await sql`insert into crm.faculties ${sql(row, "id", "university_id", "name", "is_active")}`;
      else if (type === "program")
        await sql`insert into crm.programs ${sql(row, "id", "university_id", "faculty_id", "name", "program_code", "credential_level", "duration_months", "description", "is_active")}`;
      else if (type === "program-campus")
        await sql`insert into crm.program_campuses ${sql(row, "program_id", "campus_id")}`;
      else
        await sql`insert into crm.intakes ${sql(row, "id", "program_id", "campus_id", "name", "start_date", "start_date_precision", "application_deadline", "international_deadline", "capacity", "status")}`;
    },
    async update(type, id, values) {
      if (type === "country")
        await sql`update crm.countries set ${sql(values, "iso_code", "name", "default_currency", "is_active")} where id = ${id}`;
      else if (type === "university")
        await sql`update crm.universities set ${sql(values, "country_id", "name", "slug", "institution_type", "website_url", "is_active")} where id = ${id}`;
      else if (type === "campus")
        await sql`update crm.campuses set ${sql(values, "university_id", "name", "city", "region", "is_primary", "is_active")} where id = ${id}`;
      else if (type === "faculty")
        await sql`update crm.faculties set ${sql(values, "university_id", "name", "is_active")} where id=${id}`;
      else if (type === "program")
        await sql`update crm.programs set ${sql(values, "university_id", "faculty_id", "name", "program_code", "credential_level", "duration_months", "description", "is_active")} where id=${id}`;
      else if (type === "intake")
        await sql`update crm.intakes set ${sql(values, "program_id", "campus_id", "name", "start_date", "start_date_precision", "application_deadline", "international_deadline", "capacity", "status")} where id=${id}`;
    },
    async verify({ expected, actions, dryRun }) {
      if (dryRun) {
        const effective = actions.filter(
          ({ operation }) => operation !== "skipped",
        );
        return {
          rowCounts: Object.fromEntries(
            [
              "country",
              "university",
              "campus",
              "faculty",
              "program",
              "program-campus",
              "intake",
            ].map((type) => [
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
        faculties,
        programs,
        relations,
        intakes,
        brokenUniversity,
        brokenCampus,
        brokenFaculty,
        brokenProgram,
        brokenRelation,
        brokenIntake,
      ] = await Promise.all([
        sql`select count(*)::int as count from crm.countries where id = any(${ids})`,
        sql`select count(*)::int as count from crm.universities where id = any(${ids})`,
        sql`select count(*)::int as count from crm.campuses where id = any(${ids})`,
        sql`select count(*)::int as count from crm.faculties where id = any(${ids})`,
        sql`select count(*)::int as count from crm.programs where id = any(${ids})`,
        sql`select count(*)::int as count from crm.program_campuses where program_id = any(${ids})`,
        sql`select count(*)::int as count from crm.intakes where id = any(${ids})`,
        sql`select count(*)::int as count from crm.universities u left join crm.countries c on c.id = u.country_id where u.id = any(${ids}) and c.id is null`,
        sql`select count(*)::int as count from crm.campuses ca left join crm.universities u on u.id = ca.university_id where ca.id = any(${ids}) and u.id is null`,
        sql`select count(*)::int as count from crm.faculties f left join crm.universities u on u.id=f.university_id where f.id=any(${ids}) and u.id is null`,
        sql`select count(*)::int as count from crm.programs p left join crm.universities u on u.id=p.university_id left join crm.faculties f on f.id=p.faculty_id where p.id=any(${ids}) and (u.id is null or (p.faculty_id is not null and f.id is null))`,
        sql`select count(*)::int as count from crm.program_campuses pc left join crm.programs p on p.id=pc.program_id left join crm.campuses c on c.id=pc.campus_id where pc.program_id=any(${ids}) and (p.id is null or c.id is null)`,
        sql`select count(*)::int as count from crm.intakes i left join crm.program_campuses pc on pc.program_id=i.program_id and pc.campus_id=i.campus_id where i.id=any(${ids}) and pc.program_id is null`,
      ]);
      const rowCounts = {
        country: countries[0].count,
        university: universities[0].count,
        campus: campuses[0].count,
        faculty: faculties[0].count,
        program: programs[0].count,
        "program-campus": relations[0].count,
        intake: intakes[0].count,
      };
      const expectedCounts = Object.fromEntries(
        [
          "country",
          "university",
          "campus",
          "faculty",
          "program",
          "program-campus",
          "intake",
        ].map((type) => [
          type,
          expected.filter((record) => record.entityType === type).length,
        ]),
      );
      return {
        rowCounts,
        foreignKeyIntegrity: [
          brokenUniversity,
          brokenCampus,
          brokenFaculty,
          brokenProgram,
          brokenRelation,
          brokenIntake,
        ].every((rows) => rows[0].count === 0),
        identityConsistency: Object.keys(expectedCounts).every(
          (type) => rowCounts[type] === expectedCounts[type],
        ),
      };
    },
  };
}
