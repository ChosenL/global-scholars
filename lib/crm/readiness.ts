import type { SupabaseClient } from "@supabase/supabase-js";

export interface StudentReadinessComponents {
  profile: { completed_fields: number; total_fields: number; weight: number };
  documents: { required: number; missing: number; weight: number };
  tasks: { total: number; completed: number; weight: number };
  applications: { enabled: boolean; weight: number };
}

export interface StudentReadiness {
  student_profile_id: string;
  total_score: number;
  profile_score: number;
  document_score: number;
  task_score: number;
  application_score: number;
  components: StudentReadinessComponents;
  calculated_at: string;
  updated_at: string;
}

export async function calculateStudentReadiness(
  supabase: SupabaseClient,
  studentProfileId: string,
): Promise<StudentReadiness> {
  const { data, error } = await supabase
    .schema("crm")
    .rpc("calculate_student_readiness", {
      target_student_profile_id: studentProfileId,
    });
  if (error) throw error;
  return data as StudentReadiness;
}

export function getReadinessStage(score: number): string {
  if (score >= 85) return "Application Ready";
  if (score >= 65) return "Preparing Applications";
  if (score >= 40) return "Building Readiness";
  return "Profile Foundation";
}
