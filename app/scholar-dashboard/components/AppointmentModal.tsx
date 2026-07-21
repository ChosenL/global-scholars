"use client";

import {
  CalendarDays,
  Clock3,
  Loader2,
  MapPin,
  Phone,
  Video,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import type {
  Appointment,
  CreateAppointmentInput,
  MeetingType,
} from "../types/dashboard";

interface AppointmentModalProps {
  isOpen: boolean;
  mode: "create" | "reschedule";
  appointment?: Appointment | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onCreate: (
    input: CreateAppointmentInput,
  ) => Promise<void>;
  onReschedule: (
    appointmentId: string,
    startTime: string,
    endTime: string,
  ) => Promise<void>;
}

interface AppointmentFormState {
  title: string;
  description: string;
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: string;
  meetingType: MeetingType;
  location: string;
  notes: string;
}

const initialFormState: AppointmentFormState = {
  title: "",
  description: "",
  appointmentDate: "",
  appointmentTime: "",
  durationMinutes: "30",
  meetingType: "video",
  location: "",
  notes: "",
};

const durationOptions = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "1 hour" },
  { value: "90", label: "1 hour 30 minutes" },
  { value: "120", label: "2 hours" },
];

function formatDateInput(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTimeInput(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function getLocalDateTime(
  dateValue: string,
  timeValue: string,
): Date {
  return new Date(`${dateValue}T${timeValue}:00`);
}

function createFormState(
  appointment?: Appointment | null,
): AppointmentFormState {
  if (!appointment) {
    return initialFormState;
  }

  return {
    title: appointment.title,
    description: appointment.description ?? "",
    appointmentDate: formatDateInput(appointment.start_time),
    appointmentTime: formatTimeInput(appointment.start_time),
    durationMinutes: String(
      appointment.duration_minutes || 30,
    ),
    meetingType: appointment.meeting_type,
    location: appointment.location ?? "",
    notes: appointment.notes ?? "",
  };
}

function getMinimumDate(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AppointmentModal({
  isOpen,
  mode,
  appointment,
  isSubmitting = false,
  onClose,
  onCreate,
  onReschedule,
}: AppointmentModalProps) {
  const [form, setForm] = useState<AppointmentFormState>(
    initialFormState,
  );
  const [formError, setFormError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setForm(createFormState(appointment));
      setFormError(null);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [appointment, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, isSubmitting, onClose]);

  const modalTitle =
    mode === "create"
      ? "Book an Appointment"
      : "Reschedule Appointment";

  const modalDescription =
    mode === "create"
      ? "Request a consultation with a Global Scholars advisor."
      : "Choose a new date and time for your appointment.";

  const submitLabel =
    mode === "create"
      ? "Request Appointment"
      : "Save New Time";

  const selectedDateSummary = useMemo(() => {
    if (!form.appointmentDate || !form.appointmentTime) {
      return null;
    }

    const date = getLocalDateTime(
      form.appointmentDate,
      form.appointmentTime,
    );

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  }, [form.appointmentDate, form.appointmentTime]);

  if (!isOpen) {
    return null;
  }

  const updateField = <Key extends keyof AppointmentFormState>(
    field: Key,
    value: AppointmentFormState[Key],
  ): void => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setFormError(null);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setFormError(null);

    const title = form.title.trim();

    if (mode === "create" && title.length < 2) {
      setFormError(
        "Please enter an appointment title with at least two characters.",
      );
      return;
    }

    if (!form.appointmentDate || !form.appointmentTime) {
      setFormError("Please choose an appointment date and time.");
      return;
    }

    const startDate = getLocalDateTime(
      form.appointmentDate,
      form.appointmentTime,
    );

    if (Number.isNaN(startDate.getTime())) {
      setFormError("Please choose a valid appointment date and time.");
      return;
    }

    if (startDate.getTime() <= Date.now()) {
      setFormError(
        "Please choose an appointment time in the future.",
      );
      return;
    }

    const durationMinutes = Number(form.durationMinutes);

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 10 ||
      durationMinutes > 240
    ) {
      setFormError(
        "Please choose a valid appointment duration.",
      );
      return;
    }

    if (
      mode === "create" &&
      form.meetingType === "in_person" &&
      !form.location.trim()
    ) {
      setFormError(
        "Please provide a location for the in-person appointment.",
      );
      return;
    }

    const endDate = new Date(
      startDate.getTime() + durationMinutes * 60_000,
    );

    try {
      if (mode === "reschedule") {
        if (!appointment) {
          setFormError(
            "The appointment could not be found. Please try again.",
          );
          return;
        }

        await onReschedule(
          appointment.id,
          startDate.toISOString(),
          endDate.toISOString(),
        );

        onClose();
        return;
      }

      await onCreate({
        title,
        description: form.description.trim() || undefined,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        meeting_type: form.meetingType,
        location:
          form.meetingType === "in_person"
            ? form.location.trim()
            : undefined,
        notes: form.notes.trim() || undefined,
      });

      onClose();
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }

      setFormError(
        "Something went wrong while saving the appointment.",
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !isSubmitting
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-modal-title"
        className="max-h-[95vh] w-full overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[2rem]"
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F2747] text-white">
                <CalendarDays size={21} />
              </div>

              <h2
                id="appointment-modal-title"
                className="text-2xl font-black text-[#0F2747]"
              >
                {modalTitle}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {modalDescription}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close appointment form"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="space-y-6 p-5 sm:p-7"
        >
          {mode === "create" && (
            <>
              <div>
                <label
                  htmlFor="appointment-title"
                  className="text-sm font-black text-slate-800"
                >
                  Appointment title
                </label>

                <input
                  id="appointment-title"
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    updateField("title", event.target.value)
                  }
                  placeholder="Example: University application consultation"
                  maxLength={150}
                  disabled={isSubmitting}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C8A24A] focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="appointment-description"
                  className="text-sm font-black text-slate-800"
                >
                  Description
                  <span className="ml-1 font-medium text-slate-400">
                    Optional
                  </span>
                </label>

                <textarea
                  id="appointment-description"
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value,
                    )
                  }
                  placeholder="Briefly describe what you would like to discuss."
                  rows={3}
                  maxLength={1000}
                  disabled={isSubmitting}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C8A24A] focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </div>
            </>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="appointment-date"
                className="text-sm font-black text-slate-800"
              >
                Date
              </label>

              <div className="relative mt-2">
                <CalendarDays
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="appointment-date"
                  type="date"
                  min={getMinimumDate()}
                  value={form.appointmentDate}
                  onChange={(event) =>
                    updateField(
                      "appointmentDate",
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#C8A24A] focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="appointment-time"
                className="text-sm font-black text-slate-800"
              >
                Time
              </label>

              <div className="relative mt-2">
                <Clock3
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="appointment-time"
                  type="time"
                  value={form.appointmentTime}
                  onChange={(event) =>
                    updateField(
                      "appointmentTime",
                      event.target.value,
                    )
                  }
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#C8A24A] focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="appointment-duration"
              className="text-sm font-black text-slate-800"
            >
              Duration
            </label>

            <select
              id="appointment-duration"
              value={form.durationMinutes}
              onChange={(event) =>
                updateField(
                  "durationMinutes",
                  event.target.value,
                )
              }
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#C8A24A] focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100"
            >
              {durationOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {mode === "create" && (
            <>
              <fieldset>
                <legend className="text-sm font-black text-slate-800">
                  Meeting type
                </legend>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      updateField("meetingType", "video")
                    }
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition ${
                      form.meetingType === "video"
                        ? "border-[#0F2747] bg-[#0F2747] text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#C8A24A]"
                    }`}
                  >
                    <Video size={17} />
                    Video
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateField("meetingType", "phone")
                    }
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition ${
                      form.meetingType === "phone"
                        ? "border-[#0F2747] bg-[#0F2747] text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#C8A24A]"
                    }`}
                  >
                    <Phone size={17} />
                    Phone
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "meetingType",
                        "in_person",
                      )
                    }
                    disabled={isSubmitting}
                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition ${
                      form.meetingType === "in_person"
                        ? "border-[#0F2747] bg-[#0F2747] text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#C8A24A]"
                    }`}
                  >
                    <MapPin size={17} />
                    In person
                  </button>
                </div>
              </fieldset>

              {form.meetingType === "in_person" && (
                <div>
                  <label
                    htmlFor="appointment-location"
                    className="text-sm font-black text-slate-800"
                  >
                    Location
                  </label>

                  <div className="relative mt-2">
                    <MapPin
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="appointment-location"
                      type="text"
                      value={form.location}
                      onChange={(event) =>
                        updateField(
                          "location",
                          event.target.value,
                        )
                      }
                      placeholder="Enter the meeting location"
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C8A24A] focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="appointment-notes"
                  className="text-sm font-black text-slate-800"
                >
                  Notes for your advisor
                  <span className="ml-1 font-medium text-slate-400">
                    Optional
                  </span>
                </label>

                <textarea
                  id="appointment-notes"
                  value={form.notes}
                  onChange={(event) =>
                    updateField("notes", event.target.value)
                  }
                  placeholder="Add any questions, concerns, or information your advisor should know."
                  rows={4}
                  maxLength={1500}
                  disabled={isSubmitting}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#C8A24A] focus:ring-4 focus:ring-amber-100 disabled:bg-slate-100"
                />
              </div>
            </>
          )}

          {selectedDateSummary && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                Selected appointment
              </p>

              <p className="mt-2 text-sm font-bold leading-6 text-amber-950">
                {selectedDateSummary}
              </p>

              <p className="mt-1 text-xs font-semibold text-amber-800">
                Duration: {form.durationMinutes} minutes
              </p>
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700"
            >
              {formError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F2747] px-5 py-3 text-sm font-black text-white transition hover:bg-[#163A68] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              )}

              {isSubmitting ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}