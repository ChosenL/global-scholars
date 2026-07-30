import type { OrganizationAdvisorRole } from "@/lib/crm/organizations";
import {
  assignAdvisor,
  listOrganizationAdvisors,
} from "@/lib/crm/organizations";
import {
  optionalString,
  parseJsonObject,
  requiredString,
} from "@/lib/api/organizationApi";
import { handleOrganizationRoute } from "@/lib/api/organizationRoute";

interface AdvisorRouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function GET(request: Request, { params }: AdvisorRouteContext) {
  const { organizationId } = await params;
  return handleOrganizationRoute(
    request,
    "/api/organizations/[organizationId]/advisors",
    (supabase) => listOrganizationAdvisors(supabase, organizationId),
  );
}

export async function POST(request: Request, { params }: AdvisorRouteContext) {
  const { organizationId } = await params;
  return handleOrganizationRoute(
    request,
    "/api/organizations/[organizationId]/advisors",
    async (supabase) => {
      const payload = await parseJsonObject(request);
      return assignAdvisor(supabase, {
        organizationId,
        advisorProfileId: requiredString(payload, "advisorProfileId"),
        assignmentRole: optionalString(payload, "assignmentRole") as
          OrganizationAdvisorRole | undefined,
        startsAt: optionalString(payload, "startsAt") ?? undefined,
      });
    },
    true,
  );
}
