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
const apiPath = path.join(workspaceRoot, "lib", "api", "organizationApi.ts");
const errorPath = path.join(workspaceRoot, "lib", "crm", "platformErrors.ts");

function compileTypeScript(filePath) {
  return ts.transpileModule(readFileSync(filePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;
}

function evaluate(filePath, requireModule) {
  const loadedModule = { exports: {} };
  const wrapper = vm.runInThisContext(
    `(function (require, module, exports) { ${compileTypeScript(filePath)}\n})`,
    { filename: filePath },
  );
  wrapper(requireModule, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const platformErrors = evaluate(errorPath, (specifier) => {
  throw new Error(`Unexpected runtime dependency: ${specifier}`);
});
const reportedErrors = [];
const api = evaluate(apiPath, (specifier) => {
  if (specifier === "@/lib/crm/platformErrors") return platformErrors;
  if (specifier === "@/lib/operations") {
    return {
      createRequestContext(_request, route) {
        return {
          requestId: "11111111-1111-4111-8111-111111111111",
          correlationId: "11111111-1111-4111-8111-111111111111",
          route,
          startedAt: 0,
        };
      },
      responseHeaders(context, base) {
        return {
          ...base,
          "X-Request-ID": context.requestId,
          "X-Correlation-ID": context.correlationId,
        };
      },
      async reportError(report) {
        reportedErrors.push(report);
      },
    };
  }
  throw new Error(`Unexpected runtime dependency: ${specifier}`);
});

function request(body) {
  return new Request("https://example.test/api/organizations", {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : body,
  });
}

function clientWithRole(role = "admin", error = null) {
  const calls = [];
  return {
    calls,
    client: {
      schema(schemaName) {
        assert.equal(schemaName, "crm");
        return {
          async rpc(name) {
            calls.push(name);
            assert.equal(name, "current_profile_role");
            return { data: role, error };
          },
        };
      },
    },
  };
}

test("organization API rejects unauthenticated requests before invoking operations", async () => {
  let invoked = false;
  const response = await api.runOrganizationApi({
    request: request(),
    route: "/api/organizations",
    userId: null,
    operation: async () => {
      invoked = true;
    },
  });

  assert.equal(response.status, 401);
  assert.equal(invoked, false);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: {
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication is required.",
    },
  });
});

test("organization API checks admin authorization before every mutation", async () => {
  const supabase = clientWithRole("advisor");
  let invoked = false;
  const response = await api.runOrganizationApi({
    request: request("{}"),
    route: "/api/organizations",
    userId: "user_123",
    supabase: supabase.client,
    requireAdmin: true,
    operation: async () => {
      invoked = true;
    },
  });

  assert.equal(response.status, 403);
  assert.deepEqual(supabase.calls, ["current_profile_role"]);
  assert.equal(invoked, false);
  assert.equal((await response.json()).error.code, "AUTHORIZATION_DENIED");
});

test("organization API returns structured successful responses", async () => {
  const supabase = clientWithRole();
  const organization = { id: "org-id", name: "Partner School" };
  const response = await api.runOrganizationApi({
    request: request("{}"),
    route: "/api/organizations",
    userId: "user_123",
    supabase: supabase.client,
    requireAdmin: true,
    operation: async (receivedClient) => {
      assert.equal(receivedClient, supabase.client);
      return organization;
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, data: organization });
});

test("payload validation failures return expected public errors", async () => {
  const supabase = clientWithRole();
  const malformedRequest = request("{");
  const response = await api.runOrganizationApi({
    request: malformedRequest,
    route: "/api/organizations",
    userId: "user_123",
    supabase: supabase.client,
    operation: async () => api.parseJsonObject(malformedRequest),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: {
      code: "VALIDATION_FAILED",
      message: "Request body must contain valid JSON.",
    },
  });
});

test("internal database errors are reported but never exposed", async () => {
  reportedErrors.length = 0;
  const supabase = clientWithRole();
  const response = await api.runOrganizationApi({
    request: request(),
    route: "/api/organizations",
    userId: "user_123",
    supabase: supabase.client,
    operation: async () => {
      throw new Error("password=secret database host unavailable");
    },
  });

  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error.code, "UNKNOWN");
  assert.equal(
    body.error.message,
    "The organization request could not be completed.",
  );
  assert.doesNotMatch(JSON.stringify(body), /secret|database host/i);
  assert.equal(reportedErrors.length, 1);
});

test("all organization routes use the service layer and admin-gate mutations", () => {
  const routeFiles = [
    [
      "app/api/organizations/route.ts",
      ["listOrganizations", "createOrganization"],
    ],
    [
      "app/api/organizations/[organizationId]/route.ts",
      ["getOrganizationById", "updateOrganization"],
    ],
    [
      "app/api/organizations/[organizationId]/archive/route.ts",
      ["archiveOrganization"],
    ],
    [
      "app/api/organizations/[organizationId]/advisors/route.ts",
      ["assignAdvisor"],
    ],
    [
      "app/api/organizations/[organizationId]/advisors/[assignmentId]/route.ts",
      ["removeAdvisor"],
    ],
    [
      "app/api/organizations/[organizationId]/students/route.ts",
      ["assignStudent"],
    ],
    [
      "app/api/organizations/[organizationId]/students/[membershipId]/route.ts",
      ["removeStudent"],
    ],
  ];

  for (const [relativePath, methods] of routeFiles) {
    const source = readFileSync(path.join(workspaceRoot, relativePath), "utf8");
    assert.match(source, /handleOrganizationRoute/);
    for (const method of methods) {
      assert.match(source, new RegExp(`\\b${method}\\b`));
    }
    if (
      !methods.includes("listOrganizations") &&
      !methods.includes("getOrganizationById")
    ) {
      assert.match(source, /true,\s*\);/);
    }
  }
});
