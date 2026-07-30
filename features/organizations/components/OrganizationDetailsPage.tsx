"use client";

import {
  AlertCircle,
  Archive,
  CalendarDays,
  Pencil,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  archiveOrganization,
  getOrganization,
  getOrganizationAdvisors,
  getOrganizationStudents,
} from "../api";
import type {
  Organization,
  OrganizationAdvisor,
  OrganizationStudent,
} from "../types";
import OrganizationShell from "./OrganizationShell";
import OrganizationToast from "./OrganizationToast";

function formatDate(value: string | null) {
  if (!value) return "Not applicable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DetailSkeleton() {
  return (
    <div
      aria-label="Loading organization"
      className="grid gap-5 lg:grid-cols-3"
    >
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="h-28 animate-pulse rounded-3xl bg-slate-200"
        />
      ))}
    </div>
  );
}

export default function OrganizationDetailsPage({ id }: { id: string }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [advisors, setAdvisors] = useState<OrganizationAdvisor[]>([]);
  const [students, setStudents] = useState<OrganizationStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [nextOrganization, nextAdvisors, nextStudents] =
          await Promise.all([
            getOrganization(id),
            getOrganizationAdvisors(id),
            getOrganizationStudents(id),
          ]);
        if (active) {
          setOrganization(nextOrganization);
          setAdvisors(nextAdvisors);
          setStudents(nextStudents);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Organization could not be loaded.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  async function confirmArchive() {
    setIsArchiving(true);
    try {
      const archived = await archiveOrganization(id);
      setOrganization(archived);
      setShowArchive(false);
      setToast({ message: "Organization archived.", tone: "success" });
    } catch (cause) {
      setToast({
        message:
          cause instanceof Error
            ? cause.message
            : "Organization could not be archived.",
        tone: "error",
      });
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <OrganizationShell
      title={organization?.name ?? "Organization details"}
      description="Review organization information, active advisors, and student memberships."
      backHref="/organizations"
      actions={
        organization ? (
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/organizations/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit
            </Link>
            {organization.status !== "archived" ? (
              <button
                type="button"
                onClick={() => setShowArchive(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-black text-white"
              >
                <Archive aria-hidden="true" className="h-4 w-4" />
                Archive
              </button>
            ) : null}
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <DetailSkeleton />
      ) : error || !organization ? (
        <div
          role="alert"
          className="rounded-3xl border border-rose-200 bg-white p-10 text-center"
        >
          <AlertCircle
            aria-hidden="true"
            className="mx-auto h-9 w-9 text-rose-600"
          />
          <h2 className="mt-4 text-xl font-black">
            Unable to load organization
          </h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Slug", organization.slug],
              ["Type", label(organization.organization_type)],
              ["Status", label(organization.status)],
              ["Email", organization.email ?? "Not provided"],
              ["Phone", organization.phone ?? "Not provided"],
              ["Website", organization.website ?? "Not provided"],
              ["Address", organization.address ?? "Not provided"],
            ].map(([title, value]) => (
              <article
                key={title}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {title}
                </p>
                <p className="mt-2 break-words text-sm font-bold text-[#071526]">
                  {value}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <Users aria-hidden="true" className="h-5 w-5 text-[#A6812C]" />
                Advisors{" "}
                <span className="text-slate-400">({advisors.length})</span>
              </h2>
              <div className="mt-5 space-y-3">
                {advisors.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
                    No active advisors assigned.
                  </p>
                ) : (
                  advisors.map((advisor) => (
                    <div
                      key={advisor.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <p className="font-mono text-xs text-slate-600">
                        {advisor.advisor_profile_id}
                      </p>
                      <p className="mt-2 text-sm font-black">
                        {label(advisor.assignment_role)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <Users aria-hidden="true" className="h-5 w-5 text-[#A6812C]" />
                Students{" "}
                <span className="text-slate-400">({students.length})</span>
              </h2>
              <div className="mt-5 space-y-3">
                {students.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
                    No active students associated.
                  </p>
                ) : (
                  students.map((student) => (
                    <div
                      key={student.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <p className="font-mono text-xs text-slate-600">
                        {student.student_profile_id}
                      </p>
                      <p className="mt-2 text-sm font-black">
                        {label(student.membership_type)}
                        {student.is_primary ? " · Primary" : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </article>
          </section>

          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <CalendarDays
                aria-hidden="true"
                className="h-5 w-5 text-[#A6812C]"
              />
              Record timeline
            </h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-black uppercase text-slate-500">
                  Created
                </dt>
                <dd className="mt-1 text-sm font-bold">
                  {formatDate(organization.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase text-slate-500">
                  Updated
                </dt>
                <dd className="mt-1 text-sm font-bold">
                  {formatDate(organization.updated_at)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase text-slate-500">
                  Archived
                </dt>
                <dd className="mt-1 text-sm font-bold">
                  {formatDate(organization.archived_at)}
                </dd>
              </div>
            </dl>
          </section>
        </>
      )}

      {showArchive ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071526]/70 p-5"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-title"
            className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl"
          >
            <h2 id="archive-title" className="text-xl font-black">
              Archive this organization?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This preserves the record and its history. It does not permanently
              delete any data.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isArchiving}
                onClick={() => setShowArchive(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isArchiving}
                onClick={() => void confirmArchive()}
                className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
              >
                {isArchiving ? "Archiving…" : "Archive organization"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? <OrganizationToast {...toast} /> : null}
    </OrganizationShell>
  );
}
