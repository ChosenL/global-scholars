import type { AiAnswer, AiCitation, AiAssistantRequest, AiCapability } from "../types";

const capabilities = new Set<AiCapability>([
  "student_advice", "timeline_summary", "next_action",
  "readiness_explanation", "advisor_reply", "application_summary",
  "natural_language_search",
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseAiRequest(value: unknown): AiAssistantRequest {
  if (!value || typeof value !== "object") throw new Error("Invalid AI request.");
  const input = value as Partial<AiAssistantRequest>;
  if (!input.capability || !capabilities.has(input.capability)) throw new Error("Unsupported AI capability.");
  if (!input.studentProfileId || !uuidPattern.test(input.studentProfileId)) throw new Error("Invalid student profile ID.");
  const question = input.question?.trim();
  if (!question || question.length > 4000) throw new Error("Question must contain 1 to 4000 characters.");
  if (input.applicationId && !uuidPattern.test(input.applicationId)) throw new Error("Invalid application ID.");
  return { ...input, question } as AiAssistantRequest;
}

export function validateCitations(
  citations: AiCitation[],
  allowed: ReadonlySet<string>,
): AiCitation[] {
  if (!Array.isArray(citations)) throw new Error("AI citations are invalid.");
  return citations.filter((citation) =>
    citation && allowed.has(`${citation.sourceType}:${citation.sourceId}`),
  );
}

export function parseAiAnswer(raw: string, allowed: ReadonlySet<string>): AiAnswer {
  const parsed = JSON.parse(raw) as Partial<AiAnswer>;
  if (typeof parsed.answer !== "string" || !parsed.answer.trim()) throw new Error("AI response is empty.");
  return {
    answer: parsed.answer.trim(),
    citations: validateCitations(parsed.citations ?? [], allowed),
    suggestedActions: Array.isArray(parsed.suggestedActions)
      ? parsed.suggestedActions.filter((item): item is string => typeof item === "string").slice(0, 5)
      : [],
    disclaimer: typeof parsed.disclaimer === "string" ? parsed.disclaimer : null,
  };
}
