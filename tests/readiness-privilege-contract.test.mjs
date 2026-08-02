import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const migrationsDirectory = new URL("../supabase/migrations/", import.meta.url);

async function migration(name) {
  return readFile(new URL(name, migrationsDirectory), "utf8");
}

test("readiness schema usage migration grants no data or function privileges", async () => {
  const sql = await migration("20260827_grant_anon_crm_schema_usage.sql");

  assert.equal(sql.trim().toLowerCase(), "grant usage on schema crm to anon;");
  assert.doesNotMatch(
    sql,
    /grant\s+(select|insert|update|delete|truncate|references|trigger)/i,
  );
  assert.doesNotMatch(sql, /grant\s+execute/i);
  assert.doesNotMatch(
    sql,
    /alter\s+table|create\s+policy|disable\s+row\s+level\s+security/i,
  );
});

test("anonymous readiness access stays narrower than protected CRM access", async () => {
  const names = await readdir(migrationsDirectory);
  const sources = await Promise.all(
    names.filter((name) => name.endsWith(".sql")).map(migration),
  );
  const allMigrations = sources.join("\n");
  const readiness = await migration(
    "20260822_add_infrastructure_readiness.sql",
  );

  assert.match(
    readiness,
    /grant\s+execute\s+on\s+function\s+crm\.operational_readiness\(\)\s+to\s+anon,\s*authenticated/i,
  );
  assert.doesNotMatch(
    allMigrations,
    /grant\s+select[^;]*on(?:\s+table)?\s+crm\.[^;]*\s+to\s+anon/i,
  );
  assert.doesNotMatch(
    allMigrations,
    /grant\s+execute\s+on\s+function\s+crm\.(?:create|update|archive|assign|remove|change|transition)[a-z0-9_]*\([^;]*\)\s+to\s+anon/i,
  );
});
