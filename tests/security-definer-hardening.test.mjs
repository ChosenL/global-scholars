import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/20260820_harden_security_definer_privileges.sql",
  import.meta.url,
);

test("legacy SECURITY DEFINER functions deny anonymous execution", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const legacyFunctions = [
    "attach_assigned_advisors_to_conversation",
    "create_student_conversation",
    "current_platform_role",
    "is_assigned_advisor",
    "is_conversation_participant",
    "update_conversation_after_message",
  ];

  for (const functionName of legacyFunctions) {
    assert.match(
      sql,
      new RegExp(`alter function public\\.${functionName}`),
      `${functionName} must be explicitly hardened`,
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
  assert.doesNotMatch(sql, /update public\.|delete from public\.|insert into public\./i);
});
