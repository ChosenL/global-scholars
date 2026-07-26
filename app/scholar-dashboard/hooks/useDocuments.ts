"use client";

import { useSession } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import { createClerkSupabaseClient } from "@/lib/supabase";

import {
  fetchStudentDocuments,
  getStudentDocumentDownloadUrl,
  replaceStudentDocument,
  softDeleteStudentDocument,
  uploadStudentDocument,
} from "../services/studentDocuments";
import type {
  StudentDocument,
  StudentDocumentType,
  StudentDocumentWithUploader,
} from "../types/dashboard";

interface UseDocumentsResult {
  documents: StudentDocumentWithUploader[];
  isLoading: boolean;
  isUploading: boolean;
  deletingDocumentId: string | null;
  replacingDocumentId: string | null;
  downloadingDocumentId: string | null;
  error: string;
  successMessage: string;
  uploadDocument: (
    documentType: StudentDocumentType,
    customDocumentName: string | null,
    expiresAt: string | null,
    file: File,
  ) => Promise<boolean>;
  replaceDocument: (
    document: StudentDocument,
    file: File,
  ) => Promise<boolean>;
  removeDocument: (document: StudentDocument) => Promise<void>;
  openDocument: (document: StudentDocument) => Promise<void>;
  downloadDocument: (document: StudentDocument) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  clearFeedback: () => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function useDocuments(
  profileId: string | null,
): UseDocumentsResult {
  const { session } = useSession();
  const [documents, setDocuments] = useState<StudentDocumentWithUploader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] =
    useState<string | null>(null);
  const [replacingDocumentId, setReplacingDocumentId] =
    useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] =
    useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const requestIdRef = useRef(0);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const getSupabase = useCallback(() => {
    const currentSession = sessionRef.current;
    if (!currentSession) throw new Error("Your session is unavailable.");
    return createClerkSupabaseClient(() => currentSession.getToken());
  }, []);

  const clearFeedback = useCallback(() => {
    setError("");
    setSuccessMessage("");
  }, []);

  const refreshDocuments = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!profileId || !sessionRef.current) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const next = await fetchStudentDocuments(getSupabase(), profileId);
      if (requestId === requestIdRef.current) {
        setDocuments(next);
        setError("");
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(getErrorMessage(loadError, "Unable to load documents."));
      }
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [getSupabase, profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refreshDocuments(), 0);
    return () => {
      window.clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
  }, [refreshDocuments]);

  const uploadDocument = useCallback(
    async (
      documentType: StudentDocumentType,
      customDocumentName: string | null,
      expiresAt: string | null,
      file: File,
    ): Promise<boolean> => {
      if (!profileId) return false;
      setIsUploading(true);
      clearFeedback();
      try {
        await uploadStudentDocument(getSupabase(), {
          profileId,
          documentType,
          customDocumentName,
          expiresAt,
          file,
        });
        await refreshDocuments();
        setSuccessMessage("Your document was uploaded successfully.");
        return true;
      } catch (uploadError) {
        setError(getErrorMessage(uploadError, "Unable to upload document."));
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [clearFeedback, getSupabase, profileId, refreshDocuments],
  );

  const replaceDocument = useCallback(
    async (document: StudentDocument, file: File): Promise<boolean> => {
      setReplacingDocumentId(document.id);
      clearFeedback();
      try {
        await replaceStudentDocument(getSupabase(), document, file);
        await refreshDocuments();
        setSuccessMessage(
          "A new document revision was uploaded. The previous revision remains in the audit history.",
        );
        return true;
      } catch (replaceError) {
        setError(getErrorMessage(replaceError, "Unable to upload revision."));
        return false;
      } finally {
        setReplacingDocumentId(null);
      }
    },
    [clearFeedback, getSupabase, refreshDocuments],
  );

  const removeDocument = useCallback(
    async (document: StudentDocument) => {
      setDeletingDocumentId(document.id);
      clearFeedback();
      try {
        await softDeleteStudentDocument(
          getSupabase(),
          document.id,
          document.profile_id,
        );
        setDocuments((current) =>
          current.filter((item) => item.id !== document.id),
        );
        setSuccessMessage("The document was removed from your active records.");
      } catch (deleteError) {
        setError(getErrorMessage(deleteError, "Unable to remove document."));
      } finally {
        setDeletingDocumentId(null);
      }
    },
    [clearFeedback, getSupabase],
  );

  const openDocument = useCallback(
    async (document: StudentDocument) => {
      clearFeedback();
      try {
        const url = await getStudentDocumentDownloadUrl(
          getSupabase(),
          document,
        );
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (openError) {
        setError(getErrorMessage(openError, "Unable to open document."));
      }
    },
    [clearFeedback, getSupabase],
  );

  const downloadDocument = useCallback(
    async (document: StudentDocument) => {
      setDownloadingDocumentId(document.id);
      clearFeedback();
      try {
        const url = await getStudentDocumentDownloadUrl(
          getSupabase(),
          document,
          true,
        );
        window.location.assign(url);
      } catch (downloadError) {
        setError(getErrorMessage(downloadError, "Unable to download document."));
      } finally {
        setDownloadingDocumentId(null);
      }
    },
    [clearFeedback, getSupabase],
  );

  return {
    documents,
    isLoading,
    isUploading,
    deletingDocumentId,
    replacingDocumentId,
    downloadingDocumentId,
    error,
    successMessage,
    uploadDocument,
    replaceDocument,
    removeDocument,
    openDocument,
    downloadDocument,
    refreshDocuments,
    clearFeedback,
  };
}
