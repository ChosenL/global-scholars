"use client";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  History,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  User,
  Video,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  Appointment,
  CreateAppointmentInput,
  MeetingType,
} from "../types/dashboard";
import { useAppointments } from "../hooks/useAppointments";
import AppointmentModal from "./AppointmentModal";

type AppointmentTab = "upcoming" | "past" | "cancelled";

interface AppointmentListCardProps {
  appointment: Appointment;
  isUpdating: boolean;
  isCancelling: boolean;
  isDeleting: boolean;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => Promise<void>;
  onDelete: (appointment: Appointment) => Promise<void>;
}

interface EmptyStateProps {
  tab: AppointmentTab;
  onBook: () => void;
}

const tabs: Array<{
  id: AppointmentTab;
  label: string;
  icon: typeof CalendarDays;
}> = [
  { id: "upcoming", label: "Upcoming", icon: CalendarDays },
  { id: "past", label: "Previous", icon: History },
  { id: "cancelled", label: "Cancelled", icon: XCircle },
];

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

function formatAppointmentTime(startValue: string, endValue: string): string {
  const startDate = new Date(startValue);
  const endDate = new Date(endValue);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "Time unavailable";
  }

  const startFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const endFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${startFormatter.format(startDate)} – ${endFormatter.format(endDate)}`;
}

function formatMeetingType(meetingType: MeetingType): string {
  switch (meetingType) {
    case "phone":
      return "Phone consultation";
    case "in_person":
      return "In-person consultation";
    case "video":
    default:
      return "Video consultation";
  }
}

function getStatusLabel(status: Appointment["status"]): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

function getStatusClassName(status: Appointment["status"]): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-700";
    case "completed":
      return "bg-blue-100 text-blue-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function MeetingTypeIcon({ meetingType }: { meetingType: MeetingType }) {
  switch (meetingType) {
    case "phone":
      return <Phone size={18} />;
    case "in_person":
      return <MapPin size={18} />;
    case "video":
    default:
      return <Video size={18} />;
  }
}

function AppointmentListCard({
  appointment,
  isUpdating,
  isCancelling,
  isDeleting,
  onReschedule,
  onCancel,
  onDelete,
}: AppointmentListCardProps) {
  const isBusy = isUpdating || isCancelling || isDeleting;
  const canManage =
    appointment.status !== "cancelled" &&
    appointment.status !== "completed";

  const meetingDestination =
    appointment.meeting_url ||
    (appointment.meeting_type === "in_person"
      ? appointment.location
      : null);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClassName(
                  appointment.status,
                )}`}
              >
                {getStatusLabel(appointment.status)}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {formatMeetingType(appointment.meeting_type)}
              </span>
            </div>

            <h3 className="mt-4 text-xl font-black text-[#071526] sm:text-2xl">
              {appointment.title}
            </h3>

            {appointment.description ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {appointment.description}
              </p>
            ) : null}
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F2747] text-[#C8A24A]">
            <MeetingTypeIcon meetingType={appointment.meeting_type} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className="flex gap-3 rounded-2xl bg-[#F4F7FA] p-4">
          <CalendarDays size={19} className="mt-0.5 shrink-0 text-[#0F2747]" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Date</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
              {formatAppointmentDate(appointment.start_time)}
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-2xl bg-[#F4F7FA] p-4">
          <Clock3 size={19} className="mt-0.5 shrink-0 text-[#0F2747]" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Time</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
              {formatAppointmentTime(appointment.start_time, appointment.end_time)}
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-2xl bg-[#F4F7FA] p-4">
          <User size={19} className="mt-0.5 shrink-0 text-[#0F2747]" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Advisor</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-700">
              {appointment.advisor_name || "Global Scholars Advisor"}
            </p>
          </div>
        </div>

        <div className="flex gap-3 rounded-2xl bg-[#F4F7FA] p-4">
          <div className="mt-0.5 shrink-0 text-[#0F2747]">
            <MeetingTypeIcon meetingType={appointment.meeting_type} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Meeting</p>
            <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-700">
              {meetingDestination || formatMeetingType(appointment.meeting_type)}
            </p>
          </div>
        </div>
      </div>

      {appointment.notes ? (
        <div className="mx-5 mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:mx-6 sm:mb-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Your notes</p>
          <p className="mt-2 text-sm leading-6 text-amber-950">{appointment.notes}</p>
        </div>
      ) : null}

      {appointment.advisor_notes ? (
        <div className="mx-5 mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:mx-6 sm:mb-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Advisor notes</p>
          <p className="mt-2 text-sm leading-6 text-blue-950">{appointment.advisor_notes}</p>
        </div>
      ) : null}

      {appointment.status === "cancelled" && appointment.cancellation_reason ? (
        <div className="mx-5 mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 sm:mx-6 sm:mb-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Cancellation reason</p>
          <p className="mt-2 text-sm leading-6 text-red-800">{appointment.cancellation_reason}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 p-5 sm:flex-row sm:flex-wrap sm:items-center sm:p-6">
        {appointment.meeting_url && canManage ? (
          <a
            href={appointment.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-4 py-3 text-sm font-black text-white transition hover:bg-[#173A68]"
          >
            <ExternalLink size={17} />
            Join Meeting
          </a>
        ) : null}

        {canManage ? (
          <>
            <button
              type="button"
              onClick={() => onReschedule(appointment)}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-[#C8A24A] hover:text-[#8A6A1F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? <Loader2 size={17} className="animate-spin" /> : <RotateCcw size={17} />}
              Reschedule
            </button>

            <button
              type="button"
              onClick={() => void onCancel(appointment)}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCancelling ? <Loader2 size={17} className="animate-spin" /> : <XCircle size={17} />}
              Cancel
            </button>
          </>
        ) : null}

        {appointment.status === "cancelled" ? (
          <button
            type="button"
            onClick={() => void onDelete(appointment)}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto"
          >
            {isDeleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
}

function EmptyState({ tab, onBook }: EmptyStateProps) {
  const content = {
    upcoming: {
      icon: CalendarDays,
      title: "No upcoming appointments",
      description: "Book a consultation to speak with a Global Scholars advisor about your next steps.",
    },
    past: {
      icon: History,
      title: "No previous appointments",
      description: "Your completed and previous consultations will appear here.",
    },
    cancelled: {
      icon: XCircle,
      title: "No cancelled appointments",
      description: "Appointments you cancel will be kept here until you choose to delete them.",
    },
  }[tab];

  const Icon = content.icon;

  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-[#0F2747] shadow-sm">
        <Icon size={29} />
      </div>
      <h3 className="mt-5 text-xl font-black text-[#071526]">{content.title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{content.description}</p>
      {tab === "upcoming" ? (
        <button
          type="button"
          onClick={onBook}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173A68]"
        >
          <Plus size={18} />
          Book Appointment
        </button>
      ) : null}
    </div>
  );
}

export default function AppointmentsSection() {
  const {
    upcomingAppointments,
    pastAppointments,
    cancelledAppointments,
    isLoading,
    isCreating,
    updatingAppointmentId,
    cancellingAppointmentId,
    deletingAppointmentId,
    error,
    successMessage,
    refreshAppointments,
    createAppointment,
    rescheduleAppointment,
    cancelAppointment,
    deleteAppointment,
    clearFeedback,
  } = useAppointments();

  const [activeTab, setActiveTab] = useState<AppointmentTab>("upcoming");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "reschedule">("create");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const visibleAppointments = useMemo(() => {
    switch (activeTab) {
      case "past":
        return pastAppointments;
      case "cancelled":
        return cancelledAppointments;
      case "upcoming":
      default:
        return upcomingAppointments;
    }
  }, [activeTab, cancelledAppointments, pastAppointments, upcomingAppointments]);

  const totalAppointments =
    upcomingAppointments.length +
    pastAppointments.length +
    cancelledAppointments.length;

  function openCreateModal(): void {
    clearFeedback();
    setSelectedAppointment(null);
    setModalMode("create");
    setIsModalOpen(true);
  }

  function openRescheduleModal(appointment: Appointment): void {
    clearFeedback();
    setSelectedAppointment(appointment);
    setModalMode("reschedule");
    setIsModalOpen(true);
  }

  function closeModal(): void {
    if (isCreating || selectedAppointment?.id === updatingAppointmentId) {
      return;
    }

    setIsModalOpen(false);
    setSelectedAppointment(null);
  }

  async function handleCreate(input: CreateAppointmentInput): Promise<void> {
    await createAppointment(input);
    setActiveTab("upcoming");
  }

  async function handleReschedule(
    appointmentId: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    await rescheduleAppointment({ appointmentId, startTime, endTime });
    setActiveTab("upcoming");
  }

  async function handleCancel(appointment: Appointment): Promise<void> {
    const confirmed = window.confirm(
      `Cancel “${appointment.title}”? This action will move it to your cancelled appointments.`,
    );

    if (!confirmed) {
      return;
    }

    const cancellationReason =
      window
        .prompt(
          "You may provide a cancellation reason. Leave this blank to continue without one.",
        )
        ?.trim() || undefined;

    try {
      await cancelAppointment({
        appointmentId: appointment.id,
        cancellationReason,
      });
    } catch {
      return;
    }
  }

  async function handleDelete(appointment: Appointment): Promise<void> {
    const confirmed = window.confirm(
      `Permanently delete “${appointment.title}”? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAppointment(appointment.id);
    } catch {
      return;
    }
  }

  return (
    <>
      <section
        id="appointments"
        className="scroll-mt-28 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#C8A24A]">Appointments</p>
            <h2 className="mt-2 text-3xl font-black text-[#071526]">Advisor Consultations</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Book and manage consultations with your Global Scholars advisor.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void refreshAppointments()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={17} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173A68]"
            >
              <Plus size={18} />
              Book Appointment
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-[#0F2747] p-5 text-white">
            <p className="text-sm font-semibold text-white/60">Total appointments</p>
            <p className="mt-2 text-3xl font-black text-[#C8A24A]">{totalAppointments}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-700">Upcoming</p>
            <p className="mt-2 text-3xl font-black text-emerald-800">{upcomingAppointments.length}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-700">Previous</p>
            <p className="mt-2 text-3xl font-black text-blue-800">{pastAppointments.length}</p>
          </div>
          <div className="rounded-2xl bg-red-50 p-5">
            <p className="text-sm font-semibold text-red-700">Cancelled</p>
            <p className="mt-2 text-3xl font-black text-red-800">{cancelledAppointments.length}</p>
          </div>
        </div>

        {successMessage ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
              <p>{successMessage}</p>
              <button
                type="button"
                onClick={clearFeedback}
                className="shrink-0 text-emerald-700 transition hover:text-emerald-900"
                aria-label="Dismiss success message"
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
              <p>{error}</p>
              <button
                type="button"
                onClick={clearFeedback}
                className="shrink-0 text-red-700 transition hover:text-red-900"
                aria-label="Dismiss error message"
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-7 overflow-x-auto">
          <div className="inline-flex min-w-full gap-2 rounded-2xl bg-[#F4F7FA] p-2 sm:min-w-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const count =
                tab.id === "upcoming"
                  ? upcomingAppointments.length
                  : tab.id === "past"
                    ? pastAppointments.length
                    : cancelledAppointments.length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-black transition ${
                    activeTab === tab.id
                      ? "bg-white text-[#071526] shadow-sm"
                      : "text-slate-500 hover:text-[#071526]"
                  }`}
                >
                  <Icon size={17} />
                  {tab.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      activeTab === tab.id
                        ? "bg-[#C8A24A]/20 text-[#8A6A1F]"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7">
          {isLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 px-6 py-14 text-center">
              <Loader2 size={32} className="animate-spin text-[#0F2747]" />
              <p className="mt-4 font-black text-[#071526]">Loading appointments...</p>
              <p className="mt-2 text-sm text-slate-500">
                Please wait while we retrieve your consultation records.
              </p>
            </div>
          ) : visibleAppointments.length === 0 ? (
            <EmptyState tab={activeTab} onBook={openCreateModal} />
          ) : (
            <div className="space-y-5">
              {visibleAppointments.map((appointment) => (
                <AppointmentListCard
                  key={appointment.id}
                  appointment={appointment}
                  isUpdating={updatingAppointmentId === appointment.id}
                  isCancelling={cancellingAppointmentId === appointment.id}
                  isDeleting={deletingAppointmentId === appointment.id}
                  onReschedule={openRescheduleModal}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <AppointmentModal
        isOpen={isModalOpen}
        mode={modalMode}
        appointment={selectedAppointment}
        isSubmitting={
          modalMode === "create"
            ? isCreating
            : selectedAppointment?.id === updatingAppointmentId
        }
        onClose={closeModal}
        onCreate={handleCreate}
        onReschedule={handleReschedule}
      />
    </>
  );
}