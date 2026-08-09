import { searchUniversities } from "@/lib/crm/admissionsCatalog";
import { handleApplicationRoute } from "@/lib/api/applicationRoute";

export async function GET(request: Request) {
  return handleApplicationRoute(
    request,
    "/api/applications/universities",
    (supabase) =>
      searchUniversities(
        supabase,
        new URL(request.url).searchParams.get("query") ?? "",
        20,
      ),
  );
}
