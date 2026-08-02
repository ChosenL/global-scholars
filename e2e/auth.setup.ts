import { clerkSetup } from "@clerk/testing/playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import {
  missingClerkE2EEnvironment,
  signInAsAdministrator,
} from "./fixtures/auth";
import { test as setup } from "./fixtures/test";

const authFile = path.join(process.cwd(), "playwright/.clerk/admin.json");
const missingEnvironment = missingClerkE2EEnvironment();

setup.describe.configure({ mode: "serial" });
setup.skip(
  missingEnvironment.length > 0,
  `Requires Clerk E2E configuration: ${missingEnvironment.join(", ")}`,
);

setup("configure Clerk testing", async () => {
  await clerkSetup();
});

setup("authenticate administrator and save browser state", async ({ page }) => {
  await signInAsAdministrator(page);
  await mkdir(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
