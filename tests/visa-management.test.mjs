import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = (name) =>
  readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");

const schema = migration("20260815_create_crm_visa_management.sql");
const workflows = migration("20260816_create_crm_visa_workflows.sql");
const integrations = migration("20260817_integrate_crm_visa_platform.sql");

test("visa domain contains every required normalized entity", () => {
  for (const table of [
    "visa_cases", "visa_documents", "visa_checklists", "visa_interviews",
    "visa_decisions", "passports", "travel_plans", "embassies",
  ]) {
    assert.match(schema, new RegExp(`create table crm\\.${table}`, "i"));
  }
});

test("multiple concurrent visa cases are supported", () => {
  assert.doesNotMatch(schema, /unique\s*\(student_profile_id\)/i);
  assert.match(schema, /visa_cases_student_idx/i);
});

test("visa histories are immutable and transitions are controlled", () => {
  assert.match(schema, /visa_stage_history_immutable/i);
  assert.match(schema, /visa_decisions_immutable/i);
  assert.match(workflows, /visa_transition_allowed/i);
});

test("primary visa services use secure RPCs and emit events", () => {
  for (const rpc of [
    "create_visa_case", "update_visa_stage", "schedule_visa_interview",
    "record_visa_decision", "upload_visa_document",
    "calculate_visa_readiness", "close_visa_case",
  ]) {
    assert.match(workflows, new RegExp(`function crm\\.${rpc}`, "i"));
  }
  assert.match(workflows, /security definer/g);
  assert.match(workflows, /crm\.emit_domain_event/g);
});

test("visa document flow reaches readiness and platform consumers", () => {
  assert.match(workflows, /'visa\.document_uploaded'/i);
  assert.match(workflows, /calculate_visa_readiness/i);
  assert.match(workflows, /calculate_student_readiness/i);
  assert.match(integrations, /create_visa_notification/i);
  assert.match(integrations, /calculate_visa_analytics/i);
});

test("visa access uses shared authorization and forced RLS", () => {
  assert.match(schema, /can_access_visa_case/i);
  assert.match(schema, /can_manage_visa_case/i);
  assert.match(schema, /force row level security/g);
  assert.doesNotMatch(schema + workflows + integrations, /clerk_user_id|auth\.uid\(\)/i);
});

test("deadline reminders are event-driven and idempotently marked", () => {
  assert.match(workflows, /emit_due_visa_reminders/i);
  assert.match(workflows, /reminder_sent_at is null/i);
  assert.match(workflows, /'visa\.checklist_due'/i);
});
