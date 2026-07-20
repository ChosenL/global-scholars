import type { DocumentStatus } from "../types/dashboard";

interface StatusBadgeProps {
  status: DocumentStatus;
}

const statusStyles: Record<DocumentStatus, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

const statusLabels: Record<DocumentStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
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
