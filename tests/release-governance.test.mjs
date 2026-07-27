import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("production certification requires evidence and cross-functional approval", async () => {
  const release = await source("../docs/operations/production-release-checklist.md");
  const decision = await source("../docs/operations/go-no-go-approval-checklist.md");
  const signoff = await source("../docs/operations/production-sign-off.md");
  for (const document of [release, decision, signoff]) {
    assert.match(document, /NO-GO/);
    assert.match(document, /Engineering/i);
    assert.match(document, /Operations/i);
    assert.match(document, /Security/i);
  }
  assert.match(decision, /Automatic NO-GO conditions/);
  assert.match(signoff, /A template is not approval/);
});

test("every Phase 2 operational migration has a safe recovery procedure", async () => {
  const rollback = await source("../docs/operations/phase-2-migration-rollback.md");
  for (const migration of ["20260820", "20260821", "20260822"]) {
    assert.match(rollback, new RegExp(migration));
  }
  assert.match(rollback, /forward corrective migration/i);
  assert.match(rollback, /Never.*PUBLIC.*anon/is);
  assert.match(rollback, /Do not cascade/i);
});

test("incident governance defines SEV-1 through SEV-4 and ownership", async () => {
  const severity = await source(
    "../docs/operations/incident-severity-classification.md",
  );
  const ownership = await source(
    "../docs/operations/operational-ownership-matrix.md",
  );
  for (const level of ["SEV-1", "SEV-2", "SEV-3", "SEV-4"]) {
    assert.match(severity, new RegExp(level));
  }
  assert.match(ownership, /RACI/);
  assert.match(ownership, /Security has stop\s+authority/);
});

test("post-deployment verification preserves architecture and rollback controls", async () => {
  const verification = await source(
    "../docs/operations/post-deployment-verification.md",
  );
  const certification = await source(
    "../docs/architecture/phase-2-certification-report.md",
  );
  assert.match(verification, /CRM profile/);
  assert.match(verification, /exactly one domain event/);
  assert.match(verification, /Rollback thresholds/);
  assert.match(certification, /Repository readiness \| PASS/);
  assert.match(certification, /Staging readiness \| FAIL/);
  assert.match(certification, /Production readiness \| FAIL/);
});
