"use client";

import {
  CalendarDays,
  Clock3,
  ExternalLink,
  MapPin,
  Monitor,
  Phone,
  RefreshCw,
  Trash2,
  UserRound,
  Video,
  XCircle,
} from "lucide-react";
import type {
  Appointment,
  AppointmentStatus,
  MeetingType,
} from "../types/dashboard";

interface AppointmentCardProps {
  appointment: Appointment;
  isUpdating?: boolean;
  isCancelling?: boolean;
  isDeleting?: boolean;
  onReschedule?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
}

const statusStyles: Record<AppointmentStatus, string> = {
  requested: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  completed: "border-blue-200 bg-blue-50 text-blue-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  rescheduled: "border-violet-200 bg-violet-50 text-violet-800",
};

const statusLabels: Record<AppointmentStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

const meetingTypeLabels: Record<MeetingType, string> = {
  video: "Video meeting",
  phone: "Phone call",
  in_person: "In-person meeting",
};

function formatAppointmentDate(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatAppointmentTime(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function MeetingTypeIcon({
  meetingType,
  size = 14,
  className,
}: {
  meetingType: MeetingType;
  size?: number;
  className?: string;
}) {
  if (meetingType === "phone") {
    return <Phone size={size} className={className} />;
  }

  if (meetingType === "in_person") {
    return <MapPin size={size} className={className} />;
  }

  return <Video size={size} className={className} />;
}

function canManageAppointment(status: AppointmentStatus): boolean {
  return (
    status === "requested" ||
    status === "confirmed" ||
    status === "rescheduled"
  );
}

export default function AppointmentCard({
  appointment,
  isUpdating = false,
  isCancelling = false,
  isDeleting = false,
  onReschedule,
  onCancel,
  onDelete,
}: AppointmentCardProps) {
  const isBusy = isUpdating || isCancelling || isDeleting;
  const isManageable = canManageAppointment(appointment.status);

  const advisorName =
    appointment.advisor_name?.trim() || "Advisor to be assigned";

  const startTime = formatAppointmentTime(appointment.start_time);
  const endTime = formatAppointmentTime(appointment.end_time);

  const duration =
    appointment.duration_minutes &&
    appointment.duration_minutes > 0
      ? `${appointment.duration_minutes} minutes`
      : null;

  const meetingDetail =
    appointment.meeting_type === "in_person"
      ? appointment.location?.trim() || "Location to be confirmed"
      : appointment.meeting_type === "phone"
        ? "Your advisor will contact you"
        : appointment.meeting_url
          ? "Online meeting link available"
          : "Meeting link to be provided";

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-1.5 bg-gradient-to-r from-[#0F2747] via-[#1D4E89] to-[#C8A24A]" />

      <div className="p-5 sm:p-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusStyles[appointment.status]}`}
              >
                {statusLabels[appointment.status]}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                <MeetingTypeIcon
                  meetingType={appointment.meeting_type}
                  size={14}
                />

                {meetingTypeLabels[appointment.meeting_type]}
              </span>
            </div>

            <h3 className="mt-4 break-words text-xl font-black text-[#0F2747] sm:text-2xl">
              {appointment.title}
            </h3>

            {appointment.description && (
              <p className="mt-2 break-words leading-7 text-slate-500">
                {appointment.description}
              </p>
            )}
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F2747] text-white shadow-sm">
            <CalendarDays size={22} />
          </div>
        </div>

        <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <CalendarDays
              size={19}
              className="mt-0.5 shrink-0 text-[#C8A24A]"
            />

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Date
              </p>

              <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {formatAppointmentDate(appointment.start_time)}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <Clock3
              size={19}
              className="mt-0.5 shrink-0 text-[#C8A24A]"
            />

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Time
              </p>

              <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {startTime} – {endTime}
              </p>

              {duration && (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {duration}
                </p>
              )}
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <UserRound
              size={19}
              className="mt-0.5 shrink-0 text-[#C8A24A]"
            />

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Advisor
              </p>

              <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {advisorName}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 p-4">
            <Monitor
              size={19}
              className="mt-0.5 shrink-0 text-[#C8A24A]"
            />

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Meeting details
              </p>

              <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {meetingDetail}
              </p>
            </div>
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              Your notes
            </p>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
              {appointment.notes}
            </p>
          </div>
        )}

        {appointment.advisor_notes && (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
              Advisor notes
            </p>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-blue-900">
              {appointment.advisor_notes}
            </p>
          </div>
        )}

        {appointment.status === "cancelled" &&
          appointment.cancellation_reason && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <XCircle
                size={19}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div className="min-w-0">
                <p className="text-sm font-black text-red-800">
                  Cancellation reason
                </p>

                <p className="mt-1 break-words text-sm leading-6 text-red-700">
                  {appointment.cancellation_reason}
                </p>
              </div>
            </div>
          )}

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap">
          {appointment.meeting_url &&
            appointment.meeting_type === "video" &&
            appointment.status !== "cancelled" && (
              <a
                href={appointment.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-4 py-3 text-sm font-black text-white transition hover:bg-[#163A68]"
              >
                <ExternalLink size={17} />
                Join Meeting
              </a>
            )}

          {isManageable && onReschedule && (
            <button
              type="button"
              onClick={() => onReschedule(appointment)}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-[#0F2747] transition hover:border-[#C8A24A] hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={isUpdating ? "animate-spin" : ""}
              />

              {isUpdating ? "Rescheduling..." : "Reschedule"}
            </button>
          )}

          {isManageable && onCancel && (
            <button
              type="button"
              onClick={() => onCancel(appointment)}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <XCircle
                size={17}
                className={isCancelling ? "animate-pulse" : ""}
              />

              {isCancelling ? "Cancelling..." : "Cancel"}
            </button>
          )}

          {onDelete &&
            (appointment.status === "cancelled" ||
              appointment.status === "completed") && (
              <button
                type="button"
                onClick={() => onDelete(appointment)}
                disabled={isBusy}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
              >
                <Trash2
                  size={17}
                  className={isDeleting ? "animate-pulse" : ""}
                />

                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
        </div>
      </div>
    </article>
  );
}