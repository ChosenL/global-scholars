import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const METHODS = new Set(["download", "api", "html", "manual"]);
const REQUIRED = [
  "sourceName",
  "jurisdiction",
  "sourceUrl",
  "releaseVersion",
  "retrievalMethod",
  "licensingTermsNote",
  "adapterName",
  "enabled",
  "checksumRequired",
];

export function validateSourceConfig(config) {
  const errors = [];
  for (const field of REQUIRED)
    if (config?.[field] === undefined || config[field] === "")
      errors.push(`Missing required field: ${field}`);
  if (config?.jurisdiction && !/^[A-Z]{2}$/.test(config.jurisdiction))
    errors.push("jurisdiction must be uppercase ISO alpha-2");
  if (config?.sourceUrl && !config.sourceUrl.startsWith("https://"))
    errors.push("sourceUrl must use HTTPS");
  if (config?.retrievalMethod && !METHODS.has(config.retrievalMethod))
    errors.push("retrievalMethod is unsupported");
  if (config?.adapterName && !/^[a-z][a-z0-9_]+$/.test(config.adapterName))
    errors.push("adapterName is invalid");
  if (config?.checksumRequired !== true)
    errors.push("checksumRequired must be true");
  if (config?.enabled !== undefined && typeof config.enabled !== "boolean")
    errors.push("enabled must be boolean");
  return errors;
}

async function jsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? jsonFiles(path.join(directory, entry.name))
        : entry.name.endsWith(".json") &&
            !/\d{4}-\d{2}-\d{2}\.json$/.test(entry.name) &&
            entry.name !== "source-config.schema.json"
          ? [path.join(directory, entry.name)]
          : [],
    ),
  );
  return nested.flat();
}

export async function loadSourceConfigs() {
  const files = await jsonFiles(path.join(ROOT, "config", "sources"));
  return Promise.all(
    files.map(async (file) => ({
      file,
      config: JSON.parse(await readFile(file, "utf8")),
    })),
  );
}

export async function validateRepositoryConfiguration() {
  const sources = await loadSourceConfigs();
  return sources.flatMap(({ file, config }) =>
    validateSourceConfig(config).map((message) => ({
      file: path.relative(ROOT, file),
      message,
    })),
  );
}

export { ROOT };
