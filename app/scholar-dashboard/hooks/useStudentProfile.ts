"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import { createClerkSupabaseClient } from "@/lib/supabase";
import {
  calculateStudentReadiness,
  type StudentReadiness,
} from "@/lib/crm/readiness";

import {
  createStudentProfile,
  fetchStudentProfile,
  updateStudentProfile,
} from "../services/studentProfile";
import type {
  CompleteStudentProfile,
  CrmProfile,
  StudentProfileInput,
} from "../types/dashboard";

interface UseStudentProfileResult {
  profile: CompleteStudentProfile | null;
  progress: StudentReadiness | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  successMessage: string;
  saveProfile: (input: StudentProfileInput) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearFeedback: () => void;
}

export function useStudentProfile(
  crmProfile: CrmProfile | null,
): UseStudentProfileResult {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();
  const [profile, setProfile] =
    useState<CompleteStudentProfile | null>(null);
  const [progress, setProgress] =
    useState<StudentReadiness | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const requestIdRef = useRef(0);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const getSupabase = useCallback(() => {
    const currentSession = sessionRef.current;

    if (!currentSession) {
      throw new Error("Your session is unavailable. Please sign in again.");
    }

    return createClerkSupabaseClient(() => currentSession.getToken());
  }, []);

  const loadProfile = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;

    if (!isLoaded || !crmProfile) {
      return;
    }

    if (
      !isSignedIn ||
      !user ||
      crmProfile.role !== "student"
    ) {
      setProfile(null);
      setProgress(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabase();
      const [nextProfile, nextReadiness] = await Promise.all([
        fetchStudentProfile(supabase, crmProfile.id),
        calculateStudentReadiness(supabase, crmProfile.id),
      ]);

      if (requestId === requestIdRef.current) {
        setProfile(nextProfile);
        setProgress(nextReadiness);
        setError("");
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your student profile.",
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    crmProfile,
    getSupabase,
    isLoaded,
    isSignedIn,
    user,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
  }, [loadProfile]);

  const saveProfile = useCallback(
    async (input: StudentProfileInput): Promise<void> => {
      if (!crmProfile || crmProfile.role !== "student") {
        setError("Your student CRM profile is unavailable.");
        return;
      }

      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      try {
        const nextProfile = profile?.student
          ? await updateStudentProfile(
              getSupabase(),
              crmProfile.id,
              input,
            )
          : await createStudentProfile(
              getSupabase(),
              crmProfile.id,
              input,
            );

        setProfile(nextProfile);
        setSuccessMessage("Your student profile has been saved.");
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save your student profile.",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [crmProfile, getSupabase, profile],
  );

  const clearFeedback = useCallback(() => {
    setError("");
    setSuccessMessage("");
  }, []);

  return {
    profile,
    progress,
    isLoading,
    isSaving,
    error,
    successMessage,
    saveProfile,
    refreshProfile: loadProfile,
    clearFeedback,
  };
}
