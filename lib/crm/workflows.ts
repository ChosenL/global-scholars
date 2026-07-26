import type { SupabaseClient } from "@supabase/supabase-js";

import { requireCrmUuid } from "./validation";

export type WorkflowAction =
  | { type: "recalculate_readiness" }
  | {
      type: "assign_task";
      title: string;
      description?: string;
      priority?: "low" | "normal" | "high" | "urgent";
      visibility?: "student" | "internal";
      assigned_to_profile_id?: string;
      due_in_hours?: number;
    }
  | {
      type: "create_notification";
      title: string;
      body: string;
      severity?: "info" | "success" | "warning" | "critical";
    }
  | {
      type: "schedule_work";
      work_type: string;
      delay_hours?: number;
      payload?: Record<string, unknown>;
    };

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  event_pattern: string;
  conditions: Record<string, unknown>;
  actions: WorkflowAction[];
  priority: number;
  is_enabled: boolean;
  created_by_profile_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WorkflowRun {
  id: string;
  workflow_definition_id: string;
  domain_event_id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  attempt_count: number;
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchWorkflowRuns(
  supabase: SupabaseClient,
  status?: WorkflowRun["status"],
): Promise<WorkflowRun[]> {
  let query = supabase.schema("crm").from("workflow_runs").select("*")
    .order("scheduled_for", { ascending: true });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WorkflowRun[];
}

export async function processWorkflowRun(
  supabase: SupabaseClient,
  workflowRunId: string,
): Promise<WorkflowRun> {
  const { data, error } = await supabase.schema("crm").rpc(
    "process_workflow_run",
    { target_workflow_run_id: requireCrmUuid(workflowRunId, "Workflow run") },
  );
  if (error) throw error;
  return data as WorkflowRun;
}
