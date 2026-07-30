import type {
  CreateOrganizationInput,
  ListOrganizationsInput,
  OrganizationStatus,
  OrganizationType,
} from "@/lib/crm/organizations";
import { createOrganization, listOrganizations } from "@/lib/crm/organizations";
import {
  optionalString,
  parseJsonObject,
  requiredString,
} from "@/lib/api/organizationApi";
import { handleOrganizationRoute } from "@/lib/api/organizationRoute";

export async function GET(request: Request) {
  return handleOrganizationRoute(request, "/api/organizations", (supabase) => {
    const searchParams = new URL(request.url).searchParams;
    const input: ListOrganizationsInput = {
      status:
        (searchParams.get("status") as OrganizationStatus | null) ?? undefined,
      organizationType:
        (searchParams.get("organizationType") as OrganizationType | null) ??
        undefined,
      search: searchParams.get("search") ?? undefined,
      limit: searchParams.has("limit")
        ? Number(searchParams.get("limit"))
        : undefined,
      offset: searchParams.has("offset")
        ? Number(searchParams.get("offset"))
        : undefined,
    };
    return listOrganizations(supabase, input);
  });
}

export async function POST(request: Request) {
  return handleOrganizationRoute(
    request,
    "/api/organizations",
    async (supabase) => {
      const payload = await parseJsonObject(request);
      const input: CreateOrganizationInput = {
        name: requiredString(payload, "name"),
        slug: requiredString(payload, "slug"),
        organizationType: requiredString(
          payload,
          "organizationType",
        ) as OrganizationType,
        email: optionalString(payload, "email"),
        phone: optionalString(payload, "phone"),
        website: optionalString(payload, "website"),
        address: optionalString(payload, "address"),
      };
      return createOrganization(supabase, input);
    },
    true,
  );
}
