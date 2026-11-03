import { defineConfig, devices } from "@playwright/test";

// Isolated, signed-out tests: synthetic Clerk keys, no database or real users.
const port = 3101;
const baseURL = `http://localhost:${port}`;
const productionBuild = process.env.PLAYWRIGHT_PORTAL_PRODUCTION === "true";

export default defineConfig({
  testDir: "./e2e/portal",
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  outputDir: "test-results/portal-browser",
  use: { baseURL, ...devices["Desktop Chrome"], channel: "msedge" },
  webServer: {
    command: `node node_modules/next/dist/bin/next ${productionBuild ? "start" : "dev"} --hostname localhost --port ${port}`,
    url: `${baseURL}/icon.png`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: productionBuild ? "production" : "development",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_live_${Buffer.from("clerk.portal-test.invalid$").toString("base64")}`,
      CLERK_SECRET_KEY: "sk_live_local_portal_placeholder",
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/student-portal",
      NEXT_PUBLIC_CLERK_DOMAIN: "",
      NEXT_PUBLIC_CLERK_PROXY_URL: "",
      NEXT_PUBLIC_CLERK_IS_SATELLITE: "false",
      CLERK_TELEMETRY_DISABLED: "true",
      NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED: "true",
    },
  },
});
