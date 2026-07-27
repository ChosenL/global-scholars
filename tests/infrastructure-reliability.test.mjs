import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("liveness remains available and directs monitoring to dependency readiness", async () => {
  const health = await source("../app/api/health/route.ts");
  assert.match(health, /status: "ok"/);
  assert.match(health, /status: 200/);
  assert.match(health, /readinessPath: "\/api\/ready"/);
  assert.match(health, /Cache-Control.*no-store/);
});

test("readiness verifies the database while allowing AI degradation", async () => {
  const route = await source("../app/api/ready/route.ts");
  const probe = await source("../lib/operations/readiness.ts");
  assert.match(route, /checkDatabaseReadiness/);
  assert.match(route, /required: false/);
  assert.match(route, /status: 503/);
  assert.match(route, /createRequestContext/);
  assert.match(route, /responseHeaders/);
  assert.match(probe, /AbortController/);
  assert.match(probe, /READINESS_DATABASE_TIMEOUT_MS/);
  assert.match(probe, /\.rpc\("operational_readiness"\)/);
});

test("database readiness probe is non-privileged and discloses no business data", async () => {
  const migration = await source(
    "../supabase/migrations/20260822_add_infrastructure_readiness.sql",
  );
  assert.match(migration, /security invoker/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /revoke all .* from public/);
  assert.match(migration, /grant execute .* to anon, authenticated/);
  assert.doesNotMatch(migration, /security definer|crm\.profiles|clerk_user_id/);
});

test("private storage links retain bounded expiry controls", async () => {
  const documents = await source(
    "../app/scholar-dashboard/services/studentDocuments.ts",
  );
  const messages = await source(
    "../app/scholar-dashboard/services/messages.ts",
  );
  assert.match(documents, /createSignedUrl\(\s*document\.storage_path,\s*60 \* 5/s);
  assert.match(messages, /MESSAGE_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 \* 10/);
});

test("recovery documentation defines RTO RPO restore and signed-link evidence", async () => {
  const recovery = await source("../docs/operations/disaster-recovery-plan.md");
  const validation = await source(
    "../docs/operations/backup-restore-validation.md",
  );
  assert.match(recovery, /RTO/);
  assert.match(recovery, /RPO/);
  assert.match(validation, /checksum/i);
  assert.match(validation, /cross-user/i);
  assert.match(validation, /expir/i);
  assert.match(validation, /isolated restore/i);
});
