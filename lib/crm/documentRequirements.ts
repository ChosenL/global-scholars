import type { SupabaseClient } from "@supabase/supabase-js";

export type DocumentRequirementScope = "country" | "university" | "program";
export type DocumentRequirementLevel =
  | "required"
  | "optional"
  | "conditional"
  | "waived";

export interface DocumentRequirement {
  id: string;
  parent_requirement_id: string | null;
  scope_type: DocumentRequirementScope;
  country_code: string;
  university_key: string | null;
  program_key: string | null;
  document_type: string;
  custom_document_name: string | null;
  requirement_level: DocumentRequirementLevel;
  condition_definition: Record<string, unknown> | null;
  guidance: string | null;
  created_by_profile_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DocumentRequirementContext {
  studentProfileId: string;
  countryCode?: string | null;
  universityKey?: string | null;
  programKey?: string | null;
}

function requirementArgs(context: DocumentRequirementContext) {
  return {
    target_student_profile_id: context.studentProfileId,
    target_country_code: context.countryCode ?? null,
    target_university_key: context.universityKey ?? null,
    target_program_key: context.programKey ?? null,
  };
}

export async function fetchEffectiveDocumentRequirements(
  supabase: SupabaseClient,
  context: DocumentRequirementContext,
): Promise<DocumentRequirement[]> {
  const { data, error } = await supabase
    .schema("crm")
    .rpc("get_effective_document_requirements", requirementArgs(context));
  if (error) throw error;
  return (data ?? []) as DocumentRequirement[];
}

export async function fetchMissingDocumentRequirements(
  supabase: SupabaseClient,
  context: DocumentRequirementContext,
): Promise<DocumentRequirement[]> {
  const { data, error } = await supabase
    .schema("crm")
    .rpc("get_missing_document_requirements", requirementArgs(context));
  if (error) throw error;
  return (data ?? []) as DocumentRequirement[];
}
