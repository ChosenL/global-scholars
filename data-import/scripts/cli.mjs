#!/usr/bin/env node
import {
  validateRepositoryConfiguration,
  loadSourceConfigs,
} from "./lib/config.mjs";
import {
  acquire,
  normalize,
  validate,
  plan,
  publish,
} from "./lib/pipeline.mjs";

const COMMANDS = [
  "acquire",
  "normalize",
  "validate",
  "plan",
  "publish",
  "reconcile",
  "resume",
];
const HELP = `University admissions catalog import framework

Usage: node data-import/scripts/cli.mjs <command> [--source <adapter>] [--environment <name>] [--limit <number|all>] [--dry-run]

Commands:
  acquire     Download/verify the immutable source snapshot
  normalize   Convert the snapshot to canonical local records
  validate    Validate canonical records, identity, lineage, and relationships
  plan        Generate an offline publication and reconciliation plan
  publish     Transactionally publish validated records to the preview catalog

Options:
  --source <adapter>       Restrict the command to one configured adapter
  --environment <name>    local only for data operations
  --limit <number|all>    Pilot size (default 50) or complete matching dataset
  --dry-run               Generate the deterministic report without database writes
  -h, --help              Show this help
`;
export function parseArgs(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h"))
    return { help: true };
  const [command, ...rest] = argv;
  if (!COMMANDS.includes(command))
    throw new Error(`Unknown command: ${command}`);
  const options = {};
  for (let index = 0; index < rest.length;) {
    const flag = rest[index];
    if (flag === "--dry-run") {
      options.dryRun = true;
      index += 1;
      continue;
    }
    const value = rest[index + 1];
    if (!["--source", "--environment", "--limit"].includes(flag))
      throw new Error(`Unknown option: ${flag}`);
    if (!value || value.startsWith("--"))
      throw new Error(`Missing value for ${flag}`);
    options[flag.slice(2)] = value;
    index += 2;
  }
  if (
    options.environment &&
    !["local", "test", "preview", "staging", "production"].includes(
      options.environment,
    )
  )
    throw new Error(`Invalid environment: ${options.environment}`);
  if (
    options.limit &&
    options.limit !== "all" &&
    (!/^\d+$/.test(options.limit) || Number(options.limit) < 1)
  )
    throw new Error("--limit must be a positive integer or all");
  return { command, options };
}
export async function run(argv, io = console) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    io.log(HELP);
    return 0;
  }
  const failures = await validateRepositoryConfiguration();
  if (failures.length) {
    failures.forEach((failure) =>
      io.error(`CONFIG_ERROR ${failure.file}: ${failure.message}`),
    );
    return 1;
  }
  const configured = await loadSourceConfigs();
  const selected = configured.filter(
    ({ config }) =>
      config.enabled &&
      (!parsed.options.source || config.adapterName === parsed.options.source),
  );
  if (
    parsed.options.source &&
    !configured.some(
      ({ config }) => config.adapterName === parsed.options.source,
    )
  ) {
    io.error(`Unknown configured source adapter: ${parsed.options.source}`);
    return 1;
  }
  if (
    ["acquire", "normalize", "validate", "plan"].includes(parsed.command) &&
    parsed.options.environment &&
    parsed.options.environment !== "local" &&
    parsed.options.environment !== "test"
  ) {
    io.error("Data operations are local-only until publishing is implemented.");
    return 1;
  }
  if (
    parsed.command === "publish" &&
    parsed.options.environment &&
    parsed.options.environment !== "preview"
  ) {
    io.error(
      "Publishing is restricted to the preview environment in this step.",
    );
    return 1;
  }
  if (["reconcile", "resume"].includes(parsed.command)) {
    io.log(
      `NOT_IMPLEMENTED ${parsed.command}: no data or database operation was performed.`,
    );
    return 0;
  }
  try {
    for (const { config } of selected) {
      if (parsed.command === "acquire") {
        const result = await acquire(config);
        io.log(
          `ACQUIRED ${config.adapterName}: ${result.snapshot.artifacts.length} verified artifacts`,
        );
      }
      if (parsed.command === "normalize") {
        const result = await normalize(config, { limit: parsed.options.limit });
        io.log(
          `NORMALIZED ${config.adapterName}: ${result.records.length} canonical records (${result.manifest.runId})`,
        );
      }
      if (parsed.command === "validate") {
        const result = await validate(config);
        io.log(
          `VALIDATION ${config.adapterName}: valid=${result.report.valid} records=${result.report.counts.records} errors=${result.report.counts.errors} warnings=${result.report.counts.warnings}`,
        );
        if (!result.report.valid) return 1;
      }
      if (parsed.command === "plan") {
        const result = await plan(config);
        io.log(
          `PLAN ${config.adapterName}: ${result.publicationPlan.operations.length} offline operations; checksum=${result.publicationPlan.checksum}`,
        );
        io.log("No database writes were performed.");
      }
      if (parsed.command === "publish") {
        const result = await publish(config, {
          dryRun: parsed.options.dryRun === true,
          environment: parsed.options.environment ?? "preview",
        });
        io.log(
          `PUBLISH ${config.adapterName}: status=${result.report.status} insert=${result.report.counts.insert} update=${result.report.counts.update} unchanged=${result.report.counts.unchanged} skipped=${result.report.counts.skipped}`,
        );
        io.log(
          `RECONCILED foreignKeys=${result.reconciliation.foreignKeyIntegrity} identities=${result.reconciliation.identityConsistency}`,
        );
      }
    }
    return 0;
  } catch (error) {
    io.error(`ERROR ${error.message}`);
    return 1;
  }
}
if (
  process.argv[1] &&
  import.meta.url ===
    new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href
)
  run(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`ERROR ${error.message}`);
      process.exitCode = 1;
    });
