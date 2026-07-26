import type { SupabaseClient } from "@supabase/supabase-js";

import { requireCrmUuid, requireTrimmedText } from "@/lib/crm/validation";

import { VISA_RPC } from "../rpc/contracts";
import type {
  VisaCase,
  VisaChecklistInput,
  VisaDecision,
  VisaDocument,
  VisaInterview,
  VisaReadiness,
  VisaPassport,
  VisaStage,
  VisaTravelPlan,
} from "../types";
import {
  validateDocumentPurpose,
  validateVisaCaseIdentity,
  validateVisaType,
} from "../validation";

export async function fetchStudentVisaCases(
  supabase: SupabaseClient,
  studentProfileId: string,
): Promise<VisaCase[]> {
  const { data, error } = await supabase.schema("crm").from("visa_cases")
    .select("*")
    .eq("student_profile_id", requireCrmUuid(studentProfileId, "Student profile"))
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VisaCase[];
}

export async function createVisaCase(
  supabase: SupabaseClient,
  input: {
    studentProfileId: string;
    destinationCountryId: string;
    visaType: string;
    applicationId?: string | null;
    embassyId?: string | null;
    advisorProfileId?: string | null;
    targetSubmissionDate?: string | null;
    initialChecklist?: VisaChecklistInput[];
  },
): Promise<VisaCase> {
  const { data, error } = await supabase.schema("crm").rpc(
    VISA_RPC.createCase,
    {
      target_student_profile_id: requireCrmUuid(input.studentProfileId, "Student profile"),
      target_destination_country_id: requireCrmUuid(input.destinationCountryId, "Destination country"),
      new_visa_type: validateVisaType(input.visaType),
      target_application_id: input.applicationId
        ? requireCrmUuid(input.applicationId, "Application") : null,
      target_embassy_id: input.embassyId
        ? requireCrmUuid(input.embassyId, "Embassy") : null,
      target_advisor_profile_id: input.advisorProfileId
        ? requireCrmUuid(input.advisorProfileId, "Advisor profile") : null,
      new_target_submission_date: input.targetSubmissionDate ?? null,
      initial_checklist: input.initialChecklist ?? [],
    },
  );
  if (error) throw error;
  return data as VisaCase;
}

export async function updateVisaStage(
  supabase: SupabaseClient,
  visaCaseId: string,
  stage: VisaStage,
  reason?: string | null,
): Promise<VisaCase> {
  const { data, error } = await supabase.schema("crm").rpc(
    VISA_RPC.updateStage,
    {
      target_visa_case_id: validateVisaCaseIdentity(visaCaseId),
      new_stage: stage,
      transition_reason: reason?.trim() || null,
    },
  );
  if (error) throw error;
  return data as VisaCase;
}

export async function scheduleInterview(
  supabase: SupabaseClient,
  input: {
    visaCaseId: string;
    embassyId?: string | null;
    interviewType: VisaInterview["interview_type"];
    scheduledAt: string;
    timezone: string;
    locationDetails?: string | null;
  },
): Promise<VisaInterview> {
  const { data, error } = await supabase.schema("crm").rpc(
    VISA_RPC.scheduleInterview,
    {
      target_visa_case_id: validateVisaCaseIdentity(input.visaCaseId),
      target_embassy_id: input.embassyId
        ? requireCrmUuid(input.embassyId, "Embassy") : null,
      new_interview_type: input.interviewType,
      new_scheduled_at: input.scheduledAt,
      new_timezone: requireTrimmedText(input.timezone, "Timezone", 2, 100),
      new_location_details: input.locationDetails?.trim() || null,
    },
  );
  if (error) throw error;
  return data as VisaInterview;
}

export async function recordDecision(
  supabase: SupabaseClient,
  input: {
    visaCaseId: string;
    decision: VisaDecision["decision"];
    decisionDate: string;
    validFrom?: string | null;
    validUntil?: string | null;
    refusalReasons?: string | null;
    conditions?: string | null;
  },
): Promise<VisaDecision> {
  const { data, error } = await supabase.schema("crm").rpc(
    VISA_RPC.recordDecision,
    {
      target_visa_case_id: validateVisaCaseIdentity(input.visaCaseId),
      new_decision: input.decision,
      new_decision_date: input.decisionDate,
      new_valid_from: input.validFrom ?? null,
      new_valid_until: input.validUntil ?? null,
      new_refusal_reasons: input.refusalReasons ?? null,
      new_conditions: input.conditions ?? null,
    },
  );
  if (error) throw error;
  return data as VisaDecision;
}

export async function uploadVisaDocument(
  supabase: SupabaseClient,
  input: {
    visaCaseId: string;
    studentDocumentId: string;
    purpose: string;
    checklistItemId?: string | null;
  },
): Promise<VisaDocument> {
  const { data, error } = await supabase.schema("crm").rpc(
    VISA_RPC.uploadDocument,
    {
      target_visa_case_id: validateVisaCaseIdentity(input.visaCaseId),
      target_student_document_id: requireCrmUuid(input.studentDocumentId, "Student document"),
      new_document_purpose: validateDocumentPurpose(input.purpose),
      target_checklist_item_id: input.checklistItemId
        ? requireCrmUuid(input.checklistItemId, "Checklist item") : null,
    },
  );
  if (error) throw error;
  return data as VisaDocument;
}

export async function calculateVisaReadiness(
  supabase: SupabaseClient,
  visaCaseId: string,
): Promise<VisaReadiness> {
  const { data, error } = await supabase.schema("crm").rpc(
    VISA_RPC.calculateReadiness,
    { target_visa_case_id: validateVisaCaseIdentity(visaCaseId) },
  );
  if (error) throw error;
  return data as VisaReadiness;
}

export async function closeVisaCase(
  supabase: SupabaseClient,
  visaCaseId: string,
  reason: string,
): Promise<VisaCase> {
  const { data, error } = await supabase.schema("crm").rpc(
    VISA_RPC.closeCase,
    {
      target_visa_case_id: validateVisaCaseIdentity(visaCaseId),
      closure_reason: requireTrimmedText(reason, "Closure reason", 2, 2000),
    },
  );
  if (error) throw error;
  return data as VisaCase;
}

export async function recordVisaPassport(
  supabase: SupabaseClient,
  input: {
    visaCaseId: string;
    studentDocumentId?: string | null;
    issuingCountryId: string;
    passportLastFour: string;
    issuedAt?: string | null;
    expiresAt: string;
    isPrimary?: boolean;
  },
): Promise<VisaPassport> {
  const { data, error } = await supabase.schema("crm").rpc(
    VISA_RPC.recordPassport,
    {
      target_visa_case_id: validateVisaCaseIdentity(input.visaCaseId),
      target_student_document_id: input.studentDocumentId
        ? requireCrmUuid(input.studentDocumentId, "Passport document") : null,
      target_issuing_country_id: requireCrmUuid(input.issuingCountryId, "Issuing country"),
      new_passport_last_four: input.passportLastFour.toUpperCase(),
      new_issued_at: input.issuedAt ?? null,
      new_expires_at: input.expiresAt,
      new_is_primary: input.isPrimary ?? true,
    },
  );
  if (error) throw error;
  return data as VisaPassport;
}

export async function upsertVisaTravelPlan(
  supabase: SupabaseClient,
  input: {
    travelPlanId?: string | null;
    visaCaseId: string;
    departureCountryId: string;
    arrivalCountryId: string;
    departureAt?: string | null;
    arrivalAt?: string | null;
    departureAirport?: string | null;
    arrivalAirport?: string | null;
    accommodationDetails?: Record<string, unknown>;
    itineraryMetadata?: Record<string, unknown>;
    status: VisaTravelPlan["status"];
  },
): Promise<VisaTravelPlan> {
  const { data, error } = await supabase.schema("crm").rpc(
    VISA_RPC.upsertTravelPlan,
    {
      target_travel_plan_id: input.travelPlanId
        ? requireCrmUuid(input.travelPlanId, "Travel plan") : null,
      target_visa_case_id: validateVisaCaseIdentity(input.visaCaseId),
      target_departure_country_id: requireCrmUuid(input.departureCountryId, "Departure country"),
      target_arrival_country_id: requireCrmUuid(input.arrivalCountryId, "Arrival country"),
      new_departure_at: input.departureAt ?? null,
      new_arrival_at: input.arrivalAt ?? null,
      new_departure_airport: input.departureAirport ?? "",
      new_arrival_airport: input.arrivalAirport ?? "",
      new_accommodation_details: input.accommodationDetails ?? {},
      new_itinerary_metadata: input.itineraryMetadata ?? {},
      new_status: input.status,
    },
  );
  if (error) throw error;
  return data as VisaTravelPlan;
}
