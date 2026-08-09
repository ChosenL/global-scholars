import { handleApplicationRoute } from "@/lib/api/applicationRoute";
import { requiredString } from "@/lib/api/applicationApi";
import { listOpenIntakes } from "@/lib/crm/admissionsCatalog";

export async function GET(request: Request) {
  return handleApplicationRoute(
    request,
    "/api/applications/intakes",
    (supabase) => {
      const params = new URL(request.url).searchParams;
      return listOpenIntakes(
        supabase,
        requiredString(Object.fromEntries(params), "programId"),
      );
    },
  );
}
