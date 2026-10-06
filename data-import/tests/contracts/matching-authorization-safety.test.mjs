import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNonProductionDatabaseTarget,
  databaseUrlTargetsProduction,
} from "../../scripts/test-matching-authorization.mjs";

const productionRef = "lrgnsdxsuhzufodnstyn";

test("matching authorization guard detects Production Supabase URLs", () => {
  assert.equal(
    databaseUrlTargetsProduction(
      `postgresql://postgres.${productionRef}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    ),
    true,
  );
  assert.equal(
    databaseUrlTargetsProduction(
      `postgresql://postgres:secret@db.${productionRef}.supabase.co:5432/postgres`,
    ),
    true,
  );
});

test("matching authorization guard allows non-Production Supabase URLs", () => {
  assert.equal(
    databaseUrlTargetsProduction(
      "postgresql://postgres.zrroenacchnvyunfgwkc:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    ),
    false,
  );
});

test("matching authorization guard fails closed unless explicitly overridden", () => {
  const previous = process.env.ALLOW_PRODUCTION_DB_TESTS;
  delete process.env.ALLOW_PRODUCTION_DB_TESTS;
  assert.throws(
    () =>
      assertNonProductionDatabaseTarget(
        `postgresql://postgres.${productionRef}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
      ),
    /Refusing to run database authorization tests against the Production Supabase project/,
  );
  process.env.ALLOW_PRODUCTION_DB_TESTS = "true";
  assert.doesNotThrow(() =>
    assertNonProductionDatabaseTarget(
      `postgresql://postgres.${productionRef}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    ),
  );
  if (previous === undefined) {
    delete process.env.ALLOW_PRODUCTION_DB_TESTS;
  } else {
    process.env.ALLOW_PRODUCTION_DB_TESTS = previous;
  }
});
