import { removeAdvisor } from "@/lib/crm/organizations";
import { handleOrganizationRoute } from "@/lib/api/organizationRoute";

interface AdvisorAssignmentRouteContext {
  params: Promise<{ organizationId: string; assignmentId: string }>;
}

export async function DELETE(
  request: Request,
  { params }: AdvisorAssignmentRouteContext,
) {
  const { assignmentId } = await params;
  return handleOrganizationRoute(
    request,
    "/api/organizations/[organizationId]/advisors/[assignmentId]",
    (supabase) => removeAdvisor(supabase, assignmentId),
    true,
  );
}
