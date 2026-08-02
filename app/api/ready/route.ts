import {
  getEnvironmentChecks,
  isCoreEnvironmentReady,
} from "@/lib/deployment/environment";
import { reportError } from "@/lib/operations/errorReporter";
import { operationsLogger } from "@/lib/operations/logger";
import { checkDatabaseReadiness } from "@/lib/operations/readiness";
import {
  createRequestContext,
  responseHeaders,
} from "@/lib/operations/requestContext";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = createRequestContext(request, "/api/ready");
  const checks = getEnvironmentChecks();
  const coreEnvironment = isCoreEnvironmentReady();
  const aiConfigured = checks
    .filter((check) => check.requiredFor === "ai")
    .every((check) => check.configured);
  const aiEnabled =
    process.env.AI_OPERATIONS_ENABLED?.toLowerCase() !== "false";

  try {
    const database = await checkDatabaseReadiness();
    const ready = coreEnvironment && database.status === "ready";
    const statusCode = ready ? 200 : 503;

    operationsLogger.info("readiness.checked", {
      ...context,
      statusCode,
      databaseStatus: database.status,
      databaseLatencyMs: database.latencyMs,
      aiStatus: aiConfigured && aiEnabled ? "available" : "degraded",
      durationMs: Date.now() - context.startedAt,
    });

    return Response.json(
      {
        status: ready ? "ready" : "not_ready",
        timestamp: new Date().toISOString(),
        dependencies: {
          database,
          coreEnvironment: {
            status: coreEnvironment ? "ready" : "unavailable",
          },
          ai: {
            status: aiConfigured && aiEnabled ? "available" : "degraded",
            required: false,
          },
        },
      },
      {
        status: statusCode,
        headers: responseHeaders(context, { "Cache-Control": "no-store" }),
      },
    );
  } catch (error) {
    await reportError({ error, context, severity: "error" });
    return Response.json(
      {
        status: "not_ready",
        timestamp: new Date().toISOString(),
        dependencies: {
          database: { status: "unavailable" },
          coreEnvironment: {
            status: coreEnvironment ? "ready" : "unavailable",
          },
          ai: {
            status: aiConfigured && aiEnabled ? "available" : "degraded",
            required: false,
          },
        },
      },
      {
        status: 503,
        headers: responseHeaders(context, { "Cache-Control": "no-store" }),
      },
    );
  }
}
