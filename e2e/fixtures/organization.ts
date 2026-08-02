export interface OrganizationE2EConfig {
  advisorProfileId: string;
  studentProfileId: string;
  runId: string;
}

const REQUIRED_ENVIRONMENT = [
  "E2E_ADVISOR_PROFILE_ID",
  "E2E_STUDENT_PROFILE_ID",
  "E2E_RUN_ID",
] as const;

export function missingOrganizationE2EEnvironment(): string[] {
  return REQUIRED_ENVIRONMENT.filter((name) => !process.env[name]?.trim());
}

export function requireOrganizationE2EConfig(): OrganizationE2EConfig {
  const missing = missingOrganizationE2EEnvironment();
  if (missing.length > 0) {
    throw new Error(
      `Organization E2E environment is incomplete: ${missing.join(", ")}`,
    );
  }

  return {
    advisorProfileId: process.env.E2E_ADVISOR_PROFILE_ID!.trim(),
    studentProfileId: process.env.E2E_STUDENT_PROFILE_ID!.trim(),
    runId: process.env.E2E_RUN_ID!.trim(),
  };
}

export function organizationTestData(runId: string, retry: number) {
  const suffix = `${runId}-${retry}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-80);

  return {
    name: `E2E Partner ${suffix}`,
    updatedName: `E2E Partner Updated ${suffix}`,
    slug: `e2e-preview-${suffix}-organization`,
    email: `org-${suffix}@example.test`,
    updatedEmail: `updated-${suffix}@example.test`,
    phone: "+1 202 555 0199",
    website: "https://example.test",
    address: `100 ${suffix} Scholar Way`,
    updatedAddress: `200 ${suffix} Scholar Way`,
  };
}
