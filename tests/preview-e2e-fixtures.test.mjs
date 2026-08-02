import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const APPLICATION_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ENTITY_NAMESPACES = [
  "advisor-1",
  "advisor-2",
  "organization-student",
  "application-student",
  "university",
  "campus",
  "program",
  "intake",
  "application-conversation",
  "application-conversation:advisor-1",
  "application-conversation:advisor-2",
  "application-conversation:student",
];

const PROVISION_ONLY_NAMESPACES = [
  "application-conversation:advisor-1",
  "application-conversation:advisor-2",
  "application-conversation:student",
];

function deterministicFixtureUuid(sourceValue) {
  const hash = createHash("md5").update(sourceValue).digest("hex");
  const rfcHex = `${hash.slice(0, 12)}5${hash.slice(13, 16)}a${hash.slice(17)}`;
  return [
    rfcHex.slice(0, 8),
    rfcHex.slice(8, 12),
    rfcHex.slice(12, 16),
    rfcHex.slice(16, 20),
    rfcHex.slice(20),
  ].join("-");
}

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Preview fixtures are synthetic, parameterized, and deployment-independent", async () => {
  const fixture = await source("../supabase/fixtures/preview_e2e.sql");

  assert.match(fixture, /PREVIEW ONLY/i);
  assert.match(fixture, /:'run_id'/);
  assert.match(fixture, /e2e-preview-/);
  assert.match(fixture, /@example\.invalid/g);
  assert.match(fixture, /on conflict \(id\) do update/gi);
  assert.match(
    fixture,
    /Application student\/intake pair already has an active application/,
  );
  assert.match(fixture, /insert into crm\.conversations/i);
  assert.match(fixture, /insert into crm\.conversation_participants/i);
  assert.match(fixture, /advisor_one_id, 'advisor'/i);
  assert.match(fixture, /advisor_two_id, 'advisor'/i);
  assert.match(fixture, /application_student_id, 'student'/i);
  assert.doesNotMatch(fixture, /service_role|@gmail\.|@outlook\.|@yahoo\./i);
});

test("every deterministic fixture identifier is an application-valid RFC UUID", async () => {
  const fixture = await source("../supabase/fixtures/preview_e2e.sql");
  const cleanup = await source("../supabase/fixtures/cleanup_preview_e2e.sql");
  const prefix = "e2e-preview-contract-run";
  const sources = [
    ...ENTITY_NAMESPACES.map((namespace) => `${prefix}:${namespace}`),
    "e2e-preview:country:xz",
  ];
  const firstPass = sources.map(deterministicFixtureUuid);
  const secondPass = sources.map(deterministicFixtureUuid);

  assert.deepEqual(firstPass, secondPass, "the same run must be deterministic");
  assert.equal(
    new Set(firstPass).size,
    sources.length,
    "entity namespaces must produce distinct identifiers",
  );

  for (const id of firstPass) {
    assert.match(id, APPLICATION_UUID_PATTERN);
    assert.equal(id[14], "5", "UUID version nibble must be 5");
    assert.match(id[19], /^[89ab]$/, "UUID variant must be RFC 4122");
  }

  for (const sql of [fixture, cleanup]) {
    assert.match(
      sql,
      /create function pg_temp\.preview_e2e_uuid\(source text\)/i,
    );
    assert.match(sql, /substr\(hash, 1, 12\) \|\| '5'/i);
    assert.match(sql, /'a' \|\| substr\(hash, 18, 15\)/i);
    assert.match(sql, /\)::uuid/i);
    const prefixExpression = sql === cleanup ? "seed.prefix" : "prefix";
    const requiredNamespaces =
      sql === cleanup
        ? ENTITY_NAMESPACES.filter(
            (namespace) => !PROVISION_ONLY_NAMESPACES.includes(namespace),
          )
        : ENTITY_NAMESPACES;
    for (const namespace of requiredNamespaces) {
      assert.match(
        sql,
        new RegExp(
          `pg_temp\\.preview_e2e_uuid\\(${prefixExpression.replace(".", "\\.")} \\|\\| ':${namespace}'\\)`,
          "i",
        ),
      );
    }
    assert.match(sql, /pg_temp\.preview_e2e_uuid\('e2e-preview:country:xz'\)/i);
  }
  assert.doesNotMatch(fixture, /md5\([^)]*\)::uuid/i);
  assert.match(cleanup, /legacy_program_id/i);
  assert.match(cleanup, /legacy_campus_id/i);
});

test("Preview cleanup is run-scoped and respects foreign-key order", async () => {
  const cleanup = await source("../supabase/fixtures/cleanup_preview_e2e.sql");

  assert.match(cleanup, /PREVIEW ONLY/i);
  assert.match(cleanup, /:'run_id'/);
  assert.match(cleanup, /slug like fixture\.prefix \|\| '-%'/i);
  assert.match(
    cleanup,
    /\^e2e-partner-' \|\| fixture\.run_id \|\| '-\[0-9\]\+\$'/i,
  );
  assert.ok(
    cleanup.indexOf("delete from crm.application_status_history") <
      cleanup.indexOf("delete from crm.student_applications"),
  );
  assert.ok(
    cleanup.indexOf("delete from crm.attachments") <
      cleanup.indexOf("delete from crm.messages"),
  );
  assert.ok(
    cleanup.indexOf("delete from crm.messages") <
      cleanup.indexOf("delete from crm.conversation_participants"),
  );
  assert.ok(
    cleanup.indexOf("delete from crm.conversation_participants") <
      cleanup.indexOf("delete from crm.conversations"),
  );
  assert.ok(
    cleanup.indexOf("delete from crm.intakes") <
      cleanup.indexOf("delete from crm.programs"),
  );
  assert.match(
    cleanup,
    /set deleted_at = coalesce\(profile\.deleted_at, now\(\)\)/i,
  );
  assert.doesNotMatch(cleanup, /truncate|delete from crm\.audit_log/i);
  assert.match(
    cleanup,
    /program_campus\.program_id in \(\s*fixture\.program_id,\s*fixture\.legacy_program_id/i,
  );
  assert.match(
    cleanup,
    /program_campus\.campus_id in \(\s*fixture\.campus_id,\s*fixture\.legacy_campus_id/i,
  );
  assert.doesNotMatch(
    cleanup,
    /where\s+(?:program_campuses\.)?program_id\s*=\s*program_id\b/i,
  );
  assert.doesNotMatch(
    cleanup,
    /\b(?:id|profile_id|organization_id|application_id|program_id|campus_id|intake_id|country_id)\s*=\s*(?:id|profile_id|organization_id|application_id|program_id|campus_id|intake_id|country_id)\b/i,
  );
});

test("organization workflow slugs share the fixture cleanup namespace", async () => {
  const organizationFixture = await source("../e2e/fixtures/organization.ts");

  assert.match(
    organizationFixture,
    /slug: `e2e-preview-\$\{suffix\}-organization`/,
  );
  assert.doesNotMatch(organizationFixture, /slug: `e2e-partner-/);
});

test("Playwright owns a fresh provision and cleanup lifecycle", async () => {
  const config = await source("../playwright.config.ts");
  const lifecycle = await source("../e2e/fixtures/previewDatabase.ts");
  const runner = await source("../e2e/run-playwright.mjs");
  const setup = await source("../e2e/preview.global-setup.ts");
  const teardown = await source("../e2e/preview.global-teardown.ts");

  assert.match(config, /configurePreviewFixtureEnvironment\(\)/);
  assert.match(config, /globalSetup: "\.\/e2e\/preview\.global-setup\.ts"/);
  assert.match(
    config,
    /globalTeardown: "\.\/e2e\/preview\.global-teardown\.ts"/,
  );
  assert.match(lifecycle, /PLAYWRIGHT_E2E_GENERATED_RUN_ID/);
  assert.doesNotMatch(lifecycle, /randomBytes|Date\.now/);
  assert.match(runner, /randomBytes\(5\)/);
  assert.match(runner, /process\.env\.E2E_RUN_ID\?\.trim\(\) \|\|/);
  assert.match(runner, /PLAYWRIGHT_E2E_GENERATED_RUN_ID: "true"/);
  assert.match(runner, /E2E_RUN_ID: runId/);
  assert.doesNotMatch(lifecycle, /process\.env\.E2E_RUN_ID\s*=/);
  assert.match(lifecycle, /preview_e2e\.sql/);
  assert.match(lifecycle, /cleanup_preview_e2e\.sql/);
  assert.match(setup, /provisionPreviewFixtures/);
  assert.match(teardown, /cleanupPreviewFixtures/);
});

test("Preview cleanup database regression covers deletion safety and rolls back", async () => {
  const regression = await source("../supabase/tests/preview_e2e_cleanup.sql");

  assert.match(regression, /^begin;/i);
  assert.match(regression, /delete from crm\.application_status_history/i);
  assert.match(regression, /delete from crm\.student_applications/i);
  assert.match(
    regression,
    /crm\.assign_application_advisor\(application_id, advisor_one_id\)/i,
  );
  assert.match(
    regression,
    /crm\.assign_application_advisor\(application_id, advisor_two_id\)/i,
  );
  assert.match(regression, /all three active participants/i);
  assert.match(regression, /Unrelated profile was unexpectedly authorized/i);
  assert.match(regression, /delete from crm\.conversation_participants/i);
  assert.match(regression, /delete from crm\.conversations/i);
  assert.match(regression, /unrelated_conversation_id/i);
  assert.match(regression, /delete from crm\.organization_advisors/i);
  assert.match(regression, /delete from crm\.organization_students/i);
  assert.match(regression, /delete from crm\.organizations/i);
  assert.match(regression, /delete from crm\.intakes/i);
  assert.match(regression, /delete from crm\.program_campuses/i);
  assert.match(regression, /delete from crm\.programs/i);
  assert.match(regression, /delete from crm\.campuses/i);
  assert.match(regression, /delete from crm\.universities/i);
  assert.match(regression, /did not soft-deactivate fixture profiles/i);
  assert.match(regression, /modified unrelated data/i);
  assert.match(regression, /country that is still referenced/i);
  assert.match(regression, /unused synthetic country/i);
  assert.match(regression, /rollback;\s*$/i);
  assert.doesNotMatch(regression, /delete from crm\.audit_log|truncate/i);
});
