"use client";

import {
  AlertCircle,
  Archive,
  Clock3,
  DollarSign,
  Loader2,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  archiveApplication,
  assignApplicationAdvisor,
  changeApplicationStatus,
  getApplication,
  listApplicationTimeline,
  updateApplicationFinancials,
} from "../api";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type ApplicationTimelineEvent,
  type StudentApplication,
} from "../types";
import ApplicationShell from "./ApplicationShell";
import ApplicationToast from "./ApplicationToast";

const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function ApplicationDetailsPage({ id }: { id: string }) {
  const [application, setApplication] = useState<StudentApplication | null>(
    null,
  );
  const [timeline, setTimeline] = useState<ApplicationTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [status, setStatus] = useState<ApplicationStatus>("draft");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [source, setSource] = useState("");
  const [advisorProfileId, setAdvisorProfileId] = useState("");
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [pending, setPending] = useState<
    "status" | "financials" | "archive" | "advisor" | null
  >(null);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getApplication(id), listApplicationTimeline(id)])
      .then(([record, events]) => {
        if (!active) return;
        setApplication(record);
        setTimeline(events);
        setStatus(record.status as ApplicationStatus);
        setAmount(record.tuition_amount?.toString() ?? "");
        setCurrency(record.tuition_currency ?? "");
        setSource(record.tuition_source ?? "");
        setAdvisorProfileId(record.advisor_profile_id ?? "");
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load application.",
          );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const updateStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!application) return;
    setPending("status");
    try {
      const updated = await changeApplicationStatus(
        id,
        status,
        reason.trim() || null,
      );
      setApplication(updated);
      setReason("");
      setToast({ tone: "success", message: "Application status updated." });
      setTimeline(await listApplicationTimeline(id));
    } catch (cause) {
      setToast({
        tone: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "Status could not be updated.",
      });
    } finally {
      setPending(null);
    }
  };
  const updateFinancials = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending("financials");
    try {
      const clearing = !amount && !currency && !source;
      const updated = await updateApplicationFinancials(id, {
        tuitionAmount: clearing ? null : Number(amount),
        tuitionCurrency: clearing ? null : currency,
        tuitionSource: clearing ? null : source,
      });
      setApplication(updated);
      setToast({ tone: "success", message: "Financial details updated." });
    } catch (cause) {
      setToast({
        tone: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "Financial details could not be updated.",
      });
    } finally {
      setPending(null);
    }
  };
  const assignAdvisor = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextAdvisor = advisorProfileId.trim();
    if (!nextAdvisor) {
      setAdvisorError("Advisor profile ID is required.");
      return;
    }
    setPending("advisor");
    setAdvisorError(null);
    try {
      const updated = await assignApplicationAdvisor(id, nextAdvisor);
      setApplication(updated);
      setAdvisorProfileId(updated.advisor_profile_id ?? "");
      setToast({ tone: "success", message: "Advisor assignment updated." });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Advisor could not be assigned.";
      setAdvisorError(message);
      setToast({ tone: "error", message });
    } finally {
      setPending(null);
    }
  };
  const confirmArchive = async () => {
    setPending("archive");
    try {
      const updated = await archiveApplication(id);
      setApplication(updated);
      setShowArchive(false);
      setToast({ tone: "success", message: "Application archived." });
    } catch (cause) {
      setToast({
        tone: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "Application could not be archived.",
      });
    } finally {
      setPending(null);
    }
  };

  if (isLoading)
    return (
      <ApplicationShell
        title="Application details"
        description="Loading application data."
      >
        <div
          aria-label="Loading application"
          className="h-80 animate-pulse rounded-[2rem] bg-white"
        />
      </ApplicationShell>
    );
  if (error || !application)
    return (
      <ApplicationShell
        title="Application details"
        description="The requested record could not be loaded."
        backHref="/applications"
      >
        <div
          role="alert"
          className="rounded-[2rem] bg-white p-10 text-center text-rose-800"
        >
          <AlertCircle className="mx-auto h-9 w-9" />
          <p className="mt-3 font-black">Unable to load application</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </ApplicationShell>
    );

  return (
    <ApplicationShell
      title={
        application.external_reference ??
        `Application ${application.id.slice(0, 8)}`
      }
      description="Review the application aggregate and its auditable lifecycle."
      backHref="/applications"
      actions={
        <button
          type="button"
          disabled={Boolean(application.archived_at)}
          onClick={() => setShowArchive(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          <Archive className="h-4 w-4" />
          {application.archived_at ? "Archived" : "Archive"}
        </button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Overview">
          <Info labelText="Student" value={application.student_profile_id} />
          <Info
            labelText="University"
            value="Resolved through the selected intake"
          />
          <Info
            labelText="Advisor"
            value={application.advisor_profile_id ?? "Unassigned"}
          />
          <Info labelText="Intake" value={application.intake_id} />
          <Info
            labelText="Program"
            value="Resolved through the selected intake"
          />
        </Section>
        <Section title="Advisor Assignment">
          <Info
            labelText="Current advisor"
            value={application.advisor_profile_id ?? "Unassigned"}
          />
          {advisorError ? (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800"
            >
              {advisorError}
            </p>
          ) : null}
          <form onSubmit={assignAdvisor} className="space-y-4">
            <label className="block text-sm font-bold">
              Advisor profile ID
              <input
                value={advisorProfileId}
                onChange={(event) => setAdvisorProfileId(event.target.value)}
                disabled={pending !== null}
                aria-invalid={!advisorProfileId.trim()}
                className="mt-2 w-full rounded-xl border p-3 font-mono text-sm disabled:opacity-60"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                disabled={pending !== null}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {pending === "advisor" ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  <UserPlus aria-hidden="true" className="h-4 w-4" />
                )}
                {application.advisor_profile_id
                  ? "Change advisor"
                  : "Assign advisor"}
              </button>
              <button
                type="button"
                disabled
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-400"
              >
                Remove advisor unavailable
              </button>
            </div>
          </form>
        </Section>
        <Section title="Status">
          <p className="mb-5">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-black text-blue-800">
              {label(application.status)}
            </span>
          </p>
          <form onSubmit={updateStatus} className="space-y-4">
            <label className="block text-sm font-bold">
              New status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ApplicationStatus)
                }
                className="mt-2 w-full rounded-xl border px-3 py-3"
              >
                {APPLICATION_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold">
              Reason
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border p-3"
              />
            </label>
            <button
              disabled={pending !== null || status === application.status}
              className="rounded-xl bg-[#0F2747] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {pending === "status" ? "Updating…" : "Update status"}
            </button>
          </form>
        </Section>
        <Section title="Financials">
          <div className="mb-5 grid grid-cols-2 gap-4">
            <Info
              labelText="Tuition"
              value={
                application.tuition_amount === null
                  ? "Not recorded"
                  : application.tuition_amount.toLocaleString()
              }
            />
            <Info
              labelText="Scholarship"
              value="Read-only; linked awards are not exposed by the current API"
            />
            <Info
              labelText="Currency"
              value={application.tuition_currency ?? "Not recorded"}
            />
          </div>
          <form
            onSubmit={updateFinancials}
            className="grid gap-4 sm:grid-cols-2"
          >
            <label className="text-sm font-bold">
              Tuition amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-2 w-full rounded-xl border p-3"
              />
            </label>
            <label className="text-sm font-bold">
              Currency
              <input
                maxLength={3}
                value={currency}
                onChange={(event) =>
                  setCurrency(event.target.value.toUpperCase())
                }
                className="mt-2 w-full rounded-xl border p-3 uppercase"
              />
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              Source
              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="mt-2 w-full rounded-xl border p-3"
              />
            </label>
            <button
              disabled={pending !== null}
              className="rounded-xl bg-[#0F2747] px-4 py-3 text-sm font-black text-white disabled:opacity-50 sm:col-span-2"
            >
              {pending === "financials" ? "Saving…" : "Update financials"}
            </button>
          </form>
        </Section>
        <Section title="Timeline">
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-600">
              No timeline events are available.
            </p>
          ) : (
            <ol className="space-y-4">
              {timeline.map((event) => (
                <li
                  key={event.id}
                  className="flex gap-3 border-l-2 border-[#C8A24A] pl-4"
                >
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-black">{label(event.event_type)}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(event.occurred_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>
        <Section title="Notes">
          <p className="text-sm text-slate-600">
            Notes are read-only in this phase. Editing will be added through a
            future Application API capability.
          </p>
        </Section>
        <Section title="Tasks">
          <p className="text-sm text-slate-600">
            Tasks are read-only in this phase. Application-linked task editing
            is not exposed by the current API.
          </p>
        </Section>
      </div>
      {showArchive ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#071526]/70 p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-application-title"
            className="w-full max-w-md rounded-[2rem] bg-white p-7"
          >
            <h2 id="archive-application-title" className="text-xl font-black">
              Archive this application?
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              This preserves the application and its audit history. It does not
              permanently delete data.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={pending === "archive"}
                onClick={() => setShowArchive(false)}
                className="rounded-xl border px-4 py-2.5 font-black"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending === "archive"}
                onClick={() => void confirmArchive()}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 font-black text-white disabled:opacity-50"
              >
                {pending === "archive" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DollarSign className="h-4 w-4" />
                )}
                Archive application
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? <ApplicationToast {...toast} /> : null}
    </ApplicationShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-black">{title}</h2>
      {children}
    </section>
  );
}
function Info({ labelText, value }: { labelText: string; value: string }) {
  return (
    <div className="mb-4">
      <dt className="text-xs font-black uppercase tracking-wider text-slate-500">
        {labelText}
      </dt>
      <dd className="mt-1 break-all text-sm font-semibold">{value}</dd>
    </div>
  );
}
