"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import {
  createStudentDocumentDownloadUrl,
  deleteStudentDocument,
  listStudentDocuments,
  uploadStudentDocument,
} from "../services/documents";
import type { StudentDocument } from "../types/dashboard";

interface UseDocumentsResult {
  documents: StudentDocument[];
  isLoading: boolean;
  isUploading: boolean;
  error: string;
  uploadDocument: (documentName: string, file: File) => Promise<void>;
  removeDocument: (document: StudentDocument) => Promise<void>;
  openDocument: (document: StudentDocument) => Promise<void>;
  refreshDocuments: () => Promise<void>;
}

export function useDocuments(): UseDocumentsResult {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const getSupabase = useCallback(() => {
    if (!session) {
      throw new Error("Your session is not available.");
    }

    return createClerkSupabaseClient(() => session.getToken());
  }, [session]);

  const refreshDocuments = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user || !session) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const nextDocuments = await listStudentDocuments(getSupabase(), user.id);
      setDocuments(nextDocuments);
    } catch (loadError) {
      console.error("Unable to load documents:", loadError);
      setError("We could not load your documents. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [getSupabase, isLoaded, isSignedIn, session, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshDocuments();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshDocuments]);

  const uploadDocument = useCallback(
    async (documentName: string, file: File) => {
      if (!user) {
        throw new Error("You must be signed in to upload a document.");
      }

      setIsUploading(true);
      setError("");

      try {
        const { document } = await uploadStudentDocument(getSupabase(), {
          studentId: user.id,
          documentName,
          file,
        });

        setDocuments((current) => [document, ...current]);
      } catch (uploadError) {
        console.error("Unable to upload document:", uploadError);
        setError("Your document could not be uploaded. Please try again.");
        throw uploadError;
      } finally {
        setIsUploading(false);
      }
    },
    [getSupabase, user],
  );

  const removeDocument = useCallback(
    async (document: StudentDocument) => {
      setError("");

      try {
        await deleteStudentDocument(getSupabase(), document);
        setDocuments((current) =>
          current.filter((item) => item.id !== document.id),
        );
      } catch (deleteError) {
        console.error("Unable to delete document:", deleteError);
        setError("The document could not be deleted. Please try again.");
        throw deleteError;
      }
    },
    [getSupabase],
  );

  const openDocument = useCallback(
    async (document: StudentDocument) => {
      setError("");

      try {
        const url = await createStudentDocumentDownloadUrl(
          getSupabase(),
          document,
        );
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (openError) {
        console.error("Unable to open document:", openError);
        setError("The document could not be opened. Please try again.");
        throw openError;
      }
    },
    [getSupabase],
  );

  return {
    documents,
    isLoading,
    isUploading,
    error,
    uploadDocument,
    removeDocument,
    openDocument,
    refreshDocuments,
  };
}