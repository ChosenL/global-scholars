import type { SupabaseClient } from "@supabase/supabase-js";

export interface PlatformAnalyticsMetrics {
  application_pipeline: Record<string, number>;
  document_completion: {
    created: number;
    approved: number;
    needs_attention: number;
  };
  advisor_workload: Array<{
    actor_profile_id: string;
    event_count: number;
  }>;
  student_readiness: {
    calculations: number;
    average_score: number;
    students_calculated: number;
  };
  processing_times: {
    document_approval_hours: number;
    workflow_completion_hours: number;
  };
}

export interface AnalyticsSnapshot {
  id: string;
  period_start: string;
  period_end: string;
  metrics: PlatformAnalyticsMetrics;
  source_event_count: number;
  calculated_by_profile_id: string;
  calculated_at: string;
}

export async function calculatePlatformAnalytics(
  supabase: SupabaseClient,
  periodStart: string,
  periodEnd: string,
): Promise<AnalyticsSnapshot> {
  const { data, error } = await supabase.schema("crm").rpc(
    "calculate_platform_analytics",
    {
      target_period_start: periodStart,
      target_period_end: periodEnd,
    },
  );
  if (error) throw error;
  return data as AnalyticsSnapshot;
}
