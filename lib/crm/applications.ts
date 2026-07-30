import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/types";

import { PlatformServiceError, type PlatformErrorCode } from "./platformErrors";
import { requireCrmUuid, requireLimit, requireTrimmedText } from "./validation";

export type StudentApplication =
  Database["crm"]["Tables"]["student_applications"]["Row"];
export type ApplicationTimelineEvent =
  Database["crm"]["Tables"]["timeline_events"]["Row"];

export interface ApplicationDecision {
  id: string;
  application_id: string;
  decision_type:
    "conditional_offer" | "unconditional_offer" | "rejected" | "waitlisted";
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

const APPLICATION_STATUSES = new Set<ApplicationStatus>([
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
]);

interface SupabaseFailure {
  code?: string;
  message?: string;
}

export interface CreateApplicationInput {
  studentProfileId: string;
  intakeId: string;
  advisorProfileId?: string | null;
}

export interface UpdateApplicationInput {
  externalReference?: string | null;
  organizationId?: string | null;
}

export interface ListApplicationsInput {
  studentProfileId?: string;
  advisorProfileId?: string;
  organizationId?: string;
  status?: ApplicationStatus;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface ChangeApplicationStatusInput {
  applicationId: string;
  status: ApplicationStatus;
  reason?: string | null;
}

export interface UpdateFinancialDetailsInput {
  tuitionAmount: number | null;
  tuitionCurrency: string | null;
  tuitionSource: string | null;
}

function failValidation(message: string): never {
  throw new PlatformServiceError("VALIDATION_FAILED", message);
}

function optionalText(
  value: string | null | undefined,
  fieldName: string,
  minimum: number,
  maximum: number,
): string | null {
  if (value === null || value === undefined || !value.trim()) return null;
  return requireTrimmedText(value, fieldName, minimum, maximum);
}

function requireStatus(value: ApplicationStatus): ApplicationStatus {
  if (!APPLICATION_STATUSES.has(value)) {
    failValidation("Application status is invalid.");
  }
  return value;
}

function requireOffset(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    failValidation("Offset must be a non-negative integer.");
  }
  return value;
}

function classifyError(
  cause: unknown,
  fallbackMessage: string,
): PlatformServiceError {
  if (cause instanceof PlatformServiceError) return cause;
  const details =
    cause && typeof cause === "object" ? (cause as SupabaseFailure) : {};
  const message =
    details.message ??
    (cause instanceof Error ? cause.message : fallbackMessage);
  const normalized = message.toLowerCase();
  let code: PlatformErrorCode = "UNKNOWN";

  if (
    details.code === "42501" ||
    normalized.includes("access denied") ||
    normalized.includes("not authorized")
  ) {
    code = "AUTHORIZATION_DENIED";
  } else if (
    details.code === "23505" ||
    normalized.includes("duplicate") ||
    normalized.includes("already")
  ) {
    code = "CONFLICT";
  } else if (details.code === "PGRST116" || normalized.includes("not found")) {
    code = "NOT_FOUND";
  } else if (
    details.code?.startsWith("22") ||
    details.code === "23502" ||
    details.code === "23503" ||
    details.code === "23514" ||
    normalized.includes("invalid")
  ) {
    code = "VALIDATION_FAILED";
  } else if (
    details.code?.startsWith("08") ||
    normalized.includes("unavailable")
  ) {
    code = "SERVICE_UNAVAILABLE";
  }

  return new PlatformServiceError(code, message, cause);
}

async function execute<T>(
  operation: () => Promise<T>,
  fallbackMessage: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw classifyError(error, fallbackMessage);
  }
}

function requireResult<T>(data: T | null, entityName: string): T {
  if (data === null) {
    throw new PlatformServiceError("NOT_FOUND", `${entityName} not found.`);
  }
  return data;
}

export async function createApplication(
  supabase: SupabaseClient,
  input: CreateApplicationInput,
): Promise<StudentApplication> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("create_student_application", {
        target_student_profile_id: requireCrmUuid(
          input.studentProfileId,
          "Student profile",
        ),
        target_intake_id: requireCrmUuid(input.intakeId, "Intake"),
        target_advisor_profile_id: input.advisorProfileId
          ? requireCrmUuid(input.advisorProfileId, "Advisor profile")
          : null,
      });
    if (error) throw error;
    return requireResult(
      data as StudentApplication | null,
      "Student application",
    );
  }, "Student application could not be created.");
}

export async function updateApplication(
  supabase: SupabaseClient,
  applicationId: string,
  input: UpdateApplicationInput,
): Promise<StudentApplication> {
  return execute(async () => {
    const values: Record<string, Json> = {};
    if (input.externalReference !== undefined) {
      values.external_reference = optionalText(
        input.externalReference,
        "External reference",
        2,
        100,
      );
    }
    if (input.organizationId !== undefined) {
      values.organization_id = input.organizationId
        ? requireCrmUuid(input.organizationId, "Organization")
        : null;
    }
    if (Object.keys(values).length === 0) {
      failValidation("At least one application field must be updated.");
    }

    const { data, error } = await supabase
      .schema("crm")
      .rpc("update_student_application", {
        target_application_id: requireCrmUuid(applicationId, "Application"),
        new_values: values as Json,
      });
    if (error) throw error;
    return requireResult(data as StudentApplication | null, "Application");
  }, "Application could not be updated.");
}

export async function archiveApplication(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<StudentApplication> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("archive_student_application", {
        target_application_id: requireCrmUuid(applicationId, "Application"),
      });
    if (error) throw error;
    return requireResult(data as StudentApplication | null, "Application");
  }, "Application could not be archived.");
}

export async function getApplicationById(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<StudentApplication> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .from("student_applications")
      .select("*")
      .eq("id", requireCrmUuid(applicationId, "Application"))
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    return requireResult(data as StudentApplication | null, "Application");
  }, "Application could not be loaded.");
}

export async function listApplications(
  supabase: SupabaseClient,
  input: ListApplicationsInput = {},
): Promise<StudentApplication[]> {
  return execute(async () => {
    const limit = requireLimit(input.limit ?? 50, 100);
    const offset = requireOffset(input.offset ?? 0);
    let query = supabase
      .schema("crm")
      .from("student_applications")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!input.includeArchived) query = query.is("archived_at", null);
    if (input.studentProfileId) {
      query = query.eq(
        "student_profile_id",
        requireCrmUuid(input.studentProfileId, "Student profile"),
      );
    }
    if (input.advisorProfileId) {
      query = query.eq(
        "advisor_profile_id",
        requireCrmUuid(input.advisorProfileId, "Advisor profile"),
      );
    }
    if (input.organizationId) {
      query = query.eq(
        "organization_id",
        requireCrmUuid(input.organizationId, "Organization"),
      );
    }
    if (input.status) query = query.eq("status", requireStatus(input.status));

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as StudentApplication[];
  }, "Applications could not be loaded.");
}

export async function changeApplicationStatus(
  supabase: SupabaseClient,
  input: ChangeApplicationStatusInput,
): Promise<StudentApplication> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("update_application_status", {
        target_application_id: requireCrmUuid(
          input.applicationId,
          "Application",
        ),
        new_status: requireStatus(input.status),
        transition_reason: optionalText(
          input.reason,
          "Transition reason",
          2,
          2_000,
        ),
      });
    if (error) throw error;
    return requireResult(data as StudentApplication | null, "Application");
  }, "Application status could not be changed.");
}

export async function assignAdvisor(
  supabase: SupabaseClient,
  applicationId: string,
  advisorProfileId: string,
): Promise<StudentApplication> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("assign_application_advisor", {
        target_application_id: requireCrmUuid(applicationId, "Application"),
        target_advisor_profile_id: requireCrmUuid(
          advisorProfileId,
          "Advisor profile",
        ),
      });
    if (error) throw error;
    return requireResult(data as StudentApplication | null, "Application");
  }, "Application advisor could not be assigned.");
}

export async function updateFinancialDetails(
  supabase: SupabaseClient,
  applicationId: string,
  input: UpdateFinancialDetailsInput,
): Promise<StudentApplication> {
  return execute(async () => {
    const clearing =
      input.tuitionAmount === null &&
      input.tuitionCurrency === null &&
      input.tuitionSource === null;
    if (!clearing) {
      if (
        input.tuitionAmount === null ||
        !Number.isFinite(input.tuitionAmount) ||
        input.tuitionAmount < 0
      ) {
        failValidation("Tuition amount must be a non-negative number.");
      }
      const currency = input.tuitionCurrency?.trim().toUpperCase() ?? "";
      if (!/^[A-Z]{3}$/.test(currency)) {
        failValidation("Tuition currency must be a three-letter ISO code.");
      }
      requireTrimmedText(input.tuitionSource ?? "", "Tuition source", 2, 200);
    }

    const { data, error } = await supabase
      .schema("crm")
      .rpc("update_application_financial_details", {
        target_application_id: requireCrmUuid(applicationId, "Application"),
        new_tuition_amount: input.tuitionAmount,
        new_tuition_currency: clearing
          ? null
          : input.tuitionCurrency!.trim().toUpperCase(),
        new_tuition_source: clearing ? null : input.tuitionSource!.trim(),
      });
    if (error) throw error;
    return requireResult(data as StudentApplication | null, "Application");
  }, "Application financial details could not be updated.");
}

export async function listApplicationTimeline(
  supabase: SupabaseClient,
  applicationId: string,
  limit = 100,
): Promise<ApplicationTimelineEvent[]> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .from("timeline_events")
      .select("*")
      .eq("subject_type", "application")
      .eq("subject_id", requireCrmUuid(applicationId, "Application"))
      .order("occurred_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(requireLimit(limit, 200));
    if (error) throw error;
    return (data ?? []) as ApplicationTimelineEvent[];
  }, "Application timeline could not be loaded.");
}

// Compatibility aliases for the pre-service application helpers.
export const fetchStudentApplications = (
  supabase: SupabaseClient,
  studentProfileId: string,
) => listApplications(supabase, { studentProfileId, includeArchived: true });
export const updateApplicationStatus = (
  supabase: SupabaseClient,
  applicationId: string,
  status: ApplicationStatus,
  reason?: string | null,
) =>
  changeApplicationStatus(supabase, {
    applicationId,
    status,
    reason,
  });

export async function submitApplication(
  supabase: SupabaseClient,
  applicationId: string,
): Promise<StudentApplication> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("submit_student_application", {
        target_application_id: requireCrmUuid(applicationId, "Application"),
      });
    if (error) throw error;
    return requireResult(data as StudentApplication | null, "Application");
  }, "Application could not be submitted.");
}

export async function recordApplicationDecision(
  supabase: SupabaseClient,
  input: {
    applicationId: string;
    decisionType: ApplicationDecision["decision_type"];
    conditions?: string | null;
    decisionDate: string;
    offerExpiresAt?: string | null;
  },
): Promise<ApplicationDecision> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("record_application_decision", {
        target_application_id: requireCrmUuid(
          input.applicationId,
          "Application",
        ),
        new_decision_type: input.decisionType,
        new_conditions:
          optionalText(input.conditions, "Decision conditions", 2, 5_000) ?? "",
        new_decision_date: input.decisionDate,
        new_offer_expires_at: input.offerExpiresAt ?? null,
      });
    if (error) throw error;
    return requireResult(
      data as ApplicationDecision | null,
      "Application decision",
    );
  }, "Application decision could not be recorded.");
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
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("record_application_deposit", {
        target_application_id: requireCrmUuid(
          input.applicationId,
          "Application",
        ),
        new_amount: input.amount,
        new_currency: input.currency.trim().toUpperCase(),
        new_status: input.status,
        new_due_date: input.dueDate ?? null,
        new_paid_at: input.paidAt ?? null,
        new_reference: input.reference ?? null,
      });
    if (error) throw error;
    return requireResult(
      data as ApplicationDeposit | null,
      "Application deposit",
    );
  }, "Application deposit could not be recorded.");
}

export async function linkApplicationNote(
  supabase: SupabaseClient,
  applicationId: string,
  noteId: string,
): Promise<void> {
  return execute(async () => {
    const { error } = await supabase
      .schema("crm")
      .rpc("link_application_note", {
        target_application_id: requireCrmUuid(applicationId, "Application"),
        target_note_id: requireCrmUuid(noteId, "Note"),
      });
    if (error) throw error;
  }, "Application note could not be linked.");
}
