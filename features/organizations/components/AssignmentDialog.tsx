"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { isCrmProfileId } from "../assignments";

type AssignmentKind = "advisor" | "student";

export interface AssignmentDialogResult {
  profileId: string;
  relationshipType: string;
  isPrimary: boolean;
}

export default function AssignmentDialog({
  kind,
  isPending,
  isDuplicate,
  onClose,
  onAssign,
}: {
  kind: AssignmentKind;
  isPending: boolean;
  isDuplicate: (profileId: string) => boolean;
  onClose: () => void;
  onAssign: (result: AssignmentDialogResult) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [profileId, setProfileId] = useState("");
  const [relationshipType, setRelationshipType] = useState(
    kind === "advisor" ? "support" : "client",
  );
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState("");
  const title = kind === "advisor" ? "Assign advisor" : "Assign student";
  const duplicate = isDuplicate(profileId);

  useEffect(() => {
    inputRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isPending, onClose]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedId = profileId.trim();
    if (!isCrmProfileId(normalizedId)) {
      setError("Enter a valid CRM profile UUID.");
      return;
    }
    if (isDuplicate(normalizedId)) {
      setError(`This ${kind} already has an active assignment.`);
      return;
    }
    setError("");
    await onAssign({
      profileId: normalizedId,
      relationshipType,
      isPrimary,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071526]/70 p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-dialog-title"
        className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl md:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="assignment-dialog-title" className="text-xl font-black">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Search by the {kind}&apos;s CRM profile UUID.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()} dialog`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6">
          <label className="block text-sm font-black">
            {kind === "advisor" ? "Advisor" : "Student"} profile
            <span className="relative mt-2 block">
              <Search
                aria-hidden="true"
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={inputRef}
                type="search"
                role="combobox"
                aria-expanded="false"
                aria-controls="assignment-profile-options"
                aria-autocomplete="list"
                aria-invalid={Boolean(error || duplicate)}
                aria-describedby={
                  error || duplicate ? "assignment-profile-error" : undefined
                }
                value={profileId}
                disabled={isPending}
                onChange={(event) => {
                  setProfileId(event.target.value);
                  setError("");
                }}
                placeholder="00000000-0000-4000-8000-000000000000"
                className="h-12 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-12 pr-4 font-mono text-sm outline-none focus:border-[#C8A24A] focus:ring-4 focus:ring-[#C8A24A]/10"
              />
              <span
                id="assignment-profile-options"
                role="listbox"
                aria-label={`${kind} profile search results`}
                className="sr-only"
              >
                <span role="option" aria-selected="false">
                  Enter an exact CRM profile UUID
                </span>
              </span>
            </span>
          </label>
          {error || duplicate ? (
            <p
              id="assignment-profile-error"
              role="alert"
              className="mt-2 text-sm font-semibold text-rose-700"
            >
              {error || `This ${kind} already has an active assignment.`}
            </p>
          ) : null}

          <label className="mt-5 block text-sm font-black">
            {kind === "advisor" ? "Assignment role" : "Membership type"}
            <select
              value={relationshipType}
              disabled={isPending}
              onChange={(event) => setRelationshipType(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#C8A24A] focus:ring-4 focus:ring-[#C8A24A]/10"
            >
              {(kind === "advisor"
                ? [
                    ["support", "Support"],
                    ["primary", "Primary"],
                    ["manager", "Manager"],
                  ]
                : [
                    ["client", "Client"],
                    ["sponsored", "Sponsored"],
                    ["referred", "Referred"],
                    ["managed", "Managed"],
                  ]
              ).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>

          {kind === "student" ? (
            <label className="mt-5 flex items-center gap-3 text-sm font-black">
              <input
                type="checkbox"
                checked={isPrimary}
                disabled={isPending}
                onChange={(event) => setIsPrimary(event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 accent-[#0F2747]"
              />
              Primary organization membership
            </label>
          ) : null}

          <div className="mt-7 flex justify-end gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || duplicate}
              className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : null}
              {isPending ? "Assigning…" : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
