"use client";

import {
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  DOCUMENT_TYPE_LABELS,
  summarizeStudentDocuments,
} from "@/app/scholar-dashboard/services/studentDocuments";
import type {
  StudentDocumentStatus,
  StudentDocumentWithUploader,
} from "@/app/scholar-dashboard/types/dashboard";
import StatusBadge from "@/app/scholar-dashboard/components/StatusBadge";

import { useAdvisorDocuments } from "../hooks/useAdvisorDocuments";

interface StudentDocumentsCardProps {
  studentProfileId: string;
  studentName: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function ReviewForm({
  document,
  isReviewing,
  onReview,
}: {
  document: StudentDocumentWithUploader;
  isReviewing: boolean;
  onReview: (
    status: Exclude<StudentDocumentStatus, "uploaded">,
    notes: string,
  ) => Promise<void>;
}) {
  const [status, setStatus] =
    useState<Exclude<StudentDocumentStatus, "uploaded">>(
      document.status === "under_review" ? "approved" : "under_review",
    );
  const [notes, setNotes] = useState(document.review_notes ?? "");
  const notesRequired =
    status === "rejected" || status === "needs_revision";

  return (
    <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[180px_1fr_auto] md:items-end">
      <label className="text-xs font-black uppercase tracking-wide text-slate-500">
        Review status
        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target.value as Exclude<
                StudentDocumentStatus,
                "uploaded"
              >,
            )
          }
          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
        >
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="needs_revision">Needs Revision</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </label>
      <label className="text-xs font-black uppercase tracking-wide text-slate-500">
        Review notes {notesRequired ? "(required)" : "(optional)"}
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={5000}
          className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal normal-case"
        />
      </label>
      <button
        type="button"
        disabled={isReviewing || (notesRequired && notes.trim().length < 2)}
        onClick={() => void onReview(status, notes)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#C8A24A] px-4 text-sm font-black text-[#071526] disabled:opacity-50"
      >
        {isReviewing ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
        Save Review
      </button>
    </div>
  );
}

export default function StudentDocumentsCard({
  studentProfileId,
  studentName,
}: StudentDocumentsCardProps) {
  const {
    documents,
    isLoading,
    reviewingDocumentId,
    error,
    successMessage,
    refresh,
    review,
    open,
  } = useAdvisorDocuments(studentProfileId);
  const summary = summarizeStudentDocuments(documents);
  const supersededDocumentIds = useMemo(
    () =>
      new Set(
        documents.flatMap((document) =>
          document.replaces_document_id
            ? [document.replaces_document_id]
            : [],
        ),
      ),
    [documents],
  );

  return (
    <section className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C8A24A]">
            Documents
          </p>
          <h2 className="mt-2 text-2xl font-black">{studentName}&apos;s Documents</h2>
          <p className="mt-2 text-sm text-slate-500">
            {summary.totalDocuments} active · {summary.approvedDocuments} approved ·{" "}
            {summary.needsRevisionDocuments} need attention
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-xl border border-slate-200 p-3"
          aria-label="Refresh student documents"
        >
          <RefreshCw className={isLoading ? "animate-spin" : ""} size={18} />
        </button>
      </div>

      {error || successMessage ? (
        <p className={`mt-5 rounded-xl p-3 text-sm font-semibold ${error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
          {error || successMessage}
        </p>
      ) : null}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="rounded-2xl border p-6 text-sm text-slate-500">Loading authorized student documents...</p>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <FileText className="mx-auto text-slate-400" />
            <p className="mt-3 font-black">No documents uploaded</p>
            <p className="mt-1 text-sm text-slate-500">This student has no active CRM document records.</p>
          </div>
        ) : (
          documents.map((document) => (
            <article key={document.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-black">
                      {document.custom_document_name ?? DOCUMENT_TYPE_LABELS[document.document_type]}
                      {document.revision_number > 1 ? ` · Revision ${document.revision_number}` : ""}
                      {supersededDocumentIds.has(document.id) ? " · Superseded" : ""}
                    </p>
                    <StatusBadge status={document.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {document.original_filename} · Uploaded {formatDate(document.created_at)} by {document.uploader.display_name}
                  </p>
                  {document.expires_at ? (
                    <p className="mt-1 text-xs font-semibold text-slate-500">Expires {formatDate(document.expires_at)}</p>
                  ) : null}
                  {document.reviewer ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Last reviewed by {document.reviewer.display_name} on {formatDate(document.reviewed_at)}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void open(document)} className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-4 py-2 text-sm font-black text-white">
                    <Eye size={16} /> View
                  </button>
                  <button type="button" onClick={() => void open(document, true)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black">
                    <Download size={16} /> Download
                  </button>
                </div>
              </div>
              <ReviewForm
                document={document}
                isReviewing={reviewingDocumentId === document.id}
                onReview={(status, notes) =>
                  review({
                    documentId: document.id,
                    status,
                    reviewNotes: notes,
                  })
                }
              />
            </article>
          ))
        )}
      </div>
    </section>
  );
}
