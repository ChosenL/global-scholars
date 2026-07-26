import {
  requireCrmUuid,
  requireTrimmedText,
} from "@/lib/crm/validation";

export function validateVisaCaseIdentity(
  visaCaseId: string,
): string {
  return requireCrmUuid(visaCaseId, "Visa case");
}

export function validateVisaType(visaType: string): string {
  return requireTrimmedText(visaType, "Visa type", 2, 100);
}

export function validateDocumentPurpose(purpose: string): string {
  return requireTrimmedText(purpose, "Document purpose", 2, 150);
}
