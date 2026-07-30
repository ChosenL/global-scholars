import { removeStudent } from "@/lib/crm/organizations";
import { handleOrganizationRoute } from "@/lib/api/organizationRoute";

interface StudentMembershipRouteContext {
  params: Promise<{ organizationId: string; membershipId: string }>;
}

export async function DELETE(
  request: Request,
  { params }: StudentMembershipRouteContext,
) {
  const { membershipId } = await params;
  return handleOrganizationRoute(
    request,
    "/api/organizations/[organizationId]/students/[membershipId]",
    (supabase) => removeStudent(supabase, membershipId),
    true,
  );
}
