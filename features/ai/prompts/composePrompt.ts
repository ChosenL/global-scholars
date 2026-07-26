import type { AiAssistantRequest, AuthorizedAiContext } from "../types";

export function composePrompt(request: AiAssistantRequest, context: AuthorizedAiContext): string {
  const sources = context.records.map((record) => ({
    citation: `${record.sourceType}:${record.sourceId}`,
    label: record.label,
    data: record.data,
  }));
  return JSON.stringify({
    task: request.capability,
    question: request.question,
    requesterRole: context.role,
    rules: [
      "Use only the supplied authorized records.",
      "Never infer or reveal fields that are absent.",
      "Cite factual CRM claims using supplied sourceType and sourceId values.",
      "Do not guarantee admission, a visa, scholarships, or outcomes.",
      "Visa information is general education, not legal advice.",
      "If evidence is insufficient, say so and suggest a human advisor.",
    ],
    authorizedSources: sources,
  });
}
