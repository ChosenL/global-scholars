export type DocumentStatus = "pending" | "approved" | "rejected";

export interface StudentProfile {
  id?: string;
  user_id: string;
  full_name: string;
  email: string | null;
  profile_image_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApplicationProgress {
  id?: string;
  student_id: string;
  current_stage: string;
  progress_percent: number;
  created_at?: string;
  updated_at?: string;
}

export interface StudentDocument {
  id: string;
  student_id: string;
  name: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  status: DocumentStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadStudentDocumentInput {
  studentId: string;
  documentName: string;
  file: File;
}

export interface ReplaceStudentDocumentInput {
  document: StudentDocument;
  file: File;
}

export interface UploadStudentDocumentResult {
  document: StudentDocument;
}