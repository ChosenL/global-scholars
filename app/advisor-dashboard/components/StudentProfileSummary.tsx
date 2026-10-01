"use client";

import { AlertCircle, CheckCircle2, Loader2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@clerk/nextjs";

import { createClerkSupabaseClient } from "@/lib/supabase";

interface StudentProfile {
  nationality: string | null;
  current_country: string | null;
  highest_qualification: string | null;
  institution: string | null;
  gpa: number | null;
  graduation_year: number | null;
  english_test_type: string | null;
  english_test_score: number | null;
  preferred_destination_country: string | null;
  preferred_degree: string | null;
  preferred_program: string | null;
  intended_intake: string | null;
  budget: number | null;
  budget_currency: string | null;
}

const profileFields: Array<[string, keyof StudentProfile]> = [
  ["Nationality", "nationality"],
  ["Residence country", "current_country"],
  ["Qualification", "highest_qualification"],
  ["Institution", "institution"],
  ["GPA", "gpa"],
  ["Graduation year", "graduation_year"],
  ["English test", "english_test_type"],
];
const matchingFields: Array<[string, keyof StudentProfile]> = [
  ["Destination", "preferred_destination_country"],
  ["Degree level", "preferred_degree"],
  ["Program or field", "preferred_program"],
  ["Preferred intake", "intended_intake"],
  ["Budget", "budget"],
];

function valueFor(profile: StudentProfile, field: keyof StudentProfile) {
  if (field === "english_test_type")
    return profile.english_test_type
      ? `${profile.english_test_type}${profile.english_test_score === null ? "" : ` (${profile.english_test_score})`}`
      : null;
  if (field === "budget")
    return profile.budget === null
      ? null
      : `${profile.budget.toLocaleString()} ${profile.budget_currency ?? ""}`.trim();
  const value = profile[field];
  return value === null ? null : String(value);
}

export default function StudentProfileSummary({
  studentProfileId,
}: {
  studentProfileId: string;
}) {
  const { session } = useSession();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!session) return;
    let active = true;
    const supabase = createClerkSupabaseClient(() => session.getToken());
    void (async () => {
      try {
        const { data, error: loadError } = await supabase
          .schema("crm")
          .from("student_profiles")
          .select(
            "nationality,current_country,highest_qualification,institution,gpa,graduation_year,english_test_type,english_test_score,preferred_destination_country,preferred_degree,preferred_program,intended_intake,budget,budget_currency",
          )
          .eq("profile_id", studentProfileId)
          .is("deleted_at", null)
          .maybeSingle();
        if (!active) return;
        if (loadError || !data) {
          setProfile(null);
          setError(true);
          return;
        }
        setProfile(data as StudentProfile);
        setError(false);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [session, studentProfileId]);
  if (loading)
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          Loading student profile
        </div>
      </section>
    );
  if (error || !profile)
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <div className="flex gap-3">
          <AlertCircle aria-hidden="true" className="h-5 w-5 shrink-0" />
          <p>Student profile details are unavailable in this workspace.</p>
        </div>
      </section>
    );
  const missingMatching = matchingFields
    .filter(([, field]) => !valueFor(profile, field))
    .map(([label]) => label);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF1F8] text-[#0F2747]">
          <UserRound aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#C8A24A]">
            Student snapshot
          </p>
          <h2 className="mt-1 text-xl font-black text-[#071526]">
            Profile and matching preferences
          </h2>
        </div>
      </div>
      <div className="mt-5 grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
        {profileFields.map(([label, field]) => (
          <Detail key={field} label={label} value={valueFor(profile, field)} />
        ))}
      </div>
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-black text-[#071526]">
          Preferences used for matching
        </h3>
        <div className="mt-3 grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
          {matchingFields.map(([label, field]) => (
            <Detail
              key={field}
              label={label}
              value={valueFor(profile, field)}
            />
          ))}
        </div>
        <div className="mt-5 flex gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <CheckCircle2
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-[#0F2747]"
          />
          <p>
            {missingMatching.length
              ? `Missing profile information: ${missingMatching.join(", ")}. This is not a catalog mismatch.`
              : "Matching preferences are available. Catalog evidence is reviewed separately in the results below."}
          </p>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[#071526]">
        {value ?? "Not provided"}
      </p>
    </div>
  );
}
