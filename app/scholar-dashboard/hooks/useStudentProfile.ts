"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import type {
  ApplicationProgress,
  StudentProfile,
} from "../types/dashboard";

interface UseStudentProfileResult {
  profile: StudentProfile | null;
  progress: ApplicationProgress | null;
  isLoading: boolean;
  error: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We could not load your saved portal information.";
}

export function useStudentProfile(): UseStudentProfileResult {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [progress, setProgress] = useState<ApplicationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const requestIdRef = useRef(0);

  const userId = user?.id ?? null;
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const fullName = user?.fullName ?? "";
  const imageUrl = user?.imageUrl ?? null;
  const sessionId = session?.id ?? null;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    async function loadStudentProfile() {
      if (!isLoaded) {
        return;
      }

      if (!isSignedIn || !userId || !session) {
        if (!cancelled && requestId === requestIdRef.current) {
          setProfile(null);
          setProgress(null);
          setError("");
          setIsLoading(false);
        }

        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const supabase = createClerkSupabaseClient(() => session.getToken());

        const resolvedFullName =
          fullName ||
          [firstName, lastName].filter(Boolean).join(" ") ||
          email ||
          "Scholar";

        const { data: existingProfile, error: profileReadError } =
          await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (profileReadError) {
          throw profileReadError;
        }

        let savedProfile = existingProfile;

        if (existingProfile) {
          const { data: updatedProfile, error: profileUpdateError } =
            await supabase
              .from("profiles")
              .update({
                full_name: resolvedFullName,
                email,
                profile_image_url: imageUrl,
              })
              .eq("user_id", userId)
              .select("*")
              .single();

          if (profileUpdateError) {
            throw profileUpdateError;
          }

          savedProfile = updatedProfile;
        } else {
          const { data: createdProfile, error: profileInsertError } =
            await supabase
              .from("profiles")
              .insert({
                user_id: userId,
                full_name: resolvedFullName,
                email,
                profile_image_url: imageUrl,
              })
              .select("*")
              .single();

          if (profileInsertError) {
            throw profileInsertError;
          }

          savedProfile = createdProfile;
        }

        const { data: existingProgress, error: progressReadError } =
          await supabase
            .from("application_progress")
            .select("*")
            .eq("student_id", userId)
            .maybeSingle();

        if (progressReadError) {
          throw progressReadError;
        }

        let savedProgress = existingProgress;

        if (!existingProgress) {
          const { data: createdProgress, error: progressInsertError } =
            await supabase
              .from("application_progress")
              .insert({
                student_id: userId,
                current_stage: "Initial Consultation",
                progress_percent: 10,
              })
              .select("*")
              .single();

          if (progressInsertError) {
            throw progressInsertError;
          }

          savedProgress = createdProgress;
        }

        if (!cancelled && requestId === requestIdRef.current) {
          setProfile(savedProfile as StudentProfile);
          setProgress(savedProgress as ApplicationProgress);
          setError("");
        }
      } catch (loadError) {
        console.error("Unable to load student profile:", loadError);

        if (!cancelled && requestId === requestIdRef.current) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void loadStudentProfile();

    return () => {
      cancelled = true;
    };
  }, [
    email,
    firstName,
    fullName,
    imageUrl,
    isLoaded,
    isSignedIn,
    lastName,
    session,
    sessionId,
    userId,
  ]);

  return {
    profile,
    progress,
    isLoading,
    error,
  };
}