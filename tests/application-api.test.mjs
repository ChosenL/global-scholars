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
const apiPath = path.join(workspaceRoot, "lib", "api", "applicationApi.ts");
const reportedErrors = [];

function loadTypeScriptModule(filePath, cache = new Map()) {
  const normalizedPath = path.normalize(filePath);
  if (cache.has(normalizedPath)) return cache.get(normalizedPath).exports;
  const source = readFileSync(normalizedPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: normalizedPath,
  }).outputText;
  const loadedModule = { exports: {} };
  cache.set(normalizedPath, loadedModule);
  const localRequire = (specifier) => {
    if (specifier === "@/lib/crm/platformErrors") {
      return loadTypeScriptModule(
        path.join(workspaceRoot, "lib", "crm", "platformErrors.ts"),
        cache,
      );
    }
    if (specifier === "@/lib/operations") {
      return {
        createRequestContext(_request, route) {
          return {
            requestId: "11111111-1111-4111-8111-111111111111",
            correlationId: "22222222-2222-4222-8222-222222222222",
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
  };
  const wrapper = vm.runInThisContext(
    `(function (require, module, exports) { ${output}\n})`,
    { filename: normalizedPath },
  );
  wrapper(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const moduleCache = new Map();
const api = loadTypeScriptModule(apiPath, moduleCache);
const serviceErrors = loadTypeScriptModule(
  path.join(workspaceRoot, "lib", "crm", "platformErrors.ts"),
  moduleCache,
);

function request(body) {
  return new Request("https://example.test/api/applications", {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : body,
  });
}

test("application API rejects unauthenticated requests before service execution", async () => {
  let invoked = false;
  const response = await api.runApplicationApi({
    request: request(),
    route: "/api/applications",
    userId: null,
    operation: async () => {
      invoked = true;
    },
  });
  assert.equal(response.status, 401);
  assert.equal(invoked, false);
  assert.equal((await response.json()).error.code, "AUTHENTICATION_REQUIRED");
  assert.equal(
    response.headers.get("cache-control"),
    "private, no-store, max-age=0",
  );
  assert.equal(
    response.headers.get("x-correlation-id"),
    "22222222-2222-4222-8222-222222222222",
  );
});

test("authenticated application operations return structured success", async () => {
  const client = { callerScoped: true };
  const value = { id: "application-id", status: "draft" };
  const response = await api.runApplicationApi({
    request: request("{}"),
    route: "/api/applications",
    userId: "user_123",
    supabase: client,
    operation: async (receivedClient) => {
      assert.equal(receivedClient, client);
      return value;
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, data: value });
});

test("request validation and status-transition failures return public errors", async () => {
  const client = {};
  const malformed = request("{");
  const validationResponse = await api.runApplicationApi({
    request: malformed,
    route: "/api/applications",
    userId: "user_123",
    supabase: client,
    operation: () => api.parseJsonObject(malformed),
  });
  assert.equal(validationResponse.status, 400);
  assert.equal(
    (await validationResponse.json()).error.code,
    "VALIDATION_FAILED",
  );

  const transitionResponse = await api.runApplicationApi({
    request: request("{}"),
    route: "/api/applications/[applicationId]/status",
    userId: "user_123",
    supabase: client,
    operation: async () => {
      throw new serviceErrors.PlatformServiceError(
        "VALIDATION_FAILED",
        "Invalid application status transition from draft to enrolled.",
      );
    },
  });
  assert.equal(transitionResponse.status, 400);
  assert.match(
    (await transitionResponse.json()).error.message,
    /invalid application status/i,
  );
});

test("authorization and service failures are mapped and internal details sanitized", async () => {
  const denied = await api.runApplicationApi({
    request: request("{}"),
    route: "/api/applications/[applicationId]",
    userId: "user_123",
    supabase: {},
    operation: async () => {
      throw new serviceErrors.PlatformServiceError(
        "AUTHORIZATION_DENIED",
        "Application update access denied.",
      );
    },
  });
  assert.equal(denied.status, 403);

  reportedErrors.length = 0;
  const failed = await api.runApplicationApi({
    request: request(),
    route: "/api/applications",
    userId: "user_123",
    supabase: {},
    operation: async () => {
      throw new Error("password=secret database unavailable");
    },
  });
  const body = await failed.json();
  assert.equal(failed.status, 500);
  assert.equal(
    body.error.message,
    "The application request could not be completed.",
  );
  assert.doesNotMatch(JSON.stringify(body), /secret|database unavailable/i);
  assert.equal(reportedErrors.length, 1);
});

test("every application route delegates exclusively to the service layer", () => {
  const routes = [
    [
      "app/api/applications/route.ts",
      ["listApplications", "createApplication"],
    ],
    [
      "app/api/applications/[applicationId]/route.ts",
      ["getApplicationById", "updateApplication"],
    ],
    [
      "app/api/applications/[applicationId]/status/route.ts",
      ["changeApplicationStatus"],
    ],
    [
      "app/api/applications/[applicationId]/advisor/route.ts",
      ["assignAdvisor"],
    ],
    [
      "app/api/applications/[applicationId]/financials/route.ts",
      ["updateFinancialDetails"],
    ],
    [
      "app/api/applications/[applicationId]/archive/route.ts",
      ["archiveApplication"],
    ],
    [
      "app/api/applications/[applicationId]/timeline/route.ts",
      ["listApplicationTimeline"],
    ],
  ];
  for (const [relativePath, methods] of routes) {
    const source = readFileSync(path.join(workspaceRoot, relativePath), "utf8");
    assert.match(source, /handleApplicationRoute/);
    assert.doesNotMatch(
      source,
      /\.schema\(|\.from\(|\.rpc\(|createClerkSupabaseClient/,
    );
    for (const method of methods)
      assert.match(source, new RegExp(`\\b${method}\\b`));
  }
});

test("timeline route exposes authenticated service retrieval with bounded input", () => {
  const source = readFileSync(
    path.join(
      workspaceRoot,
      "app/api/applications/[applicationId]/timeline/route.ts",
    ),
    "utf8",
  );
  assert.match(source, /export async function GET/);
  assert.match(source, /listApplicationTimeline/);
  assert.match(source, /searchParams\.get\("limit"\)/);
});
