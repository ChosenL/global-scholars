import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

type PlatformRole = "student" | "advisor" | "admin";

const SCHOLAR_DASHBOARD = "/scholar-dashboard";
const ADVISOR_DASHBOARD = "/advisor-dashboard";

function isRouteOrChild(
  pathname: string,
  route: string,
): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function getPlatformRole(
  sessionClaims: unknown,
): PlatformRole | null {
  if (
    !sessionClaims ||
    typeof sessionClaims !== "object"
  ) {
    return null;
  }

  const claims = sessionClaims as {
    metadata?: {
      role?: unknown;
    };
  };

  const role = claims.metadata?.role;

  if (
    role === "student" ||
    role === "advisor" ||
    role === "admin"
  ) {
    return role;
  }

  return null;
}

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;

  const isScholarDashboard = isRouteOrChild(
    pathname,
    SCHOLAR_DASHBOARD,
  );

  const isAdvisorDashboard = isRouteOrChild(
    pathname,
    ADVISOR_DASHBOARD,
  );

  const isProtectedDashboard =
    isScholarDashboard || isAdvisorDashboard;

  if (!isProtectedDashboard) {
    return NextResponse.next();
  }

  await auth.protect();

  const { sessionClaims } = await auth();
  const role = getPlatformRole(sessionClaims);

  if (
    isScholarDashboard &&
    (role === "advisor" || role === "admin")
  ) {
    return NextResponse.redirect(
      new URL(ADVISOR_DASHBOARD, request.url),
    );
  }

  if (
    isAdvisorDashboard &&
    role === "student"
  ) {
    return NextResponse.redirect(
      new URL(SCHOLAR_DASHBOARD, request.url),
    );
  }

  /*
   * A missing token role is not blocked here.
   *
   * usePlatformRole() performs the fuller client-side resolution
   * using both Clerk metadata and platform_users in Supabase. This
   * avoids locking out an existing user while their Clerk session
   * token is waiting to refresh after a metadata update.
   */
  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Skip Next.js internals and static files unless they are
     * explicitly requested through search parameters.
     */
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",

    /*
     * Always allow Clerk to inspect API and tRPC requests.
     * Authorization for data access should still be enforced
     * inside each route handler and Supabase policy.
     */
    "/(api|trpc)(.*)",

    /*
     * Required for Clerk frontend API proxy routes.
     */
    "/__clerk/(.*)",
  ],
};