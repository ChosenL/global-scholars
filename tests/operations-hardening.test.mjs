import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("every API route creates and returns request correlation identifiers", async () => {
  for (const route of [
    "../app/api/chat/route.ts",
    "../app/api/ai/route.ts",
    "../app/api/auth/supabase-identity/route.ts",
    "../app/api/health/route.ts",
  ]) {
    const content = await source(route);
    assert.match(content, /createRequestContext/);
    assert.match(content, /responseHeaders/);
  }
});

test("logging and error reporting redact sensitive values", async () => {
  const redaction = await source("../lib/operations/redaction.ts");
  const logger = await source("../lib/operations/logger.ts");
  const reporter = await source("../lib/operations/errorReporter.ts");
  assert.match(redaction, /authorization\|cookie\|token\|secret\|password\|passport/);
  assert.match(redaction, /REDACTED_EMAIL/);
  assert.match(logger, /redactForLogging/);
  assert.match(reporter, /interface ErrorReporter/);
  assert.match(reporter, /registerErrorReporter/);
});

test("AI routes enforce timeouts retries kill switch quotas and circuit protection", async () => {
  const resilience = await source("../lib/operations/aiResilience.ts");
  const aiRoute = await source("../app/api/ai/route.ts");
  const migration = await source("../supabase/migrations/20260821_add_operational_controls.sql");
  assert.match(resilience, /AI_OPERATIONS_ENABLED/);
  assert.match(resilience, /AbortController/);
  assert.match(resilience, /maxRetries/);
  assert.match(aiRoute, /consumeAiQuota/);
  assert.match(aiRoute, /consumeRateLimit/);
  assert.match(migration, /circuit_failure_threshold/);
  assert.match(migration, /create table crm\.ai_daily_usage/);
});

test("distributed rate limits store hashes rather than network or identity values", async () => {
  const rateLimit = await source("../lib/operations/rateLimit.ts");
  const migration = await source("../supabase/migrations/20260821_add_operational_controls.sql");
  assert.match(rateLimit, /createHash\("sha256"\)/);
  assert.match(migration, /key_hash text not null/);
  assert.doesNotMatch(migration, /ip_address|clerk_user_id|email/);
  assert.match(migration, /rate_key_hash !~ '\^\[a-f0-9\]\{64\}\$'/);
});
