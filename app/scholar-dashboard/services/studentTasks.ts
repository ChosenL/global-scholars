import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  StudentTask,
  StudentTaskCreateInput,
  StudentTaskPriority,
  StudentTaskStatus,
  StudentTaskSummary,
  StudentTaskUpdateInput,
  StudentTaskVisibility,
  StudentTaskWithProfiles,
} from "../types/dashboard";

export const TASK_STATUS_LABELS: Record<StudentTaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  blocked: "Blocked",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const TASK_PRIORITY_LABELS: Record<StudentTaskPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
export const TASK_VISIBILITY_LABELS: Record<StudentTaskVisibility, string> = {
  student: "Student-facing",
  internal: "Internal",
};

interface RawRelation {
  id: string;
  display_name: string;
  role: "student" | "advisor" | "admin";
  avatar_url: string | null;
}

interface RawTask extends StudentTask {
  assignee: RawRelation | RawRelation[] | null;
  creator: RawRelation | RawRelation[] | null;
  completer: RawRelation | RawRelation[] | null;
  document: StudentTaskWithProfiles["document"] | StudentTaskWithProfiles["document"][] | null;
}

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapTask(row: RawTask): StudentTaskWithProfiles {
  const assignee = first(row.assignee);
  const creator = first(row.creator);
  if (!assignee || !creator) throw new Error("Task profile identity is unavailable.");
  return {
    ...row,
    assignee,
    creator,
    completer: first(row.completer),
    document: first(row.document),
  };
}

const taskSelect = [
  "*",
  "assignee:profiles!student_tasks_assignee_fkey(id,display_name,role,avatar_url)",
  "creator:profiles!student_tasks_creator_fkey(id,display_name,role,avatar_url)",
  "completer:profiles!student_tasks_completer_fkey(id,display_name,role,avatar_url)",
  "document:student_documents!student_tasks_document_fkey(*)",
].join(",");

export async function fetchStudentTasks(
  supabase: SupabaseClient,
  studentProfileId: string,
): Promise<StudentTaskWithProfiles[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("student_tasks")
    .select(taskSelect)
    .eq("student_profile_id", studentProfileId)
    .is("deleted_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawTask[]).map(mapTask);
}

export const fetchAdvisorStudentTasks = fetchStudentTasks;

export async function createStudentTask(
  supabase: SupabaseClient,
  input: StudentTaskCreateInput,
): Promise<StudentTask> {
  const { data, error } = await supabase.schema("crm").rpc(
    "create_student_task",
    {
      target_student_profile_id: input.studentProfileId,
      task_title: input.title,
      task_description: input.description ?? "",
      task_priority: input.priority,
      task_visibility: input.visibility,
      target_assigned_to_profile_id: input.assignedToProfileId,
      task_due_at: input.dueAt,
      target_document_id: input.documentId,
    },
  );
  if (error) throw error;
  return data as StudentTask;
}

export async function updateStudentTask(
  supabase: SupabaseClient,
  input: StudentTaskUpdateInput,
): Promise<StudentTask> {
  const { data, error } = await supabase.schema("crm").rpc(
    "update_student_task",
    {
      target_task_id: input.taskId,
      task_title: input.title,
      task_description: input.description ?? "",
      task_priority: input.priority,
      task_visibility: input.visibility,
      target_assigned_to_profile_id: input.assignedToProfileId,
      task_due_at: input.dueAt,
      target_document_id: input.documentId,
    },
  );
  if (error) throw error;
  return data as StudentTask;
}

export async function updateStudentTaskStatus(
  supabase: SupabaseClient,
  taskId: string,
  status: StudentTaskStatus,
): Promise<StudentTask> {
  const { data, error } = await supabase.schema("crm").rpc(
    "update_student_task_status",
    { target_task_id: taskId, new_status: status },
  );
  if (error) throw error;
  return data as StudentTask;
}

export async function softDeleteStudentTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<void> {
  const { error } = await supabase.schema("crm").rpc(
    "soft_delete_student_task",
    { target_task_id: taskId },
  );
  if (error) throw error;
}

export function getStudentTaskSummary(
  tasks: StudentTask[],
): StudentTaskSummary {
  const counted = tasks.filter((task) => task.status !== "cancelled");
  const now = Date.now();
  const open = counted.filter((task) =>
    ["not_started", "in_progress", "blocked"].includes(task.status),
  );
  return {
    totalTasks: counted.length,
    openTasks: open.length,
    completedTasks: counted.filter((task) => task.status === "completed").length,
    overdueTasks: open.filter(
      (task) => task.due_at && new Date(task.due_at).getTime() < now,
    ).length,
    blockedTasks: open.filter((task) => task.status === "blocked").length,
    urgentTasks: open.filter((task) => task.priority === "urgent").length,
  };
}
