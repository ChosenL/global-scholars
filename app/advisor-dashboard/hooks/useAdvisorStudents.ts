"use client";

import { useSession, useUser } from "@clerk/nextjs";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";

export interface AdvisorStudent {
  profileId: string;
  userId: string;
  displayName: string;
  email: string | null;
  assignedAt: string;
}

interface UseAdvisorStudentsResult {
  students: AdvisorStudent[];
  isLoading: boolean;
  error: string;
  refreshStudents: () => Promise<void>;
}

interface AdvisorMembershipRow {
  conversation_id: string;
}

interface StudentParticipantRow {
  conversation_id: string;
  joined_at: string;
  profile: StudentProfileRow | StudentProfileRow[] | null;
}

interface StudentProfileRow {
  id: string;
  clerk_user_id: string;
  display_name: string | null;
  email: string | null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "We could not load assigned students.";
}

export function useAdvisorStudents(): UseAdvisorStudentsResult {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();

  const [students, setStudents] = useState<AdvisorStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const requestIdRef = useRef(0);

  const userId = user?.id ?? null;
  const sessionId = session?.id ?? null;
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const loadStudents = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;

    if (!isLoaded) {
      return;
    }

    const currentSession = sessionRef.current;

    if (!isSignedIn || !userId || !sessionId || !currentSession) {
      if (requestId === requestIdRef.current) {
        setStudents([]);
        setError("");
        setIsLoading(false);
      }

      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const supabase = createClerkSupabaseClient(
        () => currentSession.getToken(),
      );

      const crm = supabase.schema("crm");
      const {
        data: advisorProfileId,
        error: advisorProfileIdError,
      } = await crm.rpc("current_profile_id");

      if (advisorProfileIdError) {
        throw advisorProfileIdError;
      }

      if (typeof advisorProfileId !== "string") {
        throw new Error(
          "Your authenticated CRM advisor profile is unavailable.",
        );
      }

      const {
        data: memberships,
        error: membershipsError,
      } = await crm
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", advisorProfileId)
        .is("deleted_at", null);

      if (membershipsError) {
        throw membershipsError;
      }

      const conversationIds = (
        (memberships ?? []) as AdvisorMembershipRow[]
      ).map((membership) => membership.conversation_id);

      if (conversationIds.length === 0) {
        if (requestId === requestIdRef.current) {
          setStudents([]);
          setError("");
        }

        return;
      }

      const {
        data: studentParticipants,
        error: studentParticipantsError,
      } = await crm
        .from("conversation_participants")
        .select(
          "conversation_id,joined_at,profile:profiles!conversation_participants_profile_id_fkey(id,clerk_user_id,display_name,email)",
        )
        .in("conversation_id", conversationIds)
        .eq("participant_role", "student")
        .is("deleted_at", null)
        .order("joined_at", { ascending: true });

      if (studentParticipantsError) {
        throw studentParticipantsError;
      }

      const studentsByUserId = new Map<string, AdvisorStudent>();

      for (const participant of (
        studentParticipants ?? []
      ) as StudentParticipantRow[]) {
        const profile = Array.isArray(participant.profile)
          ? participant.profile[0]
          : participant.profile;

        if (!profile || studentsByUserId.has(profile.clerk_user_id)) {
          continue;
        }

        studentsByUserId.set(profile.clerk_user_id, {
          profileId: profile.id,
          userId: profile.clerk_user_id,
          displayName:
            profile.display_name?.trim() ||
            profile.email ||
            "Student",
          email: profile.email,
          assignedAt: participant.joined_at,
        });
      }

      const resolvedStudents = Array.from(
        studentsByUserId.values(),
      );

      if (requestId === requestIdRef.current) {
        setStudents(resolvedStudents);
        setError("");
      }
    } catch (loadError) {
      console.error(
        "Unable to load advisor students:",
        loadError,
      );

      if (requestId === requestIdRef.current) {
        setStudents([]);
        setError(getErrorMessage(loadError));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    isLoaded,
    isSignedIn,
    sessionId,
    userId,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStudents();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
  }, [loadStudents]);

  return {
    students,
    isLoading,
    error,
    refreshStudents: loadStudents,
  };
}
