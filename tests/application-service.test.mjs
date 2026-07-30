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
const servicePath = path.join(workspaceRoot, "lib", "crm", "applications.ts");
const migrationPath = path.join(
  workspaceRoot,
  "supabase",
  "migrations",
  "20260826_add_crm_application_service_rpcs.sql",
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
    select(value) {
      calls.push({ operation: "select", value });
      return this;
    },
    eq(column, value) {
      calls.push({ operation: "eq", column, value });
      return this;
    },
    is(column, value) {
      calls.push({ operation: "is", column, value });
      return this;
    },
    order(column, options) {
      calls.push({ operation: "order", column, options });
      return this;
    },
    range(from, to) {
      calls.push({ operation: "range", from, to });
      return this;
    },
    limit(value) {
      calls.push({ operation: "limit", value });
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
const APPLICATION_ID = "11111111-1111-4111-8111-111111111111";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const INTAKE_ID = "33333333-3333-4333-8333-333333333333";
const ADVISOR_ID = "44444444-4444-4444-8444-444444444444";
const ORGANIZATION_ID = "55555555-5555-4555-8555-555555555555";
const application = {
  id: APPLICATION_ID,
  organization_id: null,
  student_profile_id: STUDENT_ID,
  intake_id: INTAKE_ID,
  advisor_profile_id: null,
  status: "draft",
  external_reference: null,
  tuition_amount: null,
  tuition_currency: null,
  tuition_source: null,
  submitted_at: null,
  closed_at: null,
  withdrawn_at: null,
  archived_at: null,
  created_by_profile_id: ADVISOR_ID,
  created_at: "2026-07-30T00:00:00.000Z",
  updated_at: "2026-07-30T00:00:00.000Z",
  deleted_at: null,
};

test("createApplication validates CRM identity and uses the existing creation RPC", async () => {
  const { client, calls } = rpcClient({ data: application, error: null });
  const result = await service.createApplication(client, {
    studentProfileId: STUDENT_ID,
    intakeId: INTAKE_ID,
    advisorProfileId: ADVISOR_ID,
  });

  assert.equal(result.id, APPLICATION_ID);
  assert.deepEqual(calls[0], {
    name: "create_student_application",
    args: {
      target_student_profile_id: STUDENT_ID,
      target_intake_id: INTAKE_ID,
      target_advisor_profile_id: ADVISOR_ID,
    },
  });
});

test("general updates send only normalized supported fields to the new RPC", async () => {
  const { client, calls } = rpcClient({
    data: {
      ...application,
      organization_id: ORGANIZATION_ID,
      external_reference: "APP-100",
    },
    error: null,
  });
  await service.updateApplication(client, APPLICATION_ID, {
    externalReference: " APP-100 ",
    organizationId: ORGANIZATION_ID,
  });

  assert.deepEqual(calls[0], {
    name: "update_student_application",
    args: {
      target_application_id: APPLICATION_ID,
      new_values: {
        external_reference: "APP-100",
        organization_id: ORGANIZATION_ID,
      },
    },
  });
});

test("archive uses the existing audited RPC and single-record reads stay RLS protected", async () => {
  const archived = rpcClient({
    data: { ...application, archived_at: "2026-07-30T12:00:00.000Z" },
    error: null,
  });
  await service.archiveApplication(archived.client, APPLICATION_ID);
  assert.deepEqual(archived.calls[0], {
    name: "archive_student_application",
    args: { target_application_id: APPLICATION_ID },
  });

  const readable = queryClient({ data: application, error: null });
  const result = await service.getApplicationById(
    readable.client,
    APPLICATION_ID,
  );
  assert.equal(result.id, APPLICATION_ID);
  assert.ok(
    readable.calls.some(
      (call) =>
        call.operation === "from" && call.tableName === "student_applications",
    ),
  );
});

test("status changes use existing history-aware RPC and invalid transitions are structured", async () => {
  const successful = rpcClient({
    data: { ...application, status: "ready_for_review" },
    error: null,
  });
  await service.changeApplicationStatus(successful.client, {
    applicationId: APPLICATION_ID,
    status: "ready_for_review",
    reason: " Ready for advisor review ",
  });
  assert.deepEqual(successful.calls[0], {
    name: "update_application_status",
    args: {
      target_application_id: APPLICATION_ID,
      new_status: "ready_for_review",
      transition_reason: "Ready for advisor review",
    },
  });

  const invalid = rpcClient({
    data: null,
    error: {
      code: "P0001",
      message: "Invalid application status transition from draft to enrolled.",
    },
  });
  await assert.rejects(
    service.changeApplicationStatus(invalid.client, {
      applicationId: APPLICATION_ID,
      status: "enrolled",
    }),
    (error) =>
      error.name === "PlatformServiceError" &&
      error.code === "VALIDATION_FAILED",
  );
});

test("advisor and financial mutations use their narrowly scoped RPCs", async () => {
  const advisor = rpcClient({
    data: { ...application, advisor_profile_id: ADVISOR_ID },
    error: null,
  });
  await service.assignAdvisor(advisor.client, APPLICATION_ID, ADVISOR_ID);
  assert.equal(advisor.calls[0].name, "assign_application_advisor");

  const financial = rpcClient({
    data: {
      ...application,
      tuition_amount: 12_500,
      tuition_currency: "USD",
      tuition_source: "University offer",
    },
    error: null,
  });
  await service.updateFinancialDetails(financial.client, APPLICATION_ID, {
    tuitionAmount: 12_500,
    tuitionCurrency: "usd",
    tuitionSource: " University offer ",
  });
  assert.deepEqual(financial.calls[0], {
    name: "update_application_financial_details",
    args: {
      target_application_id: APPLICATION_ID,
      new_tuition_amount: 12_500,
      new_tuition_currency: "USD",
      new_tuition_source: "University offer",
    },
  });
});

test("authorization, advisor, and local validation failures are structured", async () => {
  const denied = rpcClient({
    data: null,
    error: { code: "P0001", message: "Application update access denied." },
  });
  await assert.rejects(
    service.updateApplication(denied.client, APPLICATION_ID, {
      externalReference: "APP-100",
    }),
    (error) => error.code === "AUTHORIZATION_DENIED",
  );

  const invalidAdvisor = rpcClient({
    data: null,
    error: {
      code: "P0001",
      message: "Application advisor is not authorized for this student.",
    },
  });
  await assert.rejects(
    service.assignAdvisor(invalidAdvisor.client, APPLICATION_ID, ADVISOR_ID),
    (error) => error.code === "AUTHORIZATION_DENIED",
  );

  const local = rpcClient();
  await assert.rejects(
    service.updateFinancialDetails(local.client, APPLICATION_ID, {
      tuitionAmount: -1,
      tuitionCurrency: "US",
      tuitionSource: "",
    }),
    (error) => error.code === "VALIDATION_FAILED" && local.calls.length === 0,
  );
});

test("RLS-protected reads return application lists and ordered timeline events", async () => {
  const listed = queryClient({ data: [application], error: null });
  const applications = await service.listApplications(listed.client, {
    studentProfileId: STUDENT_ID,
    status: "draft",
    limit: 25,
  });
  assert.equal(applications.length, 1);
  assert.ok(
    listed.calls.some(
      (call) =>
        call.operation === "from" && call.tableName === "student_applications",
    ),
  );
  assert.ok(
    listed.calls.some(
      (call) =>
        call.operation === "is" &&
        call.column === "archived_at" &&
        call.value === null,
    ),
  );

  const timelineEvent = {
    id: "66666666-6666-4666-8666-666666666666",
    subject_id: APPLICATION_ID,
  };
  const timeline = queryClient({ data: [timelineEvent], error: null });
  const events = await service.listApplicationTimeline(
    timeline.client,
    APPLICATION_ID,
  );
  assert.equal(events.length, 1);
  assert.ok(
    timeline.calls.some(
      (call) =>
        call.operation === "eq" &&
        call.column === "subject_type" &&
        call.value === "application",
    ),
  );
  assert.ok(
    timeline.calls.some(
      (call) =>
        call.operation === "order" &&
        call.column === "occurred_at" &&
        call.options.ascending === true,
    ),
  );
});

test("application service RPC migration preserves least privilege and audit contracts", () => {
  const migration = readFileSync(migrationPath, "utf8");

  for (const rpc of [
    "update_student_application",
    "assign_application_advisor",
    "update_application_financial_details",
  ]) {
    assert.match(migration, new RegExp(`function crm\\.${rpc}`, "i"));
  }
  assert.equal((migration.match(/security definer/gi) ?? []).length, 3);
  assert.equal((migration.match(/set search_path = ''/gi) ?? []).length, 3);
  assert.equal(
    (migration.match(/perform crm\.emit_domain_event/gi) ?? []).length,
    3,
  );
  assert.match(migration, /crm\.can_manage_application/i);
  assert.match(migration, /for update/g);
  assert.match(migration, /revoke all on function[\s\S]*from public/gi);
  assert.match(migration, /grant execute on function[\s\S]*to authenticated/gi);
  assert.doesNotMatch(migration, /grant update|create policy|service_role/i);
  assert.doesNotMatch(migration, /create table|application_status_history/i);
});
