"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";

import {
  getStudentTaskSummary,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "../services/studentTasks";
import type {
  StudentTaskStatus,
  StudentTaskWithProfiles,
} from "../types/dashboard";

interface StudentTasksSectionProps {
  tasks: StudentTaskWithProfiles[];
  isLoading: boolean;
  updatingTaskId: string | null;
  error: string;
  onRefresh: () => Promise<void>;
  onStatusChange: (
    taskId: string,
    status: StudentTaskStatus,
  ) => Promise<void>;
  onOpenRelatedDocument: (task: StudentTaskWithProfiles) => Promise<void>;
}

function formatDate(value: string | null): string {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function StudentTasksSection({
  tasks,
  isLoading,
  updatingTaskId,
  error,
  onRefresh,
  onStatusChange,
  onOpenRelatedDocument,
}: StudentTasksSectionProps) {
  const summary = getStudentTaskSummary(tasks);
  const openTasks = tasks.filter((task) =>
    ["not_started", "in_progress", "blocked"].includes(task.status),
  );
  const closedTasks = tasks.filter((task) =>
    ["completed", "cancelled"].includes(task.status),
  );

  return (
    <section id="tasks" className="scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">Tasks</p>
          <h2 className="mt-2 text-3xl font-black">Your Action Items</h2>
          <p className="mt-2 text-sm text-slate-500">
            {summary.openTasks} open · {summary.overdueTasks} overdue · {summary.completedTasks} completed
          </p>
        </div>
        <button type="button" onClick={() => void onRefresh()} className="rounded-xl border p-3" aria-label="Refresh tasks">
          <RefreshCw className={isLoading ? "animate-spin" : ""} size={18} />
        </button>
      </div>

      {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}

      {isLoading ? (
        <p className="mt-6 rounded-2xl border p-6 text-sm text-slate-500">Loading your visible tasks...</p>
      ) : tasks.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
          <ClipboardCheck className="mx-auto text-slate-300" size={38} />
          <p className="mt-4 font-black">No action items assigned</p>
          <p className="mt-2 text-sm text-slate-500">New student-facing tasks from your advisor will appear here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {[{ label: "Open Tasks", items: openTasks }, { label: "Completed & Cancelled", items: closedTasks }].map((group) =>
            group.items.length ? (
              <div key={group.label}>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">{group.label}</h3>
                <div className="mt-3 space-y-3">
                  {group.items.map((task) => {
                    const overdue = Boolean(
                      task.due_at &&
                      new Date(task.due_at).getTime() < Date.now() &&
                      !["completed", "cancelled"].includes(task.status),
                    );
                    const busy = updatingTaskId === task.id;
                    return (
                      <article key={task.id} className={`rounded-2xl border p-5 ${overdue ? "border-red-300 bg-red-50/40" : "border-slate-200"}`}>
                        <div className="flex flex-col justify-between gap-4 md:flex-row">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black">{task.title}</h4>
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{TASK_STATUS_LABELS[task.status]}</span>
                              <span className="rounded-full bg-[#FFF4CF] px-3 py-1 text-xs font-black text-[#8A6A1F]">{TASK_PRIORITY_LABELS[task.priority]} priority</span>
                              {overdue ? <span className="text-xs font-black text-red-700">Overdue</span> : null}
                            </div>
                            {task.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p> : null}
                            <p className="mt-2 text-xs font-semibold text-slate-500">
                              Due {formatDate(task.due_at)} · Assigned to {task.assignee.display_name}
                            </p>
                            {task.document ? (
                              <button type="button" onClick={() => void onOpenRelatedDocument(task)} className="mt-2 text-xs font-black text-[#0F2747] underline">
                                Open related CRM document · Revision {task.document.revision_number}
                              </button>
                            ) : task.document_id ? <p className="mt-1 text-xs text-slate-500">Related document unavailable</p> : null}
                            {task.completed_at ? <p className="mt-1 text-xs text-emerald-700">Completed {formatDate(task.completed_at)}</p> : null}
                          </div>
                          {!["completed", "cancelled"].includes(task.status) ? (
                            <div className="flex shrink-0 gap-2">
                              {task.status !== "in_progress" ? (
                                <button type="button" disabled={busy || task.status === "blocked"} onClick={() => void onStatusChange(task.id, "in_progress")} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-50">
                                  {busy ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />} Start
                                </button>
                              ) : null}
                              <button type="button" disabled={busy} onClick={() => void onStatusChange(task.id, "completed")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                                <CheckCircle2 size={14} /> Complete
                              </button>
                            </div>
                          ) : (
                            <Clock3 className="text-slate-300" size={22} />
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </section>
  );
}
