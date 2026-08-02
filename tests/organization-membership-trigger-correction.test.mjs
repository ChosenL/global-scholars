import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("organization membership trigger dispatches by exact row type", async () => {
  const migration = await source(
    "../supabase/migrations/20260830_fix_organization_membership_trigger_dispatch.sql",
  );

  assert.match(migration, /returns trigger/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = ''/i);
  assert.match(migration, /tg_table_schema \|\| '\.' \|\| tg_table_name/i);
  assert.match(migration, /target_relation = 'crm\.organization_advisors'/i);
  assert.match(migration, /target_relation = 'crm\.organization_students'/i);
  assert.match(migration, /new\.ends_at is null/i);
  assert.match(migration, /new\.status = 'active'/i);
  assert.match(
    migration,
    /revoke all on function crm\.validate_organization_membership\(\) from public/i,
  );
  assert.doesNotMatch(migration, /drop trigger|create trigger/i);

  const advisorBranch = migration.slice(
    migration.indexOf("target_relation = 'crm.organization_advisors'"),
    migration.indexOf("elsif target_relation = 'crm.organization_students'"),
  );
  const studentBranch = migration.slice(
    migration.indexOf("elsif target_relation = 'crm.organization_students'"),
    migration.indexOf("else\n    raise exception 'Unsupported"),
  );
  assert.doesNotMatch(advisorBranch, /new\.status/i);
  assert.doesNotMatch(studentBranch, /new\.ends_at/i);
});

test("organization membership regression is transactional and covers both rows", async () => {
  const regression = await source(
    "../supabase/tests/volume11_organization_membership_trigger_dispatch.sql",
  );

  assert.match(regression, /^begin;/i);
  assert.match(regression, /insert into crm\.organization_advisors/i);
  assert.match(regression, /Advisor expiry validation/i);
  assert.match(regression, /insert into crm\.organization_students/i);
  assert.match(regression, /Student status validation/i);
  assert.match(regression, /Organization membership profile role is invalid/i);
  assert.match(
    regression,
    /Organization memberships require an active organization/i,
  );
  assert.match(regression, /rollback;/i);
  assert.match(regression, /rollback left test rows behind/i);
});
