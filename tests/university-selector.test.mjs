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
        : (() => {
            throw new Error(`Unexpected dependency ${specifier}`);
          })(),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
function catalogClient(rows) {
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
    client: {
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
const universities = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Springfield University",
    is_active: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Springfield University",
    is_active: true,
  },
];

test("university search is case-insensitive, active-only, and preserves duplicate names by ID", async () => {
  const service = loadService();
  const catalog = catalogClient(universities);
  const result = await service.searchUniversities(catalog.client, "sPrInG");
  assert.deepEqual(result, universities);
  assert.ok(
    catalog.calls.some(
      (call) => call[0] === "eq" && call[1] === "is_active" && call[2] === true,
    ),
  );
  assert.ok(
    catalog.calls.some(
      (call) =>
        call[0] === "eq" && call[1] === "search_eligible" && call[2] === true,
    ),
  );
  assert.ok(
    catalog.calls.some((call) => call[0] === "ilike" && call[2] === "%sPrInG%"),
  );
  assert.notEqual(result[0].id, result[1].id);
});

test("university search exposes an empty catalog result", async () => {
  const service = loadService();
  assert.deepEqual(
    await service.searchUniversities(catalogClient([]).client, "missing"),
    [],
  );
});

test("selector implements incremental states and keyboard selection", () => {
  const source = readFileSync(
    path.join(
      root,
      "features",
      "applications",
      "components",
      "UniversitySelector.tsx",
    ),
    "utf8",
  );
  for (const contract of [
    "250",
    'role="combobox"',
    'role="listbox"',
    "ArrowDown",
    "ArrowUp",
    "Enter",
    "Escape",
    "Loading universities",
    "No universities found",
    "Unable to load universities",
    "option.id",
    "option.name",
  ])
    assert.match(source, new RegExp(contract));
});
