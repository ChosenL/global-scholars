"use client";

import { Eye, FileText, Trash2 } from "lucide-react";
import FileUpload from "./FileUpload";
import StatusBadge from "./StatusBadge";
import type { StudentDocument } from "../types/dashboard";

interface DocumentsCardProps {
  documents: StudentDocument[];
  isLoading: boolean;
  isUploading: boolean;
  error: string;
  onUpload: (documentName: string, file: File) => Promise<void>;
  onOpen: (document: StudentDocument) => Promise<void>;
  onRemove: (document: StudentDocument) => Promise<void>;
}

function formatFileSize(fileSize: number | null): string {
  if (!fileSize) {
    return "Unknown size";
  }

  if (fileSize < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSize / 1024))} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsCard({
  documents,
  isLoading,
  isUploading,
  error,
  onUpload,
  onOpen,
  onRemove,
}: DocumentsCardProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">
          Documents
        </p>
        <h2 className="mt-2 text-3xl font-black">Required Files</h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-500">
          Upload and manage the documents your advisor needs to complete your
          admission pathway.
        </p>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <FileUpload isUploading={isUploading} onUpload={onUpload} />

        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 p-6 text-sm font-semibold text-slate-500">
              Loading your documents...
            </div>
          ) : documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <FileText className="mx-auto text-slate-400" size={32} />
              <p className="mt-3 font-black text-[#071526]">
                No documents uploaded yet
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Use the uploader to add your first document.
              </p>
            </div>
          ) : (
            documents.map((document) => (
              <article
                key={document.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4F7FA] text-[#0F2747]">
                    <FileText size={22} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#071526]">
                          {document.name}
                        </p>
                        <p className="mt-1 break-all text-sm text-slate-500">
                          {document.file_name} · {formatFileSize(document.file_size)}
                        </p>
                      </div>
                      <StatusBadge status={document.status} />
                    </div>

                    {document.status === "rejected" &&
                      document.rejection_reason && (
                        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                          {document.rejection_reason}
                        </p>
                      )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void onOpen(document)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-4 py-3 text-sm font-black text-white"
                      >
                        <Eye size={17} />
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => void onRemove(document)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-black text-red-700"
                      >
                        <Trash2 size={17} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              {error}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
