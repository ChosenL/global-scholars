import type {
  ApplicationStatus,
  CreateApplicationInput,
  ListApplicationsInput,
} from "@/lib/crm/applications";
import { createApplication, listApplications } from "@/lib/crm/applications";
import {
  optionalString,
  parseJsonObject,
  requiredString,
} from "@/lib/api/applicationApi";
import { handleApplicationRoute } from "@/lib/api/applicationRoute";

export async function GET(request: Request) {
  return handleApplicationRoute(request, "/api/applications", (supabase) => {
    const params = new URL(request.url).searchParams;
    const input: ListApplicationsInput = {
      studentProfileId: params.get("studentProfileId") ?? undefined,
      advisorProfileId: params.get("advisorProfileId") ?? undefined,
      organizationId: params.get("organizationId") ?? undefined,
      status: (params.get("status") as ApplicationStatus | null) ?? undefined,
      includeArchived: params.get("includeArchived") === "true",
      limit: params.has("limit") ? Number(params.get("limit")) : undefined,
      offset: params.has("offset") ? Number(params.get("offset")) : undefined,
    };
    return listApplications(supabase, input);
  });
}

export async function POST(request: Request) {
  return handleApplicationRoute(
    request,
    "/api/applications",
    async (supabase) => {
      const payload = await parseJsonObject(request);
      const input: CreateApplicationInput = {
        studentProfileId: requiredString(payload, "studentProfileId"),
        universityId: requiredString(payload, "universityId"),
        programId: requiredString(payload, "programId"),
        intakeId: requiredString(payload, "intakeId"),
        advisorProfileId: optionalString(payload, "advisorProfileId"),
      };
      return createApplication(supabase, input);
    },
  );
}
