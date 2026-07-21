import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Conversation,
  ConversationParticipant,
  ConversationWithDetails,
  CreateConversationInput,
  Message,
  MessageReadReceipt,
  SendMessageInput,
  UpdateMessageInput,
} from "../types/dashboard";

const MAX_MESSAGE_LENGTH = 5_000;
const MAX_SUBJECT_LENGTH = 150;

function normalizeSubject(subject: string): string {
  const normalizedSubject = subject.trim();

  if (!normalizedSubject) {
    return "General Support";
  }

  if (normalizedSubject.length > MAX_SUBJECT_LENGTH) {
    throw new Error(
      `Conversation subjects cannot exceed ${MAX_SUBJECT_LENGTH} characters.`,
    );
  }

  return normalizedSubject;
}

function normalizeMessageBody(body: string): string {
  const normalizedBody = body.trim();

  if (!normalizedBody) {
    throw new Error("Please enter a message.");
  }

  if (normalizedBody.length > MAX_MESSAGE_LENGTH) {
    throw new Error(
      `Messages cannot exceed ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`,
    );
  }

  return normalizedBody;
}

function sortConversations(
  conversations: ConversationWithDetails[],
): ConversationWithDetails[] {
  return [...conversations].sort((firstConversation, secondConversation) => {
    const firstTimestamp = new Date(
      firstConversation.last_message_at ?? firstConversation.created_at,
    ).getTime();

    const secondTimestamp = new Date(
      secondConversation.last_message_at ?? secondConversation.created_at,
    ).getTime();

    return secondTimestamp - firstTimestamp;
  });
}

export async function listStudentConversations(
  supabase: SupabaseClient,
  userId: string,
): Promise<ConversationWithDetails[]> {
  const { data: participantRows, error: participantError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .is("removed_at", null);

  if (participantError) {
    throw participantError;
  }

  const conversationIds = (participantRows ?? []).map(
    (participant) => participant.conversation_id as string,
  );

  if (conversationIds.length === 0) {
    return [];
  }

  const [
    conversationsResult,
    participantsResult,
    messagesResult,
    receiptsResult,
  ] = await Promise.all([
    supabase
      .from("conversations")
      .select("*")
      .in("id", conversationIds),

    supabase
      .from("conversation_participants")
      .select("*")
      .in("conversation_id", conversationIds)
      .is("removed_at", null),

    supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    supabase
      .from("message_read_receipts")
      .select("*")
      .eq("user_id", userId),
  ]);

  if (conversationsResult.error) {
    throw conversationsResult.error;
  }

  if (participantsResult.error) {
    throw participantsResult.error;
  }

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  if (receiptsResult.error) {
    throw receiptsResult.error;
  }

  const conversations = (conversationsResult.data ?? []) as Conversation[];
  const participants = (participantsResult.data ??
    []) as ConversationParticipant[];
  const messages = (messagesResult.data ?? []) as Message[];
  const receipts = (receiptsResult.data ?? []) as MessageReadReceipt[];

  const readMessageIds = new Set(
    receipts.map((receipt) => receipt.message_id),
  );

  const conversationDetails = conversations.map(
    (conversation): ConversationWithDetails => {
      const conversationMessages = messages.filter(
        (message) => message.conversation_id === conversation.id,
      );

      const unreadCount = conversationMessages.filter(
        (message) =>
          message.sender_id !== userId && !readMessageIds.has(message.id),
      ).length;

      return {
        ...conversation,
        participants: participants.filter(
          (participant) =>
            participant.conversation_id === conversation.id,
        ),
        latest_message: conversationMessages[0] ?? null,
        unread_count: unreadCount,
      };
    },
  );

  return sortConversations(conversationDetails);
}

export async function getConversation(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<ConversationWithDetails> {
  const [
    conversationResult,
    participantsResult,
    messagesResult,
    receiptsResult,
  ] = await Promise.all([
    supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single(),

    supabase
      .from("conversation_participants")
      .select("*")
      .eq("conversation_id", conversationId)
      .is("removed_at", null),

    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    supabase
      .from("message_read_receipts")
      .select("*")
      .eq("user_id", userId),
  ]);

  if (conversationResult.error) {
    throw conversationResult.error;
  }

  if (participantsResult.error) {
    throw participantsResult.error;
  }

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  if (receiptsResult.error) {
    throw receiptsResult.error;
  }

  const messages = (messagesResult.data ?? []) as Message[];
  const readMessageIds = new Set(
    ((receiptsResult.data ?? []) as MessageReadReceipt[]).map(
      (receipt) => receipt.message_id,
    ),
  );

  return {
    ...(conversationResult.data as Conversation),
    participants: (participantsResult.data ??
      []) as ConversationParticipant[],
    latest_message: messages[0] ?? null,
    unread_count: messages.filter(
      (message) =>
        message.sender_id !== userId && !readMessageIds.has(message.id),
    ).length,
  };
}

export async function createStudentConversation(
  supabase: SupabaseClient,
  input: CreateConversationInput,
): Promise<Conversation> {
  const subject = normalizeSubject(input.subject);

  const { data, error } = await supabase.rpc(
    "create_student_conversation",
    {
      conversation_subject: subject,
    },
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("The conversation could not be created.");
  }

  return data as Conversation;
}

export async function listConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Message[];
}

export async function sendConversationMessage(
  supabase: SupabaseClient,
  senderId: string,
  input: SendMessageInput,
): Promise<Message> {
  const body = normalizeMessageBody(input.body);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: senderId,
      message_type: "text",
      body,
      attachment_name: null,
      attachment_path: null,
      attachment_type: null,
      attachment_size: null,
      reply_to_message_id: input.replyToMessageId ?? null,
      edited_at: null,
      deleted_at: null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Message;
}

export async function updateConversationMessage(
  supabase: SupabaseClient,
  senderId: string,
  input: UpdateMessageInput,
): Promise<Message> {
  const body = normalizeMessageBody(input.body);

  const { data, error } = await supabase
    .from("messages")
    .update({
      body,
      edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.messageId)
    .eq("sender_id", senderId)
    .eq("message_type", "text")
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Message;
}

export async function deleteConversationMessage(
  supabase: SupabaseClient,
  senderId: string,
  messageId: string,
): Promise<Message> {
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from("messages")
    .update({
      body: "This message was deleted.",
      attachment_name: null,
      attachment_path: null,
      attachment_type: null,
      attachment_size: null,
      deleted_at: timestamp,
      updated_at: timestamp,
    })
    .eq("id", messageId)
    .eq("sender_id", senderId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Message;
}

export async function markConversationAsRead(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  messages: Message[],
): Promise<void> {
  const unreadMessages = messages.filter(
    (message) =>
      message.conversation_id === conversationId &&
      message.sender_id !== userId &&
      !message.deleted_at,
  );

  if (unreadMessages.length === 0) {
    return;
  }

  const readAt = new Date().toISOString();

  const receiptRows = unreadMessages.map((message) => ({
    message_id: message.id,
    user_id: userId,
    read_at: readAt,
  }));

  const { error: receiptError } = await supabase
    .from("message_read_receipts")
    .upsert(receiptRows, {
      onConflict: "message_id,user_id",
    });

  if (receiptError) {
    throw receiptError;
  }

  const { error: participantError } = await supabase
    .from("conversation_participants")
    .update({
      last_read_at: readAt,
      updated_at: readAt,
    })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  if (participantError) {
    throw participantError;
  }
}

export async function updateConversationStatus(
  supabase: SupabaseClient,
  conversationId: string,
  status: Conversation["status"],
): Promise<Conversation> {
  const timestamp = new Date().toISOString();

  const updatePayload: {
    status: Conversation["status"];
    resolved_at: string | null;
    archived_at: string | null;
    updated_at: string;
  } = {
    status,
    resolved_at: status === "resolved" ? timestamp : null,
    archived_at: status === "archived" ? timestamp : null,
    updated_at: timestamp,
  };

  const { data, error } = await supabase
    .from("conversations")
    .update(updatePayload)
    .eq("id", conversationId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as Conversation;
}