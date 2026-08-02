import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

for (const filename of [".env.local", ".env"]) {
  const envPath = path.join(process.cwd(), filename);
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

if (
  !process.env.CLERK_PUBLISHABLE_KEY?.trim() &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
) {
  process.env.CLERK_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

const requiredEnvironment = [
  "PLAYWRIGHT_BASE_URL",
  "SUPABASE_DB_URL",
  "E2E_ADMIN_EMAIL",
  "CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "VERCEL_AUTOMATION_BYPASS_SECRET",
];
const missingEnvironment = requiredEnvironment.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingEnvironment.length > 0) {
  console.error(missingEnvironment.join("\n"));
  process.exit(1);
}

const runId =
  process.env.E2E_RUN_ID?.trim() ||
  `pw-${Date.now().toString(36)}-${randomBytes(5).toString("hex")}`;
const cli = path.join(
  process.cwd(),
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);
const result = spawnSync(
  process.execPath,
  [cli, "test", ...process.argv.slice(2)],
  {
    env: {
      ...process.env,
      PLAYWRIGHT_E2E_PREVIEW: "true",
      PLAYWRIGHT_E2E_GENERATED_RUN_ID: "true",
      E2E_RUN_ID: runId,
    },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
