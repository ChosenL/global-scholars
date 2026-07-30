"use client";

import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getOrganizationAdvisors,
  getOrganizationStudents,
  listOrganizations,
} from "../api";
import type { OrganizationSummary } from "../types";
import OrganizationShell from "./OrganizationShell";

const PAGE_SIZE = 10;

function formatType(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function ListSkeleton() {
  return (
    <div aria-label="Loading organizations" className="space-y-3 p-5">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="h-20 animate-pulse rounded-2xl bg-slate-100"
        />
      ))}
    </div>
  );
}

export default function OrganizationListPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<OrganizationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const organizations = await listOrganizations({
          search,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        const summaries = await Promise.all(
          organizations.map(async (organization) => {
            const [advisors, students] = await Promise.all([
              getOrganizationAdvisors(organization.id),
              getOrganizationStudents(organization.id),
            ]);
            return {
              ...organization,
              advisorCount: advisors.length,
              studentCount: students.length,
            };
          }),
        );
        if (!controller.signal.aborted) setItems(summaries);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Organizations could not be loaded.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [page, reloadKey, search]);

  return (
    <OrganizationShell
      title="Organizations"
      description="Search and manage the customer organizations using Global Scholars OS."
      actions={
        <Link
          href="/organizations/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C8A24A] px-5 py-3 text-sm font-black text-[#071526] hover:bg-[#D8B75E] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#C8A24A]/30"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          New organization
        </Link>
      }
    >
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(0);
            setSearch(query);
          }}
          className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row"
        >
          <label className="relative flex-1">
            <span className="sr-only">Search organizations</span>
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by organization name"
              className="h-12 w-full rounded-xl border border-slate-200 bg-[#F8FAFC] pl-12 pr-4 text-sm font-semibold outline-none focus:border-[#C8A24A] focus:ring-4 focus:ring-[#C8A24A]/10"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-[#0F2747] px-6 py-3 text-sm font-black text-white hover:bg-[#173B68] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#C8A24A]/30"
          >
            Search
          </button>
        </form>

        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <div role="alert" className="px-6 py-14 text-center">
            <AlertCircle
              aria-hidden="true"
              className="mx-auto h-9 w-9 text-rose-600"
            />
            <h2 className="mt-4 text-lg font-black">
              Unable to load organizations
            </h2>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="mt-5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-black"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Building2
              aria-hidden="true"
              className="mx-auto h-10 w-10 text-slate-400"
            />
            <h2 className="mt-4 text-lg font-black">No organizations found</h2>
            <p className="mt-2 text-sm text-slate-600">
              {search
                ? "Try a different search term."
                : "Create the first customer organization to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">Organization</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Advisors</th>
                  <th className="px-5 py-4">Students</th>
                  <th className="px-5 py-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((organization) => (
                  <tr
                    key={organization.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open ${organization.name}`}
                    onClick={() =>
                      router.push(`/organizations/${organization.id}`)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/organizations/${organization.id}`);
                      }
                    }}
                    className="cursor-pointer transition hover:bg-[#FFFCF2] focus:bg-[#FFFCF2] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#C8A24A] focus-within:bg-[#FFFCF2]"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/organizations/${organization.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="block font-black text-[#071526] focus-visible:outline-none focus-visible:underline"
                      >
                        {organization.name}
                        <span className="mt-1 block font-mono text-xs font-normal text-slate-500">
                          {organization.slug}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-black capitalize",
                          organization.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700",
                        ].join(" ")}
                      >
                        {organization.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700">
                      {formatType(organization.organization_type)}
                    </td>
                    <td className="px-5 py-4">{organization.advisorCount}</td>
                    <td className="px-5 py-4">{organization.studentCount}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDate(organization.created_at)}
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
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={items.length < PAGE_SIZE || isLoading}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black disabled:opacity-40"
            >
              Next
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </OrganizationShell>
  );
}
