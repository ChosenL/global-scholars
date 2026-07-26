"use client";

import { useSession } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createStudentTask,
  fetchAdvisorStudentTasks,
  softDeleteStudentTask,
  updateStudentTask,
  updateStudentTaskStatus,
} from "@/app/scholar-dashboard/services/studentTasks";
import {
  fetchStudentDocuments,
  getStudentDocumentDownloadUrl,
} from "@/app/scholar-dashboard/services/studentDocuments";
import type {
  StudentTaskCreateInput,
  StudentTaskStatus,
  StudentTaskUpdateInput,
  StudentTaskWithProfiles,
  StudentDocumentWithUploader,
} from "@/app/scholar-dashboard/types/dashboard";
import { createClerkSupabaseClient } from "@/lib/supabase";

export function useAdvisorTasks(studentProfileId: string) {
  const { session } = useSession();
  const sessionRef = useRef(session);
  const [tasks, setTasks] = useState<StudentTaskWithProfiles[]>([]);
  const [documents, setDocuments] = useState<StudentDocumentWithUploader[]>([]);
  const [advisorProfileId, setAdvisorProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const getSupabase = useCallback(() => {
    const current = sessionRef.current;
    if (!current) throw new Error("Your session is unavailable.");
    return createClerkSupabaseClient(() => current.getToken());
  }, []);

  const refresh = useCallback(async () => {
    if (!sessionRef.current) return;
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const [nextTasks, nextDocuments, profileResult] = await Promise.all([
        fetchAdvisorStudentTasks(supabase, studentProfileId),
        fetchStudentDocuments(supabase, studentProfileId),
        supabase.schema("crm").rpc("current_profile_id"),
      ]);
      if (profileResult.error || typeof profileResult.data !== "string") {
        throw profileResult.error ?? new Error("Advisor CRM profile unavailable.");
      }
      setTasks(nextTasks);
      setDocuments(nextDocuments);
      setAdvisorProfileId(profileResult.data);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load tasks.");
    } finally {
      setIsLoading(false);
    }
  }, [getSupabase, studentProfileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const create = useCallback(
    async (input: Omit<StudentTaskCreateInput, "studentProfileId">) => {
      setIsCreating(true);
      setError("");
      setSuccessMessage("");
      try {
        await createStudentTask(getSupabase(), {
          ...input,
          studentProfileId,
        });
        await refresh();
        setSuccessMessage("Task created successfully.");
        return true;
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : "Unable to create task.");
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [getSupabase, refresh, studentProfileId],
  );

  const edit = useCallback(
    async (input: StudentTaskUpdateInput) => {
      setBusyTaskId(input.taskId);
      setError("");
      try {
        await updateStudentTask(getSupabase(), input);
        await refresh();
        setSuccessMessage("Task updated successfully.");
        return true;
      } catch (editError) {
        setError(editError instanceof Error ? editError.message : "Unable to edit task.");
        return false;
      } finally {
        setBusyTaskId(null);
      }
    },
    [getSupabase, refresh],
  );

  const changeStatus = useCallback(
    async (taskId: string, status: StudentTaskStatus) => {
      setBusyTaskId(taskId);
      setError("");
      try {
        await updateStudentTaskStatus(getSupabase(), taskId, status);
        await refresh();
      } catch (statusError) {
        setError(statusError instanceof Error ? statusError.message : "Unable to update status.");
      } finally {
        setBusyTaskId(null);
      }
    },
    [getSupabase, refresh],
  );

  const remove = useCallback(
    async (taskId: string) => {
      setBusyTaskId(taskId);
      try {
        await softDeleteStudentTask(getSupabase(), taskId);
        await refresh();
        setSuccessMessage("Task removed from active records.");
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Unable to remove task.");
      } finally {
        setBusyTaskId(null);
      }
    },
    [getSupabase, refresh],
  );

  const openRelatedDocument = useCallback(
    async (task: StudentTaskWithProfiles) => {
      if (!task.document) {
        setError("The related document is unavailable.");
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
    documents,
    advisorProfileId,
    isLoading,
    busyTaskId,
    isCreating,
    error,
    successMessage,
    refresh,
    create,
    edit,
    changeStatus,
    remove,
    openRelatedDocument,
  };
}
