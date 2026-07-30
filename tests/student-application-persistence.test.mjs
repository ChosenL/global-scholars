import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260825_extend_crm_student_applications.sql",
  import.meta.url,
);
const typesPath = new URL("../lib/supabase/types.ts", import.meta.url);

test("application persistence extends the existing aggregate additively", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /alter table crm\.student_applications/i);
  assert.doesNotMatch(migration, /create table crm\.applications/i);
  assert.doesNotMatch(
    migration,
    /create table crm\.(application_status_history|application_notes|application_tasks)/i,
  );
  assert.doesNotMatch(migration, /(drop|rename|truncate)\s+(table\s+)?crm\./i);
});

test("application additions use existing CRM relationships and normalized domains", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(
    migration,
    /organization_id uuid[\s\S]*references crm\.organizations\(id\) on delete restrict/i,
  );
  assert.match(migration, /tuition_amount numeric\(14,2\)/i);
  assert.match(migration, /tuition_currency ~ '\^\[A-Z\]\{3\}\$'/i);
  assert.match(migration, /student_applications_organization_idx/i);
  assert.doesNotMatch(
    migration,
    /alter table crm\.(universities|organization_advisors|organization_students)/i,
  );
});

test("existing student tasks gain an optional application association", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(
    migration,
    /alter table crm\.student_tasks[\s\S]*add column application_id uuid/i,
  );
  assert.match(
    migration,
    /references crm\.student_applications\(id\) on delete restrict/i,
  );
  assert.match(migration, /student_tasks_application_idx/i);
});

test("database types expose the additive application persistence fields", async () => {
  const types = await readFile(typesPath, "utf8");

  assert.match(
    types,
    /student_tasks: \{[\s\S]*?Row: \{[\s\S]*?application_id: string \| null;/,
  );
  assert.match(
    types,
    /student_applications: \{[\s\S]*?Row: \{[\s\S]*?organization_id: string \| null;/,
  );
  assert.match(
    types,
    /student_applications: \{[\s\S]*?tuition_amount: number \| null;/,
  );
  assert.match(
    types,
    /student_applications: \{[\s\S]*?tuition_currency: string \| null;/,
  );
  assert.match(
    types,
    /student_applications: \{[\s\S]*?tuition_source: string \| null;/,
  );
});
