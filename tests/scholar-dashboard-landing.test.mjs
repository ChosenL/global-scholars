import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/scholar-dashboard/page.tsx", import.meta.url);

test("root scholar dashboard always lands on the overview", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.match(source, /const ROOT_DASHBOARD_SECTION = "dashboard"/);
  assert.match(
    source,
    /useState\(ROOT_DASHBOARD_SECTION\)/,
    "the initial section must be the dashboard overview",
  );
  assert.match(
    source,
    /window\.history\.scrollRestoration = "manual"/,
    "browser history must not restore a stale in-page section",
  );
  assert.match(
    source,
    /window\.scrollTo\(\{ top: 0, left: 0, behavior: "auto" \}\)/,
    "entry and refresh must return to the top-level overview",
  );
});

test("root scholar dashboard does not restore section persistence", async () => {
  const source = await readFile(pagePath, "utf8");

  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /sessionStorage/);
  assert.doesNotMatch(source, /useSearchParams/);
});
