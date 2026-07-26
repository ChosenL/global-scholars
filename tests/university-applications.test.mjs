import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readMigration = (name) =>
  readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");

const catalog = readMigration("20260812_create_crm_admissions_catalog.sql");
const applications = readMigration("20260813_create_crm_student_applications.sql");
const integrations = readMigration("20260814_integrate_crm_applications.sql");

test("admissions catalog is normalized across institution hierarchy", () => {
  for (const table of [
    "countries", "universities", "campuses", "faculties",
    "programs", "program_campuses", "intakes", "scholarships",
  ]) {
    assert.match(catalog, new RegExp(`create table crm\\.${table}`, "i"));
  }
  assert.match(catalog, /validate_admissions_catalog_relationships/i);
});

test("students can hold multiple concurrent applications", () => {
  assert.match(applications, /unique \(student_profile_id, intake_id\)/i);
  assert.doesNotMatch(
    applications,
    /unique \(student_profile_id\)(?!,)/i,
  );
});

test("application histories are immutable and transitions are controlled", () => {
  assert.match(applications, /application_transition_allowed/i);
  assert.match(applications, /application_status_history_immutable/i);
  assert.match(applications, /application_decisions_immutable/i);
});

test("all application mutations are secure event-emitting RPCs", () => {
  for (const rpc of [
    "create_student_application",
    "update_application_status",
    "submit_student_application",
    "record_application_decision",
    "record_application_deposit",
    "archive_student_application",
  ]) {
    assert.match(applications, new RegExp(`function crm\\.${rpc}`, "i"));
  }
  assert.match(applications, /security definer/g);
  assert.match(applications, /crm\.emit_domain_event/g);
});

test("applications integrate with requirements and readiness", () => {
  assert.match(applications, /application_document_requirements/i);
  assert.match(applications, /get_effective_document_requirements/i);
  assert.match(applications, /calculate_student_readiness/i);
  assert.match(integrations, /application_score/i);
});

test("applications integrate with notifications and global search", () => {
  assert.match(integrations, /create_application_notification/i);
  assert.match(integrations, /domain_events_create_application_notification/i);
  assert.match(integrations, /can_access_application/i);
  assert.match(integrations, /'application'::text/i);
});

test("application tables force RLS and use shared authorization", () => {
  assert.match(applications, /can_access_application/i);
  assert.match(applications, /can_manage_application/i);
  assert.match(applications, /force row level security/g);
  assert.doesNotMatch(applications, /clerk_user_id|auth\.uid\(\)/i);
});
