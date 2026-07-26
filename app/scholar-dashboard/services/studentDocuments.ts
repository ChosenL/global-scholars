import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  StudentDocument,
  StudentDocumentReviewInput,
  StudentDocumentSummary,
  StudentDocumentType,
  StudentDocumentUploadInput,
  StudentDocumentUploadResult,
  StudentDocumentWithUploader,
} from "../types/dashboard";

export const STUDENT_DOCUMENTS_BUCKET = "student-documents";
export const MAX_STUDENT_DOCUMENT_SIZE = 10 * 1024 * 1024;
export const STUDENT_DOCUMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

export const DOCUMENT_TYPE_LABELS: Record<StudentDocumentType, string> = {
  passport: "Passport",
  transcript: "Academic Transcript",
  degree_certificate: "Degree Certificate",
  english_test_result: "English Test Result",
  cv_resume: "CV / Résumé",
  statement_of_purpose: "Statement of Purpose",
  recommendation_letter: "Recommendation Letter",
  financial_document: "Financial Document",
  visa_document: "Visa Document",
  birth_certificate: "Birth Certificate",
  national_id: "National ID",
  application_form: "Application Form",
  offer_letter: "Offer Letter",
  other: "Other",
};

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);

interface RawProfileRelation {
  id: string;
  display_name: string;
  role: "student" | "advisor" | "admin";
  avatar_url: string | null;
}

interface RawDocument extends StudentDocument {
  uploader: RawProfileRelation | RawProfileRelation[] | null;
  reviewer: RawProfileRelation | RawProfileRelation[] | null;
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapDocument(row: RawDocument): StudentDocumentWithUploader {
  const uploader = firstRelation(row.uploader);

  if (!uploader) {
    throw new Error("Document uploader identity is unavailable.");
  }

  return {
    ...row,
    uploader,
    reviewer: firstRelation(row.reviewer),
  };
}

function documentSelect(): string {
  return [
    "*",
    "uploader:profiles!student_documents_uploader_fkey(id,display_name,role,avatar_url)",
    "reviewer:profiles!student_documents_reviewer_fkey(id,display_name,role,avatar_url)",
  ].join(",");
}

export function sanitizeDocumentFilename(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const base = filename
    .slice(0, extension ? -(extension.length + 1) : undefined)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 180);

  return `${base || "document"}.${extension}`;
}

export function validateStudentDocumentFile(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!allowedMimeTypes.has(file.type) || !allowedExtensions.has(extension)) {
    return "Upload a PDF, JPG, JPEG, or PNG file.";
  }

  if (file.size === 0) {
    return "The selected file is empty.";
  }

  if (file.size > MAX_STUDENT_DOCUMENT_SIZE) {
    return "The file must be 10 MB or smaller.";
  }

  return "";
}

export function summarizeStudentDocuments(
  documents: StudentDocument[],
): StudentDocumentSummary {
  const replacedIds = new Set(
    documents.flatMap((item) =>
      item.replaces_document_id ? [item.replaces_document_id] : [],
    ),
  );
  const currentDocuments = documents.filter(
    (item) => !replacedIds.has(item.id),
  );

  return {
    totalDocuments: currentDocuments.length,
    approvedDocuments: currentDocuments.filter(
      (item) => item.status === "approved",
    ).length,
    pendingReviewDocuments: currentDocuments.filter((item) =>
      ["uploaded", "under_review"].includes(item.status),
    ).length,
    needsRevisionDocuments: currentDocuments.filter((item) =>
      ["rejected", "needs_revision"].includes(item.status),
    ).length,
  };
}

export async function fetchStudentDocuments(
  supabase: SupabaseClient,
  profileId: string,
): Promise<StudentDocumentWithUploader[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("student_documents")
    .select(documentSelect())
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as RawDocument[]).map(mapDocument);
}

export async function createStudentDocumentMetadata(
  supabase: SupabaseClient,
  input: StudentDocumentUploadInput,
  documentId: string,
  storagePath: string,
): Promise<StudentDocument> {
  const previous = input.replacesDocument;
  const { data, error } = await supabase
    .schema("crm")
    .from("student_documents")
    .insert({
      id: documentId,
      profile_id: input.profileId,
      document_type: input.documentType,
      custom_document_name:
        input.documentType === "other"
          ? input.customDocumentName?.trim() || null
          : null,
      original_filename: input.file.name,
      storage_bucket: STUDENT_DOCUMENTS_BUCKET,
      storage_path: storagePath,
      mime_type: input.file.type,
      file_size_bytes: input.file.size,
      status: "uploaded",
      uploaded_by_profile_id: input.profileId,
      expires_at: input.expiresAt?.trim() || null,
      replaces_document_id: previous?.id ?? null,
      revision_number: previous ? previous.revision_number + 1 : 1,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as StudentDocument;
}

export async function uploadStudentDocument(
  supabase: SupabaseClient,
  input: StudentDocumentUploadInput,
): Promise<StudentDocumentUploadResult> {
  const validationError = validateStudentDocumentFile(input.file);
  if (validationError) throw new Error(validationError);
  if (input.documentType === "other" && !input.customDocumentName?.trim()) {
    throw new Error("Enter a custom document name.");
  }

  const documentId = crypto.randomUUID();
  const sanitizedFilename = sanitizeDocumentFilename(input.file.name);
  const storagePath = [
    "students",
    input.profileId,
    documentId,
    sanitizedFilename,
  ].join("/");

  const uploadResult = await supabase.storage
    .from(STUDENT_DOCUMENTS_BUCKET)
    .upload(storagePath, input.file, {
      cacheControl: "3600",
      contentType: input.file.type,
      upsert: false,
    });

  if (uploadResult.error) throw uploadResult.error;

  try {
    const document = await createStudentDocumentMetadata(
      supabase,
      input,
      documentId,
      storagePath,
    );
    return { document, cleanupError: null };
  } catch (metadataError) {
    const cleanup = await supabase.storage
      .from(STUDENT_DOCUMENTS_BUCKET)
      .remove([storagePath]);
    if (cleanup.error) {
      console.error("Orphaned document upload cleanup failed:", cleanup.error);
      throw new Error(
        `Document metadata failed and the uploaded file could not be cleaned up: ${cleanup.error.message}`,
        { cause: metadataError },
      );
    }
    throw metadataError;
  }
}

export function replaceStudentDocument(
  supabase: SupabaseClient,
  document: StudentDocument,
  file: File,
): Promise<StudentDocumentUploadResult> {
  return uploadStudentDocument(supabase, {
    profileId: document.profile_id,
    documentType: document.document_type,
    customDocumentName: document.custom_document_name,
    expiresAt:
      document.expires_at &&
      document.expires_at >= new Date().toISOString().slice(0, 10)
        ? document.expires_at
        : null,
    file,
    replacesDocument: document,
  });
}

export async function getStudentDocumentDownloadUrl(
  supabase: SupabaseClient,
  document: StudentDocument,
  download = false,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STUDENT_DOCUMENTS_BUCKET)
    .createSignedUrl(
      document.storage_path,
      60 * 5,
      download ? { download: document.original_filename } : undefined,
    );
  if (error) {
    throw new Error(
      `The document file is unavailable or the signed link could not be created: ${error.message}`,
    );
  }
  return data.signedUrl;
}

export async function softDeleteStudentDocument(
  supabase: SupabaseClient,
  documentId: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("crm")
    .from("student_documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("profile_id", profileId)
    .is("deleted_at", null);
  if (error) throw error;
}

export async function reviewStudentDocument(
  supabase: SupabaseClient,
  input: StudentDocumentReviewInput,
): Promise<StudentDocument> {
  const { data, error } = await supabase.schema("crm").rpc(
    "review_student_document",
    {
      target_document_id: input.documentId,
      new_status: input.status,
      new_review_notes: input.reviewNotes?.trim() || null,
    },
  );
  if (error) throw error;
  return data as StudentDocument;
}
