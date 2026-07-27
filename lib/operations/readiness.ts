import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DependencyStatus = "ready" | "unavailable";

export interface DatabaseReadiness {
  status: DependencyStatus;
  latencyMs: number;
}

function readinessTimeoutMs(): number {
  const configured = Number(process.env.READINESS_DATABASE_TIMEOUT_MS || 3000);
  return Number.isFinite(configured) && configured >= 250
    ? Math.min(configured, 10_000)
    : 3000;
}

export async function checkDatabaseReadiness(): Promise<DatabaseReadiness> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), readinessTimeoutMs());

  try {
    const { data, error } = await createSupabaseServerClient()
      .rpc("operational_readiness")
      .abortSignal(controller.signal);

    if (error || data?.database !== true) {
      return { status: "unavailable", latencyMs: Date.now() - startedAt };
    }

    return { status: "ready", latencyMs: Date.now() - startedAt };
  } catch {
    return { status: "unavailable", latencyMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}
