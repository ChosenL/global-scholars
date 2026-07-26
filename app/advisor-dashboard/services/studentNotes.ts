import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  StudentNote,
  StudentNoteCreateInput,
  StudentNoteType,
  StudentNoteUpdateInput,
  StudentNoteWithAuthor,
  TaskProfileSummary,
} from "@/app/scholar-dashboard/types/dashboard";

export const NOTE_TYPE_LABELS: Record<StudentNoteType, string> = {
  general: "General",
  academic: "Academic",
  financial: "Financial",
  visa: "Visa",
  behavior: "Behavior",
  communication: "Communication",
  warning: "Warning",
  follow_up: "Follow-up",
};

interface RawNote extends StudentNote {
  author: TaskProfileSummary | TaskProfileSummary[] | null;
}

export async function fetchStudentNotes(
  supabase: SupabaseClient,
  studentProfileId: string,
): Promise<StudentNoteWithAuthor[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("student_notes")
    .select("*,author:profiles!student_notes_creator_fkey(id,display_name,role,avatar_url)")
    .eq("student_profile_id", studentProfileId)
    .is("deleted_at", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as RawNote[]).map((note) => {
    const author = Array.isArray(note.author) ? note.author[0] : note.author;
    if (!author) throw new Error("Note author identity is unavailable.");
    return { ...note, author };
  });
}

export async function createStudentNote(
  supabase: SupabaseClient,
  input: StudentNoteCreateInput,
): Promise<StudentNote> {
  const { data, error } = await supabase.schema("crm").rpc("create_student_note", {
    target_student_profile_id: input.studentProfileId,
    note_title: input.title,
    note_body: input.body,
    new_note_type: input.noteType,
  });
  if (error) throw error;
  return data as StudentNote;
}

export async function updateStudentNote(
  supabase: SupabaseClient,
  input: StudentNoteUpdateInput,
): Promise<StudentNote> {
  const { data, error } = await supabase.schema("crm").rpc("update_student_note", {
    target_note_id: input.noteId,
    note_title: input.title,
    note_body: input.body,
    new_note_type: input.noteType,
  });
  if (error) throw error;
  return data as StudentNote;
}

export async function pinStudentNote(
  supabase: SupabaseClient,
  noteId: string,
  isPinned: boolean,
): Promise<StudentNote> {
  const { data, error } = await supabase.schema("crm").rpc("pin_student_note", {
    target_note_id: noteId,
    new_is_pinned: isPinned,
  });
  if (error) throw error;
  return data as StudentNote;
}

export async function softDeleteStudentNote(
  supabase: SupabaseClient,
  noteId: string,
): Promise<void> {
  const { error } = await supabase.schema("crm").rpc("soft_delete_student_note", {
    target_note_id: noteId,
  });
  if (error) throw error;
}
