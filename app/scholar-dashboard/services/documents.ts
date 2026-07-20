import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StudentDocument,
  UploadStudentDocumentInput,
  UploadStudentDocumentResult,
} from "../types/dashboard";

const DOCUMENTS_BUCKET = "student-documents";

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
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
  const safeFileName = sanitizeFileName(input.file.name);
  const storagePath = `${input.studentId}/${crypto.randomUUID()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, input.file, {
      cacheControl: "3600",
      contentType: input.file.type || undefined,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error: insertError } = await supabase
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

  if (insertError) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    throw insertError;
  }

  return { document: data as StudentDocument };
}

export async function deleteStudentDocument(
  supabase: SupabaseClient,
  document: StudentDocument,
): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([document.file_path]);

  if (storageError) {
    throw storageError;
  }

  const { error: databaseError } = await supabase
    .from("documents")
    .delete()
    .eq("id", document.id)
    .eq("student_id", document.student_id);

  if (databaseError) {
    throw databaseError;
  }
}

export async function createStudentDocumentDownloadUrl(
  supabase: SupabaseClient,
  document: StudentDocument,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(document.file_path, 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
