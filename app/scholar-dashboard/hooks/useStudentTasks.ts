"use client";

import { useSession } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import { createClerkSupabaseClient } from "@/lib/supabase";

import {
  fetchStudentTasks,
  updateStudentTaskStatus,
} from "../services/studentTasks";
import { getStudentDocumentDownloadUrl } from "../services/studentDocuments";
import type {
  StudentTaskStatus,
  StudentTaskWithProfiles,
} from "../types/dashboard";

export function useStudentTasks(profileId: string | null) {
  const { session } = useSession();
  const sessionRef = useRef(session);
  const [tasks, setTasks] = useState<StudentTaskWithProfiles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const getSupabase = useCallback(() => {
    const current = sessionRef.current;
    if (!current) throw new Error("Your session is unavailable.");
    return createClerkSupabaseClient(() => current.getToken());
  }, []);

  const refresh = useCallback(async () => {
    if (!profileId || !sessionRef.current) {
      setTasks([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setTasks(await fetchStudentTasks(getSupabase(), profileId));
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load tasks.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getSupabase, profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const updateStatus = useCallback(
    async (taskId: string, status: StudentTaskStatus) => {
      setUpdatingTaskId(taskId);
      setError("");
      try {
        await updateStudentTaskStatus(getSupabase(), taskId, status);
        await refresh();
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "Unable to update this task.",
        );
      } finally {
        setUpdatingTaskId(null);
      }
    },
    [getSupabase, refresh],
  );

  const openRelatedDocument = useCallback(
    async (task: StudentTaskWithProfiles) => {
      if (!task.document) {
        setError("The related document is no longer available.");
        return;
      }
      try {
        const url = await getStudentDocumentDownloadUrl(
          getSupabase(),
          task.document,
        );
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (openError) {
        setError(
          openError instanceof Error
            ? openError.message
            : "Unable to open the related document.",
        );
      }
    },
    [getSupabase],
  );

  return {
    tasks,
    isLoading,
    updatingTaskId,
    error,
    refresh,
    updateStatus,
    openRelatedDocument,
  };
}
