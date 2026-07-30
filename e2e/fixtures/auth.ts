import { expect, type Page } from "@playwright/test";

export async function signInAsAdministrator(
  page: Page,
  credentials: { email: string; password: string },
) {
  await page.goto("/student-portal");

  const identifier = page.locator('input[name="identifier"]');
  await expect(identifier).toBeVisible();
  await identifier.fill(credentials.email);
  await page.getByRole("button", { name: /continue/i }).click();

  const password = page.locator('input[name="password"]');
  await expect(password).toBeVisible();
  await password.fill(credentials.password);
  await page.getByRole("button", { name: /continue/i }).click();

  await page.waitForURL(
    (url) =>
      url.pathname === "/advisor-dashboard" ||
      url.pathname === "/scholar-dashboard",
  );
}
