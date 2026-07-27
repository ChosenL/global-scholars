import type { SupabaseClient } from "@supabase/supabase-js";

export interface AiQuotaResult {
  allowed: boolean;
  reason: "allowed" | "daily_requests" | "daily_tokens" | "circuit_open";
  retry_after_seconds: number;
  request_count?: number;
  token_count?: number;
}

export async function consumeAiQuota(supabase: SupabaseClient): Promise<AiQuotaResult> {
  const { data, error } = await supabase.schema("crm").rpc(
    "consume_ai_daily_quota",
    {
      daily_request_limit: Number(process.env.AI_DAILY_REQUEST_LIMIT || 50),
      daily_token_limit: Number(process.env.AI_DAILY_TOKEN_LIMIT || 100000),
      circuit_failure_threshold: Number(process.env.AI_CIRCUIT_FAILURE_THRESHOLD || 5),
      circuit_window_minutes: Number(process.env.AI_CIRCUIT_WINDOW_MINUTES || 5),
    },
  );
  if (error) throw error;
  return data as unknown as AiQuotaResult;
}
