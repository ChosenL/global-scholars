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
const servicePath = path.join(workspaceRoot, "lib", "crm", "organizations.ts");
const migrationPath = path.join(
  workspaceRoot,
  "supabase",
  "migrations",
  "20260824_create_crm_organization_services.sql",
);

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
    if (!specifier.startsWith(".")) {
      throw new Error(`Unexpected runtime dependency: ${specifier}`);
    }
    const resolved = path.resolve(path.dirname(normalizedPath), specifier);
    return loadTypeScriptModule(
      path.extname(resolved) ? resolved : `${resolved}.ts`,
      cache,
    );
  };

  const wrapper = vm.runInThisContext(
    `(function (require, module, exports) { ${output}\n})`,
    { filename: normalizedPath },
  );
  wrapper(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

function rpcClient(result = { data: null, error: null }) {
  const calls = [];
  return {
    calls,
    client: {
      schema(schemaName) {
        assert.equal(schemaName, "crm");
        return {
          async rpc(name, args) {
            calls.push({ name, args });
            return result;
          },
        };
      },
    },
  };
}

function queryClient(result) {
  const calls = [];
  const chain = {
    select() {
      return this;
    },
    eq(column, value) {
      calls.push({ operation: "eq", column, value });
      return this;
    },
    order() {
      return this;
    },
    range() {
      return this;
    },
    ilike() {
      return this;
    },
    async maybeSingle() {
      return result;
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };

  return {
    calls,
    client: {
      schema(schemaName) {
        assert.equal(schemaName, "crm");
        return {
          from(tableName) {
            calls.push({ operation: "from", tableName });
            return chain;
          },
        };
      },
    },
  };
}

const service = loadTypeScriptModule(servicePath);
const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const ADVISOR_ID = "22222222-2222-4222-8222-222222222222";
const STUDENT_ID = "33333333-3333-4333-8333-333333333333";
const MEMBERSHIP_ID = "44444444-4444-4444-8444-444444444444";
const organization = {
  id: ORGANIZATION_ID,
  name: "Partner School",
  slug: "partner-school",
  organization_type: "partner_school",
  status: "active",
  email: null,
  phone: null,
  website: null,
  address: null,
  created_at: "2026-07-30T00:00:00.000Z",
  updated_at: "2026-07-30T00:00:00.000Z",
  archived_at: null,
};

test("createOrganization validates and normalizes input before using the secure RPC", async () => {
  const { client, calls } = rpcClient({
    data: organization,
    error: null,
  });

  const result = await service.createOrganization(client, {
    name: "  Partner School  ",
    slug: "PARTNER-SCHOOL",
    organizationType: "partner_school",
    email: " admin@example.org ",
  });

  assert.equal(result.id, ORGANIZATION_ID);
  assert.deepEqual(calls, [
    {
      name: "create_organization",
      args: {
        new_name: "Partner School",
        new_slug: "partner-school",
        new_organization_type: "partner_school",
        new_email: "admin@example.org",
        new_phone: null,
        new_website: null,
        new_address: null,
      },
    },
  ]);
});

test("service validation rejects malformed input before database access", async () => {
  const { client, calls } = rpcClient();

  await assert.rejects(
    service.createOrganization(client, {
      name: "Partner School",
      slug: "invalid slug",
      organizationType: "partner_school",
    }),
    (error) =>
      error.name === "PlatformServiceError" &&
      error.code === "VALIDATION_FAILED",
  );
  assert.equal(calls.length, 0);
});

test("updateOrganization sends only validated changed fields", async () => {
  const { client, calls } = rpcClient({
    data: { ...organization, website: "https://example.org" },
    error: null,
  });

  await service.updateOrganization(client, ORGANIZATION_ID, {
    website: "https://example.org",
    phone: null,
  });

  assert.deepEqual(calls[0], {
    name: "update_organization",
    args: {
      target_organization_id: ORGANIZATION_ID,
      new_values: {
        website: "https://example.org",
        phone: null,
      },
    },
  });
});

test("organization reads use the RLS-protected table and hide inaccessible rows as not found", async () => {
  const readable = queryClient({ data: organization, error: null });
  const result = await service.getOrganizationById(
    readable.client,
    ORGANIZATION_ID,
  );

  assert.equal(result.slug, "partner-school");
  assert.deepEqual(readable.calls[0], {
    operation: "from",
    tableName: "organizations",
  });

  const hidden = queryClient({ data: null, error: null });
  await assert.rejects(
    service.getOrganizationById(hidden.client, ORGANIZATION_ID),
    (error) =>
      error.name === "PlatformServiceError" && error.code === "NOT_FOUND",
  );
});

test("database authorization and conflict failures become structured service errors", async () => {
  const denied = rpcClient({
    data: null,
    error: {
      code: "P0001",
      message: "Organization archive access denied.",
    },
  });
  await assert.rejects(
    service.archiveOrganization(denied.client, ORGANIZATION_ID),
    (error) => error.code === "AUTHORIZATION_DENIED",
  );

  const duplicate = rpcClient({
    data: null,
    error: {
      code: "23505",
      message: "duplicate key value violates unique constraint",
    },
  });
  await assert.rejects(
    service.assignAdvisor(duplicate.client, {
      organizationId: ORGANIZATION_ID,
      advisorProfileId: ADVISOR_ID,
    }),
    (error) => error.code === "CONFLICT",
  );
});

test("assignment removal methods end relationships through RPCs", async () => {
  const advisor = rpcClient({
    data: { id: MEMBERSHIP_ID },
    error: null,
  });
  await service.removeAdvisor(advisor.client, MEMBERSHIP_ID);
  assert.equal(advisor.calls[0].name, "remove_organization_advisor");

  const student = rpcClient({
    data: { id: MEMBERSHIP_ID },
    error: null,
  });
  await service.removeStudent(student.client, MEMBERSHIP_ID);
  assert.equal(student.calls[0].name, "remove_organization_student");

  const assignedStudent = rpcClient({
    data: { id: MEMBERSHIP_ID },
    error: null,
  });
  await service.assignStudent(assignedStudent.client, {
    organizationId: ORGANIZATION_ID,
    studentProfileId: STUDENT_ID,
  });
  assert.equal(assignedStudent.calls[0].name, "assign_organization_student");
});

test("organization RPC migration enforces admin authorization, locking, and audit-trigger reuse", () => {
  const migration = readFileSync(migrationPath, "utf8");

  for (const rpc of [
    "create_organization",
    "update_organization",
    "archive_organization",
    "assign_organization_advisor",
    "remove_organization_advisor",
    "assign_organization_student",
    "remove_organization_student",
  ]) {
    assert.match(migration, new RegExp(`function crm\\.${rpc}`, "i"));
  }

  assert.match(migration, /security definer/g);
  assert.match(migration, /set search_path = ''/g);
  assert.match(migration, /if not crm\.is_current_admin\(\)/g);
  assert.match(migration, /for update/g);
  assert.doesNotMatch(migration, /service_role|auth\.uid\(\)|clerk_user_id/i);
  assert.doesNotMatch(migration, /crm\.emit_domain_event/i);
});
