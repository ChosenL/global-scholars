import { listApplicationTimeline } from "@/lib/crm/applications";
import { handleApplicationRoute } from "@/lib/api/applicationRoute";

interface TimelineRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function GET(request: Request, { params }: TimelineRouteContext) {
  const { applicationId } = await params;
  const searchParams = new URL(request.url).searchParams;
  const limit = searchParams.has("limit")
    ? Number(searchParams.get("limit"))
    : undefined;
  return handleApplicationRoute(
    request,
    "/api/applications/[applicationId]/timeline",
    (supabase) => listApplicationTimeline(supabase, applicationId, limit),
  );
}
