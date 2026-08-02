import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("catalog trigger correction dispatches safely without typed NEW field access", async () => {
  const migration = await source(
    "../supabase/migrations/20260829_fix_admissions_catalog_trigger_context.sql",
  );

  assert.match(
    migration,
    /create or replace function crm\.validate_admissions_catalog_relationships\(\)/i,
  );
  assert.match(migration, /returns trigger/i);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(migration, /pg_catalog\.to_jsonb\(new\)/i);
  assert.match(migration, /case tg_table_schema \|\| '\.' \|\| tg_table_name/i);

  for (const table of ["programs", "program_campuses", "scholarships"]) {
    assert.match(migration, new RegExp(`when 'crm\\.${table}'`, "i"));
  }

  for (const relationship of [
    "crm.faculties",
    "crm.programs",
    "crm.campuses",
    "crm.intakes",
  ]) {
    assert.match(migration, new RegExp(relationship.replace(".", "\\."), "i"));
  }

  assert.doesNotMatch(
    migration,
    /\bnew\.(?:faculty_id|university_id|program_id|campus_id|intake_id)\b/i,
  );
  assert.doesNotMatch(migration, /drop trigger|create trigger|alter table/i);
  assert.match(
    migration,
    /revoke all on function crm\.validate_admissions_catalog_relationships\(\) from public/i,
  );
});

test("catalog database regression covers valid and invalid insert and update paths", async () => {
  const regression = await source(
    "../supabase/tests/volume10_admissions_catalog_trigger_correction.sql",
  );

  for (const phrase of [
    "Valid program insert does not dereference campus_id",
    "Valid program update does not dereference campus_id",
    "Valid program-campus insert succeeds",
    "Valid program-campus update succeeds",
    "Program-campus insert rejects a campus from another university",
    "Program-campus update rejects a campus from another university",
    "Valid intake program-campus relationship succeeds",
    "Valid intake update succeeds",
    "Intake insert rejects an incompatible program-campus pair",
    "Intake update rejects an incompatible program-campus pair",
    "Valid scholarship scope succeeds",
    "Scholarship update rejects an inconsistent catalog scope",
  ]) {
    assert.match(regression, new RegExp(phrase, "i"));
  }

  assert.match(regression, /^begin;/i);
  assert.match(regression, /rollback;/i);
  assert.match(regression, /Catalog rollback left country rows behind/i);
  assert.match(regression, /Catalog rollback left scholarship rows behind/i);
});

test("Preview fixture retains the complete ordered catalog provisioning chain", async () => {
  const fixture = await source("../supabase/fixtures/preview_e2e.sql");
  const stages = [
    "insert into crm.profiles",
    "insert into crm.student_profiles",
    "insert into crm.countries",
    "insert into crm.universities",
    "insert into crm.campuses",
    "insert into crm.programs",
    "insert into crm.program_campuses",
    "insert into crm.intakes",
  ];

  let previous = -1;
  for (const stage of stages) {
    const position = fixture.indexOf(stage);
    assert.ok(
      position > previous,
      `${stage} must follow the preceding fixture stage`,
    );
    previous = position;
  }

  assert.match(fixture, /^begin;/im);
  assert.match(fixture, /commit;\s*$/i);
});
