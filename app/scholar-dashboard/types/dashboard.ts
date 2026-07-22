export type DocumentStatus =
  | "pending"
  | "approved"
  | "rejected";

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
  user_id: string;
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
  sender_id: string;
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

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface ConversationWithDetails
  extends Conversation {
  participants: ConversationParticipant[];
  latest_message: Message | null;
  unread_count: number;
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

export interface UploadMessageAttachmentInput {
  conversationId: string;
  senderId: string;
  file: File;
}

export interface UploadedMessageAttachment {
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

export interface MarkConversationReadInput {
  conversationId: string;
  messageIds: string[];
}

export interface MessagingState {
  conversations: ConversationWithDetails[];
  activeConversation: ConversationWithDetails | null;
  messages: Message[];

  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  isSendingAttachment: boolean;
  isCreatingConversation: boolean;

  uploadingAttachmentName: string | null;

  error: string | null;
  successMessage: string | null;
}