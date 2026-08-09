import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")),
  "..",
);
function loadService() {
  const file = path.join(root, "lib", "crm", "admissionsCatalog.ts");
  const output = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: file,
  }).outputText;
  const loaded = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, {
    filename: file,
  })(
    (specifier) =>
      specifier === "./validation"
        ? { requireCrmUuid: (value) => value }
        : null,
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
function client(rows) {
  const calls = [];
  const chain = {
    select(value) {
      calls.push(["select", value]);
      return this;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return this;
    },
    ilike(column, value) {
      calls.push(["ilike", column, value]);
      return this;
    },
    order(column) {
      calls.push(["order", column]);
      return this;
    },
    limit(value) {
      calls.push(["limit", value]);
      return Promise.resolve({ data: rows, error: null });
    },
  };
  return {
    calls,
    value: {
      schema(name) {
        assert.equal(name, "crm");
        return {
          from(table) {
            calls.push(["from", table]);
            return chain;
          },
        };
      },
    },
  };
}

test("program search is partial, university-scoped, active-only, bounded, and deterministic", async () => {
  const catalog = client([
    {
      id: "program-1",
      name: "Master of Science",
      university_id: "university-1",
      is_active: true,
    },
  ]);
  const result = await loadService().searchPrograms(
    catalog.value,
    "university-1",
    "science",
    20,
  );
  assert.equal(result.length, 1);
  assert.ok(
    catalog.calls.some(
      (call) =>
        call[0] === "eq" &&
        call[1] === "university_id" &&
        call[2] === "university-1",
    ),
  );
  assert.ok(
    catalog.calls.some(
      (call) => call[0] === "eq" && call[1] === "is_active" && call[2] === true,
    ),
  );
  assert.ok(
    catalog.calls.some(
      (call) => call[0] === "ilike" && call[2] === "%science%",
    ),
  );
  assert.deepEqual(
    catalog.calls.filter((call) => call[0] === "order").map((call) => call[1]),
    ["name", "id"],
  );
});
test("program search supports empty results", async () => {
  assert.deepEqual(
    await loadService().searchPrograms(
      client([]).value,
      "university-1",
      "missing",
    ),
    [],
  );
});
test("intakes are program-scoped, open-only, and chronological", async () => {
  const catalog = client([
    { id: "intake-1", status: "open", program_id: "program-1" },
  ]);
  await loadService().listOpenIntakes(catalog.value, "program-1");
  assert.ok(
    catalog.calls.some(
      (call) =>
        call[0] === "eq" && call[1] === "program_id" && call[2] === "program-1",
    ),
  );
  assert.ok(
    catalog.calls.some(
      (call) => call[0] === "eq" && call[1] === "status" && call[2] === "open",
    ),
  );
  assert.deepEqual(
    catalog.calls.filter((call) => call[0] === "order").map((call) => call[1]),
    ["start_date", "id"],
  );
});
test("selectors implement cascading resets, catalog states, and keyboard contracts", () => {
  const page = readFileSync(
    path.join(
      root,
      "features",
      "applications",
      "components",
      "ApplicationListPage.tsx",
    ),
    "utf8",
  );
  const program = readFileSync(
    path.join(
      root,
      "features",
      "applications",
      "components",
      "ProgramSelector.tsx",
    ),
    "utf8",
  );
  const intake = readFileSync(
    path.join(
      root,
      "features",
      "applications",
      "components",
      "IntakeSelector.tsx",
    ),
    "utf8",
  );
  assert.match(
    page,
    /universityId: university\?\.id[\s\S]*programId: ""[\s\S]*intakeId: ""/,
  );
  assert.match(page, /key=\{form\.universityId \|\| "no-university"\}/);
  assert.match(page, /programId: program\?\.id[\s\S]*intakeId: ""/);
  assert.doesNotMatch(page, /Degree level field|Intake field|Program field/);
  for (const value of [
    "ArrowDown",
    "ArrowUp",
    "Enter",
    "Escape",
    "Searching programs",
    "No programs found",
    "Unable to load programs",
  ])
    assert.match(program, new RegExp(value));
  for (const value of [
    "Loading intakes",
    "No open intakes found",
    "Unable to load intakes",
    "start_date",
  ])
    assert.match(intake, new RegExp(value));
});
test("application creation verifies university, active program, and open intake hierarchy", () => {
  const source = readFileSync(
    path.join(root, "lib", "crm", "applications.ts"),
    "utf8",
  );
  for (const value of [
    'eq("program_id", programId)',
    'eq("status", "open")',
    'eq("programs.university_id", universityId)',
    'eq("programs.is_active", true)',
    "create_student_application",
  ])
    assert.match(source, new RegExp(value.replace(/[()]/g, "\\$&")));
});
