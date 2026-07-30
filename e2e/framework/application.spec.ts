import { expect, test } from "@playwright/test";

test("the built application serves static assets to a browser", async ({
  request,
}) => {
  const response = await request.get("/icon.png");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^image\/png/);
  expect((await response.body()).byteLength).toBeGreaterThan(0);
});
