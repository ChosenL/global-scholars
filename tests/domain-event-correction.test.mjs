import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Preview profile fixture types every deleted_at union value", async () => {
  const fixture = await source("../supabase/fixtures/preview_e2e.sql");
  const profileInsert = fixture.slice(
    fixture.indexOf("insert into crm.profiles"),
    fixture.indexOf("insert into crm.student_profiles"),
  );

  assert.equal((profileInsert.match(/null::timestamptz/gi) ?? []).length, 4);
  assert.match(profileInsert, /on conflict \(id\) do update/i);
});

test("Preview student-profile fixture types both deleted_at union values", async () => {
  const fixture = await source("../supabase/fixtures/preview_e2e.sql");
  const studentProfileInsert = fixture.slice(
    fixture.indexOf("insert into crm.student_profiles"),
    fixture.indexOf("insert into crm.countries"),
  );

  assert.equal(
    (studentProfileInsert.match(/null::timestamptz/gi) ?? []).length,
    2,
  );
  assert.doesNotMatch(
    studentProfileInsert,
    /select\s+(?:organization_student_id|application_student_id),\s*null\s+from/i,
  );
  assert.match(studentProfileInsert, /on conflict \(profile_id\) do update/i);
});

test("emit_domain_event correction preserves its contract without trigger context", async () => {
  const migration = await source(
    "../supabase/migrations/20260828_fix_emit_domain_event.sql",
  );

  assert.match(
    migration,
    /create or replace function crm\.emit_domain_event\(\s*new_event_type text,\s*new_aggregate_type text,\s*new_aggregate_id uuid,\s*target_student_profile_id uuid default null,\s*new_payload jsonb default '\{\}'::jsonb,\s*new_correlation_id uuid default null,\s*new_causation_id uuid default null\s*\)/is,
  );
  assert.match(migration, /returns crm\.domain_events/i);
  assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
  assert.match(migration, /insert into crm\.domain_events/i);
  assert.match(migration, /coalesce\(new_payload, '\{\}'::jsonb\)/i);
  assert.match(
    migration,
    /coalesce\(new_correlation_id, gen_random_uuid\(\)\)/i,
  );
  assert.doesNotMatch(migration, /\bnew\./i);
});

test("database regression covers domain event counts and immutable audit", async () => {
  const regression = await source(
    "../supabase/tests/volume9_domain_event_correction.sql",
  );

  assert.match(
    regression,
    /emit_domain_event executes outside trigger context/i,
  );
  assert.match(regression, /Profile creation emits exactly one domain event/i);
  assert.match(
    regression,
    /Student-profile creation emits exactly one domain event/i,
  );
  assert.match(regression, /Audit log records are immutable\./i);
  assert.match(regression, /rollback;/i);
  assert.match(regression, /Fixture rollback left profile rows behind/i);
  assert.match(
    regression,
    /Fixture rollback left student-profile rows behind/i,
  );
  assert.match(regression, /Fixture rollback left domain-event rows behind/i);
});
