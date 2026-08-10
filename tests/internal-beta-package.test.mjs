import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("operator runbook explains evidence and safe beta operation", () => {
  const runbook = read("docs/operations/internal-beta-operator-runbook.md");
  for (const phrase of [
    "Compatibility",
    "Evidence completeness",
    "Unknown / verify",
    "Known blockers",
    "Start Application",
    "does not mean the institution has no intake",
    "Never promise admission",
    "Do not include student names",
  ])
    assert.match(runbook, new RegExp(phrase, "i"));
});

test("reusable beta checklist covers the certified end-to-end workflow", () => {
  const checklist = read(
    "docs/operations/internal-beta-acceptance-checklist.md",
  );
  for (const phrase of [
    "Login succeeds",
    "authorized students",
    "Find Matches",
    "application creation",
    "Status changes",
    "Advisor assignment",
    "Financial fields",
    "archived",
    "defect",
  ])
    assert.match(checklist, new RegExp(phrase, "i"));
});

test("release record distinguishes certified release from blocked candidate", () => {
  const release = read("docs/operations/internal-beta-release-record.md");
  assert.match(release, /1c7d5fc7dbc74acb1098ac3236a5d6518445d74a/);
  assert.match(release, /Preview\/internal beta only/i);
  assert.match(release, /not a certified new\s+release/i);
  assert.match(release, /usage limit/i);
  assert.doesNotMatch(release, /password|secret key|database url/i);
});
