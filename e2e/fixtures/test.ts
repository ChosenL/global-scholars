import { expect, test as base } from "@playwright/test";

type VercelProtectionFixtures = {
  vercelProtection: void;
};

export const test = base.extend<VercelProtectionFixtures>({
  vercelProtection: [
    async ({ context }, use) => {
      const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
      const previewBaseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();

      if (bypassSecret && previewBaseURL) {
        const previewOrigin = new URL(previewBaseURL).origin;
        let status: number | "request failed" = "request failed";
        let finalURL = `${previewOrigin}/api/health`;

        try {
          let response = await context.request.get(finalURL, {
            headers: {
              "x-vercel-protection-bypass": bypassSecret,
              "x-vercel-set-bypass-cookie": "true",
            },
            maxRedirects: 0,
          });

          const location = response.headers()["location"];
          if (response.status() >= 300 && response.status() < 400 && location) {
            response = await context.request.get(
              new URL(location, response.url()).toString(),
            );
          }

          status = response.status();
          finalURL = response.url();

          const cookies = await context.cookies(previewOrigin);
          const hasBypassCookie = cookies.some(
            (cookie) => cookie.name === "_vercel_jwt",
          );
          const health = (await response.json().catch(() => null)) as {
            status?: unknown;
          } | null;
          const reachedApplication =
            response.ok() &&
            new URL(finalURL).origin === previewOrigin &&
            health?.status === "ok";

          if (!reachedApplication || !hasBypassCookie) {
            throw new Error("Vercel bypass cookie was not initialized");
          }
        } catch (error) {
          const cookies = await context.cookies(previewOrigin);
          const hasBypassCookie = cookies.some(
            (cookie) => cookie.name === "_vercel_jwt",
          );

          throw new Error(
            "Vercel bypass-cookie initialization failed.\n" +
              `Response status: ${status}\n` +
              `Final URL: ${finalURL}\n` +
              `Bypass cookie present: ${hasBypassCookie}`,
            { cause: error },
          );
        }
      }

      await use();
    },
    { auto: true },
  ],
});

export { expect };
