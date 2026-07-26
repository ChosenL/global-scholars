import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("health response exposes status but never secret values", async () => {
  const health = await source("../app/api/health/route.ts");
  const environment = await source("../lib/deployment/environment.ts");
  assert.match(health, /Cache-Control.*no-store/);
  assert.match(health, /coreEnvironment/);
  assert.doesNotMatch(health, /process\.env/);
  assert.doesNotMatch(environment, /value:\s*process\.env/);
});

test("protected dashboard routes are enforced at the middleware boundary", async () => {
  const middleware = await source("../proxy.ts");
  assert.match(middleware, /await auth\.protect\(\)/);
  assert.match(middleware, /SCHOLAR_DASHBOARD/);
  assert.match(middleware, /ADVISOR_DASHBOARD/);
  assert.match(middleware, /role === "student"/);
  assert.match(middleware, /role === "advisor" \|\| role === "admin"/);
});

test("student and advisor surfaces render connected platform journeys", async () => {
  const scholar = await source("../app/scholar-dashboard/page.tsx");
  const advisor = await source("../app/advisor-dashboard/components/StudentWorkspace.tsx");
  const journey = await source("../app/shared/PlatformJourneyPanel.tsx");
  assert.match(scholar, /PlatformJourneyPanel/);
  assert.match(advisor, /PlatformJourneyPanel/);
  assert.match(journey, /fetchStudentApplications/);
  assert.match(journey, /fetchStudentVisaCases/);
  assert.match(journey, /\.from\("timeline_events"\)/);
  assert.match(journey, /fetch\("\/api\/ai"/);
  assert.match(journey, /No applications have been created yet/);
  assert.match(journey, /Journey data could not be loaded/);
});

test("release migration keeps restricted timeline events away from students", async () => {
  const sql = await source("../supabase/migrations/20260819_harden_release_integration.sql");
  assert.match(sql, /student_profile_id = crm\.current_profile_id\(\)/);
  assert.match(sql, /subject_type not in \('note', 'ai_invocation'\)/);
  assert.match(sql, /event_type not like 'note\.%'/);
  assert.match(sql, /event_type not like 'ai\.%'/);
});

test("CI runs the mandatory static release gates", async () => {
  const workflow = await source("../.github/workflows/release-gates.yml");
  for (const command of ["npm ci", "npx tsc --noEmit", "npm run lint", "npm test", "npm run build", "git diff --check"]) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
