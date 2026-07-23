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

interface AssignmentRow {
  student_id: string;
  assigned_at: string;
}

interface PlatformUserRow {
  user_id: string;
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

      const {
        data: assignments,
        error: assignmentsError,
      } = await supabase
        .from("advisor_student_assignments")
        .select("student_id, assigned_at")
        .eq("advisor_id", userId)
        .is("ended_at", null)
        .order("assigned_at", { ascending: true });

      if (assignmentsError) {
        throw assignmentsError;
      }

      const assignmentRows =
        (assignments ?? []) as AssignmentRow[];

      if (assignmentRows.length === 0) {
        if (requestId === requestIdRef.current) {
          setStudents([]);
          setError("");
        }

        return;
      }

      const studentIds = assignmentRows.map(
        (assignment) => assignment.student_id,
      );

      const {
        data: platformUsers,
        error: platformUsersError,
      } = await supabase
        .from("platform_users")
        .select("user_id, display_name, email")
        .in("user_id", studentIds);

      if (platformUsersError) {
        throw platformUsersError;
      }

      const usersById = new Map(
        ((platformUsers ?? []) as PlatformUserRow[]).map(
          (platformUser) => [
            platformUser.user_id,
            platformUser,
          ],
        ),
      );

      const resolvedStudents: AdvisorStudent[] =
        assignmentRows.map((assignment) => {
          const platformUser = usersById.get(
            assignment.student_id,
          );

          return {
            userId: assignment.student_id,
            displayName:
              platformUser?.display_name?.trim() ||
              platformUser?.email ||
              "Assigned Student",
            email: platformUser?.email ?? null,
            assignedAt: assignment.assigned_at,
          };
        });

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
