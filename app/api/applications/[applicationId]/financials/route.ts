import { updateFinancialDetails } from "@/lib/crm/applications";
import {
  optionalString,
  parseJsonObject,
  requiredNullableNumber,
} from "@/lib/api/applicationApi";
import { handleApplicationRoute } from "@/lib/api/applicationRoute";

interface FinancialsRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function POST(
  request: Request,
  { params }: FinancialsRouteContext,
) {
  const { applicationId } = await params;
  return handleApplicationRoute(
    request,
    "/api/applications/[applicationId]/financials",
    async (supabase) => {
      const payload = await parseJsonObject(request);
      return updateFinancialDetails(supabase, applicationId, {
        tuitionAmount: requiredNullableNumber(payload, "tuitionAmount"),
        tuitionCurrency: optionalString(payload, "tuitionCurrency") ?? null,
        tuitionSource: optionalString(payload, "tuitionSource") ?? null,
      });
    },
  );
}
