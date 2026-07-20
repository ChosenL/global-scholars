"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Replace,
  Trash2,
  XCircle,
} from "lucide-react";
import FileUpload, {
  acceptedDocumentExtensions,
  validateDocumentFile,
} from "./FileUpload";
import StatusBadge from "./StatusBadge";
import type { DocumentStatus, StudentDocument } from "../types/dashboard";

type DocumentFilter = "all" | DocumentStatus;

interface DocumentsCardProps {
  documents: StudentDocument[];
  isLoading: boolean;
  isUploading: boolean;
  deletingDocumentId: string | null;
  replacingDocumentId: string | null;
  downloadingDocumentId: string | null;
  error: string;
  successMessage: string;
  onUpload: (documentName: string, file: File) => Promise<void>;
  onReplace: (document: StudentDocument, file: File) => Promise<void>;
  onOpen: (document: StudentDocument) => Promise<void>;
  onDownload: (document: StudentDocument) => Promise<void>;
  onRemove: (document: StudentDocument) => Promise<void>;
  onRefresh: () => Promise<void>;
  onClearFeedback: () => void;
}

const filterOptions: Array<{ value: DocumentFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function formatFileSize(fileSize: number | null): string {
  if (!fileSize) {
    return "Unknown size";
  }

  if (fileSize < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSize / 1024))} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function DocumentsCard({
  documents,
  isLoading,
  isUploading,
  deletingDocumentId,
  replacingDocumentId,
  downloadingDocumentId,
  error,
  successMessage,
  onUpload,
  onReplace,
  onOpen,
  onDownload,
  onRemove,
  onRefresh,
  onClearFeedback,
}: DocumentsCardProps) {
  const replacementInputRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState<DocumentFilter>("all");
  const [replacementTarget, setReplacementTarget] =
    useState<StudentDocument | null>(null);
  const [replacementError, setReplacementError] = useState("");

  const counts = useMemo(
    () => ({
      all: documents.length,
      pending: documents.filter((item) => item.status === "pending").length,
      approved: documents.filter((item) => item.status === "approved").length,
      rejected: documents.filter((item) => item.status === "rejected").length,
    }),
    [documents],
  );

  const filteredDocuments = useMemo(
    () =>
      activeFilter === "all"
        ? documents
        : documents.filter((document) => document.status === activeFilter),
    [activeFilter, documents],
  );

  function startReplacement(document: StudentDocument) {
    setReplacementTarget(document);
    setReplacementError("");
    replacementInputRef.current?.click();
  }

  async function handleReplacementFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const document = replacementTarget;

    event.target.value = "";

    if (!file || !document) {
      return;
    }

    const validationError = validateDocumentFile(file);

    if (validationError) {
      setReplacementError(validationError);
      return;
    }

    try {
      await onReplace(document, file);
      setReplacementTarget(null);
      setReplacementError("");
    } catch {
      // The hook displays the service error.
    }
  }

  async function confirmRemoval(document: StudentDocument) {
    const confirmed = window.confirm(
      `Delete “${document.name}”? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await onRemove(document);
    } catch {
      // The hook displays the service error.
    }
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 md:p-8">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
            Documents
          </p>

          <h2 className="mt-2 break-words text-3xl font-black">
            Required Files
          </h2>

          <p className="mt-3 max-w-2xl break-words leading-7 text-slate-500">
            Upload, review, replace, download, and manage the documents your
            advisor needs for your admission pathway.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isLoading}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-[#0F2747] disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={isLoading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-3">
        <div className="min-w-0 rounded-2xl bg-amber-50 p-4">
          <p className="break-words text-sm font-bold text-amber-800">
            Pending review
          </p>
          <p className="mt-1 text-2xl font-black text-amber-950">
            {counts.pending}
          </p>
        </div>

        <div className="min-w-0 rounded-2xl bg-emerald-50 p-4">
          <p className="break-words text-sm font-bold text-emerald-800">
            Approved
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-950">
            {counts.approved}
          </p>
        </div>

        <div className="min-w-0 rounded-2xl bg-red-50 p-4">
          <p className="break-words text-sm font-bold text-red-800">
            Needs attention
          </p>
          <p className="mt-1 text-2xl font-black text-red-950">
            {counts.rejected}
          </p>
        </div>
      </div>

      {(successMessage || error) && (
        <div
          className={`mt-6 flex min-w-0 items-start gap-3 overflow-hidden rounded-2xl border p-4 text-sm leading-6 ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
          role={error ? "alert" : "status"}
        >
          {error ? (
            <XCircle className="mt-0.5 shrink-0" size={19} />
          ) : (
            <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
          )}

          <p className="min-w-0 flex-1 break-words">
            {error || successMessage}
          </p>

          <button
            type="button"
            onClick={onClearFeedback}
            className="shrink-0 font-black underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
          <FileUpload
            isUploading={isUploading}
            onUpload={onUpload}
          />
        </div>

        <div className="min-w-0 overflow-hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex shrink-0 items-center gap-2 text-sm font-black text-slate-600">
              <Filter size={16} />
              Filter:
            </span>

            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setActiveFilter(option.value)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  activeFilter === option.value
                    ? "bg-[#0F2747] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label} ({counts[option.value]})
              </button>
            ))}
          </div>

          {replacementError && (
            <p className="mt-4 break-words rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {replacementError}
            </p>
          )}

          <input
            ref={replacementInputRef}
            type="file"
            accept={acceptedDocumentExtensions}
            onChange={handleReplacementFile}
            className="hidden"
          />

          <div className="mt-4 min-w-0 space-y-4">
            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 p-6 text-sm font-semibold text-slate-500">
                Loading your documents...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                <FileText
                  className="mx-auto text-slate-400"
                  size={32}
                />

                <p className="mt-3 break-words font-black text-[#071526]">
                  {documents.length === 0
                    ? "No documents uploaded yet"
                    : `No ${activeFilter} documents`}
                </p>

                <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                  {documents.length === 0
                    ? "Use the uploader to add your first document."
                    : "Choose another filter to view your other files."}
                </p>
              </div>
            ) : (
              filteredDocuments.map((document) => {
                const isDeleting = deletingDocumentId === document.id;
                const isReplacing = replacingDocumentId === document.id;
                const isDownloading = downloadingDocumentId === document.id;
                const isBusy = isDeleting || isReplacing || isDownloading;

                return (
                  <article
                    key={document.id}
                    className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 p-4 sm:p-5"
                  >
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4F7FA] text-[#0F2747]">
                        <FileText size={22} />
                      </div>

                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p
                              className="block w-full truncate font-black text-[#071526]"
                              title={document.name}
                            >
                              {document.name}
                            </p>

                            <p
                              className="mt-1 block w-full truncate text-sm text-slate-500"
                              title={document.file_name}
                            >
                              {document.file_name} ·{" "}
                              {formatFileSize(document.file_size)}
                            </p>

                            <p className="mt-1 break-words text-xs font-semibold text-slate-400">
                              Uploaded {formatDate(document.created_at)}
                              {document.updated_at !== document.created_at
                                ? ` · Updated ${formatDate(document.updated_at)}`
                                : ""}
                            </p>
                          </div>

                          <div className="shrink-0">
                            <StatusBadge status={document.status} />
                          </div>
                        </div>

                        {document.status === "rejected" && (
                          <div className="mt-3 min-w-0 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                            <p className="font-black">Advisor feedback</p>

                            <p className="mt-1 break-words">
                              {document.rejection_reason ||
                                "This file needs to be replaced. Contact your advisor for details."}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void onOpen(document)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                          >
                            <Eye size={16} />
                            Preview
                          </button>

                          <button
                            type="button"
                            onClick={() => void onDownload(document)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-[#0F2747] disabled:opacity-50"
                          >
                            <Download size={16} />
                            {isDownloading ? "Downloading..." : "Download"}
                          </button>

                          <button
                            type="button"
                            onClick={() => startReplacement(document)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#C8A24A]/50 px-4 py-2.5 text-sm font-black text-[#8A6A1F] disabled:opacity-50"
                          >
                            <Replace size={16} />
                            {isReplacing ? "Replacing..." : "Replace"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void confirmRemoval(document)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-black text-red-700 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                            {isDeleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}