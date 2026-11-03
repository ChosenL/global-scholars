import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Component-state fixture: execute the actual watchdog/recovery source with the
// installed React runtime. Only Clerk hook snapshots and Link presentation are
// stubbed; no authentication endpoint, session, route protection or student data
// is involved. Imperative children model Clerk's separately managed UI root.
const watchdogSource = ts.transpileModule(
  readFileSync("app/student-portal/PortalAuthLoading.tsx", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;
const fixtureModules: Record<string, string> = {
  react: readFileSync("node_modules/react/cjs/react.production.js", "utf8"),
  "react/jsx-runtime": readFileSync(
    "node_modules/react/cjs/react-jsx-runtime.production.js",
    "utf8",
  ),
  "react-dom": readFileSync(
    "node_modules/react-dom/cjs/react-dom.production.js",
    "utf8",
  ),
  "react-dom/client": readFileSync(
    "node_modules/react-dom/cjs/react-dom-client.production.js",
    "utf8",
  ),
  scheduler: readFileSync(
    "node_modules/scheduler/cjs/scheduler.production.js",
    "utf8",
  ),
  "next/link": `exports.__esModule = true; exports.default = props => require('react').createElement('a', props);`,
  "@clerk/nextjs": `
    exports.useClerk = () => ({ status: 'ready' });
    exports.useSignIn = () => ({ signIn: { status: window.fixtureSignInStatus || null }, fetchStatus: window.fixtureFetching ? 'fetching' : 'idle' });
    exports.useSignUp = () => ({ signUp: { status: window.fixtureSignUpStatus || null }, fetchStatus: 'idle' });
  `,
  watchdog: watchdogSource,
};
const fixtureScript = `
  const process = { env: { NODE_ENV: 'production' } };
  const modules = { ${Object.entries(fixtureModules)
    .map(
      ([name, source]) =>
        `${JSON.stringify(name)}: function(module, exports, require) {\n${source}\n}`,
    )
    .join(",\n")} };
  const cache = {};
  function require(name) { if (!cache[name]) { const module = cache[name] = { exports: {} }; modules[name](module, module.exports, require); } return cache[name].exports; }
  const React = require('react');
  const root = require('react-dom/client').createRoot(document.getElementById('fixture-root'));
  function Harness() {
    React.useEffect(() => { window.fixtureHydrated = true; }, []);
    return React.createElement(require('watchdog').PortalSignInWatchdog, null, React.createElement('div', { id: 'fixture-clerk' }));
  }
  window.renderFixture = () => root.render(React.createElement(Harness));
  window.renderFixture();
`;

async function watchdogFixture(page: Page, hash = "") {
  await page.clock.install();
  await page.route("**/__watchdog-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body><main id="fixture-root"></main><script>${fixtureScript.replace(/<\/script/gi, "<\\/script")}</script></body></html>`,
    }),
  );
  await page.goto(`/__watchdog-fixture${hash}`);
  // Unlike server-rendered loading text, this proves the component effects have
  // run before advancing time. No test-only timing switches in application code.
  await page.waitForFunction(
    () => (window as unknown as { fixtureHydrated: boolean }).fixtureHydrated,
  );
}

async function clerkSurface(page: Page, html: string) {
  await page.locator("#fixture-clerk").evaluate((element, content) => {
    element.innerHTML = content;
  }, html);
}

const emailControls = `<label for="email">Email address</label><input id="email" autocomplete="username" class="portal-auth-field"><label for="password">Password</label><input id="password" type="password" autocomplete="current-password" class="portal-auth-field">`;
const googleControl = `<button class="portal-auth-action">Continue with Google</button>`;
const internalSpinner = `<div role="status" aria-label="Clerk is loading">Loading…</div>`;

test("empty component mount produces one recovery without replacing Clerk", async ({
  page,
}) => {
  await watchdogFixture(page);
  const original = await page.locator("#fixture-clerk").elementHandle();
  await page.clock.fastForward(16_000);
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(page.getByRole("alert")).toContainText("portal-sign-in-ui");
  expect(await original!.evaluate((node) => node.isConnected)).toBe(true);
});

test("mounted spinner and unusable children cannot disarm the watchdog", async ({
  page,
}) => {
  await watchdogFixture(
    page,
    "#/?sign_up_fallback_redirect_url=%2Fscholar-dashboard",
  );
  await clerkSurface(
    page,
    internalSpinner +
      `<input hidden aria-label="Hidden email" class="portal-auth-field"><fieldset disabled><button class="portal-auth-action">Continue</button></fieldset><button>Unrelated help</button><div class="portal-auth-action">Not a native control</div><button class="portal-auth-action" aria-label=""></button><button class="portal-auth-action" style="width:0;height:0;padding:0;border:0" aria-label="Zero size"></button><div style="opacity:0"><input aria-label="Transparent field" class="portal-auth-field"></div><input readonly aria-label="Read-only field" class="portal-auth-field"><div inert><input aria-label="Inert field" class="portal-auth-field"></div>`,
  );
  await page.clock.fastForward(16_000);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Clerk is loading" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/__watchdog-fixture/);
});

test("slow initial loading stops permanently when Google and email controls become usable", async ({
  page,
}) => {
  await watchdogFixture(page);
  await clerkSurface(page, internalSpinner);
  await page.clock.fastForward(8_000);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await clerkSurface(page, emailControls + googleControl);
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeEnabled();
  await page.clock.runFor(300);
  await clerkSurface(page, internalSpinner);
  await page.clock.fastForward(30_000);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("late readiness removes recovery without remounting Clerk or stealing focus", async ({
  page,
}) => {
  await watchdogFixture(page);
  const original = await page.locator("#fixture-clerk").elementHandle();
  await clerkSurface(page, internalSpinner);
  await page.clock.fastForward(16_000);
  await expect(page.getByRole("alert")).toBeVisible();
  await clerkSurface(page, emailControls);
  await page.getByLabel("Email address").fill("synthetic@example.invalid");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.clock.fastForward(30_000);
  await expect(page.getByLabel("Email address")).toHaveValue(
    "synthetic@example.invalid",
  );
  await expect(page.getByLabel("Email address")).toBeFocused();
  expect(await original!.evaluate((node) => node.isConnected)).toBe(true);
});

for (const [name, html] of [
  ["email", emailControls],
  ["Google", googleControl],
]) {
  test(`usable ${name} controls alone disarm initial monitoring`, async ({
    page,
  }) => {
    await watchdogFixture(page);
    await clerkSurface(page, html);
    await page.clock.fastForward(16_000);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("password entry and subsequent verification/MFA are never timed out", async ({
  page,
}) => {
  await watchdogFixture(page);
  await clerkSurface(page, emailControls);
  await page.getByLabel("Password").fill("synthetic-test-value");
  await page.clock.fastForward(30_000);
  await expect(page.getByLabel("Password")).toHaveValue("synthetic-test-value");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await clerkSurface(
    page,
    `<p role="status">Waiting for verification / MFA</p>`,
  );
  await page.clock.fastForward(30_000);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const activity of [
  "fetching",
  "sign-in-verification",
  "sign-up-verification",
]) {
  test(`supported Clerk ${activity} signal suppresses recovery even before a control renders`, async ({
    page,
  }) => {
    await watchdogFixture(page);
    await clerkSurface(page, internalSpinner);
    await page.evaluate((kind) => {
      const fixture = window as unknown as {
        fixtureFetching: boolean;
        fixtureSignInStatus: string;
        fixtureSignUpStatus: string;
        renderFixture: () => void;
      };
      if (kind === "fetching") fixture.fixtureFetching = true;
      if (kind === "sign-in-verification")
        fixture.fixtureSignInStatus = "needs_second_factor";
      if (kind === "sign-up-verification")
        fixture.fixtureSignUpStatus = "missing_requirements";
      fixture.renderFixture();
    }, activity);
    await page.clock.runFor(300);
    await page.evaluate(() => {
      const fixture = window as unknown as {
        fixtureFetching: boolean;
        fixtureSignInStatus: string | null;
        fixtureSignUpStatus: string | null;
        renderFixture: () => void;
      };
      fixture.fixtureFetching = false;
      fixture.fixtureSignInStatus = null;
      fixture.fixtureSignUpStatus = null;
      fixture.renderFixture();
    });
    await page.clock.runFor(300);
    await page.clock.fastForward(30_000);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("stylesheet-only visibility changes count as usable controls", async ({
  page,
}) => {
  await watchdogFixture(page);
  await page.addStyleTag({ content: ".fixture-concealed { opacity: 0; }" });
  await clerkSurface(
    page,
    `<label for="css-email">Email address</label><input id="css-email" class="portal-auth-field fixture-concealed">`,
  );
  await page.clock.fastForward(8_000);
  await page.evaluate(() => {
    for (const sheet of Array.from(document.styleSheets)) {
      for (const rule of Array.from(sheet.cssRules)) {
        if (
          rule instanceof CSSStyleRule &&
          rule.selectorText === ".fixture-concealed"
        )
          rule.style.opacity = "1";
      }
    }
  });
  await expect(page.getByLabel("Email address")).toHaveCSS("opacity", "1");
  await page.clock.runFor(300);
  await clerkSurface(page, internalSpinner);
  await page.clock.fastForward(30_000);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const hash of ["#/factor-two", "#/sso-callback"]) {
  test(`resumed ${hash} is outside the initial-loading deadline`, async ({
    page,
  }) => {
    await watchdogFixture(page, hash);
    await clerkSurface(page, internalSpinner);
    await page.clock.fastForward(30_000);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

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
