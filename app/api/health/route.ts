import { getEnvironmentChecks, isCoreEnvironmentReady } from "@/lib/deployment/environment";
import {
  createRequestContext,
  operationsLogger,
  responseHeaders,
} from "@/lib/operations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = createRequestContext(request, "/api/health");
  const coreReady = isCoreEnvironmentReady();
  const checks = getEnvironmentChecks();
  operationsLogger.info("health.checked", {
    ...context,
    statusCode: 200,
    configurationStatus: coreReady ? "ready" : "degraded",
    durationMs: Date.now() - context.startedAt,
  });
  return Response.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      readinessPath: "/api/ready",
      services: {
        application: true,
        coreEnvironment: coreReady,
        aiConfigured: checks
          .filter((check) => check.requiredFor === "ai")
          .every((check) => check.configured),
      },
    },
    {
      status: 200,
      headers: responseHeaders(context, { "Cache-Control": "no-store" }),
    },
  );
}
