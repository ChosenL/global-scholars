import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(".");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("student workspace presents a read-only RLS-backed profile summary", () => {
  const component = read(
    "app/advisor-dashboard/components/StudentProfileSummary.tsx",
  );
  const workspace = read(
    "app/advisor-dashboard/components/StudentWorkspace.tsx",
  );
  assert.match(workspace, /StudentProfileSummary/);
  assert.match(component, /from\("student_profiles"\)/);
  assert.match(component, /createClerkSupabaseClient/);
  assert.doesNotMatch(component, /service.role|SUPABASE_SERVICE|adminClient/i);
  for (const field of [
    "Nationality",
    "Residence country",
    "Qualification",
    "GPA",
    "English test",
    "Preferences used for matching",
    "Missing profile information",
    "catalog mismatch",
  ]) {
    assert.match(component, new RegExp(field, "i"));
  }
});

test("student workspace avoids exposing an internal student identifier", () => {
  const header = read("app/advisor-dashboard/components/StudentHeader.tsx");
  assert.doesNotMatch(header, /Student ID/);
  assert.match(header, /advisor-workspace-library\.png/);
});

test("application handoff preserves an authorized workspace return context", () => {
  const matches = read(
    "app/advisor-dashboard/components/StudentMatchesCard.tsx",
  );
  const applicationPage = read("app/applications/page.tsx");
  const detailsPage = read("app/applications/[applicationId]/page.tsx");
  const dashboard = read("app/advisor-dashboard/page.tsx");
  assert.match(matches, /returnTo: "\/advisor-dashboard"/);
  assert.match(matches, /sessionStorage\.setItem/);
  assert.match(applicationPage, /startsWith\("\/advisor-dashboard"\)/);
  assert.match(detailsPage, /returnTo/);
  assert.match(dashboard, /sessionStorage\.getItem/);
  assert.doesNotMatch(matches, /advisor-dashboard\?studentProfileId/);
});

test("matching empty states distinguish missing profile data from catalog evidence", () => {
  const matches = read(
    "app/advisor-dashboard/components/StudentMatchesCard.tsx",
  );
  assert.match(
    matches,
    /No verified catalog matches are currently available for this student/,
  );
  assert.match(
    matches,
    /Missing profile information is separate from catalog evidence/,
  );
});
