"use client";

import { useSession } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  StudentNoteCreateInput,
  StudentNoteUpdateInput,
  StudentNoteWithAuthor,
} from "@/app/scholar-dashboard/types/dashboard";
import { createClerkSupabaseClient } from "@/lib/supabase";

import {
  createStudentNote,
  fetchStudentNotes,
  pinStudentNote,
  softDeleteStudentNote,
  updateStudentNote,
} from "../services/studentNotes";

export function useAdvisorNotes(studentProfileId: string) {
  const { session } = useSession();
  const sessionRef = useRef(session);
  const [notes, setNotes] = useState<StudentNoteWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyNoteId, setBusyNoteId] = useState<string | null>(null);
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
      setNotes(await fetchStudentNotes(getSupabase(), studentProfileId));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load notes.");
    } finally {
      setIsLoading(false);
    }
  }, [getSupabase, studentProfileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const create = useCallback(async (input: Omit<StudentNoteCreateInput, "studentProfileId">) => {
    setIsCreating(true);
    setError("");
    try {
      await createStudentNote(getSupabase(), { ...input, studentProfileId });
      await refresh();
      setSuccessMessage("Internal note created.");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create note.");
      return false;
    } finally {
      setIsCreating(false);
    }
  }, [getSupabase, refresh, studentProfileId]);

  const run = useCallback(async (noteId: string, action: () => Promise<unknown>, message: string) => {
    setBusyNoteId(noteId);
    setError("");
    try {
      await action();
      await refresh();
      setSuccessMessage(message);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update note.");
      return false;
    } finally {
      setBusyNoteId(null);
    }
  }, [refresh]);

  return {
    notes, isLoading, isCreating, busyNoteId, error, successMessage, refresh, create,
    edit: (input: StudentNoteUpdateInput) =>
      run(input.noteId, () => updateStudentNote(getSupabase(), input), "Note updated."),
    pin: (noteId: string, isPinned: boolean) =>
      run(noteId, () => pinStudentNote(getSupabase(), noteId, isPinned), isPinned ? "Note pinned." : "Note unpinned."),
    remove: (noteId: string) =>
      run(noteId, () => softDeleteStudentNote(getSupabase(), noteId), "Note removed from active records."),
  };
}
