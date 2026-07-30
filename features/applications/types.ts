import type { Database } from "@/lib/supabase/types";

export type StudentApplication =
  Database["crm"]["Tables"]["student_applications"]["Row"];
export type ApplicationTimelineEvent =
  Database["crm"]["Tables"]["timeline_events"]["Row"];
export type ApplicationStatus =
  | "draft"
  | "ready_for_review"
  | "submitted"
  | "under_review"
  | "additional_documents_requested"
  | "interview"
  | "conditional_offer"
  | "unconditional_offer"
  | "deposit_paid"
  | "visa_stage"
  | "enrolled"
  | "closed"
  | "withdrawn"
  | "rejected"
  | "waitlisted"
  | "deferred";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "draft",
  "ready_for_review",
  "submitted",
  "under_review",
  "additional_documents_requested",
  "interview",
  "conditional_offer",
  "unconditional_offer",
  "deposit_paid",
  "visa_stage",
  "enrolled",
  "closed",
  "withdrawn",
  "rejected",
  "waitlisted",
  "deferred",
];
