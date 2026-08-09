import { handleApplicationRoute } from "@/lib/api/applicationRoute";
import { requiredString } from "@/lib/api/applicationApi";
import { searchPrograms } from "@/lib/crm/admissionsCatalog";

export async function GET(request: Request) {
  return handleApplicationRoute(
    request,
    "/api/applications/programs",
    (supabase) => {
      const params = new URL(request.url).searchParams;
      return searchPrograms(
        supabase,
        requiredString(Object.fromEntries(params), "universityId"),
        params.get("query") ?? "",
        20,
      );
    },
  );
}
