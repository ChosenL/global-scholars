import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(".");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("matching route reuses authenticated application route boundary", () => {
  const route = read("app/api/matching/route.ts");
  assert.match(route, /handleApplicationRoute/);
  assert.match(route, /studentProfileId/);
  assert.match(route, /findStudentMatches/);
  assert.doesNotMatch(route, /service.role|SUPABASE_SERVICE|adminClient/i);
});

test("matching authorization relies on existing student RLS and shared access model", () => {
  const service = read("lib/matching/matchingService.ts");
  const authorization = read(
    "supabase/migrations/20260731_create_crm_shared_authorization.sql",
  );
  assert.match(service, /from\("student_profiles"\)/);
  assert.match(service, /\.eq\("profile_id", profileId\)/);
  assert.match(service, /not found or is not accessible/i);
  assert.match(authorization, /crm\.can_access_student\(profile_id\)/);
  assert.match(authorization, /crm\.is_current_admin\(\)/);
  assert.match(authorization, /shares_conversation_with\(student\.id\)/);
});

test("candidate generation is bounded, active-only, and search-eligible-only", () => {
  const service = read("lib/matching/matchingService.ts");
  assert.match(service, /\.eq\("is_active", true\)/);
  assert.match(service, /\.eq\("search_eligible", true\)/);
  assert.match(service, /\.limit\(1_000\)/);
  assert.match(service, /rankCandidates\(facts, candidates\)/);
});

test("advisor matching UI covers loading, results, insufficient evidence, and errors", () => {
  const component = read(
    "app/advisor-dashboard/components/StudentMatchesCard.tsx",
  );
  const workspace = read(
    "app/advisor-dashboard/components/StudentWorkspace.tsx",
  );
  for (const phrase of [
    "Find Matches",
    "Finding matches",
    "Strong alignment",
    "Potential match",
    "Limited evidence",
    "Known mismatch",
    "Additional verification is required",
    "Matching service unavailable",
    "Unknown / verify",
    "Known blockers",
    "Start Application",
  ])
    assert.match(component, new RegExp(phrase.replace("/", "\\/"), "i"));
  assert.match(workspace, /StudentMatchesCard/);
  assert.match(component, /pathname: "\/applications"/);
  assert.match(component, /studentProfileId/);
  assert.doesNotMatch(
    component,
    /guaranteed admission|acceptance probability|safe school|likely acceptance/i,
  );
});

test("database-backed matching authorization contract is installed", () => {
  const pgTap = read("supabase/tests/volume16_matching_authorization.sql");
  assert.match(pgTap, /set local role authenticated/i);
  assert.match(pgTap, /request\.jwt\.claims/i);
  assert.match(pgTap, /crm\.can_access_student/i);
  assert.match(pgTap, /inaccessible student existence is not disclosed/i);
  assert.match(pgTap, /direct table access cannot bypass/i);
});
