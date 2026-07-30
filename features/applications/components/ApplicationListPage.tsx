"use client";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listApplications } from "../api";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type StudentApplication,
} from "../types";
import ApplicationShell from "./ApplicationShell";

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
  }, [page, status]);

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
    </ApplicationShell>
  );
}
