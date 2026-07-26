"use client";

import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  DOCUMENT_TYPE_LABELS,
} from "@/app/scholar-dashboard/services/studentDocuments";
import {
  getStudentTaskSummary,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_VISIBILITY_LABELS,
} from "@/app/scholar-dashboard/services/studentTasks";
import type {
  StudentDocumentWithUploader,
  StudentTaskPriority,
  StudentTaskUpdateInput,
  StudentTaskVisibility,
  StudentTaskWithProfiles,
} from "@/app/scholar-dashboard/types/dashboard";

import { useAdvisorTasks } from "../hooks/useAdvisorTasks";

interface StudentTasksCardProps {
  studentProfileId: string;
  studentName: string;
}

interface TaskFormValue {
  title: string;
  description: string;
  priority: StudentTaskPriority;
  visibility: StudentTaskVisibility;
  assignee: "student" | "advisor";
  dueAt: string;
  documentId: string;
}

function formValue(task?: StudentTaskWithProfiles): TaskFormValue {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    priority: task?.priority ?? "normal",
    visibility: task?.visibility ?? "student",
    assignee: task?.assignee.role === "student" ? "student" : "advisor",
    dueAt: task?.due_at ? task.due_at.slice(0, 16) : "",
    documentId: task?.document_id ?? "",
  };
}

function TaskForm({
  initialTask,
  documents,
  isSaving,
  onSave,
  onCancel,
}: {
  initialTask?: StudentTaskWithProfiles;
  documents: StudentDocumentWithUploader[];
  isSaving: boolean;
  onSave: (value: TaskFormValue) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(() => formValue(initialTask));

  async function submit() {
    if (!value.title.trim()) return;
    const succeeded = await onSave(value);
    if (succeeded && !initialTask) setValue(formValue());
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3">
        <input value={value.title} maxLength={200} placeholder="Task title" onChange={(e) => setValue((v) => ({ ...v, title: e.target.value }))} className="h-11 rounded-xl border px-3 text-sm" />
        <textarea value={value.description} maxLength={5000} placeholder="Description (optional)" onChange={(e) => setValue((v) => ({ ...v, description: e.target.value }))} className="min-h-20 rounded-xl border p-3 text-sm" />
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={value.priority} onChange={(e) => setValue((v) => ({ ...v, priority: e.target.value as StudentTaskPriority }))} className="h-11 rounded-xl border px-3 text-sm">
            {Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label} priority</option>)}
          </select>
          <select
            value={value.visibility}
            onChange={(e) => {
              const visibility = e.target.value as StudentTaskVisibility;
              setValue((v) => ({
                ...v,
                visibility,
                assignee: visibility === "internal" ? "advisor" : v.assignee,
              }));
            }}
            className="h-11 rounded-xl border px-3 text-sm"
          >
            {Object.entries(TASK_VISIBILITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select value={value.assignee} onChange={(e) => setValue((v) => ({ ...v, assignee: e.target.value as "student" | "advisor" }))} className="h-11 rounded-xl border px-3 text-sm">
            {value.visibility === "student" ? <option value="student">Assign to student</option> : null}
            <option value="advisor">Assign to me</option>
          </select>
          <input type="datetime-local" value={value.dueAt} onChange={(e) => setValue((v) => ({ ...v, dueAt: e.target.value }))} className="h-11 rounded-xl border px-3 text-sm" />
          <select value={value.documentId} onChange={(e) => setValue((v) => ({ ...v, documentId: e.target.value }))} className="h-11 rounded-xl border px-3 text-sm sm:col-span-2">
            <option value="">No related document</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.custom_document_name ?? DOCUMENT_TYPE_LABELS[document.document_type]} · Revision {document.revision_number}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" disabled={isSaving || !value.title.trim()} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          {initialTask ? "Save Changes" : "Create Task"}
        </button>
        {onCancel ? <button type="button" onClick={onCancel} className="rounded-xl border px-4 py-2.5 text-sm font-black">Cancel</button> : null}
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "No due date";
}

export default function StudentTasksCard({
  studentProfileId,
  studentName,
}: StudentTasksCardProps) {
  const {
    tasks,
    documents,
    advisorProfileId,
    isLoading,
    busyTaskId,
    isCreating,
    error,
    successMessage,
    refresh,
    create,
    edit,
    changeStatus,
    remove,
    openRelatedDocument,
  } = useAdvisorTasks(studentProfileId);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const summary = getStudentTaskSummary(tasks);

  return (
    <section className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C8A24A]">Student Tasks</p>
          <h2 className="mt-2 text-2xl font-black">{studentName}&apos;s Tasks</h2>
          <p className="mt-2 text-sm text-slate-500">{summary.openTasks} open · {summary.overdueTasks} overdue · {summary.completedTasks} completed</p>
        </div>
        <button type="button" onClick={() => void refresh()} className="rounded-xl border p-3"><RefreshCw className={isLoading ? "animate-spin" : ""} size={17} /></button>
      </div>

      {error || successMessage ? <p className={`mt-4 rounded-xl p-3 text-sm font-semibold ${error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{error || successMessage}</p> : null}

      {advisorProfileId ? (
        <div className="mt-5">
          <TaskForm
            documents={documents}
            isSaving={isCreating}
            onSave={(value) =>
              create({
                title: value.title.trim(),
                description: value.description.trim() || null,
                priority: value.priority,
                visibility: value.visibility,
                assignedToProfileId: value.assignee === "student" ? studentProfileId : advisorProfileId,
                dueAt: value.dueAt ? new Date(value.dueAt).toISOString() : null,
                documentId: value.documentId || null,
              })
            }
          />
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {isLoading ? <p className="rounded-2xl border p-5 text-sm text-slate-500">Loading authorized tasks...</p> : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center"><ClipboardCheck className="mx-auto text-slate-300" /><p className="mt-3 font-black">No tasks created</p></div>
        ) : tasks.map((task) => (
          <article key={task.id} className="rounded-2xl border border-slate-200 p-4">
            {editingTaskId === task.id && advisorProfileId ? (
              <TaskForm
                initialTask={task}
                documents={documents}
                isSaving={busyTaskId === task.id}
                onCancel={() => setEditingTaskId(null)}
                onSave={async (value) => {
                  const input: StudentTaskUpdateInput = {
                    taskId: task.id,
                    title: value.title.trim(),
                    description: value.description.trim() || null,
                    priority: value.priority,
                    visibility: value.visibility,
                    assignedToProfileId: value.assignee === "student" ? studentProfileId : advisorProfileId,
                    dueAt: value.dueAt ? new Date(value.dueAt).toISOString() : null,
                    documentId: value.documentId || null,
                  };
                  const succeeded = await edit(input);
                  if (succeeded) setEditingTaskId(null);
                  return succeeded;
                }}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black">{task.title}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black">{TASK_STATUS_LABELS[task.status]}</span>
                  <span className="text-xs font-black text-[#8A6A1F]">{TASK_PRIORITY_LABELS[task.priority]}</span>
                  <span className="text-xs text-slate-500">{TASK_VISIBILITY_LABELS[task.visibility]}</span>
                </div>
                {task.description ? <p className="mt-2 text-sm text-slate-600">{task.description}</p> : null}
                <p className="mt-2 text-xs text-slate-500">Assigned to {task.assignee.display_name} · Created by {task.creator.display_name} · Due {formatDate(task.due_at)}</p>
                {task.completed_at ? <p className="mt-1 text-xs text-emerald-700">Completed by {task.completer?.display_name ?? "CRM user"} on {formatDate(task.completed_at)}</p> : null}
                {task.document ? <button type="button" onClick={() => void openRelatedDocument(task)} className="mt-2 text-xs font-black underline">Open related document · Revision {task.document.revision_number}</button> : task.document_id ? <p className="mt-1 text-xs text-slate-500">Related document unavailable</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {!["completed", "cancelled"].includes(task.status) ? (
                    <>
                      {task.status === "not_started" ? <button type="button" onClick={() => void changeStatus(task.id, "in_progress")} className="rounded-lg border px-3 py-2 text-xs font-black">Start</button> : null}
                      {task.status !== "blocked" ? <button type="button" onClick={() => void changeStatus(task.id, "blocked")} className="rounded-lg border px-3 py-2 text-xs font-black">Block</button> : null}
                      {task.status === "blocked" ? <button type="button" onClick={() => void changeStatus(task.id, "in_progress")} className="rounded-lg border px-3 py-2 text-xs font-black">Resume</button> : null}
                      <button type="button" onClick={() => void changeStatus(task.id, "completed")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white"><CheckCircle2 size={13} /> Complete</button>
                      <button type="button" onClick={() => void changeStatus(task.id, "cancelled")} className="rounded-lg border px-3 py-2 text-xs font-black">Cancel Task</button>
                      <button type="button" onClick={() => setEditingTaskId(task.id)} className="rounded-lg border p-2" aria-label="Edit task"><Pencil size={14} /></button>
                    </>
                  ) : null}
                  <button type="button" disabled={busyTaskId === task.id} onClick={() => window.confirm("Remove this task from active records?") && void remove(task.id)} className="rounded-lg border border-red-200 p-2 text-red-700" aria-label="Soft delete task">{busyTaskId === task.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}</button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
