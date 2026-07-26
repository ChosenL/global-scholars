import type { SupabaseClient } from "@supabase/supabase-js";

import type { AiAnswer, AiAssistantRequest } from "../types";

export type AiGateway = (request: AiAssistantRequest) => Promise<AiAnswer>;

function invoke(gateway: AiGateway, request: AiAssistantRequest) {
  return gateway(request);
}

export const generateStudentAdvice = (gateway: AiGateway, input: Omit<AiAssistantRequest, "capability">) =>
  invoke(gateway, { ...input, capability: "student_advice" });
export const summarizeTimeline = (gateway: AiGateway, input: Omit<AiAssistantRequest, "capability">) =>
  invoke(gateway, { ...input, capability: "timeline_summary" });
export const recommendNextAction = (gateway: AiGateway, input: Omit<AiAssistantRequest, "capability">) =>
  invoke(gateway, { ...input, capability: "next_action" });
export const explainReadiness = (gateway: AiGateway, input: Omit<AiAssistantRequest, "capability">) =>
  invoke(gateway, { ...input, capability: "readiness_explanation" });
export const draftAdvisorReply = (gateway: AiGateway, input: Omit<AiAssistantRequest, "capability">) =>
  invoke(gateway, { ...input, capability: "advisor_reply" });
export const summarizeApplication = (gateway: AiGateway, input: Omit<AiAssistantRequest, "capability">) =>
  invoke(gateway, { ...input, capability: "application_summary" });

export async function beginAiInvocation(
  supabase: SupabaseClient,
  request: AiAssistantRequest,
  model: string,
) {
  const { data, error } = await supabase.schema("crm").rpc("begin_ai_invocation", {
    target_student_profile_id: request.studentProfileId,
    requested_capability: request.capability,
    requested_model: model,
    safe_request_metadata: {
      has_application_scope: Boolean(request.applicationId),
      question_length: request.question.length,
    },
  });
  if (error) throw error;
  return data as { id: string };
}

export async function completeAiInvocation(
  supabase: SupabaseClient,
  invocationId: string,
  status: "completed" | "failed" | "refused",
  details: { citations?: unknown[]; usage?: Record<string, unknown>; latencyMs?: number; errorCode?: string },
) {
  const { error } = await supabase.schema("crm").rpc("complete_ai_invocation", {
    target_invocation_id: invocationId,
    completion_status: status,
    validated_citations: details.citations ?? [],
    safe_usage_metadata: details.usage ?? {},
    measured_latency_ms: details.latencyMs ?? null,
    completion_error_code: details.errorCode ?? null,
  });
  if (error) throw error;
}
