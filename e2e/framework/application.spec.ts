import { expect, test } from "@playwright/test";

test("the built application serves static assets to a browser", async ({
  request,
}) => {
  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  const response = await request.get("/icon.png", {
    headers: bypassSecret
      ? { "x-vercel-protection-bypass": bypassSecret }
      : undefined,
  });

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^image\/png/);
  expect((await response.body()).byteLength).toBeGreaterThan(0);
});
