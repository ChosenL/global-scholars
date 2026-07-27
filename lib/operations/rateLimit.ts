import { createHash } from "node:crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retry_after_seconds: number;
}

function requireHashSalt(): string {
  const salt = process.env.OPERATIONS_HASH_SALT?.trim()
    || process.env.OPENAI_SAFETY_SALT?.trim();
  if (!salt) throw new Error("Operational hashing is not configured.");
  return salt;
}

export function requestNetworkKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded
    || request.headers.get("x-real-ip")
    || request.headers.get("cf-connecting-ip")
    || "unknown";
  return createHash("sha256")
    .update(`${requireHashSalt()}:${address}`)
    .digest("hex");
}

export function subjectRateKey(subject: string): string {
  return createHash("sha256")
    .update(`${requireHashSalt()}:${subject}`)
    .digest("hex");
}

export async function consumeRateLimit(
  scope: "public_chat" | "crm_ai",
  keyHash: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const client = createSupabaseServerClient();
  const { data, error } = await client.schema("crm").rpc(
    "consume_operational_rate_limit",
    {
      rate_scope: scope,
      rate_key_hash: keyHash,
      request_limit: limit,
      window_seconds: windowSeconds,
    },
  );
  if (error) throw error;
  return data as unknown as RateLimitResult;
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "Retry-After": String(result.retry_after_seconds),
  };
}
