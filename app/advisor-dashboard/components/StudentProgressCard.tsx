"use client";

import {
  CheckCircle2,
  Circle,
  Clock3,
} from "lucide-react";

interface ProgressStep {
  id: string;
  title: string;
  completed: boolean;
  current?: boolean;
}

interface StudentProgressCardProps {
  progress?: number;
  steps?: ProgressStep[];
}

const DEFAULT_STEPS: ProgressStep[] = [
  {
    id: "account",
    title: "Account Created",
    completed: true,
  },
  {
    id: "profile",
    title: "Profile Completed",
    completed: true,
  },
  {
    id: "documents",
    title: "Documents Uploaded",
    completed: false,
    current: true,
  },
  {
    id: "universities",
    title: "University Selection",
    completed: false,
  },
  {
    id: "application",
    title: "Application Submitted",
    completed: false,
  },
  {
    id: "offer",
    title: "Offer Received",
    completed: false,
  },
  {
    id: "visa",
    title: "Visa Approved",
    completed: false,
  },
  {
    id: "enrollment",
    title: "Enrollment Complete",
    completed: false,
  },
];

export default function StudentProgressCard({
  progress = 15,
  steps = DEFAULT_STEPS,
}: StudentProgressCardProps) {
  const safeProgress = Math.max(
    0,
    Math.min(progress, 100),
  );

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C8A24A]">
            Progress
          </p>

          <h3 className="mt-2 text-2xl font-black text-[#071526]">
            Application Journey
          </h3>
        </div>

        <div className="rounded-xl bg-[#EEF3F8] px-4 py-2">
          <span className="text-lg font-black text-[#071526]">
            {safeProgress}%
          </span>
        </div>
      </div>

      <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#C8A24A] via-[#E7C55C] to-[#F4DB88] transition-all duration-500"
          style={{
            width: `${safeProgress}%`,
          }}
        />
      </div>

      <div className="mt-8 space-y-4">
        {steps.map((step) => {
          return (
            <div
              key={step.id}
              className="flex items-center gap-4"
            >
              <div className="shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : step.current ? (
                  <Clock3 className="h-6 w-6 text-[#C8A24A]" />
                ) : (
                  <Circle className="h-6 w-6 text-slate-300" />
                )}
              </div>

              <div className="flex-1">
                <p
                  className={[
                    "font-bold",
                    step.completed
                      ? "text-[#071526]"
                      : step.current
                      ? "text-[#8A6A1F]"
                      : "text-slate-400",
                  ].join(" ")}
                >
                  {step.title}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {step.completed
                    ? "Completed"
                    : step.current
                    ? "Currently in progress"
                    : "Pending"}
                </p>
              </div>

              {step.completed ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                  Done
                </span>
              ) : step.current ? (
                <span className="rounded-full bg-[#FFF4CF] px-3 py-1 text-xs font-black text-[#8A6A1F]">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                  Waiting
                </span>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}