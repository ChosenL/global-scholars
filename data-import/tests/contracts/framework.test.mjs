import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  validateSourceConfig,
  loadSourceConfigs,
} from "../../scripts/lib/config.mjs";
import {
  crosswalkIdentity,
  deterministicIdentity,
  recordHash,
  sha256,
} from "../../scripts/lib/identity.mjs";
import {
  assertManifestSafe,
  createManifest,
  generateRunId,
  serializeManifest,
  validateRunId,
} from "../../scripts/lib/manifest.mjs";
import {
  validateCanonicalRecord,
  validateRelationships,
} from "../../scripts/lib/validation.mjs";
import { parseArgs, run } from "../../scripts/cli.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const checksum = sha256("synthetic-source");
const provenance = {
  sourceSystem: "test_source",
  sourceEntityId: "100",
  sourceUrl: "https://example.test/source",
  sourceVersion: "2026",
  retrievedAt: "2026-08-02T12:00:00.000Z",
  rawChecksum: checksum,
  mappingVersion: "1.0.0",
};

function country(overrides = {}) {
  const material = {
    entityType: "country",
    provenance,
    isoCode: "US",
    name: "United States",
    defaultCurrency: "USD",
    isActive: true,
    ...overrides,
  };
  const canonicalId = deterministicIdentity("country", {
    isoCode: material.isoCode,
  });
  return {
    ...material,
    canonicalId,
    recordHash: recordHash({ ...material, canonicalId }),
  };
}

test("all canonical JSON schemas are parseable contracts with closed object shapes", async () => {
  const directory = path.join(root, "config", "schemas", "canonical");
  const files = (await readdir(directory)).filter((name) =>
    name.endsWith(".schema.json"),
  );
  assert.deepEqual(files.sort(), [
    "campus.schema.json",
    "common.schema.json",
    "country.schema.json",
    "crosswalk.schema.json",
    "faculty.schema.json",
    "import-manifest.schema.json",
    "intake.schema.json",
    "program-campus.schema.json",
    "program.schema.json",
    "publication-diff.schema.json",
    "scholarship.schema.json",
    "university.schema.json",
    "validation-issue.schema.json",
  ]);
  for (const file of files) {
    const schema = JSON.parse(
      await readFile(path.join(directory, file), "utf8"),
    );
    assert.equal(
      schema.$schema,
      "https://json-schema.org/draft/2020-12/schema",
    );
    if (schema.type === "object")
      assert.equal(schema.additionalProperties, false);
  }
  assert.deepEqual(validateCanonicalRecord(country()), []);
});

test("run IDs, record identities, hashes, and crosswalks are deterministic", () => {
  const input = {
    createdAt: "2026-08-02T12:00:00.000Z",
    adapterName: "us_ipeds",
    sourceChecksum: checksum,
  };
  assert.equal(generateRunId(input), generateRunId({ ...input }));
  assert.equal(validateRunId(generateRunId(input)), true);
  assert.equal(
    deterministicIdentity("country", { b: 2, a: " US " }),
    deterministicIdentity("country", { a: "US", b: 2 }),
  );
  assert.equal(recordHash({ b: 2, a: 1 }), recordHash({ a: 1, b: 2 }));
  assert.equal(
    crosswalkIdentity("ipeds", "university", "123"),
    crosswalkIdentity("ipeds", "university", "123"),
  );
});

test("identical normalized input produces identical canonical identity", () => {
  const first = country();
  const second = country();
  assert.equal(first.canonicalId, second.canonicalId);
  assert.equal(first.recordHash, second.recordHash);
});

test("all source templates validate and unsafe source configuration is rejected", async () => {
  const configs = await loadSourceConfigs();
  assert.equal(configs.length, 6);
  for (const { config } of configs)
    assert.deepEqual(validateSourceConfig(config), []);
  assert.ok(
    validateSourceConfig({ sourceName: "bad", checksumRequired: false })
      .length > 0,
  );
});

test("manifests include required lineage and never serialize secrets", () => {
  const manifest = createManifest({
    createdAt: "2026-08-02T12:00:00.000Z",
    source: {
      name: "US IPEDS",
      jurisdiction: "US",
      url: "https://example.test/source",
      releaseVersion: "2026",
      retrievedAt: "2026-08-02T11:00:00.000Z",
      sha256: checksum,
    },
    versions: { adapter: "us_ipeds", mapping: "1.0.0", pipeline: "1.0.0" },
    gitCommit: "abcdef1234567",
    targetEnvironment: "test",
  });
  assert.equal(validateRunId(manifest.runId), true);
  assert.match(serializeManifest(manifest), /"gitCommit":"abcdef1234567"/);
  assert.throws(
    () => assertManifestSafe({ ...manifest, apiToken: "do-not-store" }),
    /forbidden secret/i,
  );
  assert.throws(
    () =>
      serializeManifest({
        ...manifest,
        source: {
          ...manifest.source,
          url: "https://user:password@example.test",
        },
      }),
    /forbidden secret/i,
  );
});

test("malformed records are rejected and unresolved relationships are reported", () => {
  const malformed = country({ isoCode: "usa" });
  const issues = validateCanonicalRecord(malformed);
  assert.ok(
    issues.some(
      ({ category, code }) =>
        category === "business-rule" && code === "INVALID_COUNTRY_CODE",
    ),
  );
  assert.ok(issues.every(({ quarantine }) => quarantine));
  const university = {
    entityType: "university",
    canonicalId: sha256("university"),
    recordHash: sha256("record"),
    provenance,
    countryCanonicalId: sha256("missing"),
    name: "Example University",
    slug: "example-university",
    catalogClassification: "degree_granting_institution",
    degreeGranting: true,
    acceptsDirectApplications: true,
    searchEligible: true,
    isActive: true,
  };
  assert.ok(
    validateRelationships([university]).some(
      ({ category }) => category === "relationship",
    ),
  );
});

test("CLI parsing, help, and errors work without database operations", async () => {
  assert.deepEqual(parseArgs(["plan", "--environment", "local"]), {
    command: "plan",
    options: { environment: "local" },
  });
  assert.throws(() => parseArgs(["unknown"]), /Unknown command/);
  assert.throws(() => parseArgs(["plan", "--bad", "x"]), /Unknown option/);
  const output = [];
  const errors = [];
  const io = {
    log: (line) => output.push(line),
    error: (line) => errors.push(line),
  };
  assert.equal(await run(["--help"], io), 0);
  assert.deepEqual(
    parseArgs(["publish", "--dry-run", "--environment", "preview"]),
    { command: "publish", options: { dryRun: true, environment: "preview" } },
  );
  assert.equal(await run(["plan", "--source", "missing_adapter"], io), 1);
  assert.match(errors.join("\n"), /Unknown configured source adapter/);
});
