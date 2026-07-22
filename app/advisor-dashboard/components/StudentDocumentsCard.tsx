"use client";

import {
  CheckCircle2,
  Clock3,
  FileText,
  Upload,
  XCircle,
} from "lucide-react";

export type DocumentStatus =
  | "approved"
  | "pending"
  | "missing"
  | "rejected";

export interface StudentDocument {
  id: string;
  name: string;
  status: DocumentStatus;
  uploadedAt?: string | null;
}

interface StudentDocumentsCardProps {
  documents?: StudentDocument[];
  onUploadClick?: () => void;
}

const DEFAULT_DOCUMENTS: StudentDocument[] = [
  {
    id: "passport",
    name: "Passport",
    status: "approved",
    uploadedAt: "2026-07-12",
  },
  {
    id: "transcript",
    name: "Academic Transcript",
    status: "approved",
    uploadedAt: "2026-07-12",
  },
  {
    id: "recommendation",
    name: "Recommendation Letter",
    status: "pending",
    uploadedAt: "2026-07-15",
  },
  {
    id: "financial",
    name: "Financial Statement",
    status: "missing",
  },
  {
    id: "english",
    name: "English Proficiency",
    status: "missing",
  },
  {
    id: "visa",
    name: "Visa Documents",
    status: "missing",
  },
];

function statusColor(status: DocumentStatus) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function statusLabel(status: DocumentStatus) {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending Review";
    case "rejected":
      return "Rejected";
    default:
      return "Missing";
  }
}

function StatusIcon({
  status,
}: {
  status: DocumentStatus;
}) {
  switch (status) {
    case "approved":
      return (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      );

    case "pending":
      return (
        <Clock3 className="h-5 w-5 text-amber-600" />
      );

    case "rejected":
      return (
        <XCircle className="h-5 w-5 text-red-600" />
      );

    default:
      return (
        <FileText className="h-5 w-5 text-slate-400" />
      );
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Not uploaded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function StudentDocumentsCard({
  documents = DEFAULT_DOCUMENTS,
  onUploadClick,
}: StudentDocumentsCardProps) {
  const approved = documents.filter(
    (d) => d.status === "approved",
  ).length;

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C8A24A]">
            Documents
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#071526]">
            Student Documents
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {approved} of {documents.length} required documents approved.
          </p>
        </div>

        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#173B68]"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      </div>

      <div className="mt-8 w-full overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full whitespace-nowrap">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                Document
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                Status
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                Uploaded
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {documents.map((document) => (
              <tr
                key={document.id}
                className="transition hover:bg-slate-50"
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={document.status} />

                    <span className="font-semibold text-[#071526]">
                      {document.name}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-5">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${statusColor(
                      document.status,
                    )}`}
                  >
                    {statusLabel(document.status)}
                  </span>
                </td>

                <td className="px-6 py-5 text-sm text-slate-500">
                  {formatDate(document.uploadedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
