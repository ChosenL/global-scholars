import { archiveOrganization } from "@/lib/crm/organizations";
import { handleOrganizationRoute } from "@/lib/api/organizationRoute";

interface ArchiveRouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function POST(request: Request, { params }: ArchiveRouteContext) {
  const { organizationId } = await params;
  return handleOrganizationRoute(
    request,
    "/api/organizations/[organizationId]/archive",
    (supabase) => archiveOrganization(supabase, organizationId),
    true,
  );
}
