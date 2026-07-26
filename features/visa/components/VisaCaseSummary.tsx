import type { VisaCase, VisaReadiness } from "../types";

export function VisaCaseSummary({
  visaCase,
  readiness,
}: {
  visaCase: VisaCase;
  readiness: VisaReadiness | null;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-black uppercase tracking-wide text-[#C8A24A]">
        {visaCase.visa_type}
      </p>
      <h3 className="mt-2 font-black text-[#071526]">
        {visaCase.stage.replaceAll("_", " ")}
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        Visa readiness: {Math.round(readiness?.total_score ?? 0)}%
      </p>
    </article>
  );
}
