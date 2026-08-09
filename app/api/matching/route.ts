import { handleApplicationRoute } from "@/lib/api/applicationRoute";
import { PlatformServiceError } from "@/lib/crm/platformErrors";
import { findStudentMatches } from "@/lib/matching/matchingService";

export async function GET(request: Request) {
  return handleApplicationRoute(request, "/api/matching", (supabase) => {
    const studentProfileId = new URL(request.url).searchParams.get(
      "studentProfileId",
    );
    if (!studentProfileId)
      throw new PlatformServiceError(
        "VALIDATION_FAILED",
        "studentProfileId is required.",
      );
    return findStudentMatches(supabase, studentProfileId);
  });
}
