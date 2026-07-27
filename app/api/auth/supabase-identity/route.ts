import { auth } from "@clerk/nextjs/server";

import { createClerkSupabaseClient } from "@/lib/supabase";
import {
  createRequestContext,
  operationsLogger,
  reportError,
  responseHeaders,
} from "@/lib/operations";

const noStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
} as const;

export async function GET(request: Request) {
  const context = createRequestContext(request, "/api/auth/supabase-identity");
  const json = (body: unknown, status = 200) => Response.json(body, {
    status,
    headers: responseHeaders(context, noStoreHeaders),
  });

  try {
    const clerkAuth = await auth();
    if (!clerkAuth.userId) {
      return json(
      {
        authenticated: false,
        tokenAccepted: false,
        identityMatches: false,
      },
        401,
      );
    }

    const supabase = createClerkSupabaseClient(() => clerkAuth.getToken());
    const { data: databaseUserId, error } = await supabase.rpc(
      "current_clerk_user_id",
    );

    if (error) throw error;

    const body = {
      authenticated: true,
      tokenAccepted: true,
      identityMatches: databaseUserId === clerkAuth.userId,
    };
    operationsLogger.info("request.completed", {
      ...context,
      statusCode: 200,
      durationMs: Date.now() - context.startedAt,
    });
    return json(body);
  } catch (error) {
    await reportError({ error, context });
    return json({
      authenticated: true,
      tokenAccepted: false,
      identityMatches: false,
    }, 502);
  }
}
