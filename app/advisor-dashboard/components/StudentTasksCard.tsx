"use client";

import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

export interface StudentTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string | null;
}

interface StudentTasksCardProps {
  tasks?: StudentTask[];
  onAddTask?: (title: string, dueDate?: string) => void;
  onToggleTask?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
}

const DEFAULT_TASKS: StudentTask[] = [
  {
    id: "1",
    title: "Upload Passport",
    completed: true,
    dueDate: "2026-07-15",
  },
  {
    id: "2",
    title: "Upload Financial Statement",
    completed: false,
    dueDate: "2026-07-25",
  },
  {
    id: "3",
    title: "Select Universities",
    completed: false,
    dueDate: "2026-08-01",
  },
];

function formatDate(date?: string | null) {
  if (!date) return "No due date";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function StudentTasksCard({
  tasks = DEFAULT_TASKS,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: StudentTasksCardProps) {
  const [taskTitle, setTaskTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks],
  );

  const progress =
    tasks.length === 0
      ? 0
      : Math.round((completedTasks / tasks.length) * 100);

  function handleAddTask() {
    if (!taskTitle.trim()) return;

    onAddTask?.(
      taskTitle.trim(),
      dueDate || undefined,
    );

    setTaskTitle("");
    setDueDate("");
  }

  return (
    <section className="w-full min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C8A24A]">
            Student Tasks
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#071526]">
            Task Manager
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {completedTasks} of {tasks.length} tasks completed
          </p>
        </div>

        <div className="rounded-xl bg-[#EEF3F8] px-5 py-3">
          <span className="text-xl font-black text-[#071526]">
            {progress}%
          </span>
        </div>
      </div>

      <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#C8A24A] to-[#F2D47A] transition-all duration-500"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="New task..."
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#C8A24A]"
          />

          <input
            type="date"
            value={dueDate}
            onChange={(e) =>
              setDueDate(e.target.value)
            }
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-[#C8A24A]"
          />
        </div>

        <button
          type="button"
          onClick={handleAddTask}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-5 py-3 font-bold text-white transition hover:bg-[#173B68]"
        >
          <Plus className="h-4 w-4" />
          Add Task
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
            <ClipboardCheck className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-4 font-semibold text-slate-500">
              No tasks assigned.
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <article
              key={task.id}
              className="flex items-start justify-between rounded-2xl border border-slate-200 p-5 transition hover:border-[#C8A24A]"
            >
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  onClick={() =>
                    onToggleTask?.(task.id)
                  }
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <Circle className="h-6 w-6 text-slate-300" />
                  )}
                </button>

                <div>
                  <h3
                    className={`font-bold ${
                      task.completed
                        ? "text-slate-400 line-through"
                        : "text-[#071526]"
                    }`}
                  >
                    {task.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Due: {formatDate(task.dueDate)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onDeleteTask?.(task.id)
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
