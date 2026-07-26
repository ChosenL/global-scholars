export type VisaStage =
  | "preparation"
  | "document_collection"
  | "application_ready"
  | "submitted"
  | "biometrics"
  | "interview"
  | "processing"
  | "approved"
  | "refused"
  | "passport_submission"
  | "visa_issued"
  | "travel_ready"
  | "closed"
  | "withdrawn";

export interface VisaCase {
  id: string;
  student_profile_id: string;
  application_id: string | null;
  destination_country_id: string;
  embassy_id: string | null;
  advisor_profile_id: string | null;
  visa_type: string;
  stage: VisaStage;
  external_reference: string | null;
  target_submission_date: string | null;
  submitted_at: string | null;
  closed_at: string | null;
  created_by_profile_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface VisaChecklistInput {
  key: string;
  title: string;
  description?: string;
  required?: boolean;
  due_at?: string;
  position?: number;
}

export interface VisaInterview {
  id: string;
  visa_case_id: string;
  embassy_id: string | null;
  interview_type:
    | "visa_interview"
    | "biometrics"
    | "medical"
    | "document_dropoff"
    | "other";
  scheduled_at: string;
  timezone: string;
  location_details: string | null;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled" | "missed";
  outcome_notes: string | null;
  scheduled_by_profile_id: string;
  created_at: string;
  updated_at: string;
}

export interface VisaDecision {
  id: string;
  visa_case_id: string;
  decision: "approved" | "refused" | "withdrawn" | "administrative_processing";
  decision_date: string;
  valid_from: string | null;
  valid_until: string | null;
  refusal_reasons: string | null;
  conditions: string | null;
  recorded_by_profile_id: string;
  created_at: string;
}

export interface VisaDocument {
  id: string;
  visa_case_id: string;
  student_document_id: string;
  checklist_item_id: string | null;
  document_purpose: string;
  status: "linked" | "under_review" | "accepted" | "rejected" | "expired";
  linked_by_profile_id: string;
  linked_at: string;
}

export interface VisaReadiness {
  visa_case_id: string;
  total_score: number;
  checklist_score: number;
  document_score: number;
  interview_score: number;
  passport_score: number;
  travel_score: number;
  components: Record<string, unknown>;
  calculated_at: string;
  updated_at: string;
}

export interface VisaPassport {
  id: string;
  student_profile_id: string;
  student_document_id: string | null;
  issuing_country_id: string;
  passport_last_four: string;
  issued_at: string | null;
  expires_at: string;
  is_primary: boolean;
  status: "active" | "expired" | "cancelled" | "replaced";
}

export interface VisaTravelPlan {
  id: string;
  visa_case_id: string;
  departure_country_id: string;
  arrival_country_id: string;
  departure_at: string | null;
  arrival_at: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  accommodation_details: Record<string, unknown>;
  itinerary_metadata: Record<string, unknown>;
  status: "planned" | "booked" | "completed" | "cancelled";
}
