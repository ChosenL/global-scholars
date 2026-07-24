export type PortalRole = "student" | "advisor" | "admin";

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  displayName: string;
  role: PortalRole;
  isTyping: boolean;
  updatedAt: string;
}


export interface TypingEvent {
  conversationId: string;
  userId: string;
  displayName: string;
  role: PortalRole;
  isTyping: boolean;
  sentAt: string;
}
