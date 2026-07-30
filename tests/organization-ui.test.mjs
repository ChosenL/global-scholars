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

test("organization form validation matches service constraints", () => {
  const validation = loadTypeScript("features/organizations/validation.ts");
  const valid = {
    name: "Partner School",
    slug: "partner-school",
    organizationType: "partner_school",
    email: "admin@example.org",
    phone: "+1 555 555 5555",
    website: "https://example.org",
    address: "100 Scholar Way",
  };

  assert.deepEqual(validation.validateOrganizationForm(valid), {});
  assert.equal(
    validation.slugifyOrganizationName("  Global Scholars & Partners  "),
    "global-scholars-partners",
  );
  assert.deepEqual(
    Object.keys(
      validation.validateOrganizationForm({
        ...valid,
        name: "A",
        slug: "Invalid Slug",
        email: "invalid",
        phone: "123",
        website: "javascript:alert(1)",
      }),
    ).sort(),
    ["email", "name", "phone", "slug", "website"],
  );
});

test("organization React components consume the HTTP API and never Supabase", () => {
  const componentPaths = [
    "features/organizations/components/OrganizationListPage.tsx",
    "features/organizations/components/OrganizationDetailsPage.tsx",
    "features/organizations/components/OrganizationFormPage.tsx",
    "features/organizations/components/OrganizationForm.tsx",
    "features/organizations/components/AssignmentDialog.tsx",
  ];

  for (const relativePath of componentPaths) {
    const source = readFileSync(path.join(workspaceRoot, relativePath), "utf8");
    assert.doesNotMatch(source, /supabase|createClient|\.schema\(["']crm/i);
  }

  const apiSource = readFileSync(
    path.join(workspaceRoot, "features/organizations/api.ts"),
    "utf8",
  );
  assert.match(apiSource, /fetch\(path/);
  assert.match(apiSource, /\/api\/organizations/);
  assert.doesNotMatch(apiSource, /supabase|createClient/);
});

test("active organization assignments prevent duplicate advisor and student profiles", () => {
  const assignments = loadTypeScript("features/organizations/assignments.ts");
  const advisorProfileId = "22222222-2222-4222-8222-222222222222";
  const studentProfileId = "33333333-3333-4333-8333-333333333333";

  assert.equal(assignments.isCrmProfileId(advisorProfileId), true);
  assert.equal(assignments.isCrmProfileId("not-a-profile-id"), false);
  assert.equal(
    assignments.hasActiveAdvisorAssignment(
      [
        {
          advisor_profile_id: advisorProfileId,
          ends_at: null,
        },
      ],
      advisorProfileId.toUpperCase(),
    ),
    true,
  );
  assert.equal(
    assignments.hasActiveAdvisorAssignment(
      [
        {
          advisor_profile_id: advisorProfileId,
          ends_at: "2026-07-30T00:00:00.000Z",
        },
      ],
      advisorProfileId,
    ),
    false,
  );
  assert.equal(
    assignments.hasActiveStudentAssignment(
      [
        {
          student_profile_id: studentProfileId,
          status: "active",
        },
      ],
      studentProfileId,
    ),
    true,
  );
});

test("assignment UI client uses existing advisor and student endpoints", async () => {
  const api = loadTypeScript("features/organizations/api.ts");
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (requestPath, init) => {
    calls.push({ path: requestPath, method: init?.method, body: init?.body });
    return new Response(
      JSON.stringify({ ok: true, data: { id: "assignment-id" } }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await api.assignOrganizationAdvisor("organization-id", {
      advisorProfileId: "advisor-id",
      assignmentRole: "support",
    });
    await api.removeOrganizationAdvisor("organization-id", "advisor-link-id");
    await api.assignOrganizationStudent("organization-id", {
      studentProfileId: "student-id",
      membershipType: "client",
      isPrimary: true,
    });
    await api.removeOrganizationStudent("organization-id", "student-link-id");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(
    calls.map(({ path: requestPath, method }) => [requestPath, method]),
    [
      ["/api/organizations/organization-id/advisors", "POST"],
      ["/api/organizations/organization-id/advisors/advisor-link-id", "DELETE"],
      ["/api/organizations/organization-id/students", "POST"],
      ["/api/organizations/organization-id/students/student-link-id", "DELETE"],
    ],
  );
  assert.match(calls[0].body, /advisorProfileId/);
  assert.match(calls[2].body, /studentProfileId/);
});

test("organization UI data client calls the authenticated API contract", async () => {
  const api = loadTypeScript("features/organizations/api.ts");
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (path, init) => {
    calls.push({ path, init });
    return new Response(
      JSON.stringify({
        ok: true,
        data: [{ id: "11111111-1111-4111-8111-111111111111" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const result = await api.listOrganizations({
      search: "Partner School",
      limit: 10,
      offset: 20,
    });
    assert.equal(result.length, 1);
    assert.match(
      calls[0].path,
      /^\/api\/organizations\?limit=10&offset=20&search=Partner\+School$/,
    );
    assert.equal(calls[0].init.credentials, "same-origin");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("organization UI includes required states, actions, and accessible controls", () => {
  const list = readFileSync(
    path.join(
      workspaceRoot,
      "features/organizations/components/OrganizationListPage.tsx",
    ),
    "utf8",
  );
  const details = readFileSync(
    path.join(
      workspaceRoot,
      "features/organizations/components/OrganizationDetailsPage.tsx",
    ),
    "utf8",
  );
  const form = readFileSync(
    path.join(
      workspaceRoot,
      "features/organizations/components/OrganizationForm.tsx",
    ),
    "utf8",
  );
  const dialog = readFileSync(
    path.join(
      workspaceRoot,
      "features/organizations/components/AssignmentDialog.tsx",
    ),
    "utf8",
  );

  for (const text of [
    "Loading organizations",
    "No organizations found",
    "Unable to load organizations",
    "advisorCount",
    "studentCount",
    'role="search"',
  ]) {
    assert.match(list, new RegExp(text));
  }
  assert.match(details, /role="dialog"/);
  assert.match(details, /aria-modal="true"/);
  assert.match(details, /does not permanently\s+delete/);
  assert.match(details, /Assign advisor/);
  assert.match(details, /Assign student/);
  assert.match(details, /Loading advisors/);
  assert.match(details, /Loading students/);
  assert.match(details, /Advisors could not be loaded/);
  assert.match(details, /Students could not be loaded/);
  assert.match(details, /removeOrganizationAdvisor/);
  assert.match(details, /removeOrganizationStudent/);
  assert.match(dialog, /role="combobox"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /aria-invalid/);
  assert.match(dialog, /already has an active assignment/);
  assert.match(dialog, /disabled=\{isPending \|\| duplicate\}/);
  assert.match(form, /aria-invalid/);
  assert.match(form, /disabled=\{isSaving\}/);
  assert.match(form, /validateOrganizationForm/);
});

test("all four organization pages and route-level boundaries exist", () => {
  for (const relativePath of [
    "app/organizations/page.tsx",
    "app/organizations/new/page.tsx",
    "app/organizations/[organizationId]/page.tsx",
    "app/organizations/[organizationId]/edit/page.tsx",
    "app/organizations/loading.tsx",
    "app/organizations/error.tsx",
  ]) {
    assert.equal(
      readFileSync(path.join(workspaceRoot, relativePath), "utf8").length > 0,
      true,
    );
  }
});
