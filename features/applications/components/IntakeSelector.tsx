"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { listOpenIntakes, type IntakeOption } from "../api";

export const formatIntake = (intake: IntakeOption) => {
  if (intake.start_date_precision === "term" || !intake.start_date)
    return intake.name;
  return `${intake.name} — ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${intake.start_date}T00:00:00Z`))}`;
};
export default function IntakeSelector({
  programId,
  value,
  onSelect,
  disabled,
}: {
  programId: string;
  value: string;
  onSelect: (intake: IntakeOption | null) => void;
  disabled: boolean;
}) {
  const id = useId();
  const [result, setResult] = useState<{
    programId: string;
    options: IntakeOption[];
    error: string | null;
  }>({ programId: "", options: [], error: null });
  useEffect(() => {
    if (!programId) return;
    const controller = new AbortController();
    void listOpenIntakes(programId, controller.signal)
      .then((options) => {
        if (!controller.signal.aborted)
          setResult({ programId, options, error: null });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setResult({
            programId,
            options: [],
            error:
              cause instanceof Error
                ? cause.message
                : "Unable to load intakes.",
          });
      });
    return () => controller.abort();
  }, [programId]);
  const loading = Boolean(programId && result.programId !== programId);
  const options = result.programId === programId ? result.options : [];
  const error = result.programId === programId ? result.error : null;
  const unavailable = disabled || !programId;
  return (
    <label htmlFor={id} className="text-sm font-bold">
      Intake selector
      <div className="relative mt-2">
        <select
          id={id}
          value={value}
          disabled={unavailable || loading}
          required
          onChange={(event) =>
            onSelect(
              options.find((option) => option.id === event.target.value) ??
                null,
            )
          }
          className="w-full rounded-xl border border-slate-300 p-3 pr-10 text-sm disabled:opacity-60"
        >
          <option value="">
            {programId ? "Select an open intake" : "Select a program first"}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {formatIntake(option)}
            </option>
          ))}
        </select>
        {loading ? (
          <Loader2
            aria-label="Loading intakes"
            className="absolute right-3 top-3 h-4 w-4 animate-spin"
          />
        ) : null}
      </div>
      {error ? (
        <span role="alert" className="mt-2 flex gap-2 text-rose-700">
          <AlertCircle className="h-4 w-4" />
          Unable to load intakes.
        </span>
      ) : !loading && programId && options.length === 0 ? (
        <span className="mt-2 block text-slate-500">
          No open intakes found.
        </span>
      ) : null}
    </label>
  );
}
