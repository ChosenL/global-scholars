import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClerkSupabaseClient } from "@/lib/supabase";

import { runApplicationApi } from "./applicationApi";

export async function handleApplicationRoute<T>(
  request: Request,
  route: string,
  operation: (supabase: SupabaseClient) => Promise<T>,
): Promise<Response> {
  const clerkAuth = await auth();
  const supabase = clerkAuth.userId
    ? createClerkSupabaseClient(() => clerkAuth.getToken())
    : undefined;
  return runApplicationApi({
    request,
    route,
    userId: clerkAuth.userId,
    supabase,
    operation,
  });
}
