import type { OrganizationStudentMembership } from "@/lib/crm/organizations";
import { assignStudent } from "@/lib/crm/organizations";
import {
  optionalBoolean,
  optionalString,
  parseJsonObject,
  requiredString,
} from "@/lib/api/organizationApi";
import { handleOrganizationRoute } from "@/lib/api/organizationRoute";

interface StudentRouteContext {
  params: Promise<{ organizationId: string }>;
}

export async function POST(request: Request, { params }: StudentRouteContext) {
  const { organizationId } = await params;
  return handleOrganizationRoute(
    request,
    "/api/organizations/[organizationId]/students",
    async (supabase) => {
      const payload = await parseJsonObject(request);
      return assignStudent(supabase, {
        organizationId,
        studentProfileId: requiredString(payload, "studentProfileId"),
        membershipType: optionalString(payload, "membershipType") as
          OrganizationStudentMembership | undefined,
        isPrimary: optionalBoolean(payload, "isPrimary"),
        externalStudentReference: optionalString(
          payload,
          "externalStudentReference",
        ),
        startsAt: optionalString(payload, "startsAt") ?? undefined,
      });
    },
    true,
  );
}
