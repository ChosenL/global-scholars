import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("staging plan orders every Phase 2 migration with rollback checkpoints", async () => {
  const plan = await source("../docs/operations/staging-deployment-plan.md");
  for (const migration of ["20260820", "20260821", "20260822"]) {
    assert.match(plan, new RegExp(migration));
  }
  for (const checkpoint of ["CP0", "CP2", "CP3", "CP4", "CP8"]) {
    assert.match(plan, new RegExp(checkpoint));
  }
  assert.match(plan, /AI_OPERATIONS_ENABLED=false/);
  assert.match(plan, /Never edit migration history/i);
});

test("staging smoke checklist covers every required platform surface", async () => {
  const smoke = await source("../docs/operations/staging-smoke-test-checklist.md");
  for (const heading of [
    "Authentication",
    "Authorization",
    "Student dashboard",
    "Advisor dashboard",
    "Applications",
    "Visa workflows",
    "AI Assistant",
    "Timeline",
    "Notifications",
    "`/api/health`",
    "`/api/ready`",
  ]) {
    assert.match(smoke, new RegExp(`## ${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`));
  }
  assert.match(smoke, /exactly once/);
  assert.match(smoke, /cross-user/);
});

test("production promotion is binary and missing evidence fails", async () => {
  const promotion = await source(
    "../docs/operations/production-promotion-criteria.md",
  );
  assert.match(promotion, /PARTIAL, BLOCKED, NOT VERIFIED, skipped, expired, or\s+missing evidence is FAIL/);
  assert.match(promotion, /Promotion is binary/);
  assert.match(promotion, /GO:.*every mandatory gate PASS/s);
  assert.match(promotion, /NO-GO:.*every other state/s);
});

test("certification report distinguishes parse readiness from environment application", async () => {
  const report = await source(
    "../docs/architecture/phase-3-sprint-9-1-staging-certification-report.md",
  );
  assert.match(report, /PostgreSQL parse \| Preview apply \| Staging apply/);
  assert.match(report, /PASS, rollback-only linked query/g);
  assert.match(report, /NO-GO for Staging/);
  assert.match(report, /No transaction retained changes/);
});
