import type { OrganizationFormValues } from "./types";

export type OrganizationFormErrors = Partial<
  Record<keyof OrganizationFormValues, string>
>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function slugifyOrganizationName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateOrganizationForm(
  values: OrganizationFormValues,
): OrganizationFormErrors {
  const errors: OrganizationFormErrors = {};
  const name = values.name.trim();
  const slug = values.slug.trim().toLowerCase();

  if (name.length < 2 || name.length > 200) {
    errors.name = "Name must contain between 2 and 200 characters.";
  }
  if (!slug || slug.length > 200 || !SLUG_PATTERN.test(slug)) {
    errors.slug = "Use lowercase letters, numbers, and single hyphens only.";
  }
  if (
    values.email &&
    (values.email.trim().length > 320 ||
      !EMAIL_PATTERN.test(values.email.trim()))
  ) {
    errors.email = "Enter a valid email address up to 320 characters.";
  }
  if (
    values.phone &&
    (values.phone.trim().length < 7 || values.phone.trim().length > 50)
  ) {
    errors.phone = "Phone must contain between 7 and 50 characters.";
  }
  if (values.website) {
    if (values.website.trim().length > 2_048) {
      errors.website = "Website cannot exceed 2,048 characters.";
    } else {
      try {
        const url = new URL(values.website);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          errors.website = "Website must use HTTP or HTTPS.";
        }
      } catch {
        errors.website = "Enter a valid website URL.";
      }
    }
  }
  if (values.address.trim().length > 1_000) {
    errors.address = "Address cannot exceed 1,000 characters.";
  }
  return errors;
}
