import { clerk } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";

const CLERK_INITIALIZATION_TIMEOUT = 30_000;

export const CLERK_E2E_ENVIRONMENT = [
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "E2E_ADMIN_EMAIL",
] as const;

export function missingClerkE2EEnvironment(): string[] {
  return CLERK_E2E_ENVIRONMENT.filter((name) => !process.env[name]?.trim());
}

export async function signInAsAdministrator(page: Page) {
  const missing = missingClerkE2EEnvironment();
  if (missing.length > 0) {
    throw new Error(
      `Clerk E2E environment is incomplete: ${missing.join(", ")}`,
    );
  }

  await page.goto("/");
  await clerk.loaded({ page });
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_ADMIN_EMAIL!.trim(),
  });

  await page.goto("/advisor-dashboard");
  await expect(page).toHaveURL(/\/advisor-dashboard(?:[/?#]|$)/, {
    timeout: CLERK_INITIALIZATION_TIMEOUT,
  });
  await expect(
    page.getByRole("heading", { name: "Advisor Dashboard", exact: true }),
  ).toBeVisible({ timeout: CLERK_INITIALIZATION_TIMEOUT });
}
