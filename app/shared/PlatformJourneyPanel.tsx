"use client";

import { useSession } from "@clerk/nextjs";
import { Bot, CalendarClock, GraduationCap, Plane, Send } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { fetchStudentApplications, type StudentApplication } from "@/lib/crm/applications";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { fetchStudentVisaCases } from "@/features/visa/services/visaCases";
import type { VisaCase } from "@/features/visa/types";

type TimelineItem = {
  id: string;
  event_type: string;
  occurred_at: string;
};

export default function PlatformJourneyPanel({
  studentProfileId,
  advisorMode = false,
}: {
  studentProfileId: string | null;
  advisorMode?: boolean;
}) {
  const { session } = useSession();
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [visaCases, setVisaCases] = useState<VisaCase[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!session || !studentProfileId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClerkSupabaseClient(() => session.getToken());
      const [nextApplications, nextVisaCases, timelineResult] = await Promise.all([
        fetchStudentApplications(supabase, studentProfileId),
        fetchStudentVisaCases(supabase, studentProfileId),
        supabase.schema("crm").from("timeline_events")
          .select("id,event_type,occurred_at")
          .eq("student_profile_id", studentProfileId)
          .order("occurred_at", { ascending: false }).limit(8),
      ]);
      if (timelineResult.error) throw timelineResult.error;
      setApplications(nextApplications);
      setVisaCases(nextVisaCases);
      setTimeline((timelineResult.data ?? []) as TimelineItem[]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Journey data could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [session, studentProfileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  async function askAssistant(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || !studentProfileId) return;
    setIsAsking(true);
    setAnswer("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capability: advisorMode ? "next_action" : "student_advice",
          studentProfileId,
          question: question.trim(),
        }),
      });
      const result = await response.json() as { answer?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "The assistant could not respond.");
      setAnswer(result.answer ?? "");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The assistant is unavailable.");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <section id="journey" className="scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">Connected journey</p>
          <h2 className="mt-2 text-2xl font-black text-[#071526]">Applications, visa and timeline</h2>
        </div>
        <GraduationCap className="text-[#C8A24A]" />
      </div>

      {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="mt-6 text-sm text-slate-500">Loading journey…</p> : (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <JourneyColumn icon={<GraduationCap size={18} />} title="Applications" empty="No applications have been created yet.">
            {applications.map((application) => (
              <JourneyRow key={application.id} title={application.status.replaceAll("_", " ")} detail={application.submitted_at ? `Submitted ${formatDate(application.submitted_at)}` : "Not submitted"} />
            ))}
          </JourneyColumn>
          <JourneyColumn icon={<Plane size={18} />} title="Visa cases" empty="No visa case has been opened yet.">
            {visaCases.map((visaCase) => (
              <JourneyRow key={visaCase.id} title={visaCase.visa_type} detail={visaCase.stage.replaceAll("_", " ")} />
            ))}
          </JourneyColumn>
          <JourneyColumn icon={<CalendarClock size={18} />} title="Recent timeline" empty="No permitted timeline events yet.">
            {timeline.map((item) => (
              <JourneyRow key={item.id} title={item.event_type.replaceAll(".", " ")} detail={formatDate(item.occurred_at)} />
            ))}
          </JourneyColumn>
        </div>
      )}

      <form onSubmit={askAssistant} className="mt-6 rounded-2xl bg-[#071526] p-5 text-white">
        <label htmlFor={`crm-ai-${studentProfileId}`} className="flex items-center gap-2 font-black">
          <Bot size={19} className="text-[#C8A24A]" />
          {advisorMode ? "Ask the authorized advisor copilot" : "Ask about your CRM journey"}
        </label>
        <div className="mt-3 flex gap-2">
          <input id={`crm-ai-${studentProfileId}`} value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={4000} className="min-w-0 flex-1 rounded-xl bg-white px-4 py-3 text-[#071526]" placeholder="What should happen next?" />
          <button disabled={isAsking || !question.trim()} className="rounded-xl bg-[#C8A24A] px-4 text-[#071526] disabled:opacity-50" aria-label="Ask CRM AI assistant">
            <Send size={19} />
          </button>
        </div>
        {answer ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/85">{answer}</p> : null}
      </form>
    </section>
  );
}

function JourneyColumn({ icon, title, empty, children }: { icon: ReactNode; title: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return <div className="rounded-2xl border border-slate-200 p-4"><h3 className="flex items-center gap-2 font-black">{icon}{title}</h3><div className="mt-3 space-y-3">{items.length && items.some(Boolean) ? children : <p className="text-sm text-slate-500">{empty}</p>}</div></div>;
}

function JourneyRow({ title, detail }: { title: string; detail: string }) {
  return <article className="rounded-xl bg-slate-50 p-3"><p className="font-bold capitalize text-[#071526]">{title}</p><p className="mt-1 text-xs capitalize text-slate-500">{detail}</p></article>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
