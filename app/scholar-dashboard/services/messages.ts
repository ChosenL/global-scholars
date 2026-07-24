import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Conversation,
  ConversationParticipant,
  ConversationParticipantRole,
  ConversationWithDetails,
  CreateConversationInput,
  CrmProfile,
  Message,
  SendFileMessageInput,
  SendFileMessageResult,
  SendMessageInput,
  UploadedMessageAttachment,
  UpdateMessageInput,
} from "../types/dashboard";

const MAX_MESSAGE_LENGTH = 10_000;
const MAX_SUBJECT_LENGTH = 200;
const MESSAGE_PAGE_SIZE = 50;

export const MESSAGE_ATTACHMENT_BUCKET = "message-attachments";
export const MAX_MESSAGE_ATTACHMENT_SIZE = 50 * 1024 * 1024;
export const MESSAGE_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 10;
export const ACCEPTED_MESSAGE_ATTACHMENT_EXTENSIONS =
  ".pdf,.doc,.docx,.csv,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip";

const acceptedMessageAttachmentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
  "application/zip",
]);

interface RawProfile {
  id: string;
  clerk_user_id: string;
  display_name: string;
  role: ConversationParticipantRole;
  avatar_url: string | null;
}

interface RawParticipant {
  id: string;
  conversation_id: string;
  profile_id: string;
  participant_role: ConversationParticipantRole;
  joined_at: string;
  last_read_at: string | null;
  muted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  profile: RawProfile | RawProfile[] | null;
}

interface RawAttachment {
  id: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  deleted_at: string | null;
}

interface RawMessage {
  id: string;
  conversation_id: string;
  sender_profile_id: string;
  message_type: "text" | "file" | "system";
  body: string | null;
  reply_to_message_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  sender: RawProfile | RawProfile[] | null;
  attachments: RawAttachment[] | null;
}

interface RawConversation {
  id: string;
  created_by_profile_id: string;
  subject: string;
  status: "open" | "resolved" | "archived";
  last_message_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  creator?: Pick<RawProfile, "clerk_user_id"> | Array<Pick<RawProfile, "clerk_user_id">> | null;
}

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function mapParticipant(row: RawParticipant): ConversationParticipant {
  const profile = firstRelation(row.profile);

  if (!profile) {
    throw new Error("A conversation participant is missing its profile.");
  }

  return {
    id: row.id,
    conversation_id: row.conversation_id,
    profile_id: row.profile_id,
    user_id: profile.clerk_user_id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    role: profile.role,
    joined_at: row.joined_at,
    last_read_at: row.last_read_at,
    muted_at: row.muted_at,
    removed_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapMessage(row: RawMessage): Message {
  const sender = firstRelation(row.sender);

  if (!sender) {
    throw new Error("A message is missing its sender profile.");
  }

  const attachment = (row.attachments ?? []).find(
    (item) => !item.deleted_at,
  );

  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_profile_id: row.sender_profile_id,
    sender_id: sender.clerk_user_id,
    sender_name: sender.display_name,
    sender_role: sender.role,
    message_type: row.message_type,
    body: row.body,
    attachment_name: attachment?.filename ?? null,
    attachment_path: attachment?.storage_path ?? null,
    attachment_type: attachment?.mime_type ?? null,
    attachment_size: attachment?.byte_size ?? null,
    reply_to_message_id: row.reply_to_message_id,
    edited_at: row.edited_at,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapConversation(row: RawConversation): Conversation {
  const creator = firstRelation(row.creator);

  return {
    id: row.id,
    subject: row.subject,
    status: row.status,
    created_by: creator?.clerk_user_id ?? row.created_by_profile_id,
    last_message_at: row.last_message_at,
    resolved_at: row.resolved_at,
    archived_at: row.status === "archived" ? row.updated_at : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function sanitizeAttachmentFileName(fileName: string): string {
  const safeName = fileName
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  return safeName || "attachment";
}

function buildMessageAttachmentPath(
  conversationId: string,
  profileId: string,
  fileName: string,
): string {
  return [
    "messages",
    conversationId,
    profileId,
    `${crypto.randomUUID()}-${sanitizeAttachmentFileName(fileName)}`,
  ].join("/");
}

function normalizeSubject(subject: string): string {
  const normalized = subject.trim() || "General Support";

  if (normalized.length > MAX_SUBJECT_LENGTH) {
    throw new Error(
      `Conversation subjects cannot exceed ${MAX_SUBJECT_LENGTH} characters.`,
    );
  }

  return normalized;
}

function normalizeMessageBody(body: string): string {
  const normalized = body.trim();

  if (!normalized) {
    throw new Error("Please enter a message.");
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Messages cannot exceed ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`,
    );
  }

  return normalized;
}

function messageSelect(): string {
  return [
    "*",
    "sender:profiles!messages_sender_profile_id_fkey(id,clerk_user_id,display_name,role,avatar_url)",
    "attachments(id,storage_path,filename,mime_type,byte_size,deleted_at)",
  ].join(",");
}

async function listParticipants(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<ConversationParticipant[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("conversation_participants")
    .select(
      "*,profile:profiles!conversation_participants_profile_id_fkey(id,clerk_user_id,display_name,role,avatar_url)",
    )
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as RawParticipant[]).map(mapParticipant);
}

async function getLatestMessage(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Message | null> {
  const { data, error } = await supabase
    .schema("crm")
    .from("messages")
    .select(messageSelect())
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? mapMessage(data as unknown as RawMessage)
    : null;
}

async function countUnreadMessages(
  supabase: SupabaseClient,
  conversationId: string,
  currentProfile: CrmProfile,
  lastReadAt: string | null,
): Promise<number> {
  let query = supabase
    .schema("crm")
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .neq("sender_profile_id", currentProfile.id)
    .is("deleted_at", null);

  if (lastReadAt) {
    query = query.gt("created_at", lastReadAt);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export function validateMessageAttachmentFile(file: File): string {
  if (!acceptedMessageAttachmentTypes.has(file.type)) {
    return "Upload a supported document, image, spreadsheet, presentation, text, or ZIP file.";
  }

  if (file.size === 0) {
    return "The selected file is empty.";
  }

  if (file.size > MAX_MESSAGE_ATTACHMENT_SIZE) {
    return "The file must be 50 MB or smaller.";
  }

  return "";
}

export async function listStudentConversations(
  supabase: SupabaseClient,
  currentProfile: CrmProfile,
): Promise<ConversationWithDetails[]> {
  const crm = supabase.schema("crm");
  const membershipResult = await crm
    .from("conversation_participants")
    .select("conversation_id")
    .eq("profile_id", currentProfile.id)
    .is("deleted_at", null);

  if (membershipResult.error) {
    throw membershipResult.error;
  }

  const conversationIds = (membershipResult.data ?? []).map(
    (row) => row.conversation_id as string,
  );

  if (conversationIds.length === 0) {
    return [];
  }

  const conversationsResult = await crm
    .from("conversations")
    .select(
      "*,creator:profiles!conversations_created_by_profile_id_fkey(clerk_user_id)",
    )
    .in("id", conversationIds)
    .is("deleted_at", null)
    .order("last_message_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (conversationsResult.error) {
    throw conversationsResult.error;
  }

  return Promise.all(
    ((conversationsResult.data ?? []) as RawConversation[]).map(
      async (row): Promise<ConversationWithDetails> => {
        const participants = await listParticipants(supabase, row.id);
        const currentMembership = participants.find(
          (participant) => participant.profile_id === currentProfile.id,
        );
        const [latestMessage, unreadCount] = await Promise.all([
          getLatestMessage(supabase, row.id),
          countUnreadMessages(
            supabase,
            row.id,
            currentProfile,
            currentMembership?.last_read_at ?? null,
          ),
        ]);

        return {
          ...mapConversation(row),
          participants,
          latest_message: latestMessage,
          unread_count: unreadCount,
        };
      },
    ),
  );
}

export async function getConversation(
  supabase: SupabaseClient,
  conversationId: string,
  currentProfile: CrmProfile,
): Promise<ConversationWithDetails> {
  const { data, error } = await supabase
    .schema("crm")
    .from("conversations")
    .select(
      "*,creator:profiles!conversations_created_by_profile_id_fkey(clerk_user_id)",
    )
    .eq("id", conversationId)
    .is("deleted_at", null)
    .single();

  if (error) {
    throw error;
  }

  const participants = await listParticipants(supabase, conversationId);
  const currentMembership = participants.find(
    (participant) => participant.profile_id === currentProfile.id,
  );
  const [latestMessage, unreadCount] = await Promise.all([
    getLatestMessage(supabase, conversationId),
    countUnreadMessages(
      supabase,
      conversationId,
      currentProfile,
      currentMembership?.last_read_at ?? null,
    ),
  ]);

  return {
    ...mapConversation(data as RawConversation),
    participants,
    latest_message: latestMessage,
    unread_count: unreadCount,
  };
}

export async function createStudentConversation(
  supabase: SupabaseClient,
  input: CreateConversationInput,
): Promise<Conversation> {
  const crm = supabase.schema("crm");
  const conversationResult = await crm.rpc(
    "create_student_conversation",
    {
      conversation_subject: normalizeSubject(input.subject),
    },
  );

  if (conversationResult.error) {
    throw conversationResult.error;
  }

  if (!conversationResult.data) {
    throw new Error("The conversation could not be created.");
  }

  return mapConversation(
    conversationResult.data as unknown as RawConversation,
  );
}

export async function listConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  cursor?: string | null,
): Promise<MessagePage> {
  let query = supabase
    .schema("crm")
    .from("messages")
    .select(messageSelect())
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE + 1);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as RawMessage[];
  const hasMore = rows.length > MESSAGE_PAGE_SIZE;
  const pageRows = rows.slice(0, MESSAGE_PAGE_SIZE);
  const messages = pageRows.map(mapMessage).reverse();

  return {
    messages,
    hasMore,
    nextCursor: hasMore ? messages[0]?.created_at ?? null : null,
  };
}

export async function uploadMessageAttachment(
  supabase: SupabaseClient,
  currentProfile: CrmProfile,
  conversationId: string,
  file: File,
): Promise<Omit<UploadedMessageAttachment, "id">> {
  const validationError = validateMessageAttachmentFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const path = buildMessageAttachmentPath(
    conversationId,
    currentProfile.id,
    file.name,
  );
  const { error } = await supabase.storage
    .from(MESSAGE_ATTACHMENT_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return {
    name: file.name,
    path,
    type: file.type,
    size: file.size,
  };
}

export async function sendConversationFileMessage(
  supabase: SupabaseClient,
  currentProfile: CrmProfile,
  input: SendFileMessageInput,
  onProgress?: (progress: number) => void,
): Promise<SendFileMessageResult> {
  onProgress?.(10);
  const uploaded = await uploadMessageAttachment(
    supabase,
    currentProfile,
    input.conversationId,
    input.file,
  );
  onProgress?.(70);
  const crm = supabase.schema("crm");
  const messageResult = await crm
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_profile_id: currentProfile.id,
      message_type: "file",
      body: null,
      reply_to_message_id: input.replyToMessageId ?? null,
    })
    .select(messageSelect())
    .single();

  if (messageResult.error) {
    await supabase.storage
      .from(MESSAGE_ATTACHMENT_BUCKET)
      .remove([uploaded.path]);
    throw messageResult.error;
  }

  onProgress?.(85);
  const rawCreatedMessage =
    messageResult.data as unknown as RawMessage;
  const messageId = rawCreatedMessage.id;
  const attachmentResult = await crm
    .from("attachments")
    .insert({
      message_id: messageId,
      uploaded_by_profile_id: currentProfile.id,
      storage_bucket: MESSAGE_ATTACHMENT_BUCKET,
      storage_path: uploaded.path,
      filename: uploaded.name,
      mime_type: uploaded.type || "application/octet-stream",
      byte_size: uploaded.size,
    })
    .select("id")
    .single();

  if (attachmentResult.error) {
    await Promise.all([
      crm
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", messageId),
      supabase.storage
        .from(MESSAGE_ATTACHMENT_BUCKET)
        .remove([uploaded.path]),
    ]);
    throw attachmentResult.error;
  }

  onProgress?.(100);
  return {
    message: mapMessage({
      ...rawCreatedMessage,
      attachments: [
        {
          id: attachmentResult.data.id as string,
          storage_path: uploaded.path,
          filename: uploaded.name,
          mime_type: uploaded.type || "application/octet-stream",
          byte_size: uploaded.size,
          deleted_at: null,
        },
      ],
    }),
    attachment: {
      id: attachmentResult.data.id as string,
      ...uploaded,
    },
  };
}

export async function sendConversationMessage(
  supabase: SupabaseClient,
  currentProfile: CrmProfile,
  input: SendMessageInput,
): Promise<Message> {
  const { data, error } = await supabase
    .schema("crm")
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_profile_id: currentProfile.id,
      message_type: "text",
      body: normalizeMessageBody(input.body),
      reply_to_message_id: input.replyToMessageId ?? null,
    })
    .select(messageSelect())
    .single();

  if (error) {
    throw error;
  }

  return mapMessage(data as unknown as RawMessage);
}

export async function updateConversationMessage(
  supabase: SupabaseClient,
  currentProfile: CrmProfile,
  input: UpdateMessageInput,
): Promise<Message> {
  const { data, error } = await supabase
    .schema("crm")
    .from("messages")
    .update({ body: normalizeMessageBody(input.body) })
    .eq("id", input.messageId)
    .eq("sender_profile_id", currentProfile.id)
    .eq("message_type", "text")
    .is("deleted_at", null)
    .select(messageSelect())
    .single();

  if (error) {
    throw error;
  }

  return mapMessage(data as unknown as RawMessage);
}

export async function deleteConversationMessage(
  supabase: SupabaseClient,
  currentProfile: CrmProfile,
  messageId: string,
): Promise<Message> {
  const crm = supabase.schema("crm");
  const existingResult = await crm
    .from("messages")
    .select(messageSelect())
    .eq("id", messageId)
    .eq("sender_profile_id", currentProfile.id)
    .is("deleted_at", null)
    .single();

  if (existingResult.error) {
    throw existingResult.error;
  }

  const existing =
    existingResult.data as unknown as RawMessage;
  const deletedAt = new Date().toISOString();
  const updateResult = await crm
    .from("messages")
    .update({ deleted_at: deletedAt })
    .eq("id", messageId)
    .eq("sender_profile_id", currentProfile.id)
    .select(messageSelect())
    .single();

  if (updateResult.error) {
    throw updateResult.error;
  }

  const attachments = (existing.attachments ?? []).filter(
    (attachment) => !attachment.deleted_at,
  );

  if (attachments.length > 0) {
    await crm
      .from("attachments")
      .update({ deleted_at: deletedAt })
      .in(
        "id",
        attachments.map((attachment) => attachment.id),
      );
    await supabase.storage
      .from(MESSAGE_ATTACHMENT_BUCKET)
      .remove(attachments.map((attachment) => attachment.storage_path));
  }

  return mapMessage(
    updateResult.data as unknown as RawMessage,
  );
}

function requireAttachmentPath(message: Message): string {
  const path = message.attachment_path?.trim();

  if (!path) {
    throw new Error("This message does not contain an attachment.");
  }

  return path;
}

export async function getMessageAttachmentUrl(
  supabase: SupabaseClient,
  message: Message,
  options?: {
    download?: boolean;
    expiresInSeconds?: number;
  },
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(MESSAGE_ATTACHMENT_BUCKET)
    .createSignedUrl(
      requireAttachmentPath(message),
      options?.expiresInSeconds ??
        MESSAGE_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
      options?.download
        ? { download: message.attachment_name?.trim() || true }
        : undefined,
    );

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function markConversationAsRead(
  supabase: SupabaseClient,
  currentProfile: CrmProfile,
  conversationId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("crm")
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", currentProfile.id)
    .is("deleted_at", null);

  if (error) {
    throw error;
  }
}

export async function updateConversationStatus(
  supabase: SupabaseClient,
  conversationId: string,
  status: Conversation["status"],
): Promise<Conversation> {
  const { data, error } = await supabase
    .schema("crm")
    .from("conversations")
    .update({
      status,
      resolved_at:
        status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", conversationId)
    .is("deleted_at", null)
    .select(
      "*,creator:profiles!conversations_created_by_profile_id_fkey(clerk_user_id)",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapConversation(data as RawConversation);
}
