import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = (name) =>
  readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");

const workflow = migration("20260807_create_crm_workflow_engine.sql");
const audit = migration("20260808_create_crm_audit_log.sql");
const search = migration("20260809_create_crm_global_search.sql");
const analytics = migration("20260810_create_crm_analytics_engine.sql");
const hardening = migration("20260811_harden_crm_event_coverage.sql");

test("enterprise tables force RLS and expose secure RPCs", () => {
  for (const sql of [workflow, audit, analytics]) {
    assert.match(sql, /force row level security/i);
    assert.match(sql, /security definer/i);
    assert.match(sql, /set search_path = ''/i);
  }
  assert.match(search, /security definer/i);
  assert.match(search, /set search_path = ''/i);
});

test("audit log is immutable and administrator-only", () => {
  assert.match(audit, /before update or delete on crm\.audit_log/i);
  assert.match(audit, /using \(crm\.is_current_admin\(\)\)/i);
  assert.doesNotMatch(audit, /grant (insert|update|delete)/i);
});

test("global search enforces resource authorization", () => {
  for (const helper of [
    "can_access_student",
    "can_access_document",
    "can_access_task",
    "can_access_note",
  ]) {
    assert.ok(search.includes(`crm.${helper}(`));
  }
});

test("analytics reads domain events rather than transactional modules", () => {
  assert.match(analytics, /from crm\.domain_events/i);
  assert.doesNotMatch(
    analytics,
    /from crm\.(student_documents|student_tasks|student_readiness)/i,
  );
});

test("workflow actions are configuration-driven and event-enqueued", () => {
  assert.match(workflow, /jsonb_array_elements\(definition\.actions\)/i);
  assert.match(workflow, /after insert on crm\.domain_events/i);
  assert.match(workflow, /recalculate_readiness/i);
  assert.match(workflow, /assign_task/i);
  assert.match(workflow, /create_notification/i);
  assert.match(workflow, /schedule_work/i);
});

test("enterprise migrations contain no Clerk relationship identifiers", () => {
  for (const sql of [workflow, audit, search, analytics]) {
    assert.doesNotMatch(sql, /clerk_user_id|auth\.uid\(\)/i);
  }
});

test("profile business mutations emit domain events without copied identity", () => {
  assert.match(hardening, /profiles_emit_domain_event/i);
  assert.match(hardening, /student_profiles_emit_domain_event/i);
  assert.match(hardening, /crm\.emit_domain_event/i);
  assert.match(hardening, /- 'clerk_user_id' - 'email'/i);
});
