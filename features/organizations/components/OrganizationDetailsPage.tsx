"use client";

import {
  AlertCircle,
  Archive,
  CalendarDays,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  archiveOrganization,
  assignOrganizationAdvisor,
  assignOrganizationStudent,
  getOrganization,
  getOrganizationAdvisors,
  getOrganizationStudents,
  removeOrganizationAdvisor,
  removeOrganizationStudent,
} from "../api";
import {
  hasActiveAdvisorAssignment,
  hasActiveStudentAssignment,
} from "../assignments";
import type {
  Organization,
  OrganizationAdvisor,
  OrganizationStudent,
} from "../types";
import AssignmentDialog, {
  type AssignmentDialogResult,
} from "./AssignmentDialog";
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

function AssignmentLoading({ label: text }: { label: string }) {
  return (
    <div
      role="status"
      className="flex min-h-28 items-center justify-center rounded-2xl bg-slate-50"
    >
      <Loader2
        aria-hidden="true"
        className="h-5 w-5 animate-spin text-[#A6812C]"
      />
      <span className="sr-only">{text}</span>
    </div>
  );
}

export default function OrganizationDetailsPage({ id }: { id: string }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [advisors, setAdvisors] = useState<OrganizationAdvisor[]>([]);
  const [students, setStudents] = useState<OrganizationStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLoadingAdvisors, setIsLoadingAdvisors] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [advisorsError, setAdvisorsError] = useState("");
  const [studentsError, setStudentsError] = useState("");
  const [dialogKind, setDialogKind] = useState<"advisor" | "student" | null>(
    null,
  );
  const [isAssigning, setIsAssigning] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  useEffect(() => {
    let active = true;

    getOrganization(id)
      .then((value) => {
        if (active) setOrganization(value);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Organization could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    getOrganizationAdvisors(id)
      .then((value) => {
        if (active) setAdvisors(value);
      })
      .catch((cause: unknown) => {
        if (active) {
          setAdvisorsError(
            cause instanceof Error ? cause.message : "Advisors could not load.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingAdvisors(false);
      });

    getOrganizationStudents(id)
      .then((value) => {
        if (active) setStudents(value);
      })
      .catch((cause: unknown) => {
        if (active) {
          setStudentsError(
            cause instanceof Error ? cause.message : "Students could not load.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingStudents(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  async function assignRelationship(result: AssignmentDialogResult) {
    if (!dialogKind) return;
    setIsAssigning(true);
    try {
      if (dialogKind === "advisor") {
        const assignment = await assignOrganizationAdvisor(id, {
          advisorProfileId: result.profileId,
          assignmentRole: result.relationshipType as
            "primary" | "support" | "manager",
        });
        setAdvisors((current) => [assignment, ...current]);
        setToast({ message: "Advisor assigned.", tone: "success" });
      } else {
        const membership = await assignOrganizationStudent(id, {
          studentProfileId: result.profileId,
          membershipType: result.relationshipType as
            "client" | "sponsored" | "referred" | "managed",
          isPrimary: result.isPrimary,
        });
        setStudents((current) => [membership, ...current]);
        setToast({ message: "Student assigned.", tone: "success" });
      }
      setDialogKind(null);
    } catch (cause) {
      setToast({
        message:
          cause instanceof Error ? cause.message : "Assignment could not save.",
        tone: "error",
      });
    } finally {
      setIsAssigning(false);
    }
  }

  async function removeAdvisor(assignmentId: string) {
    setPendingRemoval(`advisor:${assignmentId}`);
    try {
      await removeOrganizationAdvisor(id, assignmentId);
      setAdvisors((current) =>
        current.filter((assignment) => assignment.id !== assignmentId),
      );
      setToast({ message: "Advisor assignment removed.", tone: "success" });
    } catch (cause) {
      setToast({
        message:
          cause instanceof Error
            ? cause.message
            : "Advisor assignment could not be removed.",
        tone: "error",
      });
    } finally {
      setPendingRemoval(null);
    }
  }

  async function removeStudent(membershipId: string) {
    setPendingRemoval(`student:${membershipId}`);
    try {
      await removeOrganizationStudent(id, membershipId);
      setStudents((current) =>
        current.filter((membership) => membership.id !== membershipId),
      );
      setToast({ message: "Student assignment removed.", tone: "success" });
    } catch (cause) {
      setToast({
        message:
          cause instanceof Error
            ? cause.message
            : "Student assignment could not be removed.",
        tone: "error",
      });
    } finally {
      setPendingRemoval(null);
    }
  }

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

          <section className="mt-8" aria-labelledby="assignments-heading">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#A6812C]">
              Access relationships
            </p>
            <h2 id="assignments-heading" className="mt-2 text-2xl font-black">
              Assignments
            </h2>
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <AssignmentHeader
                  title="Advisors"
                  count={advisors.length}
                  actionLabel="Assign advisor"
                  disabled={isLoadingAdvisors || Boolean(advisorsError)}
                  onAction={() => setDialogKind("advisor")}
                />
                <div className="mt-5 space-y-3">
                  {isLoadingAdvisors ? (
                    <AssignmentLoading label="Loading advisors" />
                  ) : advisorsError ? (
                    <AssignmentError
                      title="Advisors could not be loaded"
                      message={advisorsError}
                    />
                  ) : advisors.length === 0 ? (
                    <AssignmentEmpty message="No active advisors assigned." />
                  ) : (
                    advisors.map((advisor) => (
                      <AssignmentRow
                        key={advisor.id}
                        profileId={advisor.advisor_profile_id}
                        detail={label(advisor.assignment_role)}
                        isPending={pendingRemoval === `advisor:${advisor.id}`}
                        onRemove={() => void removeAdvisor(advisor.id)}
                        removeLabel={`Remove advisor ${advisor.advisor_profile_id}`}
                      />
                    ))
                  )}
                </div>
              </article>

              <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <AssignmentHeader
                  title="Students"
                  count={students.length}
                  actionLabel="Assign student"
                  disabled={isLoadingStudents || Boolean(studentsError)}
                  onAction={() => setDialogKind("student")}
                />
                <div className="mt-5 space-y-3">
                  {isLoadingStudents ? (
                    <AssignmentLoading label="Loading students" />
                  ) : studentsError ? (
                    <AssignmentError
                      title="Students could not be loaded"
                      message={studentsError}
                    />
                  ) : students.length === 0 ? (
                    <AssignmentEmpty message="No active students associated." />
                  ) : (
                    students.map((student) => (
                      <AssignmentRow
                        key={student.id}
                        profileId={student.student_profile_id}
                        detail={`${label(student.membership_type)}${
                          student.is_primary ? " · Primary" : ""
                        }`}
                        isPending={pendingRemoval === `student:${student.id}`}
                        onRemove={() => void removeStudent(student.id)}
                        removeLabel={`Remove student ${student.student_profile_id}`}
                      />
                    ))
                  )}
                </div>
              </article>
            </div>
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
              {[
                ["Created", organization.created_at],
                ["Updated", organization.updated_at],
                ["Archived", organization.archived_at],
              ].map(([title, value]) => (
                <div key={title}>
                  <dt className="text-xs font-black uppercase text-slate-500">
                    {title}
                  </dt>
                  <dd className="mt-1 text-sm font-bold">
                    {formatDate(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}

      {dialogKind ? (
        <AssignmentDialog
          kind={dialogKind}
          isPending={isAssigning}
          isDuplicate={(profileId) =>
            dialogKind === "advisor"
              ? hasActiveAdvisorAssignment(advisors, profileId)
              : hasActiveStudentAssignment(students, profileId)
          }
          onClose={() => setDialogKind(null)}
          onAssign={assignRelationship}
        />
      ) : null}

      {showArchive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071526]/70 p-5">
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

function AssignmentHeader({
  title,
  count,
  actionLabel,
  disabled,
  onAction,
}: {
  title: string;
  count: number;
  actionLabel: string;
  disabled: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-xl font-black">
        <Users aria-hidden="true" className="h-5 w-5 text-[#A6812C]" />
        {title} <span className="text-slate-400">({count})</span>
      </h3>
      <button
        type="button"
        disabled={disabled}
        onClick={onAction}
        className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-3 py-2 text-sm font-black text-white disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        {actionLabel}
      </button>
    </div>
  );
}

function AssignmentError({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
    >
      <p className="font-black">{title}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function AssignmentEmpty({ message }: { message: string }) {
  return (
    <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
      {message}
    </p>
  );
}

function AssignmentRow({
  profileId,
  detail,
  isPending,
  onRemove,
  removeLabel,
}: {
  profileId: string;
  detail: string;
  isPending: boolean;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-slate-600">
            {profileId}
          </p>
          <p className="mt-2 text-sm font-black">{detail}</p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={onRemove}
          aria-label={removeLabel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 text-rose-700 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
