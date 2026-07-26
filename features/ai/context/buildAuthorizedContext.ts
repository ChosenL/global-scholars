import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthorizedAiContext, AiSourceType } from "../types";

type ContextRecord = AuthorizedAiContext["records"][number];

function records(
  sourceType: AiSourceType,
  rows: Array<Record<string, unknown>>,
  label: (row: Record<string, unknown>) => string,
): ContextRecord[] {
  return rows.map((row) => ({
    sourceType,
    sourceId: String(row.id ?? row.profile_id ?? row.student_profile_id),
    label: label(row),
    data: row,
  }));
}

export async function buildAuthorizedContext(
  supabase: SupabaseClient,
  studentProfileId: string,
  applicationId?: string,
): Promise<AuthorizedAiContext> {
  const [{ data: role, error: roleError }, { data: canAccess, error: accessError }] =
    await Promise.all([
      supabase.schema("crm").rpc("current_profile_role"),
      supabase.schema("crm").rpc("can_access_student", {
        target_student_profile_id: studentProfileId,
      }),
    ]);
  if (roleError || accessError || !canAccess || !["student", "advisor", "admin"].includes(String(role))) {
    throw new Error("AI context access denied.");
  }

  // Every query uses the caller's JWT. RLS remains authoritative.
  const baseQueries = await Promise.all([
    supabase.schema("crm").from("student_profiles")
      .select("profile_id,nationality,current_country,highest_qualification,institution,gpa,graduation_year,english_test_type,english_test_score,preferred_destination_country,preferred_degree,preferred_program,intended_intake")
      .eq("profile_id", studentProfileId).is("deleted_at", null).maybeSingle(),
    supabase.schema("crm").from("student_documents")
      .select("id,document_type,custom_document_name,status,expires_at,created_at")
      .eq("profile_id", studentProfileId).is("deleted_at", null).limit(100),
    supabase.schema("crm").from("student_tasks")
      .select("id,title,description,status,priority,due_at,completed_at")
      .eq("student_profile_id", studentProfileId).is("deleted_at", null).limit(100),
    supabase.schema("crm").from("student_readiness")
      .select("student_profile_id,total_score,profile_score,document_score,task_score,application_score,components,calculated_at")
      .eq("student_profile_id", studentProfileId).maybeSingle(),
    supabase.schema("crm").from("student_applications")
      .select("id,status,intake_id,advisor_profile_id,submitted_at,closed_at,created_at")
      .eq("student_profile_id", studentProfileId).is("deleted_at", null).limit(50),
    supabase.schema("crm").from("visa_cases")
      .select("id,application_id,destination_country_id,visa_type,stage,target_submission_date,submitted_at,closed_at")
      .eq("student_profile_id", studentProfileId).is("deleted_at", null).limit(50),
    supabase.schema("crm").from("notifications")
      .select("id,notification_type,title,body,severity,read_at,created_at")
      .eq("recipient_profile_id", studentProfileId).is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(50),
  ]);
  for (const query of baseQueries) if (query.error) throw query.error;

  const [profile, documents, tasks, readiness, applications, visas, notifications] = baseQueries;
  const result: ContextRecord[] = [];
  if (profile.data) result.push(...records("profile", [profile.data], () => "Student profile"));
  result.push(...records("document", documents.data ?? [], (row) => String(row.document_type ?? "Document")));
  result.push(...records("task", tasks.data ?? [], (row) => String(row.title ?? "Task")));
  if (readiness.data) result.push(...records("readiness", [readiness.data], () => "Student readiness"));
  result.push(...records("application", (applications.data ?? []).filter((row) => !applicationId || row.id === applicationId), (row) => `Application ${row.status}`));
  result.push(...records("visa_case", visas.data ?? [], (row) => `Visa case ${row.stage}`));
  result.push(...records("notification", notifications.data ?? [], (row) => String(row.title ?? "Notification")));

  const isStaff = role === "advisor" || role === "admin";
  if (isStaff) {
    const [notes, timeline] = await Promise.all([
      supabase.schema("crm").from("student_notes")
        .select("id,title,body,note_type,is_pinned,created_at")
        .eq("student_profile_id", studentProfileId).is("deleted_at", null).limit(50),
      supabase.schema("crm").from("timeline_events")
        .select("id,event_type,subject_type,subject_id,occurred_at,metadata")
        .eq("student_profile_id", studentProfileId).order("occurred_at", { ascending: false }).limit(100),
    ]);
    if (notes.error) throw notes.error;
    if (timeline.error) throw timeline.error;
    result.push(...records("note", notes.data ?? [], (row) => String(row.title ?? "Advisor note")));
    result.push(...records("timeline", timeline.data ?? [], (row) => String(row.event_type ?? "Timeline event")));
  }

  return { role: role as AuthorizedAiContext["role"], studentProfileId, records: result };
}
