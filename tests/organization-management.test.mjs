import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260823_create_crm_organizations.sql",
  import.meta.url,
);
const typesPath = new URL("../lib/supabase/types.ts", import.meta.url);
const architecturePath = new URL(
  "../docs/architecture/institution-management.md",
  import.meta.url,
);

test("organization persistence is separate from the university catalog", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /create table crm\.organizations/i);
  assert.match(migration, /create table crm\.organization_advisors/i);
  assert.match(migration, /create table crm\.organization_students/i);
  assert.doesNotMatch(
    migration,
    /alter table crm\.(universities|campuses|faculties|programs|intakes|scholarships)/i,
  );
  assert.doesNotMatch(migration, /catalog_university_id|university_id/i);
});

test("organization relationships use CRM UUID identity and preserve history", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(
    migration,
    /advisor_profile_id uuid not null[\s\S]*references crm\.profiles\(id\) on delete restrict/i,
  );
  assert.match(
    migration,
    /student_profile_id uuid not null[\s\S]*references crm\.profiles\(id\) on delete restrict/i,
  );
  assert.match(migration, /organization_advisors_active_unique/i);
  assert.match(migration, /organization_students_active_unique/i);
  assert.match(migration, /organization_students_primary_unique/i);
  assert.match(migration, /prevent_organization_record_delete/i);
  assert.doesNotMatch(migration, /clerk_user_id|auth\.uid\(\)/i);
});

test("organization tables enforce least-privilege RLS", async () => {
  const migration = await readFile(migrationPath, "utf8");

  for (const table of [
    "organizations",
    "organization_advisors",
    "organization_students",
  ]) {
    assert.match(
      migration,
      new RegExp(`alter table crm\\.${table} force row level security`, "i"),
    );
  }

  assert.match(migration, /crm\.is_organization_advisor\(organization_id\)/i);
  assert.match(migration, /student_profile_id = crm\.current_profile_id\(\)/i);
  assert.match(
    migration,
    /grant select, insert, update[\s\S]*to service_role/i,
  );
  assert.doesNotMatch(
    migration,
    /grant (insert|update|delete)[\s\S]*to authenticated/i,
  );
});

test("organization changes feed the immutable audit pipeline", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /crm\.emit_domain_event/i);
  assert.match(migration, /organizations_emit_domain_event/i);
  assert.match(migration, /organization_advisors_emit_domain_event/i);
  assert.match(migration, /organization_students_emit_domain_event/i);
  assert.match(
    migration,
    /'organization', 'organization_advisor', 'organization_student'/i,
  );
});

test("generated database types and design use organization terminology", async () => {
  const [types, architecture] = await Promise.all([
    readFile(typesPath, "utf8"),
    readFile(architecturePath, "utf8"),
  ]);

  for (const table of [
    "organizations",
    "organization_advisors",
    "organization_students",
  ]) {
    assert.match(types, new RegExp(`${table}: \\{`));
  }

  assert.match(architecture, /`crm\.organizations`/);
  assert.match(architecture, /`crm\.universities` remains/i);
});
