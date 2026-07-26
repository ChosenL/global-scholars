export type PlatformErrorCode =
  | "AUTHORIZATION_DENIED"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "SERVICE_UNAVAILABLE"
  | "UNKNOWN";

export class PlatformServiceError extends Error {
  constructor(
    public readonly code: PlatformErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "PlatformServiceError";
  }
}

export function toPlatformServiceError(
  cause: unknown,
  fallbackMessage: string,
): PlatformServiceError {
  if (cause instanceof PlatformServiceError) return cause;
  const message = cause instanceof Error ? cause.message : fallbackMessage;
  const normalized = message.toLowerCase();
  const code: PlatformErrorCode = normalized.includes("access denied")
    || normalized.includes("authorized")
    ? "AUTHORIZATION_DENIED"
    : normalized.includes("not found")
      ? "NOT_FOUND"
      : normalized.includes("invalid")
        ? "VALIDATION_FAILED"
        : "UNKNOWN";
  return new PlatformServiceError(code, message, cause);
}
