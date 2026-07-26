import { PlatformServiceError } from "./platformErrors";

export function requireCrmUuid(value: string, fieldName: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new PlatformServiceError(
      "VALIDATION_FAILED",
      `${fieldName} must be a CRM UUID.`,
    );
  }
  return value;
}

export function requireTrimmedText(
  value: string,
  fieldName: string,
  minimum: number,
  maximum: number,
): string {
  const trimmed = value.trim();
  if (trimmed.length < minimum || trimmed.length > maximum) {
    throw new PlatformServiceError(
      "VALIDATION_FAILED",
      `${fieldName} must contain ${minimum}-${maximum} characters.`,
    );
  }
  return trimmed;
}

export function requireLimit(
  value: number,
  maximum = 100,
): number {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new PlatformServiceError(
      "VALIDATION_FAILED",
      `Limit must be an integer between 1 and ${maximum}.`,
    );
  }
  return value;
}
