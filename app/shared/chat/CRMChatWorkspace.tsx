"use client";

import { useMemo, useState } from "react";

import ChatHeader from "./ChatHeader";
import ConversationSidebar from "./ConversationSidebar";
import MessageComposer from "./MessageComposer";
import MessageList from "./MessageList";

import {
  getAttachmentKind,
  type ChatMessage,
  type ChatParticipant,
  type ConversationSummary,
  type CRMChatWorkspaceProps,
} from "./types";

interface WorkspaceSessionProps extends CRMChatWorkspaceProps {
  participantId: string;
  participantName: string;
}

interface InitialWorkspaceState {
  messages: ChatMessage[];
  conversations: ConversationSummary[];
  activeConversationId: string;
}

function createConversationId(participantId: string): string {
  return `conversation-${participantId}`;
}

function getCurrentUserName(
  portalRole: CRMChatWorkspaceProps["portalRole"],
): string {
  switch (portalRole) {
    case "advisor":
      return "Advisor";
    case "admin":
      return "Administrator";
    case "student":
      return "Student";
  }
}

function createInitialWorkspaceState({
  currentUserId,
  participantId,
  participantName,
  portalRole,
}: Pick<
  WorkspaceSessionProps,
  "currentUserId" | "participantId" | "participantName" | "portalRole"
>): InitialWorkspaceState {
  const conversationId = createConversationId(participantId);
  const now = Date.now();
  const messages: ChatMessage[] = [
    {
      id: `${conversationId}-message-1`,
      conversationId,
      senderId: participantId,
      senderName: participantName,
      senderRole: "student",
      body: "Hello! I uploaded my passport for review.",
      attachments: [],
      createdAt: new Date(now - 1000 * 60 * 20).toISOString(),
      deliveryStatus: "read",
      isOwnMessage: false,
    },
    {
      id: `${conversationId}-message-2`,
      conversationId,
      senderId: currentUserId,
      senderName: getCurrentUserName(portalRole),
      senderRole: portalRole,
      body: "Perfect. I will review it shortly.",
      attachments: [],
      createdAt: new Date(now - 1000 * 60 * 10).toISOString(),
      deliveryStatus: "read",
      isOwnMessage: true,
    },
  ];
  const lastMessage = messages.at(-1) ?? null;
  const conversation: ConversationSummary = {
    id: conversationId,
    title: participantName,
    subtitle: "Student conversation",
    participantIds: [participantId],
    status: "open",
    unreadCount: 0,
    createdAt: messages[0]?.createdAt ?? new Date(now).toISOString(),
    updatedAt: lastMessage?.createdAt ?? new Date(now).toISOString(),
    lastMessage,
  };

  return {
    messages,
    conversations: [conversation],
    activeConversationId: conversationId,
  };
}

function CRMChatWorkspaceSession({
  portalRole,
  currentUserId,
  participantId,
  participantName,
  className = "",
  fixedHeightClassName = "",
}: WorkspaceSessionProps) {
  const [initialState] = useState<InitialWorkspaceState>(() =>
    createInitialWorkspaceState({
      currentUserId,
      participantId,
      participantName,
      portalRole,
    }),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialState.messages,
  );
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    initialState.conversations,
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialState.activeConversationId,
  );
  const [isSending, setIsSending] = useState(false);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId,
      ) ?? null,
    [activeConversationId, conversations],
  );

  const activeMessages = useMemo(() => {
    if (!activeConversationId) {
      return [];
    }

    return messages
      .filter((message) => message.conversationId === activeConversationId)
      .toSorted(
        (firstMessage, secondMessage) =>
          Date.parse(firstMessage.createdAt) - Date.parse(secondMessage.createdAt),
      );
  }, [activeConversationId, messages]);

  const activeParticipant = useMemo<ChatParticipant>(
    () => ({
      id: participantId,
      displayName: activeConversation?.title ?? participantName,
      role: portalRole === "student" ? "advisor" : "student",
      isOnline: true,
      lastSeenAt: null,
    }),
    [activeConversation?.title, participantId, participantName, portalRole],
  );

  function handleSelectConversation(selectedConversationId: string): void {
    setActiveConversationId(selectedConversationId);
    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === selectedConversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
  }

  async function handleSend(body: string, files: File[]): Promise<void> {
    if (!activeConversation || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const createdAt = new Date().toISOString();
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId: activeConversation.id,
        senderId: currentUserId,
        senderName: getCurrentUserName(portalRole),
        senderRole: portalRole,
        body,
        attachments: files.map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          url: URL.createObjectURL(file),
          downloadUrl: null,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          kind: getAttachmentKind(file.type, file.name),
          createdAt,
        })),
        createdAt,
        deliveryStatus: "sent",
        isOwnMessage: true,
      };

      setMessages((previous) => [...previous, newMessage]);
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === activeConversation.id
            ? {
                ...conversation,
                lastMessage: newMessage,
                updatedAt: newMessage.createdAt,
                unreadCount: 0,
              }
            : conversation,
        ),
      );
    } finally {
      setIsSending(false);
    }
  }

  const workspaceHeight =
    fixedHeightClassName ||
    "h-[calc(100vh-180px)] min-h-[700px] max-h-[900px]";

  return (
    <section
      className={[
        "flex min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        workspaceHeight,
        className,
      ].join(" ")}
    >
      <div className="hidden h-full w-[320px] shrink-0 lg:block xl:w-[360px]">
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {activeConversation ? (
          <>
            <ChatHeader participant={activeParticipant} />
            <MessageList
              messages={activeMessages}
              currentUserId={currentUserId}
              typingIndicators={[]}
              isLoading={false}
              isLoadingOlder={false}
              hasMore={false}
            />
            <MessageComposer
              onSend={handleSend}
              isSending={isSending}
              disabled={!activeConversation}
              placeholder={`Message ${activeParticipant.displayName}...`}
            />
          </>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-6">
            <div className="max-w-sm text-center">
              <h2 className="text-xl font-black text-[#071526]">
                No conversation selected
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Select a conversation from the inbox to begin messaging.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function CRMChatWorkspace(props: CRMChatWorkspaceProps) {
  const participantId =
    props.selectedParticipantId?.trim() || "student-placeholder";
  const participantName =
    props.selectedParticipantName?.trim() || "Selected Student";
  const sessionKey = JSON.stringify([
    props.portalRole,
    props.currentUserId,
    participantId,
    participantName,
  ]);

  return (
    <CRMChatWorkspaceSession
      key={sessionKey}
      {...props}
      participantId={participantId}
      participantName={participantName}
    />
  );
}
