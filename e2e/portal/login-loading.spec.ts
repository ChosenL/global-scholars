import { expect, test } from "@playwright/test";

test("blocked Clerk initialization ends with recovery options and safe diagnostics", async ({
  page,
}) => {
  const diagnostics: string[] = [];
  page.on("console", (message) => {
    if (message.text().startsWith("[scholar-portal]"))
      diagnostics.push(message.text());
  });
  await page.route("**/*", (route) => {
    const hostname = new URL(route.request().url()).hostname;
    return hostname === "localhost" ? route.continue() : route.abort();
  });
  await page.goto("/student-portal");
  const failure = page.getByRole("main").getByRole("alert");
  await expect(failure).toContainText("Secure sign-in is unavailable", {
    timeout: 25_000,
  });
  await expect(page.getByRole("button", { name: "Reload page" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Contact support" }),
  ).toHaveAttribute("href", "mailto:support@globalscholarspathway.com");
  await expect(failure).toContainText("portal-initialization");
  await expect.poll(() => diagnostics.length).toBeGreaterThan(0);
  expect(diagnostics.join("\n")).not.toMatch(
    /pk_(?:test|live)_|sk_(?:test|live)_|cookie|token|emailAddress/,
  );
  await expect(page).toHaveURL(/\/student-portal$/);
  const reload = page.waitForRequest((request) =>
    request.isNavigationRequest(),
  );
  await page.getByRole("button", { name: "Reload page" }).click();
  await reload;
  await expect(failure).toContainText("Secure sign-in is unavailable", {
    timeout: 25_000,
  });
});

test("approved portal assets retain aspect ratio at desktop and mobile sizes", async ({
  page,
}) => {
  // Asset-only preview: no authenticated route, Clerk session or student data.
  await page.route("**/__portal-assets-preview", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body></body></html>",
    }),
  );
  await page.goto("/__portal-assets-preview");
  for (const viewportWidth of [375, 1280]) {
    await page.setViewportSize({ width: viewportWidth, height: 800 });
    await page.setContent(`
      <div style="padding:24px;background:#071526">
        <img alt="Dark portal logo" src="/global-scholars-preferred-nav.webp"
             width="1779" height="739" style="width:220px;max-width:100%;height:auto;object-fit:contain">
      </div>
      <div style="padding:24px;background:#F8F9FB">
        <img alt="Light portal logo" src="/global-scholars-preferred-light-nav.webp"
             width="1784" height="711" style="width:240px;max-width:100%;height:auto;object-fit:contain">
      </div>
    `);
    for (const [name, ratio] of [
      ["Dark portal logo", 1779 / 739],
      ["Light portal logo", 1784 / 711],
    ] as const) {
      const image = page.getByRole("img", { name });
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate((element: HTMLImageElement) => element.naturalWidth),
        )
        .toBeGreaterThan(0);
      const bounds = await image.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.width / bounds!.height).toBeCloseTo(ratio, 1);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewportWidth);
    }
    await page.screenshot({
      path: `test-results/portal-assets-${viewportWidth}.png`,
    });
  }
});

test("stalled Clerk loading reaches the application timeout without granting access", async ({
  page,
}) => {
  const diagnostics: string[] = [];
  page.on("console", (message) => {
    if (message.text().startsWith("[scholar-portal]"))
      diagnostics.push(message.text());
  });
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname === "localhost")
      return route.continue();
    // Leave external requests pending until context teardown; never contact Clerk.
  });
  await page.goto("/student-portal", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "Loading secure sign-in",
  );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Secure sign-in is unavailable",
    { timeout: 25_000 },
  );
  // Clerk also has a 15-second script deadline; either failure must recover safely.
  await expect
    .poll(() => diagnostics.join("\n"))
    .toMatch(/timeout|clerk-unavailable/);
  await expect(page).toHaveURL(/\/student-portal$/);
});
