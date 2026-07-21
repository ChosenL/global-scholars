import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "../types/dashboard";

function calculateDurationMinutes(
  startTime: string,
  endTime: string,
): number {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Please provide a valid appointment date and time.");
  }

  const durationMinutes = Math.round(
    (end.getTime() - start.getTime()) / 60_000,
  );

  if (durationMinutes <= 0) {
    throw new Error("The appointment end time must be after the start time.");
  }

  if (durationMinutes > 240) {
    throw new Error("Appointments cannot be longer than four hours.");
  }

  return durationMinutes;
}

function validateMeetingDetails(
  meetingType: CreateAppointmentInput["meeting_type"],
  location?: string,
): void {
  if (meetingType === "in_person" && !location?.trim()) {
    throw new Error(
      "Please provide a location for an in-person appointment.",
    );
  }
}

export async function listStudentAppointments(
  supabase: SupabaseClient,
  studentId: string,
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("student_id", studentId)
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Appointment[];
}

export async function createStudentAppointment(
  supabase: SupabaseClient,
  studentId: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const title = input.title.trim();

  if (title.length < 2) {
    throw new Error("The appointment title must contain at least two characters.");
  }

  validateMeetingDetails(input.meeting_type, input.location);

  const durationMinutes = calculateDurationMinutes(
    input.start_time,
    input.end_time,
  );

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      student_id: studentId,
      advisor_id: null,
      advisor_name: null,

      title,
      description: input.description?.trim() || null,

      start_time: input.start_time,
      end_time: input.end_time,
      duration_minutes: durationMinutes,

      meeting_type: input.meeting_type,
      meeting_url: input.meeting_url?.trim() || null,
      location: input.location?.trim() || null,

      calendly_event_uri: null,

      notes: input.notes?.trim() || null,
      advisor_notes: null,

      status: "requested",

      cancelled_at: null,
      cancellation_reason: null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Appointment;
}

export async function updateStudentAppointment(
  supabase: SupabaseClient,
  studentId: string,
  appointmentId: string,
  input: UpdateAppointmentInput,
): Promise<Appointment> {
  const updatePayload: Record<string, string | number | null> = {};

  if (input.title !== undefined) {
    const title = input.title.trim();

    if (title.length < 2) {
      throw new Error(
        "The appointment title must contain at least two characters.",
      );
    }

    updatePayload.title = title;
  }

  if (input.description !== undefined) {
    updatePayload.description = input.description.trim() || null;
  }

  if (input.meeting_type !== undefined) {
    validateMeetingDetails(input.meeting_type, input.location);
    updatePayload.meeting_type = input.meeting_type;
  }

  if (input.meeting_url !== undefined) {
    updatePayload.meeting_url = input.meeting_url.trim() || null;
  }

  if (input.location !== undefined) {
    updatePayload.location = input.location.trim() || null;
  }

  if (input.notes !== undefined) {
    updatePayload.notes = input.notes.trim() || null;
  }

  if (input.status !== undefined) {
    updatePayload.status = input.status;
  }

  if (input.start_time !== undefined || input.end_time !== undefined) {
    const { data: currentAppointment, error: currentAppointmentError } =
      await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("id", appointmentId)
        .eq("student_id", studentId)
        .single();

    if (currentAppointmentError) {
      throw currentAppointmentError;
    }

    const nextStartTime =
      input.start_time ?? currentAppointment.start_time;

    const nextEndTime =
      input.end_time ?? currentAppointment.end_time;

    const durationMinutes = calculateDurationMinutes(
      nextStartTime,
      nextEndTime,
    );

    updatePayload.start_time = nextStartTime;
    updatePayload.end_time = nextEndTime;
    updatePayload.duration_minutes = durationMinutes;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new Error("No appointment changes were provided.");
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .update(updatePayload)
    .eq("id", appointmentId)
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Appointment;
}

export async function rescheduleStudentAppointment(
  supabase: SupabaseClient,
  studentId: string,
  appointmentId: string,
  startTime: string,
  endTime: string,
): Promise<Appointment> {
  const durationMinutes = calculateDurationMinutes(startTime, endTime);

  const { data, error } = await supabase
    .from("appointments")
    .update({
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      status: "rescheduled",
      cancelled_at: null,
      cancellation_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Appointment;
}

export async function cancelStudentAppointment(
  supabase: SupabaseClient,
  studentId: string,
  appointmentId: string,
  cancellationReason?: string,
): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancellationReason?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .eq("student_id", studentId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Appointment;
}

export async function deleteStudentAppointment(
  supabase: SupabaseClient,
  studentId: string,
  appointmentId: string,
): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .eq("student_id", studentId);

  if (error) {
    throw error;
  }
}