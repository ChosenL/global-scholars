import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL("../supabase/migrations/20260818_create_crm_ai_assistant.sql", import.meta.url);
const contextPath = new URL("../features/ai/context/buildAuthorizedContext.ts", import.meta.url);
const routePath = new URL("../app/api/ai/route.ts", import.meta.url);

test("AI invocation storage is forced-RLS, RPC-only, and event driven", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /create table crm\.ai_invocations/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /security definer set search_path = ''/i);
  assert.match(sql, /crm\.can_access_student\(target_student_profile_id\)/i);
  assert.match(sql, /'ai\.requested'/i);
  assert.match(sql, /'ai\.' \|\| completion_status/i);
  assert.doesNotMatch(sql, /grant (insert|update|delete) on crm\.ai_invocations/i);
});

test("student AI context cannot load advisor notes or administrative timeline", async () => {
  const source = await readFile(contextPath, "utf8");
  const staffBoundary = source.indexOf('const isStaff = role === "advisor" || role === "admin"');
  const notesQuery = source.indexOf('.from("student_notes")');
  const timelineQuery = source.indexOf('.from("timeline_events")');
  assert.ok(staffBoundary > 0);
  assert.ok(notesQuery > staffBoundary);
  assert.ok(timelineQuery > staffBoundary);
  assert.doesNotMatch(source, /passport_number|storage_path|review_notes|date_of_birth|phone/);
});

test("AI gateway moderates, structures, validates, and audits responses", async () => {
  const source = await readFile(routePath, "utf8");
  assert.match(source, /omni-moderation-latest/g);
  assert.match(source, /type: "json_schema"/);
  assert.match(source, /parseAiAnswer\(response\.output_text, allowedCitations\)/);
  assert.match(source, /beginAiInvocation/);
  assert.match(source, /completeAiInvocation/);
  assert.match(source, /safety_identifier: safetyIdentifier/);
  assert.doesNotMatch(source, /OPENAI_SAFETY_SALT \|\|/);
  assert.match(source, /Cache-Control.*no-store/);
});
