import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ReplaceStudentDocumentInput,
  StudentDocument,
  UploadStudentDocumentInput,
  UploadStudentDocumentResult,
} from "../types/dashboard";

const DOCUMENTS_BUCKET = "student-documents";

function sanitizeFileName(fileName: string): string {
  const sanitized = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "document";
}

function createStoragePath(studentId: string, fileName: string): string {
  return `${studentId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

async function uploadFile(
  supabase: SupabaseClient,
  storagePath: string,
  file: File,
): Promise<void> {
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    throw error;
  }
}

export async function listStudentDocuments(
  supabase: SupabaseClient,
  studentId: string,
): Promise<StudentDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as StudentDocument[];
}

export async function uploadStudentDocument(
  supabase: SupabaseClient,
  input: UploadStudentDocumentInput,
): Promise<UploadStudentDocumentResult> {
  const storagePath = createStoragePath(input.studentId, input.file.name);

  await uploadFile(supabase, storagePath, input.file);

  const { data, error } = await supabase
    .from("documents")
    .insert({
      student_id: input.studentId,
      name: input.documentName,
      file_name: input.file.name,
      file_path: storagePath,
      file_type: input.file.type || null,
      file_size: input.file.size,
      status: "pending",
      rejection_reason: null,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throw error;
  }

  return {
    document: data as StudentDocument,
  };
}

export async function replaceStudentDocument(
  supabase: SupabaseClient,
  input: ReplaceStudentDocumentInput,
): Promise<StudentDocument> {
  const newStoragePath = createStoragePath(
    input.document.student_id,
    input.file.name,
  );

  await uploadFile(supabase, newStoragePath, input.file);

  const { data, error } = await supabase
    .from("documents")
    .update({
      file_name: input.file.name,
      file_path: newStoragePath,
      file_type: input.file.type || null,
      file_size: input.file.size,
      status: "pending",
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.document.id)
    .eq("student_id", input.document.student_id)
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([newStoragePath]);
    throw error;
  }

  const { error: oldFileRemovalError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([input.document.file_path]);

  if (oldFileRemovalError) {
    console.warn(
      "The replacement succeeded, but the previous storage file could not be removed:",
      oldFileRemovalError,
    );
  }

  return data as StudentDocument;
}

export async function deleteStudentDocument(
  supabase: SupabaseClient,
  document: StudentDocument,
): Promise<void> {
  const { error: databaseError } = await supabase
    .from("documents")
    .delete()
    .eq("id", document.id)
    .eq("student_id", document.student_id);

  if (databaseError) {
    throw databaseError;
  }

  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([document.file_path]);

  if (storageError) {
    console.warn(
      "The document record was deleted, but its storage file could not be removed:",
      storageError,
    );
  }
}

export async function createStudentDocumentUrl(
  supabase: SupabaseClient,
  document: StudentDocument,
  download = false,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(
      document.file_path,
      60,
      download
        ? {
            download: document.file_name,
          }
        : undefined,
    );

  if (error) {
    throw error;
  }

  return data.signedUrl;
}