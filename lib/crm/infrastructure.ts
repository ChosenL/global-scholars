import type { SupabaseClient } from "@supabase/supabase-js";

export type DomainAggregateType =
  | "student_profile"
  | "document"
  | "task"
  | "note";

export interface DomainEvent {
  id: string;
  event_type: string;
  aggregate_type: DomainAggregateType;
  aggregate_id: string;
  student_profile_id: string | null;
  actor_profile_id: string | null;
  occurred_at: string;
  payload: Record<string, unknown>;
  correlation_id: string;
  causation_id: string | null;
}

export interface TimelineEvent {
  id: string;
  domain_event_id: string;
  student_profile_id: string;
  event_type: string;
  subject_type: DomainAggregateType;
  subject_id: string;
  actor_profile_id: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function fetchStudentDomainEvents(
  supabase: SupabaseClient,
  studentProfileId: string,
): Promise<DomainEvent[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("domain_events")
    .select("*")
    .eq("student_profile_id", studentProfileId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DomainEvent[];
}

export async function fetchStudentTimeline(
  supabase: SupabaseClient,
  studentProfileId: string,
): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("timeline_events")
    .select("*")
    .eq("student_profile_id", studentProfileId)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TimelineEvent[];
}
