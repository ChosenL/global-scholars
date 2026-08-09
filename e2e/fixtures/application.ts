export interface ApplicationE2EConfig {
  studentProfileId: string;
  intakeId: string;
  advisorProfileId: string;
  secondAdvisorProfileId: string;
  runId: string;
}

const REQUIRED_ENVIRONMENT = [
  "E2E_APPLICATION_STUDENT_PROFILE_ID",
  "E2E_APPLICATION_INTAKE_ID",
  "E2E_ADVISOR_PROFILE_ID",
  "E2E_SECOND_ADVISOR_PROFILE_ID",
  "E2E_RUN_ID",
] as const;

export function missingApplicationE2EEnvironment(): string[] {
  return REQUIRED_ENVIRONMENT.filter((name) => !process.env[name]?.trim());
}

export function requireApplicationE2EConfig(): ApplicationE2EConfig {
  const missing = missingApplicationE2EEnvironment();
  if (missing.length > 0) {
    throw new Error(
      `Application E2E environment is incomplete: ${missing.join(", ")}`,
    );
  }

  return {
    studentProfileId: process.env.E2E_APPLICATION_STUDENT_PROFILE_ID!.trim(),
    intakeId: process.env.E2E_APPLICATION_INTAKE_ID!.trim(),
    advisorProfileId: process.env.E2E_ADVISOR_PROFILE_ID!.trim(),
    secondAdvisorProfileId: process.env.E2E_SECOND_ADVISOR_PROFILE_ID!.trim(),
    runId: process.env.E2E_RUN_ID!.trim(),
  };
}

export function applicationTestData(runId: string, retry: number) {
  void retry;
  const prefix = `e2e-preview-${runId}`;

  return {
    university: `${prefix} University`,
    program: `${prefix} Program`,
    intake: `${prefix} Intake`,
    tuitionAmount: "14500",
    updatedTuitionAmount: "15750",
    currency: "USD",
    updatedCurrency: "CAD",
    financialSource: `E2E offer ${runId}`,
    updatedFinancialSource: `E2E revised offer ${runId}`,
  };
}
