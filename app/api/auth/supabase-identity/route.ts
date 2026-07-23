import { auth } from "@clerk/nextjs/server";

import { createClerkSupabaseClient } from "@/lib/supabase";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
} as const;

export async function GET() {
  const clerkAuth = await auth();

  if (!clerkAuth.userId) {
    return Response.json(
      {
        authenticated: false,
        tokenAccepted: false,
        identityMatches: false,
      },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const supabase = createClerkSupabaseClient(() => clerkAuth.getToken());
  const { data: databaseUserId, error } = await supabase.rpc(
    "current_clerk_user_id",
  );

  if (error) {
    return Response.json(
      {
        authenticated: true,
        tokenAccepted: false,
        identityMatches: false,
      },
      { status: 502, headers: noStoreHeaders },
    );
  }

  return Response.json(
    {
      authenticated: true,
      tokenAccepted: true,
      identityMatches: databaseUserId === clerkAuth.userId,
    },
    { headers: noStoreHeaders },
  );
}
