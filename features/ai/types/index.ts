export type AiCapability =
  | "student_advice"
  | "timeline_summary"
  | "next_action"
  | "readiness_explanation"
  | "advisor_reply"
  | "application_summary"
  | "natural_language_search";

export type AiSourceType =
  | "profile"
  | "document"
  | "task"
  | "note"
  | "application"
  | "visa_case"
  | "timeline"
  | "notification"
  | "readiness";

export interface AiCitation {
  sourceType: AiSourceType;
  sourceId: string;
  label: string;
}

export interface AiAnswer {
  answer: string;
  citations: AiCitation[];
  suggestedActions: string[];
  disclaimer: string | null;
}

export interface AiAssistantRequest {
  capability: AiCapability;
  studentProfileId: string;
  question: string;
  applicationId?: string;
}

export interface AuthorizedAiContext {
  role: "student" | "advisor" | "admin";
  studentProfileId: string;
  records: Array<{
    sourceType: AiSourceType;
    sourceId: string;
    label: string;
    data: Record<string, unknown>;
  }>;
}
