"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import {
  createStudentDocumentUrl,
  deleteStudentDocument,
  listStudentDocuments,
  replaceStudentDocument,
  uploadStudentDocument,
} from "../services/documents";
import type { StudentDocument } from "../types/dashboard";

interface UseDocumentsResult {
  documents: StudentDocument[];
  isLoading: boolean;
  isUploading: boolean;
  deletingDocumentId: string | null;
  replacingDocumentId: string | null;
  downloadingDocumentId: string | null;
  error: string;
  successMessage: string;
  uploadDocument: (
    documentName: string,
    file: File,
  ) => Promise<void>;
  replaceDocument: (
    document: StudentDocument,
    file: File,
  ) => Promise<void>;
  removeDocument: (
    document: StudentDocument,
  ) => Promise<void>;
  openDocument: (
    document: StudentDocument,
  ) => Promise<void>;
  downloadDocument: (
    document: StudentDocument,
  ) => Promise<void>;
  refreshDocuments: () => Promise<void>;
  clearFeedback: () => void;
}

interface SupabaseErrorLike {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  statusCode?: unknown;
  error?: unknown;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    return error.message.trim() || fallback;
  }

  if (typeof error === "string") {
    return error.trim() || fallback;
  }

  if (error && typeof error === "object") {
    const candidate = error as SupabaseErrorLike;

    const message =
      readText(candidate.message) ||
      readText(candidate.error);

    const details = readText(candidate.details);
    const hint = readText(candidate.hint);
    const code = readText(candidate.code);

    const sections = [
      message,
      details,
      hint ? `Hint: ${hint}` : "",
      code ? `Code: ${code}` : "",
    ].filter(Boolean);

    if (sections.length > 0) {
      return sections.join(" ");
    }

    try {
      const serialized = JSON.stringify(error);

      if (serialized && serialized !== "{}") {
        return serialized;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function useDocuments(): UseDocumentsResult {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();

  const [documents, setDocuments] = useState<StudentDocument[]>([]);
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

  const userId = user?.id ?? null;
  const sessionId = session?.id ?? null;

  const clearFeedback = useCallback(() => {
    setError("");
    setSuccessMessage("");
  }, []);

  const getSupabase = useCallback(() => {
    if (!session) {
      throw new Error(
        "Your session is unavailable. Please sign in again.",
      );
    }

    return createClerkSupabaseClient(
      () => session.getToken(),
    );
  }, [session]);

  const refreshDocuments = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    if (
      !isLoaded ||
      !isSignedIn ||
      !userId ||
      !session
    ) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const nextDocuments =
        await listStudentDocuments(
          getSupabase(),
          userId,
        );

      if (requestId === requestIdRef.current) {
        setDocuments(nextDocuments);
        setError("");
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          getErrorMessage(
            loadError,
            "We could not load your documents. Please try again.",
          ),
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    getSupabase,
    isLoaded,
    isSignedIn,
    session,
    userId,
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshDocuments();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
  }, [refreshDocuments, sessionId]);

  const uploadDocument = useCallback(
    async (
      documentName: string,
      file: File,
    ) => {
      if (!userId) {
        setError(
          "You must be signed in to upload a document.",
        );
        return;
      }

      setIsUploading(true);
      clearFeedback();

      try {
        const { document } =
          await uploadStudentDocument(
            getSupabase(),
            {
              studentId: userId,
              documentName,
              file,
            },
          );

        setDocuments((current) => [
          document,
          ...current,
        ]);

        setSuccessMessage(
          `${document.name} was uploaded successfully.`,
        );
      } catch (uploadError) {
        setError(
          getErrorMessage(
            uploadError,
            "Your document could not be uploaded. Please try again.",
          ),
        );
      } finally {
        setIsUploading(false);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const replaceDocument = useCallback(
    async (
      document: StudentDocument,
      file: File,
    ) => {
      setReplacingDocumentId(document.id);
      clearFeedback();

      try {
        const replacement =
          await replaceStudentDocument(
            getSupabase(),
            {
              document,
              file,
            },
          );

        setDocuments((current) =>
          current.map((item) =>
            item.id === replacement.id
              ? replacement
              : item,
          ),
        );

        setSuccessMessage(
          `${document.name} was replaced and returned to pending review.`,
        );
      } catch (replaceError) {
        setError(
          getErrorMessage(
            replaceError,
            "The document could not be replaced. Please try again.",
          ),
        );
      } finally {
        setReplacingDocumentId(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
    ],
  );

  const removeDocument = useCallback(
    async (document: StudentDocument) => {
      setDeletingDocumentId(document.id);
      clearFeedback();

      try {
        await deleteStudentDocument(
          getSupabase(),
          document,
        );

        setDocuments((current) =>
          current.filter(
            (item) => item.id !== document.id,
          ),
        );

        setSuccessMessage(
          `${document.name} was deleted.`,
        );
      } catch (deleteError) {
        setError(
          getErrorMessage(
            deleteError,
            "The document could not be deleted. Please try again.",
          ),
        );
      } finally {
        setDeletingDocumentId(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
    ],
  );

  const openDocument = useCallback(
    async (document: StudentDocument) => {
      clearFeedback();

      try {
        const url =
          await createStudentDocumentUrl(
            getSupabase(),
            document,
          );

        const openedWindow = window.open(
          url,
          "_blank",
          "noopener,noreferrer",
        );

        if (!openedWindow) {
          window.location.assign(url);
        }
      } catch (openError) {
        setError(
          getErrorMessage(
            openError,
            "The document could not be opened. Please try again.",
          ),
        );
      }
    },
    [
      clearFeedback,
      getSupabase,
    ],
  );

  const downloadDocument = useCallback(
    async (document: StudentDocument) => {
      setDownloadingDocumentId(document.id);
      clearFeedback();

      try {
        const url =
          await createStudentDocumentUrl(
            getSupabase(),
            document,
            true,
          );

        const link =
          window.document.createElement("a");

        link.href = url;
        link.download = document.file_name;
        link.rel = "noopener";

        window.document.body.appendChild(link);
        link.click();
        link.remove();

        setSuccessMessage(
          `${document.file_name} is downloading.`,
        );
      } catch (downloadError) {
        setError(
          getErrorMessage(
            downloadError,
            "The document could not be downloaded. Please try again.",
          ),
        );
      } finally {
        setDownloadingDocumentId(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
    ],
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