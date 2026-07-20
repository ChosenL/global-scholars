"use client";

import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  GraduationCap,
  Lightbulb,
} from "lucide-react";
import type {
  ApplicationProgress,
  StudentDocument,
  StudentProfile,
} from "../types/dashboard";

type StepStatus = "complete" | "current" | "upcoming";

interface JourneyStep {
  label: string;
  aliases: string[];
}

interface ProgressTrackerProps {
  profile: StudentProfile | null;
  progress: ApplicationProgress | null;
  documents: StudentDocument[];
  onNavigateToDocuments?: () => void;
}

const journeySteps: JourneyStep[] = [
  {
    label: "Consultation Completed",
    aliases: ["consultation", "initial consultation"],
  },
  {
    label: "Documents Submitted",
    aliases: ["documents", "document collection", "document submission"],
  },
  {
    label: "Credential Evaluation",
    aliases: ["credential", "evaluation"],
  },
  {
    label: "University Selection",
    aliases: ["university selection", "school selection", "shortlist"],
  },
  {
    label: "Applications Submitted",
    aliases: ["application submitted", "applications submitted"],
  },
  {
    label: "Admission Decision",
    aliases: ["admission", "decision", "offer"],
  },
  {
    label: "Visa Preparation",
    aliases: ["visa"],
  },
  {
    label: "Arrival Preparation",
    aliases: ["arrival", "pre-departure"],
  },
];

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function resolveCurrentStepIndex(
  currentStage: string,
  progressPercent: number,
): number {
  const normalizedStage = currentStage.trim().toLowerCase();
  const matchedIndex = journeySteps.findIndex((step) =>
    step.aliases.some((alias) => normalizedStage.includes(alias)),
  );

  if (matchedIndex >= 0) {
    return matchedIndex;
  }

  return Math.min(
    journeySteps.length - 1,
    Math.floor((progressPercent / 100) * journeySteps.length),
  );
}

function formatUpdatedAt(value?: string): string {
  if (!value) {
    return "Not updated yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function ProgressTracker({
  profile,
  progress,
  documents,
  onNavigateToDocuments,
}: ProgressTrackerProps) {
  const progressPercent = clampPercent(progress?.progress_percent ?? 10);
  const currentStage = progress?.current_stage ?? "Initial Consultation";
  const currentStepIndex = resolveCurrentStepIndex(
    currentStage,
    progressPercent,
  );
  const approvedDocuments = documents.filter(
    (document) => document.status === "approved",
  ).length;
  const pendingDocuments = documents.filter(
    (document) => document.status === "pending",
  ).length;
  const hasDocuments = documents.length > 0;

  const steps = journeySteps.map((step, index) => {
    let status: StepStatus =
      index < currentStepIndex
        ? "complete"
        : index === currentStepIndex
          ? "current"
          : "upcoming";

    if (index === 1 && hasDocuments && currentStepIndex < 1) {
      status = "current";
    }

    return { ...step, status };
  });

  const completedSteps = steps.filter(
    (step) => step.status === "complete",
  ).length;
  const remainingSteps = steps.filter(
    (step) => step.status !== "complete",
  ).length;
  const nextIncompleteStep = steps.find(
    (step) => step.status !== "complete",
  );

  const nextAction = !profile?.full_name || !profile?.email
    ? "Complete your student profile"
    : !hasDocuments
      ? "Upload your first required document"
      : pendingDocuments > 0
        ? "Wait for your advisor to review pending documents"
        : nextIncompleteStep?.label ?? "Review your completed pathway";

  const nextActionDescription = !hasDocuments
    ? "Your advisor needs your academic and identification documents to continue your assessment."
    : pendingDocuments > 0
      ? `${pendingDocuments} document${pendingDocuments === 1 ? " is" : "s are"} currently awaiting review.`
      : `Your current pathway stage is ${currentStage}.`;

  return (
    <section
      id="progress"
      className="scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
            My Progress
          </p>
          <h2 className="mt-2 text-3xl font-black">Application Journey</h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-500">
            Track each milestone from your first consultation through arrival
            preparation.
          </p>
        </div>

        <div className="rounded-2xl bg-[#F4F7FA] px-5 py-4 sm:text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Current stage
          </p>
          <p className="mt-1 font-black text-[#0F2747]">{currentStage}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#071526] p-5 text-white">
          <div className="flex items-center justify-between">
            <GraduationCap className="text-[#C8A24A]" size={24} />
            <span className="text-2xl font-black text-[#C8A24A]">
              {progressPercent}%
            </span>
          </div>
          <p className="mt-4 text-sm font-bold text-white/60">
            Overall completion
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#C8A24A] transition-[width] duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <CheckCircle2 className="text-emerald-600" size={24} />
          <p className="mt-4 text-2xl font-black">{completedSteps}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Milestones completed
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <Clock3 className="text-[#C8A24A]" size={24} />
          <p className="mt-4 text-2xl font-black">{remainingSteps}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Milestones remaining
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#C8A24A]/30 bg-[#C8A24A]/10 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C8A24A] text-[#071526]">
            <Lightbulb size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8A6A1F]">
              Recommended next action
            </p>
            <h3 className="mt-1 text-lg font-black">{nextAction}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {nextActionDescription}
            </p>

            {!hasDocuments && onNavigateToDocuments && (
              <button
                type="button"
                onClick={onNavigateToDocuments}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-4 py-3 text-sm font-black text-white transition hover:bg-[#173A68]"
              >
                Go to Documents
                <ArrowRight size={17} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
              step.status === "current"
                ? "border-[#C8A24A]/50 bg-[#C8A24A]/5"
                : "border-slate-200"
            }`}
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                step.status === "complete"
                  ? "bg-emerald-100 text-emerald-700"
                  : step.status === "current"
                    ? "bg-[#C8A24A]/20 text-[#8A6A1F]"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {step.status === "complete" ? (
                <CheckCircle2 size={22} />
              ) : (
                <Circle size={22} />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-black">{step.label}</p>
              <p className="mt-1 text-sm text-slate-500">
                {step.status === "complete"
                  ? "Completed"
                  : step.status === "current"
                    ? "Currently in progress"
                    : "Upcoming step"}
              </p>
            </div>

            {step.status === "current" && (
              <span className="rounded-full bg-[#C8A24A]/20 px-3 py-1 text-xs font-black text-[#8A6A1F]">
                Current
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-[#F4F7FA] p-4">
          <FileText className="text-[#0F2747]" size={21} />
          <div>
            <p className="text-sm font-black">Document review</p>
            <p className="mt-1 text-sm text-slate-500">
              {approvedDocuments} approved · {pendingDocuments} pending
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-[#F4F7FA] p-4">
          <Clock3 className="text-[#0F2747]" size={21} />
          <div>
            <p className="text-sm font-black">Last updated</p>
            <p className="mt-1 text-sm text-slate-500">
              {formatUpdatedAt(progress?.updated_at ?? progress?.created_at)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
