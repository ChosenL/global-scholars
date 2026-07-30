import type {
  OrganizationType,
  UpdateOrganizationInput,
} from "@/lib/crm/organizations";
import {
  getOrganizationById,
  updateOrganization,
} from "@/lib/crm/organizations";
import { optionalString, parseJsonObject } from "@/lib/api/organizationApi";
import { handleOrganizationRoute } from "@/lib/api/organizationRoute";

interface OrganizationRouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function GET(
  request: Request,
  { params }: OrganizationRouteContext,
) {
  const { organizationId } = await params;
  return handleOrganizationRoute(
    request,
    "/api/organizations/[organizationId]",
    (supabase) => getOrganizationById(supabase, organizationId),
  );
}

export async function PATCH(
  request: Request,
  { params }: OrganizationRouteContext,
) {
  const { organizationId } = await params;
  return handleOrganizationRoute(
    request,
    "/api/organizations/[organizationId]",
    async (supabase) => {
      const payload = await parseJsonObject(request);
      const input: UpdateOrganizationInput = {
        name: optionalString(payload, "name") ?? undefined,
        slug: optionalString(payload, "slug") ?? undefined,
        organizationType: optionalString(payload, "organizationType") as
          OrganizationType | undefined,
        email: optionalString(payload, "email"),
        phone: optionalString(payload, "phone"),
        website: optionalString(payload, "website"),
        address: optionalString(payload, "address"),
      };
      return updateOrganization(supabase, organizationId, input);
    },
    true,
  );
}
