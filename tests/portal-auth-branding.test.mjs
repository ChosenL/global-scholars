import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

test("portal retains Clerk sign-in, routing and protected dashboard", async () => {
  const portal = await readFile("app/student-portal/page.tsx", "utf8");
  const proxy = await readFile("proxy.ts", "utf8");
  assert.match(portal, /<SignIn\s/);
  assert.match(portal, /routing="hash"/);
  assert.match(
    portal,
    /fallback=\{\s*<PortalAuthLoading phase="sign-in-ui" loadingOnly/,
  );
  assert.match(portal, /<PortalSignInWatchdog>/);
  assert.match(
    portal,
    /phase={isSignedIn \? "dashboard-redirect" : "initialization"}/,
  );
  assert.match(proxy, /await auth\.protect\(\)/);
});

test("portal logos use approved assets at their real aspect ratios", async () => {
  for (const [filename, width, height] of [
    ["global-scholars-preferred-nav.webp", 1779, 739],
    ["global-scholars-preferred-light-nav.webp", 1784, 711],
  ]) {
    const metadata = await sharp(`public/${filename}`).metadata();
    assert.equal(metadata.width, width);
    assert.equal(metadata.height, height);
  }
  const portal = await readFile("app/student-portal/page.tsx", "utf8");
  const dashboard = await readFile("app/scholar-dashboard/page.tsx", "utf8");
  assert.doesNotMatch(portal + dashboard, /src="\/logo\.png"/);
  assert.match(portal, /src="\/global-scholars-preferred-light-nav.webp"/);
  assert.equal(
    (dashboard.match(/src="\/global-scholars-preferred-nav.webp"/g) ?? [])
      .length,
    2,
  );
  assert.equal(
    (dashboard.match(/h-auto w-\[220px\] max-w-full object-contain/g) ?? [])
      .length,
    2,
  );
});
