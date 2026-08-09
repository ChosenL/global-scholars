import { sha256, stableStringify } from "./identity.mjs";

const RUN_ID = /^[0-9]{8}T[0-9]{6}Z-[a-z0-9_]+-[a-f0-9]{12}$/;
const SECRET_KEY =
  /(authorization|cookie|password|passwd|secret|token|api[-_]?key|private[-_]?key|connection[-_]?string|database[-_]?url)/i;

export function generateRunId({ createdAt, adapterName, sourceChecksum }) {
  const instant = new Date(createdAt);
  if (Number.isNaN(instant.valueOf()))
    throw new TypeError("createdAt must be a valid date-time");
  if (!/^[a-z][a-z0-9_]+$/.test(adapterName))
    throw new TypeError("adapterName is invalid");
  if (!/^[a-f0-9]{64}$/.test(sourceChecksum))
    throw new TypeError("sourceChecksum must be SHA-256");
  const stamp = instant
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `${stamp}-${adapterName}-${sha256(`${adapterName}:${sourceChecksum}`).slice(0, 12)}`;
}

export function validateRunId(runId) {
  return RUN_ID.test(runId);
}

export function findSecretPaths(value, path = "$") {
  if (
    typeof value === "string" &&
    (/\bBearer\s+[A-Za-z0-9._~+/=-]+/i.test(value) ||
      /^https?:\/\/[^/@\s]+:[^/@\s]+@/.test(value))
  )
    return [path];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    return [
      ...(SECRET_KEY.test(key) ? [childPath] : []),
      ...findSecretPaths(child, childPath),
    ];
  });
}

export function assertManifestSafe(manifest) {
  const paths = findSecretPaths(manifest);
  if (paths.length)
    throw new Error(
      `Manifest contains forbidden secret fields: ${paths.join(", ")}`,
    );
  return manifest;
}

export function createManifest(input) {
  const manifest = {
    runId: generateRunId({
      createdAt: input.createdAt,
      adapterName: input.versions.adapter,
      sourceChecksum: input.source.sha256,
    }),
    createdAt: new Date(input.createdAt).toISOString(),
    source: { ...input.source },
    versions: { ...input.versions },
    gitCommit: input.gitCommit,
    targetEnvironment: input.targetEnvironment,
    stages: Object.fromEntries(
      ["acquire", "normalize", "validate", "plan", "publish", "reconcile"].map(
        (stage) => [stage, { status: "pending", counts: {} }],
      ),
    ),
  };
  assertManifestSafe(manifest);
  return manifest;
}

export function serializeManifest(manifest) {
  assertManifestSafe(manifest);
  return `${stableStringify(manifest)}\n`;
}

export function updateStage(manifest, stage, status, counts = {}) {
  if (!manifest.stages?.[stage])
    throw new Error(`Unknown manifest stage: ${stage}`);
  if (
    !Object.values(counts).every(
      (count) => Number.isInteger(count) && count >= 0,
    )
  )
    throw new TypeError("Stage counts must be non-negative integers");
  return assertManifestSafe({
    ...manifest,
    stages: {
      ...manifest.stages,
      [stage]: { ...manifest.stages[stage], status, counts: { ...counts } },
    },
  });
}
