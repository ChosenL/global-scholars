import { archiveApplication } from "@/lib/crm/applications";
import { handleApplicationRoute } from "@/lib/api/applicationRoute";

interface ArchiveRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function POST(request: Request, { params }: ArchiveRouteContext) {
  const { applicationId } = await params;
  return handleApplicationRoute(
    request,
    "/api/applications/[applicationId]/archive",
    (supabase) => archiveApplication(supabase, applicationId),
  );
}
