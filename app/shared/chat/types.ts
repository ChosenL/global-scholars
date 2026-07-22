export type PortalRole = "student" | "advisor" | "admin";

export type ConversationStatus = "open" | "closed" | "archived";

export type MessageDeliveryStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type AttachmentKind =
  | "image"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "audio"
  | "video"
  | "other";

export interface ChatParticipant {
  id: string;
  displayName: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: PortalRole;
  isOnline?: boolean;
  lastSeenAt?: string | null;
}

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  downloadUrl?: string | null;
  mimeType: string;
  sizeBytes?: number | null;
  kind: AttachmentKind;
  width?: number | null;
  height?: number | null;
  thumbnailUrl?: string | null;
  createdAt?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: PortalRole;
  body: string;
  attachments: ChatAttachment[];
  createdAt: string;
  updatedAt?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  deliveryStatus?: MessageDeliveryStatus;
  isOwnMessage?: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
  participantIds: string[];
  participants?: ChatParticipant[];
  status: ConversationStatus;
  lastMessage?: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
  createdAt?: string | null;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  displayName: string;
  role: PortalRole;
  isTyping: boolean;
  updatedAt: string;
}

export interface PendingAttachment {
  id: string;
  file: File;
  previewUrl?: string | null;
  kind: AttachmentKind;
  uploadProgress: number;
  status: "pending" | "uploading" | "uploaded" | "failed";
  error?: string | null;
}

export interface SendMessagePayload {
  conversationId: string;
  body: string;
  attachments?: ChatAttachment[];
}

export interface CreateConversationPayload {
  participantIds: string[];
  title?: string;
}

export interface ChatPagination {
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface ChatWorkspaceState {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isLoadingOlderMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;
}

export interface CRMChatWorkspaceProps {
  portalRole: PortalRole;
  currentUserId: string;
  selectedParticipantId?: string | null;
  selectedParticipantName?: string | null;
  className?: string;
  fixedHeightClassName?: string;
}

export function getAttachmentKind(
  mimeType: string,
  fileName = "",
): AttachmentKind {
  const normalizedMimeType = mimeType.toLowerCase();
  const normalizedFileName = fileName.toLowerCase();

  if (normalizedMimeType.startsWith("image/")) {
    return "image";
  }

  if (normalizedMimeType === "application/pdf") {
    return "pdf";
  }

  if (normalizedMimeType.startsWith("audio/")) {
    return "audio";
  }

  if (normalizedMimeType.startsWith("video/")) {
    return "video";
  }

  if (
    normalizedMimeType.includes("spreadsheet") ||
    normalizedMimeType.includes("excel") ||
    normalizedFileName.endsWith(".csv") ||
    normalizedFileName.endsWith(".xls") ||
    normalizedFileName.endsWith(".xlsx")
  ) {
    return "spreadsheet";
  }

  if (
    normalizedMimeType.includes("presentation") ||
    normalizedMimeType.includes("powerpoint") ||
    normalizedFileName.endsWith(".ppt") ||
    normalizedFileName.endsWith(".pptx")
  ) {
    return "presentation";
  }

  if (
    normalizedMimeType.includes("zip") ||
    normalizedMimeType.includes("archive") ||
    normalizedFileName.endsWith(".zip") ||
    normalizedFileName.endsWith(".rar") ||
    normalizedFileName.endsWith(".7z")
  ) {
    return "archive";
  }

  if (
    normalizedMimeType.startsWith("text/") ||
    normalizedMimeType.includes("word") ||
    normalizedMimeType.includes("document") ||
    normalizedFileName.endsWith(".doc") ||
    normalizedFileName.endsWith(".docx") ||
    normalizedFileName.endsWith(".txt")
  ) {
    return "document";
  }

  return "other";
}

export function formatFileSize(
  sizeBytes?: number | null,
): string {
  if (
    sizeBytes === null ||
    sizeBytes === undefined ||
    sizeBytes < 0
  ) {
    return "Unknown size";
  }

  if (sizeBytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(sizeBytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = sizeBytes / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${
    units[unitIndex]
  }`;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  displayName: string;
  role: PortalRole;
  isTyping: boolean;
  sentAt: string;
}
