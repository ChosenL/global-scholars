"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { usePlatformRole } from "@/app/hooks/usePlatformRole";
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
  const { role, isLoading: roleLoading } = usePlatformRole();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [progress, setProgress] = useState<ApplicationProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;

    async function load() {
      if (!isLoaded || roleLoading) return;

      if (!isSignedIn || !user || !session || role !== "student") {
        setProfile(null);
        setProgress(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const supabase = createClerkSupabaseClient(() => session.getToken());

        const fullName =
          user.fullName ||
          `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
          "Scholar";

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .upsert(
            {
              user_id: user.id,
              full_name: fullName,
              email: user.primaryEmailAddress?.emailAddress ?? null,
              profile_image_url: user.imageUrl,
            },
            { onConflict: "user_id" },
          )
          .select("*")
          .single();

        if (profileError) {
          throw profileError;
        }

        const { error: progressInitializationError } = await supabase
          .from("application_progress")
          .upsert(
            {
              student_id: user.id,
              current_stage: "Initial Consultation",
              progress_percent: 10,
            },
            {
              onConflict: "student_id",
              ignoreDuplicates: true,
            },
          );

        if (progressInitializationError) {
          throw progressInitializationError;
        }

        const {
          data: progressData,
          error: progressLoadError,
        } = await supabase
          .from("application_progress")
          .select("*")
          .eq("student_id", user.id)
          .single();

        if (progressLoadError) {
          throw progressLoadError;
        }

        if (requestId === requestRef.current) {
          setProfile(profileData as StudentProfile);
          setProgress(progressData as ApplicationProgress);
          setError("");
        }
      } catch (err) {
        if (requestId === requestRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your profile.",
          );
        }
      } finally {
        if (requestId === requestRef.current) {
          setIsLoading(false);
        }
      }
    }

    void load();
  }, [isLoaded, isSignedIn, user, session, role, roleLoading]);

  return {
    profile,
    progress,
    isLoading,
    error,
  };
}
