const sensitiveKeyPattern =
  /authorization|cookie|token|secret|password|passport|ssn|email|phone|prompt|context|signed.?url|storage.?path/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi;
const urlSecretPattern = /([?&](?:token|signature|sig|key)=)[^&\s]+/gi;

function redactString(value: string): string {
  return value
    .replace(emailPattern, "[REDACTED_EMAIL]")
    .replace(bearerPattern, "Bearer [REDACTED]")
    .replace(urlSecretPattern, "$1[REDACTED]")
    .slice(0, 2000);
}

export function redactForLogging(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 5) return "[REDACTED_DEPTH]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactForLogging(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 100)
        .map(([key, item]) => [
          key,
          sensitiveKeyPattern.test(key)
            ? "[REDACTED]"
            : redactForLogging(item, depth + 1),
        ]),
    );
  }
  return String(value);
}
