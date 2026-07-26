import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CompleteStudentProfile,
  CrmProfile,
  StudentProfileExtension,
  StudentProfileInput,
} from "../types/dashboard";

function normalizeOptionalText(value: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function normalizeInput(
  input: StudentProfileInput,
): StudentProfileInput {
  return {
    ...input,
    phone: normalizeOptionalText(input.phone),
    date_of_birth: normalizeOptionalText(input.date_of_birth),
    nationality: normalizeOptionalText(input.nationality),
    current_country: normalizeOptionalText(input.current_country),
    passport_number: normalizeOptionalText(input.passport_number),
    highest_qualification: normalizeOptionalText(
      input.highest_qualification,
    ),
    institution: normalizeOptionalText(input.institution),
    english_test_type: normalizeOptionalText(input.english_test_type),
    preferred_destination_country: normalizeOptionalText(
      input.preferred_destination_country,
    ),
    preferred_degree: normalizeOptionalText(input.preferred_degree),
    preferred_program: normalizeOptionalText(input.preferred_program),
    intended_intake: normalizeOptionalText(input.intended_intake),
    budget_currency:
      normalizeOptionalText(input.budget_currency)?.toUpperCase() ?? null,
  };
}

async function requireStudentIdentity(
  supabase: SupabaseClient,
  profileId: string,
): Promise<CrmProfile> {
  const { data, error } = await supabase
    .schema("crm")
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .eq("role", "student")
    .is("deleted_at", null)
    .single();

  if (error) {
    throw error;
  }

  return data as CrmProfile;
}

export async function fetchStudentProfile(
  supabase: SupabaseClient,
  profileId: string,
): Promise<CompleteStudentProfile> {
  const crm = supabase.schema("crm");
  const [identity, extensionResult] = await Promise.all([
    requireStudentIdentity(supabase, profileId),
    crm
      .from("student_profiles")
      .select("*")
      .eq("profile_id", profileId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (extensionResult.error) {
    throw extensionResult.error;
  }

  return {
    identity,
    student:
      (extensionResult.data as StudentProfileExtension | null) ?? null,
  };
}

export async function createStudentProfile(
  supabase: SupabaseClient,
  profileId: string,
  input: StudentProfileInput,
): Promise<CompleteStudentProfile> {
  const identity = await requireStudentIdentity(supabase, profileId);
  const { data, error } = await supabase
    .schema("crm")
    .from("student_profiles")
    .insert({
      profile_id: profileId,
      ...normalizeInput(input),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    identity,
    student: data as StudentProfileExtension,
  };
}

export async function updateStudentProfile(
  supabase: SupabaseClient,
  profileId: string,
  input: StudentProfileInput,
): Promise<CompleteStudentProfile> {
  const identity = await requireStudentIdentity(supabase, profileId);
  const { data, error } = await supabase
    .schema("crm")
    .from("student_profiles")
    .update(normalizeInput(input))
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    identity,
    student: data as StudentProfileExtension,
  };
}
