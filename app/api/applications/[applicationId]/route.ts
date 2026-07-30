import type { UpdateApplicationInput } from "@/lib/crm/applications";
import { getApplicationById, updateApplication } from "@/lib/crm/applications";
import { optionalString, parseJsonObject } from "@/lib/api/applicationApi";
import { handleApplicationRoute } from "@/lib/api/applicationRoute";

interface ApplicationRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function GET(
  request: Request,
  { params }: ApplicationRouteContext,
) {
  const { applicationId } = await params;
  return handleApplicationRoute(
    request,
    "/api/applications/[applicationId]",
    (supabase) => getApplicationById(supabase, applicationId),
  );
}

export async function PATCH(
  request: Request,
  { params }: ApplicationRouteContext,
) {
  const { applicationId } = await params;
  return handleApplicationRoute(
    request,
    "/api/applications/[applicationId]",
    async (supabase) => {
      const payload = await parseJsonObject(request);
      const input: UpdateApplicationInput = {
        externalReference: optionalString(payload, "externalReference"),
        organizationId: optionalString(payload, "organizationId"),
      };
      return updateApplication(supabase, applicationId, input);
    },
  );
}
