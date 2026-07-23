"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseEnv } from "./env";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | undefined;

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  browserClient ??= createClient<Database>(
    supabaseEnv.url,
    supabaseEnv.publishableKey,
    {
      db: {
        schema: "crm",
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );

  return browserClient;
}
