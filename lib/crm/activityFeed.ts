import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActivityFeedEntry {
  id: string;
  domain_event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  student_profile_id: string | null;
  actor_profile_id: string | null;
  occurred_at: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ActivityFeedFilters {
  studentProfileId?: string;
  eventType?: string;
  limit?: number;
}

export async function fetchAdminActivityFeed(
  supabase: SupabaseClient,
  filters: ActivityFeedFilters = {},
): Promise<ActivityFeedEntry[]> {
  let query = supabase
    .schema("crm")
    .from("activity_feed_entries")
    .select("*")
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(filters.limit ?? 100);
  if (filters.studentProfileId) {
    query = query.eq("student_profile_id", filters.studentProfileId);
  }
  if (filters.eventType) query = query.eq("event_type", filters.eventType);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ActivityFeedEntry[];
}
