import { getEnvironmentChecks, isCoreEnvironmentReady } from "@/lib/deployment/environment";

export const dynamic = "force-dynamic";

export async function GET() {
  const coreReady = isCoreEnvironmentReady();
  const checks = getEnvironmentChecks();
  return Response.json(
    {
      status: coreReady ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        application: true,
        coreEnvironment: coreReady,
        aiConfigured: checks
          .filter((check) => check.requiredFor === "ai")
          .every((check) => check.configured),
      },
    },
    {
      status: coreReady ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
