"use client";

import { useSession } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchStudentDocuments,
  getStudentDocumentDownloadUrl,
  reviewStudentDocument,
} from "@/app/scholar-dashboard/services/studentDocuments";
import type {
  StudentDocument,
  StudentDocumentReviewInput,
  StudentDocumentWithUploader,
} from "@/app/scholar-dashboard/types/dashboard";
import { createClerkSupabaseClient } from "@/lib/supabase";

export function useAdvisorDocuments(studentProfileId: string) {
  const { session } = useSession();
  const sessionRef = useRef(session);
  const [documents, setDocuments] = useState<StudentDocumentWithUploader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingDocumentId, setReviewingDocumentId] =
    useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const getSupabase = useCallback(() => {
    const currentSession = sessionRef.current;
    if (!currentSession) throw new Error("Your session is unavailable.");
    return createClerkSupabaseClient(() => currentSession.getToken());
  }, []);

  const refresh = useCallback(async () => {
    if (!sessionRef.current) return;
    setIsLoading(true);
    try {
      setDocuments(
        await fetchStudentDocuments(getSupabase(), studentProfileId),
      );
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load student documents.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getSupabase, studentProfileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const review = useCallback(
    async (input: StudentDocumentReviewInput) => {
      setReviewingDocumentId(input.documentId);
      setError("");
      setSuccessMessage("");
      try {
        await reviewStudentDocument(getSupabase(), input);
        await refresh();
        setSuccessMessage("The document review was saved.");
      } catch (reviewError) {
        setError(
          reviewError instanceof Error
            ? reviewError.message
            : "Unable to review this document.",
        );
      } finally {
        setReviewingDocumentId(null);
      }
    },
    [getSupabase, refresh],
  );

  const open = useCallback(
    async (document: StudentDocument, download = false) => {
      try {
        const url = await getStudentDocumentDownloadUrl(
          getSupabase(),
          document,
          download,
        );
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (openError) {
        setError(
          openError instanceof Error
            ? openError.message
            : "Unable to open this document.",
        );
      }
    },
    [getSupabase],
  );

  return {
    documents,
    isLoading,
    reviewingDocumentId,
    error,
    successMessage,
    refresh,
    review,
    open,
  };
}
