"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
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

export function useStudentProfile(): UseStudentProfileResult {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [progress, setProgress] = useState<ApplicationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStudentProfile() {
      if (!isLoaded) {
        return;
      }

      if (!isSignedIn || !user || !session) {
        if (!cancelled) {
          setIsLoading(false);
          setProfile(null);
          setProgress(null);
        }
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const supabase = createClerkSupabaseClient(() => session.getToken());
        const email = user.primaryEmailAddress?.emailAddress ?? null;
        const fullName =
          user.fullName ||
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          email ||
          "Scholar";

        const { data: savedProfile, error: profileError } = await supabase
          .from("profiles")
          .upsert(
            {
              user_id: user.id,
              full_name: fullName,
              email,
              profile_image_url: user.imageUrl || null,
            },
            { onConflict: "user_id" },
          )
          .select("*")
          .single();

        if (profileError) {
          throw profileError;
        }

        const { data: savedProgress, error: progressError } = await supabase
          .from("application_progress")
          .upsert(
            {
              student_id: user.id,
              current_stage: "Initial Consultation",
              progress_percent: 10,
            },
            { onConflict: "student_id", ignoreDuplicates: true },
          )
          .select("*")
          .single();

        let resolvedProgress = savedProgress;

        if (progressError) {
          const { data: existingProgress, error: existingProgressError } =
            await supabase
              .from("application_progress")
              .select("*")
              .eq("student_id", user.id)
              .single();

          if (existingProgressError) {
            throw existingProgressError;
          }

          resolvedProgress = existingProgress;
        }

        if (!cancelled) {
          setProfile(savedProfile as StudentProfile);
          setProgress(resolvedProgress as ApplicationProgress);
        }
      } catch (loadError) {
        console.error("Unable to load student profile:", loadError);

        if (!cancelled) {
          setError(
            "We could not load your saved portal information. Please refresh the page or try again shortly.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStudentProfile();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, session, user]);

  return { profile, progress, isLoading, error };
}
