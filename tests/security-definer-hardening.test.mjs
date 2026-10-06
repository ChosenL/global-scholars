import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260820_harden_security_definer_privileges.sql",
  import.meta.url,
);

test("legacy SECURITY DEFINER functions deny anonymous execution", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const requiredFunctions = [
    "create_student_conversation",
    "is_conversation_participant",
    "update_conversation_after_message",
    "current_clerk_user_id",
    "set_updated_at",
  ];

  for (const functionName of requiredFunctions) {
    assert.match(
      sql,
      new RegExp(`alter function public\\.${functionName}`),
      `${functionName} must be explicitly hardened`,
    );
  }

  for (const signature of [
    "public.attach_assigned_advisors_to_conversation()",
    "public.current_platform_role()",
    "public.is_assigned_advisor(text)",
  ]) {
    assert.match(
      sql,
      new RegExp(
        `to_regprocedure\\('${signature.replace(/[()]/g, "\\$&")}'\\)`,
      ),
      `${signature} must be optional for clean installs`,
    );
  }

  assert.match(sql, /from public, anon/);
  assert.match(sql, /has_function_privilege\('anon'/);
});

test("hardening migration enforces empty search paths without changing bodies", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /procedure\.proconfig @> array\['search_path=""'\]/);
  assert.doesNotMatch(sql, /create or replace function/i);
  assert.doesNotMatch(sql, /drop function/i);
  assert.doesNotMatch(
    sql,
    /update public\.|delete from public\.|insert into public\./i,
  );
});

test("optional legacy functions are hardened when present and skipped when absent", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /if legacy_function is not null then/i);
  assert.match(
    sql,
    /execute format\(\s*'alter function %s set search_path = '''''/i,
  );
  assert.match(
    sql,
    /execute format\(\s*'revoke all on function %s from public, anon, authenticated'/i,
  );
  assert.match(
    sql,
    /execute format\(\s*'grant execute on function %s to authenticated'/i,
  );
  assert.doesNotMatch(
    sql,
    /alter function public\.(?:attach_assigned_advisors_to_conversation|current_platform_role|is_assigned_advisor)\b/i,
  );
});

test("security verification block remains intact", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /do \$verification\$/);
  assert.match(sql, /procedure\.prosecdef/);
  assert.match(sql, /namespace\.nspname in \('crm', 'public'\)/);
  assert.match(
    sql,
    /has_function_privilege\('anon', procedure\.oid, 'EXECUTE'\)/,
  );
  assert.match(sql, /procedure\.proconfig @> array\['search_path=""'\]/);
  assert.match(
    sql,
    /raise exception\s+'SECURITY DEFINER hardening verification failed for %\.'/,
  );
});
