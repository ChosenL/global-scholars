import { createClient } from "@supabase/supabase-js";

import { supabaseEnv } from "./supabase/env";

export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>,
) {
  return createClient(
    supabaseEnv.url,
    supabaseEnv.publishableKey,
    {
      async accessToken() {
        return getToken();
      },
    },
  );
}
