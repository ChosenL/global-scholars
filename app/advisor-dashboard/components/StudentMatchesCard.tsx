"use client";

import { AlertCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { DeterministicMatchResult } from "@/lib/matching/deterministicMatching";

interface Props {
  studentProfileId: string;
  studentName: string;
}

interface MatchingPayload {
  ok: boolean;
  data?: {
    status: "results" | "insufficient_evidence" | "no_catalog_evidence";
    message: string;
    results: DeterministicMatchResult[];
  };
  error?: { message: string };
}

const LABELS = {
  strong_alignment: "Strong alignment",
  potential_match: "Potential match",
  limited_evidence: "Limited evidence",
  known_mismatch: "Known mismatch",
} as const;

export default function StudentMatchesCard({
  studentProfileId,
  studentName,
}: Props) {
  const [results, setResults] = useState<DeterministicMatchResult[] | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMatches() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/matching?studentProfileId=${encodeURIComponent(studentProfileId)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as MatchingPayload;
      if (!response.ok || !payload.ok || !payload.data)
        throw new Error(
          payload.error?.message ?? "Matches could not be loaded.",
        );
      setResults(payload.data.results);
      setMessage(payload.data.message);
    } catch (loadError) {
      setResults(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Matches could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#C8A24A]">
            Decision support
          </p>
          <h2 className="mt-2 text-xl font-black text-[#071526]">
            Find Matches
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Compare {studentName}&apos;s saved preferences with verified catalog
            evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadMatches()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : results ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading
            ? "Finding matches"
            : results
              ? "Refresh matches"
              : "Find Matches"}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-5 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-black">Matching service unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      {results ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-slate-600">{message}</p>
          {results.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
              Global Scholars does not yet have enough verified catalog evidence
              to produce strong matches. Additional verification is required.
            </div>
          ) : (
            results.map((result) => (
              <article
                key={`${result.institutionId}:${result.programId ?? "institution"}`}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-black text-[#071526]">
                      {result.institutionName}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {result.programName ?? "Program evidence unavailable"}
                      {result.credentialLevel
                        ? ` · ${result.credentialLevel}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#0F2747]">
                      {LABELS[result.label]}
                    </p>
                    <p className="text-xs text-slate-500">
                      Compatibility {result.compatibility ?? "—"}% · Evidence{" "}
                      {result.evidenceCompleteness}%
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="font-black text-emerald-800">Why</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                      {result.reasons
                        .filter(({ state }) => state === "match")
                        .map((reason) => (
                          <li key={reason.dimension}>{reason.explanation}</li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-black text-amber-800">
                      Unknown / verify
                    </p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                      {result.unknowns.map((unknown) => (
                        <li key={unknown}>{unknown}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-black text-rose-800">Known blockers</p>
                    {result.potentialBlockers.length ? (
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                        {result.potentialBlockers.map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-slate-500">No known blockers.</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 md:grid-cols-2">
                  <p>
                    <strong>Intake:</strong> {result.intakeEvidence}
                  </p>
                  <p>
                    <strong>Scholarship:</strong> {result.scholarshipEvidence}
                  </p>
                </div>
                {!result.excluded && result.programId ? (
                  <Link
                    href={{
                      pathname: "/applications",
                      query: {
                        start: "1",
                        studentProfileId,
                        universityId: result.institutionId,
                        universityName: result.institutionName,
                        programId: result.programId,
                        programName: result.programName ?? "",
                        credentialLevel: result.credentialLevel ?? "",
                      },
                    }}
                    className="mt-4 inline-flex rounded-xl border border-[#C8A24A] px-4 py-2 text-sm font-black text-[#0F2747]"
                  >
                    Start Application
                  </Link>
                ) : null}
              </article>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
