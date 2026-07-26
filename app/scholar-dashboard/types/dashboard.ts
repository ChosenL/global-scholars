export type StudentDocumentStatus =
  | "uploaded"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_revision"
  | "expired";

export type StudentDocumentType =
  | "passport"
  | "transcript"
  | "degree_certificate"
  | "english_test_result"
  | "cv_resume"
  | "statement_of_purpose"
  | "recommendation_letter"
  | "financial_document"
  | "visa_document"
  | "birth_certificate"
  | "national_id"
  | "application_form"
  | "offer_letter"
  | "other";

export type AppointmentStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rescheduled";

export type MeetingType =
  | "video"
  | "phone"
  | "in_person";

export type ConversationStatus =
  | "open"
  | "resolved"
  | "archived";

export type ConversationParticipantRole =
  | "student"
  | "advisor"
  | "admin";

export type MessageType =
  | "text"
  | "file"
  | "system";

export interface StudentProfileExtension {
  profile_id: string;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  current_country: string | null;
  passport_number: string | null;
  highest_qualification: string | null;
  institution: string | null;
  gpa: number | null;
  graduation_year: number | null;
  english_test_type: string | null;
  english_test_score: number | null;
  preferred_destination_country: string | null;
  preferred_degree: string | null;
  preferred_program: string | null;
  intended_intake: string | null;
  budget: number | null;
  budget_currency: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CompleteStudentProfile {
  identity: CrmProfile;
  student: StudentProfileExtension | null;
}

export interface StudentProfileInput {
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  current_country: string | null;
  passport_number: string | null;
  highest_qualification: string | null;
  institution: string | null;
  gpa: number | null;
  graduation_year: number | null;
  english_test_type: string | null;
  english_test_score: number | null;
  preferred_destination_country: string | null;
  preferred_degree: string | null;
  preferred_program: string | null;
  intended_intake: string | null;
  budget: number | null;
  budget_currency: string | null;
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
  profile_id: string;
  document_type: StudentDocumentType;
  custom_document_name: string | null;
  original_filename: string;
  storage_bucket: "student-documents";
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  status: StudentDocumentStatus;
  review_notes: string | null;
  uploaded_by_profile_id: string;
  reviewed_by_profile_id: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  replaces_document_id: string | null;
  revision_number: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentDocumentWithUploader extends StudentDocument {
  uploader: Pick<
    CrmProfile,
    "id" | "display_name" | "role" | "avatar_url"
  >;
  reviewer:
    | Pick<CrmProfile, "id" | "display_name" | "role" | "avatar_url">
    | null;
}

export interface StudentDocumentUploadInput {
  profileId: string;
  documentType: StudentDocumentType;
  customDocumentName?: string | null;
  expiresAt?: string | null;
  file: File;
  replacesDocument?: StudentDocument | null;
}

export interface StudentDocumentReviewInput {
  documentId: string;
  status: Exclude<StudentDocumentStatus, "uploaded">;
  reviewNotes?: string | null;
}

export interface StudentDocumentUploadResult {
  document: StudentDocument;
  cleanupError: string | null;
}

export interface StudentDocumentSummary {
  totalDocuments: number;
  approvedDocuments: number;
  pendingReviewDocuments: number;
  needsRevisionDocuments: number;
}

export type StudentTaskStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "completed"
  | "cancelled";

export type StudentTaskPriority = "low" | "normal" | "high" | "urgent";
export type StudentTaskVisibility = "student" | "internal";

export interface StudentTask {
  id: string;
  student_profile_id: string;
  title: string;
  description: string | null;
  status: StudentTaskStatus;
  priority: StudentTaskPriority;
  visibility: StudentTaskVisibility;
  assigned_to_profile_id: string;
  created_by_profile_id: string;
  completed_by_profile_id: string | null;
  document_id: string | null;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type TaskProfileSummary = Pick<
  CrmProfile,
  "id" | "display_name" | "role" | "avatar_url"
>;

export interface StudentTaskWithProfiles extends StudentTask {
  assignee: TaskProfileSummary;
  creator: TaskProfileSummary;
  completer: TaskProfileSummary | null;
  document: StudentDocument | null;
}

export interface StudentTaskCreateInput {
  studentProfileId: string;
  title: string;
  description: string | null;
  priority: StudentTaskPriority;
  visibility: StudentTaskVisibility;
  assignedToProfileId: string;
  dueAt: string | null;
  documentId: string | null;
}

export interface StudentTaskUpdateInput extends Omit<
  StudentTaskCreateInput,
  "studentProfileId"
> {
  taskId: string;
}

export interface StudentTaskSummary {
  totalTasks: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  urgentTasks: number;
}

export type StudentNoteType =
  | "general"
  | "academic"
  | "financial"
  | "visa"
  | "behavior"
  | "communication"
  | "warning"
  | "follow_up";

export interface StudentNote {
  id: string;
  student_profile_id: string;
  created_by_profile_id: string;
  title: string;
  body: string;
  note_type: StudentNoteType;
  is_pinned: boolean;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentNoteWithAuthor extends StudentNote {
  author: TaskProfileSummary;
}

export interface StudentNoteCreateInput {
  studentProfileId: string;
  title: string;
  body: string;
  noteType: StudentNoteType;
}

export interface StudentNoteUpdateInput {
  noteId: string;
  title: string;
  body: string;
  noteType: StudentNoteType;
}

/* ==========================================================================
   APPOINTMENTS
   ========================================================================== */

export interface Appointment {
  id: string;

  student_id: string;
  advisor_id?: string | null;
  advisor_name?: string | null;

  title: string;
  description?: string | null;

  start_time: string;
  end_time: string;

  duration_minutes?: number | null;

  meeting_type: MeetingType;

  meeting_url?: string | null;
  location?: string | null;

  calendly_event_uri?: string | null;

  notes?: string | null;
  advisor_notes?: string | null;

  status: AppointmentStatus;

  cancelled_at?: string | null;
  cancellation_reason?: string | null;

  created_at: string;
  updated_at: string;
}

export interface CreateAppointmentInput {
  title: string;
  description?: string;

  start_time: string;
  end_time: string;

  meeting_type: MeetingType;

  meeting_url?: string;
  location?: string;

  notes?: string;
}

export interface UpdateAppointmentInput {
  title?: string;
  description?: string;

  start_time?: string;
  end_time?: string;

  meeting_type?: MeetingType;

  meeting_url?: string;
  location?: string;

  notes?: string;

  status?: AppointmentStatus;
}

/* ==========================================================================
   MESSAGING
   ========================================================================== */

export interface Conversation {
  id: string;
  subject: string;
  status: ConversationStatus;
  created_by: string;
  last_message_at: string | null;
  resolved_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  profile_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: ConversationParticipantRole;
  joined_at: string;
  last_read_at: string | null;
  muted_at: string | null;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: ConversationParticipantRole;
  message_type: MessageType;
  body: string | null;
  attachment_name: string | null;
  attachment_path: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  reply_to_message_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithDetails
  extends Conversation {
  participants: ConversationParticipant[];
  latest_message: Message | null;
  unread_count: number;
}

export interface CrmProfile {
  id: string;
  clerk_user_id: string;
  email: string | null;
  display_name: string;
  role: ConversationParticipantRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateConversationInput {
  subject: string;
}

export interface SendMessageInput {
  conversationId: string;
  body: string;
  replyToMessageId?: string;
}

export interface SendFileMessageInput {
  conversationId: string;
  file: File;
  replyToMessageId?: string;
}

export interface UploadedMessageAttachment {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
}

export interface SendFileMessageResult {
  message: Message;
  attachment: UploadedMessageAttachment;
}

export interface UpdateMessageInput {
  messageId: string;
  body: string;
}
