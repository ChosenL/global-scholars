"use client";

import {
  Calendar,
  Clock3,
  MapPin,
  Plus,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";

export interface StudentAppointment {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  meetingType: "virtual" | "in-person";
}

interface StudentAppointmentsCardProps {
  appointments?: StudentAppointment[];
  onCreateAppointment?: (
    appointment: Omit<StudentAppointment, "id">,
  ) => void;
}

const DEFAULT_APPOINTMENTS: StudentAppointment[] = [
  {
    id: "1",
    title: "Initial Consultation",
    date: "2026-07-20",
    time: "10:00 AM",
    meetingType: "virtual",
    location: "Google Meet",
  },
  {
    id: "2",
    title: "Document Review",
    date: "2026-07-28",
    time: "2:00 PM",
    meetingType: "in-person",
    location: "Main Office",
  },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function StudentAppointmentsCard({
  appointments = DEFAULT_APPOINTMENTS,
  onCreateAppointment,
}: StudentAppointmentsCardProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [meetingType, setMeetingType] = useState<
    "virtual" | "in-person"
  >("virtual");
  const [location, setLocation] = useState("");

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (a, b) =>
          new Date(a.date).getTime() -
          new Date(b.date).getTime(),
      ),
    [appointments],
  );

  function handleCreateAppointment() {
    if (!title || !date || !time) return;

    onCreateAppointment?.({
      title,
      date,
      time,
      meetingType,
      location,
    });

    setTitle("");
    setDate("");
    setTime("");
    setLocation("");
    setMeetingType("virtual");
  }

  return (
    <section className="w-full min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#C8A24A]">
            Appointments
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#071526]">
            Student Schedule
          </h2>
        </div>

        <div className="rounded-xl bg-[#EEF3F8] px-4 py-2">
          <span className="font-black text-[#071526]">
            {appointments.length} Upcoming
          </span>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Appointment title"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C8A24A]"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C8A24A]"
          />

          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="10:00 AM"
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C8A24A]"
          />

          <select
            value={meetingType}
            onChange={(e) =>
              setMeetingType(
                e.target.value as "virtual" | "in-person",
              )
            }
            className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C8A24A]"
          >
            <option value="virtual">Virtual</option>
            <option value="in-person">In Person</option>
          </select>

          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Google Meet / Office"
            className="md:col-span-2 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C8A24A]"
          />
        </div>

        <button
          type="button"
          onClick={handleCreateAppointment}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0F2747] px-5 py-3 font-bold text-white transition hover:bg-[#173B68]"
        >
          <Plus className="h-4 w-4" />
          Schedule Appointment
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {sortedAppointments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-4 font-semibold text-slate-500">
              No appointments scheduled.
            </p>
          </div>
        ) : (
          sortedAppointments.map((appointment) => (
            <article
              key={appointment.id}
              className="rounded-2xl border border-slate-200 p-5 transition hover:border-[#C8A24A]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#071526]">
                    {appointment.title}
                  </h3>

                  <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(appointment.date)}
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      {appointment.time}
                    </div>

                    <div className="flex items-center gap-2">
                      {appointment.meetingType === "virtual" ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}

                      {appointment.location || "TBA"}
                    </div>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    appointment.meetingType === "virtual"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {appointment.meetingType === "virtual"
                    ? "Virtual"
                    : "In Person"}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
