import { defineConfig, devices } from "@playwright/test";

import { configurePreviewFixtureEnvironment } from "./e2e/fixtures/previewDatabase";

const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;
const previewRequested =
  process.env.PLAYWRIGHT_E2E_PREVIEW === "true" ||
  Boolean(process.env.SUPABASE_DB_URL?.trim());

if (!previewRequested) {
  throw new Error(
    "Preview Playwright must be launched with npm run test:e2e. Use npm run test:e2e:local for explicit local execution.",
  );
}

if (!process.env.PLAYWRIGHT_BASE_URL?.trim()) {
  throw new Error(
    "Preview Playwright requires PLAYWRIGHT_BASE_URL. Use npm run test:e2e:local for local execution.",
  );
}

const runId = process.env.E2E_RUN_ID?.trim();
if (!runId || !RUN_ID_PATTERN.test(runId)) {
  throw new Error(
    "Preview Playwright requires a valid E2E_RUN_ID. Use npm run test:e2e to generate one.",
  );
}

process.env.PLAYWRIGHT_E2E_GENERATED_RUN_ID = "true";
configurePreviewFixtureEnvironment();

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
const clerkAuthFile = "playwright/.clerk/admin.json";
const clerkEnvironmentConfigured = [
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "E2E_ADMIN_EMAIL",
].every((name) => Boolean(process.env[name]?.trim()));

export default defineConfig({
  globalSetup: "./e2e/preview.global-setup.ts",
  globalTeardown: "./e2e/preview.global-teardown.ts",
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "clerk setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "framework",
      testMatch: /framework\/.*\.spec\.ts/,
    },
    {
      name: "authenticated",
      testMatch: /(?:applications|organizations)\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["clerk setup"],
      ...(clerkEnvironmentConfigured
        ? { use: { ...devices["Desktop Chrome"], storageState: clerkAuthFile } }
        : {}),
    },
  ],
});
