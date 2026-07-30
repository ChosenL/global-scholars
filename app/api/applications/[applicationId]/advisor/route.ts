import { assignAdvisor } from "@/lib/crm/applications";
import { parseJsonObject, requiredString } from "@/lib/api/applicationApi";
import { handleApplicationRoute } from "@/lib/api/applicationRoute";

interface AdvisorRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function POST(request: Request, { params }: AdvisorRouteContext) {
  const { applicationId } = await params;
  return handleApplicationRoute(
    request,
    "/api/applications/[applicationId]/advisor",
    async (supabase) => {
      const payload = await parseJsonObject(request);
      return assignAdvisor(
        supabase,
        applicationId,
        requiredString(payload, "advisorProfileId"),
      );
    },
  );
}
