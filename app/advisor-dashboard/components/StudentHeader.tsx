"use client";

import { CalendarDays, Mail, UserCircle2 } from "lucide-react";
import type { AdvisorStudent } from "../hooks/useAdvisorStudents";

interface StudentHeaderProps {
  student: AdvisorStudent;
  progress?: number;
}

function formatAssignedDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Assignment date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "ST";
}

export default function StudentHeader({
  student,
  progress = 15,
}: StudentHeaderProps) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-[#071526] via-[#0F2747] to-[#173B68] px-8 py-8 text-white">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#C8A24A] text-[#071526] shadow-lg">
              <span className="text-3xl font-black">
                {getInitials(student.displayName)}
              </span>
            </div>

            <div>
              <h1 className="text-3xl font-black">
                {student.displayName}
              </h1>

              <div className="mt-3 flex flex-col gap-2 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>
                    {student.email ?? "No email available"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    Assigned {formatAssignedDate(student.assignedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 px-6 py-5 backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C8A24A]">
              Student Status
            </p>

            <p className="mt-2 text-2xl font-black">
              Active
            </p>

            <p className="mt-1 text-sm text-white/70">
              Advisor Assignment
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-8 lg:grid-cols-4">
        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <div className="flex items-center gap-3">
            <UserCircle2 className="h-6 w-6 text-[#0F2747]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Student ID
              </p>

              <p className="mt-1 text-sm font-black text-[#071526] break-all">
                {student.userId}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            University
          </p>

          <p className="mt-3 text-lg font-black text-slate-400">
            —
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Coming soon
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Intake
          </p>

          <p className="mt-3 text-lg font-black text-slate-400">
            —
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Coming soon
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Application Progress
          </p>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#C8A24A] to-[#F2D47A] transition-all duration-500"
              style={{
                width: `${safeProgress}%`,
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500">
              Progress
            </span>

            <span className="text-lg font-black text-[#071526]">
              {safeProgress}%
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
