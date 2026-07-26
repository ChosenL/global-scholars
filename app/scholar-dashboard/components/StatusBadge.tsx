import type { StudentDocumentStatus } from "../types/dashboard";

interface StatusBadgeProps {
  status: StudentDocumentStatus;
}

const statusStyles: Record<StudentDocumentStatus, string> = {
  uploaded: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  needs_revision: "bg-orange-100 text-orange-700",
  expired: "bg-slate-200 text-slate-700",
};

const statusLabels: Record<StudentDocumentStatus, string> = {
  uploaded: "Uploaded",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  needs_revision: "Needs Revision",
  expired: "Expired",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
