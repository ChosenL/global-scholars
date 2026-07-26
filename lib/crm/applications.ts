import type { SupabaseClient } from "@supabase/supabase-js";

import { requireCrmUuid, requireTrimmedText } from "./validation";

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

export type ApplicationDecisionType =
  | "conditional_offer"
  | "unconditional_offer"
  | "rejected"
  | "waitlisted";

export interface StudentApplication {
  id: string;
  student_profile_id: string;
  intake_id: string;
  advisor_profile_id: string | null;
  status: ApplicationStatus;
  external_reference: string | null;
  submitted_at: string | null;
  closed_at: string | null;
  withdrawn_at: string | null;
  archived_at: string | null;
  created_by_profile_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ApplicationStatusHistory {
  id: string;
  application_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  reason: string | null;
  changed_by_profile_id: string;
  changed_at: string;
}

export interface ApplicationDecision {
  id: string;
  application_id: string;
  decision_type: ApplicationDecisionType;
  conditions: string | null;
  decision_date: string;
  offer_expires_at: string | null;
  recorded_by_profile_id: string;
  created_at: string;
}

export interface ApplicationDeposit {
  id: string;
  application_id: string;
  amount: number;
  currency: string;
  status: "required" | "pending" | "paid" | "refunded" | "waived";
  due_date: string | null;
  paid_at: string | null;
  reference: string | null;
  recorded_by_profile_id: string;
  created_at: string;
}

export interface CreateApplicationInput {
  studentProfileId: string;
  intakeId: string;
  advisorProfileId?: string | null;
}

export async function fetchStudentApplications(
  supabase: SupabaseClient,
  studentProfileId: string,
): Promise<StudentApplication[]> {
  const { data, error } = await supabase.schema("crm")
    .from("student_applications").select("*")
    .eq("student_profile_id", requireCrmUuid(studentProfileId, "Student profile"))
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudentApplication[];
}

export async function createApplication(
  supabase: SupabaseClient,
  input: CreateApplicationInput,
): Promise<StudentApplication> {
  const { data, error } = await supabase.schema("crm").rpc(
    "create_student_application",
    {
      target_student_profile_id: requireCrmUuid(input.studentProfileId, "Student profile"),
      target_intake_id: requireCrmUuid(input.intakeId, "Intake"),
      target_advisor_profile_id: input.advisorProfileId
        ? requireCrmUuid(input.advisorProfileId, "Advisor profile")
        : null,
    },
  );
  if (error) throw error;
  return data as StudentApplication;
}

export async function updateApplicationStatus(
  supabase: SupabaseClient,
  applicationId: string,
  status: ApplicationStatus,
  reason?: string | null,
): Promise<StudentApplication> {
  const { data, error } = await supabase.schema("crm").rpc(
    "update_application_status",
    {
      target_application_id: requireCrmUuid(applicationId, "Application"),
      new_status: status,
      transition_reason: reason?.trim() || null,
    },
  );
  if (error) throw error;
  return data as StudentApplication;
}

export async function submitApplication(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<StudentApplication> {
  const { data, error } = await supabase.schema("crm").rpc(
    "submit_student_application",
    { target_application_id: requireCrmUuid(applicationId, "Application") },
  );
  if (error) throw error;
  return data as StudentApplication;
}

export async function recordApplicationDecision(
  supabase: SupabaseClient,
  input: {
    applicationId: string;
    decisionType: ApplicationDecisionType;
    conditions?: string | null;
    decisionDate: string;
    offerExpiresAt?: string | null;
  },
): Promise<ApplicationDecision> {
  const { data, error } = await supabase.schema("crm").rpc(
    "record_application_decision",
    {
      target_application_id: requireCrmUuid(input.applicationId, "Application"),
      new_decision_type: input.decisionType,
      new_conditions: input.conditions
        ? requireTrimmedText(input.conditions, "Decision conditions", 2, 5000)
        : "",
      new_decision_date: input.decisionDate,
      new_offer_expires_at: input.offerExpiresAt ?? null,
    },
  );
  if (error) throw error;
  return data as ApplicationDecision;
}

export async function recordApplicationDeposit(
  supabase: SupabaseClient,
  input: {
    applicationId: string;
    amount: number;
    currency: string;
    status: ApplicationDeposit["status"];
    dueDate?: string | null;
    paidAt?: string | null;
    reference?: string | null;
  },
): Promise<ApplicationDeposit> {
  const { data, error } = await supabase.schema("crm").rpc(
    "record_application_deposit",
    {
      target_application_id: requireCrmUuid(input.applicationId, "Application"),
      new_amount: input.amount,
      new_currency: input.currency.toUpperCase(),
      new_status: input.status,
      new_due_date: input.dueDate ?? null,
      new_paid_at: input.paidAt ?? null,
      new_reference: input.reference ?? null,
    },
  );
  if (error) throw error;
  return data as ApplicationDeposit;
}

export async function archiveApplication(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<StudentApplication> {
  const { data, error } = await supabase.schema("crm").rpc(
    "archive_student_application",
    { target_application_id: requireCrmUuid(applicationId, "Application") },
  );
  if (error) throw error;
  return data as StudentApplication;
}

export async function linkApplicationNote(
  supabase: SupabaseClient,
  applicationId: string,
  noteId: string,
): Promise<void> {
  const { error } = await supabase.schema("crm").rpc(
    "link_application_note",
    {
      target_application_id: requireCrmUuid(applicationId, "Application"),
      target_note_id: requireCrmUuid(noteId, "Note"),
    },
  );
  if (error) throw error;
}
