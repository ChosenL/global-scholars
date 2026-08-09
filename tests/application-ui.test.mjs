import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const workspaceRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")),
  "..",
);

function loadTypeScript(relativePath) {
  const filePath = path.join(workspaceRoot, relativePath);
  const output = ts.transpileModule(readFileSync(filePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filePath,
  }).outputText;
  const loadedModule = { exports: {} };
  const wrapper = vm.runInThisContext(
    `(function (require, module, exports) { ${output}\n})`,
    { filename: filePath },
  );
  wrapper(
    (specifier) => {
      throw new Error(`Unexpected runtime dependency: ${specifier}`);
    },
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}

test("application browser client uses only the authenticated Application API", async () => {
  const api = loadTypeScript("features/applications/api.ts");
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (requestPath, init) => {
    calls.push({
      path: requestPath,
      method: init?.method,
      body: init?.body,
      credentials: init?.credentials,
    });
    return new Response(JSON.stringify({ ok: true, data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await api.createApplication({
      studentProfileId: "student-id",
      universityId: "university-id",
      programId: "program-id",
      intakeId: "intake-id",
      advisorProfileId: null,
    });
    await api.listApplications({ status: "submitted", limit: 10, offset: 20 });
    await api.assignApplicationAdvisor("application-id", "advisor-id");
    await api.changeApplicationStatus(
      "application-id",
      "under_review",
      "Review started",
    );
    await api.updateApplicationFinancials("application-id", {
      tuitionAmount: 12000,
      tuitionCurrency: "USD",
      tuitionSource: "Offer",
    });
    await api.archiveApplication("application-id");
    await api.listApplicationTimeline("application-id");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls[0].path, "/api/applications");
  assert.match(calls[0].body, /"universityId":"university-id"/);
  assert.match(
    calls[1].path,
    /^\/api\/applications\?limit=10&offset=20&status=submitted$/,
  );
  assert.deepEqual(
    calls
      .slice(2)
      .map(({ path: requestPath, method }) => [requestPath, method]),
    [
      ["/api/applications/application-id/advisor", "POST"],
      ["/api/applications/application-id/status", "POST"],
      ["/api/applications/application-id/financials", "POST"],
      ["/api/applications/application-id/archive", "POST"],
      ["/api/applications/application-id/timeline", undefined],
    ],
  );
  assert.ok(calls.every((call) => call.credentials === "same-origin"));
});

test("application list includes search, filters, pagination, and all data states", () => {
  const source = readFileSync(
    path.join(
      workspaceRoot,
      "features/applications/components/ApplicationListPage.tsx",
    ),
    "utf8",
  );
  for (const expected of [
    "New Application",
    "Create application",
    "Student selector",
    "UniversitySelector",
    "IntakeSelector",
    "ProgramSelector",
    "credentialLevel",
    "Application created.",
    "Creating...",
    "Student is required.",
    'role="search"',
    "Search applications",
    "Filter by status",
    "Loading applications",
    "No applications found",
    "Unable to load applications",
    "Previous",
    "Next",
    "Student",
    "University",
    "Advisor",
    "Status",
    "Intake",
    "Program",
    "Updated",
  ])
    assert.match(source, new RegExp(expected));
  assert.match(source, /listApplications/);
  assert.match(source, /createApplication/);
  assert.match(source, /setQuery/);
  assert.match(source, /APPLICATION_STATUSES/);
});

test("application details supports status, financial, timeline, and archive workflows", () => {
  const source = readFileSync(
    path.join(
      workspaceRoot,
      "features/applications/components/ApplicationDetailsPage.tsx",
    ),
    "utf8",
  );
  for (const expected of [
    "Overview",
    "Advisor Assignment",
    "Current advisor",
    "Assign advisor",
    "Change advisor",
    "Remove advisor unavailable",
    "Advisor profile ID is required.",
    "Advisor assignment updated.",
    "Financials",
    "Scholarship",
    "Timeline",
    "Notes",
    "Tasks",
    "Update status",
    "Update financials",
    "Archive this application",
    'role="dialog"',
    'aria-modal="true"',
    "Loading application",
    "Unable to load application",
  ]) {
    assert.match(source, new RegExp(expected));
  }
  assert.match(source, /changeApplicationStatus/);
  assert.match(source, /assignApplicationAdvisor/);
  assert.match(source, /updateApplicationFinancials/);
  assert.match(source, /archiveApplication/);
  assert.match(source, /listApplicationTimeline/);
  assert.match(source, /ApplicationToast/);
  assert.doesNotMatch(source, /supabase|\.from\(|\.rpc\(/i);
});

test("application pages and route-level loading and error boundaries exist", () => {
  for (const relativePath of [
    "app/applications/page.tsx",
    "app/applications/[applicationId]/page.tsx",
    "app/applications/loading.tsx",
    "app/applications/error.tsx",
  ])
    assert.ok(
      readFileSync(path.join(workspaceRoot, relativePath), "utf8").length > 0,
    );
});
