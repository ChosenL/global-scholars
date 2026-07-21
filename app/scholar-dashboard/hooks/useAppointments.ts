"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import type {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "../types/dashboard";
import {
  cancelStudentAppointment,
  createStudentAppointment,
  deleteStudentAppointment,
  listStudentAppointments,
  rescheduleStudentAppointment,
  updateStudentAppointment,
} from "../services/appointments";

interface RescheduleAppointmentInput {
  appointmentId: string;
  startTime: string;
  endTime: string;
}

interface CancelAppointmentInput {
  appointmentId: string;
  cancellationReason?: string;
}

interface UpdateAppointmentRequest {
  appointmentId: string;
  input: UpdateAppointmentInput;
}

interface UseAppointmentsResult {
  appointments: Appointment[];
  upcomingAppointments: Appointment[];
  pastAppointments: Appointment[];
  cancelledAppointments: Appointment[];

  isLoading: boolean;
  isCreating: boolean;
  updatingAppointmentId: string | null;
  cancellingAppointmentId: string | null;
  deletingAppointmentId: string | null;

  error: string;
  successMessage: string;

  refreshAppointments: () => Promise<void>;

  createAppointment: (
    input: CreateAppointmentInput,
  ) => Promise<Appointment>;

  updateAppointment: (
    request: UpdateAppointmentRequest,
  ) => Promise<Appointment>;

  rescheduleAppointment: (
    input: RescheduleAppointmentInput,
  ) => Promise<Appointment>;

  cancelAppointment: (
    input: CancelAppointmentInput,
  ) => Promise<Appointment>;

  deleteAppointment: (appointmentId: string) => Promise<void>;

  clearFeedback: () => void;
}

interface SupabaseErrorLike {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  error?: unknown;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    return error.message.trim() || fallback;
  }

  if (typeof error === "string") {
    return error.trim() || fallback;
  }

  if (error && typeof error === "object") {
    const candidate = error as SupabaseErrorLike;

    const message =
      readText(candidate.message) ||
      readText(candidate.error);

    const details = readText(candidate.details);
    const hint = readText(candidate.hint);
    const code = readText(candidate.code);

    const sections = [
      message,
      details,
      hint ? `Hint: ${hint}` : "",
      code ? `Code: ${code}` : "",
    ].filter(Boolean);

    if (sections.length > 0) {
      return sections.join(" ");
    }

    try {
      const serialized = JSON.stringify(error);

      if (serialized && serialized !== "{}") {
        return serialized;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function sortAppointments(
  appointments: Appointment[],
): Appointment[] {
  return [...appointments].sort(
    (first, second) =>
      new Date(first.start_time).getTime() -
      new Date(second.start_time).getTime(),
  );
}

function replaceAppointment(
  appointments: Appointment[],
  replacement: Appointment,
): Appointment[] {
  return sortAppointments(
    appointments.map((appointment) =>
      appointment.id === replacement.id
        ? replacement
        : appointment,
    ),
  );
}

export function useAppointments(): UseAppointmentsResult {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [updatingAppointmentId, setUpdatingAppointmentId] =
    useState<string | null>(null);

  const [cancellingAppointmentId, setCancellingAppointmentId] =
    useState<string | null>(null);

  const [deletingAppointmentId, setDeletingAppointmentId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  const requestIdRef = useRef(0);

  const userId = user?.id ?? null;
  const sessionId = session?.id ?? null;

  const clearFeedback = useCallback((): void => {
    setError("");
    setSuccessMessage("");
  }, []);

  const getSupabase = useCallback(() => {
    if (!session) {
      throw new Error(
        "Your session is unavailable. Please sign in again.",
      );
    }

    return createClerkSupabaseClient(
      () => session.getToken(),
    );
  }, [session]);

  const refreshAppointments = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;

    if (
      !isLoaded ||
      !isSignedIn ||
      !userId ||
      !session
    ) {
      setAppointments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const nextAppointments =
        await listStudentAppointments(
          getSupabase(),
          userId,
        );

      if (requestId === requestIdRef.current) {
        setAppointments(
          sortAppointments(nextAppointments),
        );
        setError("");
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          getErrorMessage(
            loadError,
            "We could not load your appointments. Please try again.",
          ),
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    getSupabase,
    isLoaded,
    isSignedIn,
    session,
    userId,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshAppointments();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
  }, [refreshAppointments, sessionId]);

  useEffect(() => {
    const updateCurrentTime = (): void => {
      setCurrentTime(Date.now());
    };

    const timeoutId = window.setTimeout(updateCurrentTime, 0);
    const intervalId = window.setInterval(
      updateCurrentTime,
      60_000,
    );

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  const createAppointment = useCallback(
    async (
      input: CreateAppointmentInput,
    ): Promise<Appointment> => {
      if (!userId) {
        throw new Error(
          "You must be signed in before booking an appointment.",
        );
      }

      setIsCreating(true);
      clearFeedback();

      try {
        const appointment =
          await createStudentAppointment(
            getSupabase(),
            userId,
            input,
          );

        setAppointments((currentAppointments) =>
          sortAppointments([
            ...currentAppointments,
            appointment,
          ]),
        );

        setSuccessMessage(
          "Your appointment request was submitted successfully.",
        );

        return appointment;
      } catch (createError) {
        const message = getErrorMessage(
          createError,
          "Your appointment could not be booked. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setIsCreating(false);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const updateAppointment = useCallback(
    async ({
      appointmentId,
      input,
    }: UpdateAppointmentRequest): Promise<Appointment> => {
      if (!userId) {
        throw new Error(
          "You must be signed in before updating an appointment.",
        );
      }

      setUpdatingAppointmentId(appointmentId);
      clearFeedback();

      try {
        const appointment =
          await updateStudentAppointment(
            getSupabase(),
            userId,
            appointmentId,
            input,
          );

        setAppointments((currentAppointments) =>
          replaceAppointment(
            currentAppointments,
            appointment,
          ),
        );

        setSuccessMessage(
          "Your appointment was updated successfully.",
        );

        return appointment;
      } catch (updateError) {
        const message = getErrorMessage(
          updateError,
          "Your appointment could not be updated. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setUpdatingAppointmentId(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const rescheduleAppointment = useCallback(
    async ({
      appointmentId,
      startTime,
      endTime,
    }: RescheduleAppointmentInput): Promise<Appointment> => {
      if (!userId) {
        throw new Error(
          "You must be signed in before rescheduling an appointment.",
        );
      }

      setUpdatingAppointmentId(appointmentId);
      clearFeedback();

      try {
        const appointment =
          await rescheduleStudentAppointment(
            getSupabase(),
            userId,
            appointmentId,
            startTime,
            endTime,
          );

        setAppointments((currentAppointments) =>
          replaceAppointment(
            currentAppointments,
            appointment,
          ),
        );

        setSuccessMessage(
          "Your appointment was rescheduled successfully.",
        );

        return appointment;
      } catch (rescheduleError) {
        const message = getErrorMessage(
          rescheduleError,
          "Your appointment could not be rescheduled. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setUpdatingAppointmentId(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const cancelAppointment = useCallback(
    async ({
      appointmentId,
      cancellationReason,
    }: CancelAppointmentInput): Promise<Appointment> => {
      if (!userId) {
        throw new Error(
          "You must be signed in before cancelling an appointment.",
        );
      }

      setCancellingAppointmentId(appointmentId);
      clearFeedback();

      try {
        const appointment =
          await cancelStudentAppointment(
            getSupabase(),
            userId,
            appointmentId,
            cancellationReason,
          );

        setAppointments((currentAppointments) =>
          replaceAppointment(
            currentAppointments,
            appointment,
          ),
        );

        setSuccessMessage(
          "Your appointment was cancelled.",
        );

        return appointment;
      } catch (cancelError) {
        const message = getErrorMessage(
          cancelError,
          "Your appointment could not be cancelled. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setCancellingAppointmentId(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const deleteAppointment = useCallback(
    async (appointmentId: string): Promise<void> => {
      if (!userId) {
        throw new Error(
          "You must be signed in before deleting an appointment.",
        );
      }

      setDeletingAppointmentId(appointmentId);
      clearFeedback();

      try {
        await deleteStudentAppointment(
          getSupabase(),
          userId,
          appointmentId,
        );

        setAppointments((currentAppointments) =>
          currentAppointments.filter(
            (appointment) =>
              appointment.id !== appointmentId,
          ),
        );

        setSuccessMessage(
          "The appointment was deleted.",
        );
      } catch (deleteError) {
        const message = getErrorMessage(
          deleteError,
          "The appointment could not be deleted. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setDeletingAppointmentId(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const upcomingAppointments = useMemo(() => {
    if (currentTime === null) {
      return [];
    }

    return appointments.filter((appointment) => {
      const startsAt =
        new Date(appointment.start_time).getTime();

      return (
        startsAt >= currentTime &&
        appointment.status !== "cancelled" &&
        appointment.status !== "completed"
      );
    });
  }, [appointments, currentTime]);

  const pastAppointments = useMemo(() => {
    if (currentTime === null) {
      return [];
    }

    return appointments
      .filter((appointment) => {
        const startsAt =
          new Date(appointment.start_time).getTime();

        return (
          appointment.status === "completed" ||
          (
            startsAt < currentTime &&
            appointment.status !== "cancelled"
          )
        );
      })
      .sort(
        (first, second) =>
          new Date(second.start_time).getTime() -
          new Date(first.start_time).getTime(),
      );
  }, [appointments, currentTime]);

  const cancelledAppointments = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.status === "cancelled",
        )
        .sort(
          (first, second) =>
            new Date(second.start_time).getTime() -
            new Date(first.start_time).getTime(),
        ),
    [appointments],
  );

  return {
    appointments,
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
    updateAppointment,
    rescheduleAppointment,
    cancelAppointment,
    deleteAppointment,

    clearFeedback,
  };
}