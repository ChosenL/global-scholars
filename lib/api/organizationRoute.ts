import "server-only";

import { auth } from "@clerk/nextjs/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClerkSupabaseClient } from "@/lib/supabase";

import { runOrganizationApi } from "./organizationApi";

export async function handleOrganizationRoute<T>(
  request: Request,
  route: string,
  operation: (supabase: SupabaseClient) => Promise<T>,
  requireAdmin = false,
): Promise<Response> {
  const clerkAuth = await auth();
  const supabase = clerkAuth.userId
    ? createClerkSupabaseClient(() => clerkAuth.getToken())
    : undefined;

  return runOrganizationApi({
    request,
    route,
    userId: clerkAuth.userId,
    supabase,
    requireAdmin,
    operation,
  });
}
