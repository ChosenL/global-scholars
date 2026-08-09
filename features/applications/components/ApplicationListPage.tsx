"use client";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createApplication, listApplications } from "../api";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type StudentApplication,
} from "../types";
import ApplicationShell from "./ApplicationShell";
import ApplicationToast from "./ApplicationToast";
import UniversitySelector from "./UniversitySelector";
import ProgramSelector from "./ProgramSelector";
import IntakeSelector from "./IntakeSelector";

const PAGE_SIZE = 10;
const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const shortId = (value: string | null) =>
  value ? `${value.slice(0, 8)}…` : "Unassigned";
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function ApplicationListPage() {
  const [items, setItems] = useState<StudentApplication[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "">("");
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [form, setForm] = useState({
    studentProfileId: "",
    universityId: "",
    universityName: "",
    programId: "",
    programName: "",
    credentialLevel: "",
    intakeId: "",
    advisorProfileId: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await listApplications({
          status: status || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        if (!controller.signal.aborted) setItems(data);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load applications.",
          );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [page, reloadKey, status]);

  const validateCreateForm = () => {
    if (!form.studentProfileId.trim()) return "Student is required.";
    if (!form.universityId) return "University is required.";
    if (!form.intakeId.trim()) return "Intake is required.";
    if (!form.programId) return "Program is required.";
    return null;
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateCreateForm();
    if (validationError) {
      setCreateError(validationError);
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await createApplication({
        studentProfileId: form.studentProfileId.trim(),
        universityId: form.universityId,
        programId: form.programId,
        intakeId: form.intakeId.trim(),
        advisorProfileId: form.advisorProfileId.trim() || null,
      });
      setCreatedId(created.id);
      setShowCreate(false);
      setQuery(created.id);
      setPage(0);
      setReloadKey((value) => value + 1);
      setToast({ tone: "success", message: "Application created." });
      setForm({
        studentProfileId: "",
        universityId: "",
        universityName: "",
        programId: "",
        programName: "",
        credentialLevel: "",
        intakeId: "",
        advisorProfileId: "",
      });
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Application could not be created.";
      setCreateError(message);
      setToast({ tone: "error", message });
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [
        item.id,
        item.student_profile_id,
        item.intake_id,
        item.advisor_profile_id,
        item.external_reference,
        item.status,
      ].some((value) => value?.toLowerCase().includes(needle)),
    );
  }, [items, query]);

  return (
    <ApplicationShell
      title="Student applications"
      description="Track application progress, assignments, financial snapshots, and auditable lifecycle events."
      actions={
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setShowCreate(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-4 py-3 text-sm font-black text-white"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          New Application
        </button>
      }
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div
          role="search"
          className="grid gap-4 border-b border-slate-200 p-5 md:grid-cols-[1fr_240px]"
        >
          <label className="relative block">
            <span className="sr-only">Search applications</span>
            <Search
              aria-hidden="true"
              className="absolute left-4 top-3.5 h-5 w-5 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search student, intake, reference, or application ID"
              className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ApplicationStatus | "");
                setPage(0);
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">All statuses</option>
              {APPLICATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {isLoading ? (
          <div aria-label="Loading applications" className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="p-10 text-center text-rose-800">
            <AlertCircle className="mx-auto h-9 w-9" />
            <h2 className="mt-3 font-black">Unable to load applications</h2>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-14 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-4 text-lg font-black">No applications found</h2>
            <p className="mt-2 text-sm text-slate-600">
              Try another search term, status, or page.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  {[
                    "Student",
                    "University",
                    "Advisor",
                    "Status",
                    "Intake",
                    "Program",
                    "Updated",
                  ].map((heading) => (
                    <th key={heading} className="px-5 py-4">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FFFCF2]">
                    <td className="px-5 py-4">
                      <Link
                        href={`/applications/${item.id}`}
                        className="font-black text-[#071526] hover:underline"
                      >
                        {shortId(item.student_profile_id)}
                        <span className="mt-1 block font-mono text-xs font-normal text-slate-500">
                          {item.external_reference ?? item.id}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      Catalog via intake
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {shortId(item.advisor_profile_id)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                        {label(item.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs">
                      {shortId(item.intake_id)}
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      Catalog via intake
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(item.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-600">Page {page + 1}</p>
          {createdId ? (
            <Link
              href={`/applications/${createdId}`}
              className="rounded-xl border border-[#C8A24A] px-3 py-2 text-sm font-black text-[#0F2747]"
            >
              Open new application
            </Link>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0 || isLoading}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-black disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={items.length < PAGE_SIZE || isLoading}
              onClick={() => setPage((value) => value + 1)}
              className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-black disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
      {showCreate ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#071526]/70 p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-application-title"
            className="w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="create-application-title"
                  className="text-xl font-black"
                >
                  Create application
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Catalog context is validated here; the application is created
                  from the selected student and intake.
                </p>
              </div>
              <button
                type="button"
                disabled={isCreating}
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black"
              >
                Close
              </button>
            </div>
            {createError ? (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800"
              >
                {createError}
              </p>
            ) : null}
            <form
              onSubmit={submitCreate}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <CreateField
                labelText="Student selector"
                value={form.studentProfileId}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    studentProfileId: value,
                  }))
                }
                disabled={isCreating}
                required
              />
              <div aria-label="University selector">
                <UniversitySelector
                  value={form.universityId}
                  selectedName={form.universityName}
                  onSelect={(university, inputName) =>
                    setForm((current) => ({
                      ...current,
                      universityId: university?.id ?? "",
                      universityName: inputName,
                      programId: "",
                      programName: "",
                      credentialLevel: "",
                      intakeId: "",
                    }))
                  }
                  disabled={isCreating}
                />
              </div>
              <div aria-label="Program selector">
                <ProgramSelector
                  key={form.universityId || "no-university"}
                  universityId={form.universityId}
                  value={form.programId}
                  selectedName={form.programName}
                  onSelect={(program, inputName) =>
                    setForm((current) => ({
                      ...current,
                      programId: program?.id ?? "",
                      programName: inputName,
                      credentialLevel: program?.credential_level ?? "",
                      intakeId: "",
                    }))
                  }
                  disabled={isCreating}
                />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <span className="block font-bold">Degree</span>
                <span className="mt-1 block capitalize text-slate-700">
                  {form.credentialLevel
                    ? form.credentialLevel.replaceAll("_", " ")
                    : "Select a program"}
                </span>
              </div>
              <IntakeSelector
                programId={form.programId}
                value={form.intakeId}
                onSelect={(intake) =>
                  setForm((current) => ({
                    ...current,
                    intakeId: intake?.id ?? "",
                  }))
                }
                disabled={isCreating}
              />
              <CreateField
                labelText="Advisor profile ID"
                value={form.advisorProfileId}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    advisorProfileId: value,
                  }))
                }
                disabled={isCreating}
              />
              <div className="flex justify-end gap-3 md:col-span-2">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border px-4 py-3 text-sm font-black"
                >
                  Cancel
                </button>
                <button
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : (
                    <Plus aria-hidden="true" className="h-4 w-4" />
                  )}
                  {isCreating ? "Creating..." : "Create application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {toast ? <ApplicationToast {...toast} /> : null}
    </ApplicationShell>
  );
}

function CreateField({
  labelText,
  value,
  onChange,
  disabled,
  required = false,
}: {
  labelText: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-bold">
      {labelText}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        aria-invalid={required && !value.trim()}
        className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm disabled:opacity-60"
      />
    </label>
  );
}
