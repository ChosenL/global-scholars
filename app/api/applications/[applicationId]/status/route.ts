import type { ApplicationStatus } from "@/lib/crm/applications";
import { changeApplicationStatus } from "@/lib/crm/applications";
import {
  optionalString,
  parseJsonObject,
  requiredString,
} from "@/lib/api/applicationApi";
import { handleApplicationRoute } from "@/lib/api/applicationRoute";

interface StatusRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function POST(request: Request, { params }: StatusRouteContext) {
  const { applicationId } = await params;
  return handleApplicationRoute(
    request,
    "/api/applications/[applicationId]/status",
    async (supabase) => {
      const payload = await parseJsonObject(request);
      return changeApplicationStatus(supabase, {
        applicationId,
        status: requiredString(payload, "status") as ApplicationStatus,
        reason: optionalString(payload, "reason"),
      });
    },
  );
}
