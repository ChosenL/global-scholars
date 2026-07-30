import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/types";

import { PlatformServiceError, type PlatformErrorCode } from "./platformErrors";
import { requireCrmUuid, requireLimit, requireTrimmedText } from "./validation";

export type Organization = Database["crm"]["Tables"]["organizations"]["Row"];
export type OrganizationAdvisor =
  Database["crm"]["Tables"]["organization_advisors"]["Row"];
export type OrganizationStudent =
  Database["crm"]["Tables"]["organization_students"]["Row"];
export type OrganizationType = Organization["organization_type"];
export type OrganizationStatus = Organization["status"];
export type OrganizationAdvisorRole = OrganizationAdvisor["assignment_role"];
export type OrganizationStudentMembership =
  OrganizationStudent["membership_type"];

const ORGANIZATION_TYPES = new Set<OrganizationType>([
  "partner_school",
  "advising_agency",
  "sponsor",
  "operating_unit",
]);
const ADVISOR_ROLES = new Set<OrganizationAdvisorRole>([
  "primary",
  "support",
  "manager",
]);
const STUDENT_MEMBERSHIP_TYPES = new Set<OrganizationStudentMembership>([
  "client",
  "sponsored",
  "referred",
  "managed",
]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface SupabaseFailure {
  code?: string;
  message?: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  organizationType: OrganizationType;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  organizationType?: OrganizationType;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
}

export interface ListOrganizationsInput {
  status?: OrganizationStatus;
  organizationType?: OrganizationType;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AssignAdvisorInput {
  organizationId: string;
  advisorProfileId: string;
  assignmentRole?: OrganizationAdvisorRole;
  startsAt?: string;
}

export interface AssignStudentInput {
  organizationId: string;
  studentProfileId: string;
  membershipType?: OrganizationStudentMembership;
  isPrimary?: boolean;
  externalStudentReference?: string | null;
  startsAt?: string;
}

function failValidation(message: string): never {
  throw new PlatformServiceError("VALIDATION_FAILED", message);
}

function optionalText(
  value: string | null | undefined,
  fieldName: string,
  maximum: number,
  minimum = 1,
): string | null {
  if (value === null || value === undefined || !value.trim()) {
    return null;
  }
  return requireTrimmedText(value, fieldName, minimum, maximum);
}

function requireOrganizationType(value: OrganizationType): OrganizationType {
  if (!ORGANIZATION_TYPES.has(value)) {
    failValidation("Organization type is invalid.");
  }
  return value;
}

function requireAdvisorRole(
  value: OrganizationAdvisorRole,
): OrganizationAdvisorRole {
  if (!ADVISOR_ROLES.has(value)) {
    failValidation("Advisor assignment role is invalid.");
  }
  return value;
}

function requireMembershipType(
  value: OrganizationStudentMembership,
): OrganizationStudentMembership {
  if (!STUDENT_MEMBERSHIP_TYPES.has(value)) {
    failValidation("Student membership type is invalid.");
  }
  return value;
}

function requireSlug(value: string): string {
  const slug = requireTrimmedText(
    value.toLowerCase(),
    "Organization slug",
    1,
    200,
  );
  if (!SLUG_PATTERN.test(slug)) {
    failValidation(
      "Organization slug must contain lowercase letters, numbers, and single hyphens.",
    );
  }
  return slug;
}

function optionalEmail(value: string | null | undefined): string | null {
  const email = optionalText(value, "Organization email", 320, 3);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    failValidation("Organization email is invalid.");
  }
  return email;
}

function optionalWebsite(value: string | null | undefined): string | null {
  const website = optionalText(value, "Organization website", 2_048);
  if (!website) return null;

  try {
    const parsed = new URL(website);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      failValidation("Organization website must use HTTP or HTTPS.");
    }
  } catch (error) {
    if (error instanceof PlatformServiceError) throw error;
    failValidation("Organization website is invalid.");
  }
  return website;
}

function optionalTimestamp(
  value: string | undefined,
  fieldName: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (Number.isNaN(Date.parse(value))) {
    failValidation(`${fieldName} must be a valid timestamp.`);
  }
  return value;
}

function requireOffset(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    failValidation("Offset must be a non-negative integer.");
  }
  return value;
}

function errorDetails(cause: unknown): SupabaseFailure {
  if (cause && typeof cause === "object") {
    return cause as SupabaseFailure;
  }
  return {};
}

function classifyError(
  cause: unknown,
  fallbackMessage: string,
): PlatformServiceError {
  if (cause instanceof PlatformServiceError) return cause;

  const details = errorDetails(cause);
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
    normalized.includes("already") ||
    normalized.includes("duplicate")
  ) {
    code = "CONFLICT";
  } else if (details.code === "PGRST116" || normalized.includes("not found")) {
    code = "NOT_FOUND";
  } else if (
    details.code?.startsWith("22") ||
    details.code === "23502" ||
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

export async function createOrganization(
  supabase: SupabaseClient,
  input: CreateOrganizationInput,
): Promise<Organization> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("create_organization", {
        new_name: requireTrimmedText(input.name, "Organization name", 2, 200),
        new_slug: requireSlug(input.slug),
        new_organization_type: requireOrganizationType(input.organizationType),
        new_email: optionalEmail(input.email),
        new_phone: optionalText(input.phone, "Organization phone", 50, 7),
        new_website: optionalWebsite(input.website),
        new_address: optionalText(
          input.address,
          "Organization address",
          1_000,
          2,
        ),
      });
    if (error) throw error;
    return requireResult(data as Organization | null, "Organization");
  }, "Organization could not be created.");
}

export async function updateOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  return execute(async () => {
    const values: Record<string, Json | undefined> = {};

    if (input.name !== undefined) {
      values.name = requireTrimmedText(input.name, "Organization name", 2, 200);
    }
    if (input.slug !== undefined) {
      values.slug = requireSlug(input.slug);
    }
    if (input.organizationType !== undefined) {
      values.organization_type = requireOrganizationType(
        input.organizationType,
      );
    }
    if (input.email !== undefined) {
      values.email = optionalEmail(input.email);
    }
    if (input.phone !== undefined) {
      values.phone = optionalText(input.phone, "Organization phone", 50, 7);
    }
    if (input.website !== undefined) {
      values.website = optionalWebsite(input.website);
    }
    if (input.address !== undefined) {
      values.address = optionalText(
        input.address,
        "Organization address",
        1_000,
        2,
      );
    }
    if (Object.keys(values).length === 0) {
      failValidation("At least one organization field must be updated.");
    }

    const { data, error } = await supabase
      .schema("crm")
      .rpc("update_organization", {
        target_organization_id: requireCrmUuid(organizationId, "Organization"),
        new_values: values as Json,
      });
    if (error) throw error;
    return requireResult(data as Organization | null, "Organization");
  }, "Organization could not be updated.");
}

export async function archiveOrganization(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Organization> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("archive_organization", {
        target_organization_id: requireCrmUuid(organizationId, "Organization"),
      });
    if (error) throw error;
    return requireResult(data as Organization | null, "Organization");
  }, "Organization could not be archived.");
}

export async function getOrganizationById(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<Organization> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .from("organizations")
      .select("*")
      .eq("id", requireCrmUuid(organizationId, "Organization"))
      .maybeSingle();
    if (error) throw error;
    return requireResult(data as Organization | null, "Organization");
  }, "Organization could not be loaded.");
}

export async function getOrganizationBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<Organization> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .from("organizations")
      .select("*")
      .eq("slug", requireSlug(slug))
      .maybeSingle();
    if (error) throw error;
    return requireResult(data as Organization | null, "Organization");
  }, "Organization could not be loaded.");
}

export async function listOrganizations(
  supabase: SupabaseClient,
  input: ListOrganizationsInput = {},
): Promise<Organization[]> {
  return execute(async () => {
    const limit = requireLimit(input.limit ?? 50, 100);
    const offset = requireOffset(input.offset ?? 0);
    const status = input.status ?? "active";
    if (status !== "active" && status !== "archived") {
      failValidation("Organization status is invalid.");
    }
    let query = supabase
      .schema("crm")
      .from("organizations")
      .select("*")
      .order("name", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1)
      .eq("status", status);

    if (input.organizationType) {
      query = query.eq(
        "organization_type",
        requireOrganizationType(input.organizationType),
      );
    }
    if (input.search?.trim()) {
      const search = requireTrimmedText(
        input.search,
        "Organization search",
        1,
        100,
      )
        .replaceAll("\\", "\\\\")
        .replaceAll("%", "\\%")
        .replaceAll("_", "\\_");
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Organization[];
  }, "Organizations could not be loaded.");
}

export async function assignAdvisor(
  supabase: SupabaseClient,
  input: AssignAdvisorInput,
): Promise<OrganizationAdvisor> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("assign_organization_advisor", {
        target_organization_id: requireCrmUuid(
          input.organizationId,
          "Organization",
        ),
        target_advisor_profile_id: requireCrmUuid(
          input.advisorProfileId,
          "Advisor profile",
        ),
        new_assignment_role: requireAdvisorRole(
          input.assignmentRole ?? "support",
        ),
        new_starts_at: optionalTimestamp(
          input.startsAt,
          "Advisor assignment start",
        ),
      });
    if (error) throw error;
    return requireResult(
      data as OrganizationAdvisor | null,
      "Organization advisor assignment",
    );
  }, "Advisor could not be assigned.");
}

export async function removeAdvisor(
  supabase: SupabaseClient,
  assignmentId: string,
): Promise<OrganizationAdvisor> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("remove_organization_advisor", {
        target_assignment_id: requireCrmUuid(
          assignmentId,
          "Advisor assignment",
        ),
      });
    if (error) throw error;
    return requireResult(
      data as OrganizationAdvisor | null,
      "Organization advisor assignment",
    );
  }, "Advisor assignment could not be ended.");
}

export async function assignStudent(
  supabase: SupabaseClient,
  input: AssignStudentInput,
): Promise<OrganizationStudent> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("assign_organization_student", {
        target_organization_id: requireCrmUuid(
          input.organizationId,
          "Organization",
        ),
        target_student_profile_id: requireCrmUuid(
          input.studentProfileId,
          "Student profile",
        ),
        new_membership_type: requireMembershipType(
          input.membershipType ?? "client",
        ),
        new_is_primary: input.isPrimary ?? false,
        new_external_student_reference: optionalText(
          input.externalStudentReference,
          "External student reference",
          150,
        ),
        new_starts_at: optionalTimestamp(
          input.startsAt,
          "Student membership start",
        ),
      });
    if (error) throw error;
    return requireResult(
      data as OrganizationStudent | null,
      "Organization student membership",
    );
  }, "Student could not be assigned.");
}

export async function removeStudent(
  supabase: SupabaseClient,
  membershipId: string,
): Promise<OrganizationStudent> {
  return execute(async () => {
    const { data, error } = await supabase
      .schema("crm")
      .rpc("remove_organization_student", {
        target_membership_id: requireCrmUuid(
          membershipId,
          "Student membership",
        ),
      });
    if (error) throw error;
    return requireResult(
      data as OrganizationStudent | null,
      "Organization student membership",
    );
  }, "Student membership could not be ended.");
}
