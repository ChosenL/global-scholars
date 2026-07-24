import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ConversationParticipantRole,
  CrmProfile,
} from "../types/dashboard";

interface EnsureCrmProfileInput {
  clerkUserId: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: ConversationParticipantRole;
}

const sessionProfileCache = new Map<string, Promise<CrmProfile>>();

function normalizeDisplayName(input: EnsureCrmProfileInput): string {
  return (
    input.displayName.trim() ||
    input.email?.trim() ||
    (input.role === "advisor"
      ? "Global Scholars Advisor"
      : input.role === "admin"
        ? "Administrator"
        : "Student")
  );
}

async function loadOrCreateProfile(
  supabase: SupabaseClient,
  input: EnsureCrmProfileInput,
): Promise<CrmProfile> {
  const crm = supabase.schema("crm");
  const existingResult = await crm
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", input.clerkUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingResult.error) {
    throw existingResult.error;
  }

  if (existingResult.data) {
    const existing = existingResult.data as CrmProfile;
    const displayName = normalizeDisplayName(input);
    const profileChanged =
      existing.display_name !== displayName ||
      existing.email !== input.email ||
      existing.avatar_url !== input.avatarUrl;

    if (!profileChanged) {
      return existing;
    }

    const updatedResult = await crm
      .from("profiles")
      .update({
        display_name: displayName,
        email: input.email,
        avatar_url: input.avatarUrl,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updatedResult.error) {
      throw updatedResult.error;
    }

    return updatedResult.data as CrmProfile;
  }

  const createdResult = await crm
    .from("profiles")
    .insert({
      clerk_user_id: input.clerkUserId,
      email: input.email,
      display_name: normalizeDisplayName(input),
      avatar_url: input.avatarUrl,
      role: input.role,
    })
    .select("*")
    .single();

  if (!createdResult.error) {
    return createdResult.data as CrmProfile;
  }

  if (createdResult.error.code !== "23505") {
    throw createdResult.error;
  }

  const concurrentResult = await crm
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", input.clerkUserId)
    .is("deleted_at", null)
    .single();

  if (concurrentResult.error) {
    throw concurrentResult.error;
  }

  return concurrentResult.data as CrmProfile;
}

export function ensureCrmProfile(
  supabase: SupabaseClient,
  sessionId: string,
  input: EnsureCrmProfileInput,
): Promise<CrmProfile> {
  const cacheKey = `${sessionId}:${input.clerkUserId}`;
  const cached = sessionProfileCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const request = loadOrCreateProfile(supabase, input).catch((error) => {
    sessionProfileCache.delete(cacheKey);
    throw error;
  });

  sessionProfileCache.set(cacheKey, request);
  return request;
}

export function clearCrmProfileCache(sessionId: string): void {
  for (const key of sessionProfileCache.keys()) {
    if (key.startsWith(`${sessionId}:`)) {
      sessionProfileCache.delete(key);
    }
  }
}
