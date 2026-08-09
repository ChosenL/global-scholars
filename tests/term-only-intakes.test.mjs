import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
test("term-only migration is additive and never manufactures a date", () => {
  const sql = readFileSync(
    "supabase/migrations/20260831_add_term_precision_to_crm_intakes.sql",
    "utf8",
  );
  assert.match(sql, /start_date_precision text not null default 'exact'/i);
  assert.match(sql, /start_date drop not null/i);
  assert.match(sql, /start_date_precision='term' and start_date is null/i);
  assert.match(sql, /intakes_exact_unique/i);
  assert.match(sql, /intakes_term_unique/i);
});
test("selectors render term-only and exact-date labels safely", () => {
  const component = readFileSync(
    "features/applications/components/IntakeSelector.tsx",
    "utf8",
  );
  assert.match(component, /start_date_precision === "term"/);
  assert.match(component, /return intake\.name/);
  assert.match(component, /day: "numeric"/);
});
