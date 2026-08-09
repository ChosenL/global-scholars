import { createHash } from "node:crypto";

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key])]),
    );
  }
  return typeof value === "string" ? value.normalize("NFC").trim() : value;
}

export function stableStringify(value) {
  return JSON.stringify(normalize(value));
}

export function sha256(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return createHash("sha256").update(input).digest("hex");
}

export function deterministicIdentity(entityType, naturalKey) {
  if (!entityType || !naturalKey || typeof naturalKey !== "object") {
    throw new TypeError(
      "entityType and an exact naturalKey object are required",
    );
  }
  return sha256(stableStringify({ entityType, naturalKey }));
}

export function recordHash(record) {
  const material = { ...record };
  delete material.canonicalId;
  delete material.recordHash;
  return sha256(stableStringify(material));
}

export function crosswalkIdentity(sourceSystem, entityType, sourceEntityId) {
  if (
    ![sourceSystem, entityType, sourceEntityId].every(
      (value) => typeof value === "string" && value.trim(),
    )
  ) {
    throw new TypeError(
      "Crosswalk identity requires non-empty exact source identifiers",
    );
  }
  return deterministicIdentity("crosswalk", {
    sourceSystem,
    entityType,
    sourceEntityId,
  });
}
