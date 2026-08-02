import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DependencyStatus = "ready" | "unavailable";

export interface DatabaseReadiness {
  status: DependencyStatus;
  latencyMs: number;
}

export const DEFAULT_READINESS_DATABASE_TIMEOUT_MS = 3000;

export function readinessTimeoutMs(): number {
  const configured = Number(
    process.env.READINESS_DATABASE_TIMEOUT_MS ||
      DEFAULT_READINESS_DATABASE_TIMEOUT_MS,
  );
  return Number.isFinite(configured) && configured >= 250
    ? Math.min(configured, 10_000)
    : DEFAULT_READINESS_DATABASE_TIMEOUT_MS;
}

async function withReadinessTimeout<T>(
  operation: PromiseLike<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          onTimeout();
          reject(new Error("Database readiness probe timed out."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function checkDatabaseReadiness(): Promise<DatabaseReadiness> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutMs = readinessTimeoutMs();

  try {
    const { data, error } = await withReadinessTimeout(
      createSupabaseServerClient()
        .rpc("operational_readiness")
        .abortSignal(controller.signal),
      timeoutMs,
      () => controller.abort(),
    );

    if (error || data?.database !== true) {
      return { status: "unavailable", latencyMs: Date.now() - startedAt };
    }

    return { status: "ready", latencyMs: Date.now() - startedAt };
  } catch {
    return { status: "unavailable", latencyMs: Date.now() - startedAt };
  }
}
