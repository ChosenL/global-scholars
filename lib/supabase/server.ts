import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseEnv } from "./env";
import type { Database } from "./types";

type AccessTokenProvider = () => Promise<string | null>;

export function createSupabaseServerClient(
  getAccessToken?: AccessTokenProvider,
): SupabaseClient<Database> {
  return createClient<Database>(
    supabaseEnv.url,
    supabaseEnv.publishableKey,
    {
      db: {
        schema: "crm",
      },
      ...(getAccessToken
        ? {
            accessToken: getAccessToken,
          }
        : {}),
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
