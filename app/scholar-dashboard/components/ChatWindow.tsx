"use client";

import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Inbox,
  Loader2,
  MessageCircle,
  MoreVertical,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Conversation,
  ConversationWithDetails,
  Message,
} from "../types/dashboard";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import type { TypingParticipant } from "../hooks/useTypingIndicator";

interface ChatWindowProps {
  conversation: ConversationWithDetails | null;
  messages: Message[];
  currentUserId: string;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  isSendingAttachment?: boolean;
  uploadingAttachmentName?: string | null;
  typingParticipants?: TypingParticipant[];
  editingMessageId: string | null;
  deletingMessageId: string | null;
  updatingConversationId: string | null;
  onSendMessage: (input: {
    body: string;
    replyToMessageId?: string;
  }) => void | Promise<unknown>;
  onSendAttachment?: (input: {
    file: File;
    replyToMessageId?: string;
  }) => void | Promise<unknown>;
  onEditMessage: (input: {
    messageId: string;
    body: string;
  }) => void | Promise<unknown>;
  onDeleteMessage: (
    messageId: string,
  ) => void | Promise<unknown>;
  onOpenAttachment?: (
    message: Message,
  ) => void | Promise<unknown>;
  onDownloadAttachment?: (
    message: Message,
  ) => void | Promise<unknown>;
  onGetAttachmentPreviewUrl?: (
    message: Message,
    forceRefresh?: boolean,
  ) => Promise<string>;
  onRefreshMessages: (
    conversationId?: string,
  ) => void | Promise<void>;
  onUpdateStatus: (input: {
    conversationId: string;
    status: Conversation["status"];
  }) => void | Promise<unknown>;
  onBack?: () => void;
  /**
   * @deprecated Temporary compatibility prop.
   * Replace this in the parent with onSendAttachment.
   */
  onRequestAttachment?: () => void;
  onTypingChange?: (isTyping: boolean) => void;
}

interface MessageGroup {
  label: string;
  key: string;
  messages: Message[];
}

function formatConversationDate(value: string): {
  key: string;
  label: string;
} {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      key: "unknown",
      label: "Messages",
    };
  }

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const messageDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const differenceInDays = Math.round(
    (today.getTime() - messageDay.getTime()) /
      86_400_000,
  );

  if (differenceInDays === 0) {
    return {
      key: date.toISOString().slice(0, 10),
      label: "Today",
    };
  }

  if (differenceInDays === 1) {
    return {
      key: date.toISOString().slice(0, 10),
      label: "Yesterday",
    };
  }

  return {
    key: date.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year:
        date.getFullYear() === now.getFullYear()
          ? undefined
          : "numeric",
    }).format(date),
  };
}

function groupMessagesByDate(
  messages: Message[],
): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const date = formatConversationDate(
      message.created_at,
    );

    const currentGroup = groups.at(-1);

    if (currentGroup?.key === date.key) {
      currentGroup.messages.push(message);
      continue;
    }

    groups.push({
      key: date.key,
      label: date.label,
      messages: [message],
    });
  }

  return groups;
}

function getStatusDescription(
  status: Conversation["status"],
): string {
  switch (status) {
    case "resolved":
      return "This conversation has been resolved.";
    case "archived":
      return "This conversation is archived.";
    default:
      return "Your advisor can respond here in real time.";
  }
}

function getTypingLabel(
  participants: TypingParticipant[],
): string {
  const names = participants.map(
    (participant) => participant.displayName,
  );

  if (names.length === 0) {
    return "";
  }

  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }

  return `${names[0]} and ${names.length - 1} others are typing...`;
}

export default function ChatWindow({
  conversation,
  messages,
  currentUserId,
  isLoadingMessages,
  isSendingMessage,
  isSendingAttachment = false,
  uploadingAttachmentName = null,
  typingParticipants = [],
  editingMessageId,
  deletingMessageId,
  updatingConversationId,
  onSendMessage,
  onSendAttachment,
  onEditMessage,
  onDeleteMessage,
  onOpenAttachment,
  onDownloadAttachment,
  onGetAttachmentPreviewUrl,
  onRefreshMessages,
  onUpdateStatus,
  onBack,
  onTypingChange,
}: ChatWindowProps) {
  const [replyToMessage, setReplyToMessage] =
    useState<Message | null>(null);

  const [actionsOpen, setActionsOpen] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);
  const scrollContainerRef =
    useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);
  const previousConversationIdRef = useRef<string | null>(null);
  const previousMessageCountRef = useRef(0);

  const messageGroups = useMemo(
    () => groupMessagesByDate(messages),
    [messages],
  );

  const otherParticipants = useMemo(
    () =>
      conversation?.participants.filter(
        (participant) =>
          participant.user_id !== currentUserId &&
          !participant.removed_at,
      ) ?? [],
    [conversation, currentUserId],
  );

  const latestOtherParticipantReadAt = useMemo(() => {
    const timestamps = otherParticipants
      .map((participant) => participant.last_read_at)
      .filter(
        (value): value is string => Boolean(value),
      )
      .map((value) => new Date(value).getTime())
      .filter((value) => !Number.isNaN(value));

    return timestamps.length > 0
      ? Math.max(...timestamps)
      : null;
  }, [otherParticipants]);

  const conversationIsUpdating =
    conversation?.id === updatingConversationId;

  const composerDisabled =
    !conversation ||
    conversation.status !== "open" ||
    isLoadingMessages;

  useLayoutEffect(() => {
    const conversationChanged =
      previousConversationIdRef.current !== (conversation?.id ?? null);
    const messageAdded = messages.length > previousMessageCountRef.current;
    const newestMessage = messages.at(-1);
    const currentUserSentNewestMessage =
      newestMessage?.sender_id === currentUserId;

    if (
      messages.length > 0 &&
      (conversationChanged ||
        currentUserSentNewestMessage ||
        (messageAdded && isNearBottomRef.current))
    ) {
      messagesEndRef.current?.scrollIntoView({
        behavior: conversationChanged ? "auto" : "smooth",
        block: "end",
      });
    }

    previousConversationIdRef.current = conversation?.id ?? null;
    previousMessageCountRef.current = messages.length;
  }, [conversation?.id, currentUserId, messages]);

  const handleStatusUpdate = async (
    status: Conversation["status"],
  ): Promise<void> => {
    if (!conversation) {
      return;
    }

    await onUpdateStatus({
      conversationId: conversation.id,
      status,
    });

    setActionsOpen(false);
  };

  if (!conversation) {
    return (
      <section className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F4F7FA] text-[#0F2747]">
          <Inbox
            aria-hidden="true"
            className="h-7 w-7"
          />
        </div>

        <h2 className="mt-5 text-2xl font-black text-[#071526]">
          Select a conversation
        </h2>

        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          Choose a conversation from your inbox to read
          messages and continue speaking with your advisor.
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                "border border-slate-200 text-slate-600 transition",
                "hover:bg-slate-50 hover:text-[#0F2747]",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[#C8A24A]",
                "xl:hidden",
              ].join(" ")}
              aria-label="Return to conversations"
            >
              <ArrowLeft
                aria-hidden="true"
                className="h-5 w-5"
              />
            </button>
          ) : null}

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F2747] text-white">
            <MessageCircle
              aria-hidden="true"
              className="h-5 w-5"
            />
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-[#071526] md:text-lg">
              {conversation.subject}
            </h2>

            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
              {getStatusDescription(conversation.status)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void onRefreshMessages(conversation.id);
            }}
            disabled={isLoadingMessages}
            className={[
              "flex h-10 w-10 items-center justify-center rounded-xl",
              "border border-slate-200 text-slate-500 transition",
              "hover:bg-slate-50 hover:text-[#0F2747]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[#C8A24A]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
            aria-label="Refresh messages"
            title="Refresh messages"
          >
            <RefreshCw
              aria-hidden="true"
              className={[
                "h-4 w-4",
                isLoadingMessages ? "animate-spin" : "",
              ].join(" ")}
            />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActionsOpen((current) => !current)
              }
              disabled={conversationIsUpdating}
              className={[
                "flex h-10 w-10 items-center justify-center rounded-xl",
                "border border-slate-200 text-slate-500 transition",
                "hover:bg-slate-50 hover:text-[#0F2747]",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[#C8A24A]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
              aria-label="Conversation actions"
              aria-expanded={actionsOpen}
            >
              {conversationIsUpdating ? (
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <MoreVertical
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              )}
            </button>

            {actionsOpen ? (
              <div className="absolute right-0 top-12 z-30 min-w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                {conversation.status !== "open" ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleStatusUpdate("open");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <RotateCcw
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                    Reopen conversation
                  </button>
                ) : null}

                {conversation.status !== "resolved" ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleStatusUpdate("resolved");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                    Mark as resolved
                  </button>
                ) : null}

                {conversation.status !== "archived" ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleStatusUpdate("archived");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Archive
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                    Archive conversation
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div
        ref={scrollContainerRef}
        onScroll={() => {
          const container = scrollContainerRef.current;

          if (!container) {
            return;
          }

          isNearBottomRef.current =
            container.scrollHeight - container.scrollTop - container.clientHeight < 160;
        }}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F8FAFC] px-4 py-5 md:px-6"
      >
        {isLoadingMessages && messages.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <Loader2
              aria-hidden="true"
              className="h-7 w-7 animate-spin text-[#C8A24A]"
            />

            <p className="mt-4 text-sm font-black text-[#071526]">
              Loading messages
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Retrieving your conversation history.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0F2747] shadow-sm">
              <MessageCircle
                aria-hidden="true"
                className="h-6 w-6"
              />
            </div>

            <h3 className="mt-5 text-lg font-black text-[#071526]">
              Start the conversation
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Send your first message to ask about
              admissions, documents, appointments, or your
              study-abroad pathway.
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {messageGroups.map((group) => (
              <div key={group.key}>
                <div className="mb-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />

                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                    {group.label}
                  </span>

                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="space-y-4">
                  {group.messages.map((message) => {
                    const createdAt =
                      new Date(message.created_at).getTime();

                    const isRead =
                      message.sender_id ===
                        currentUserId &&
                      latestOtherParticipantReadAt !== null &&
                      !Number.isNaN(createdAt) &&
                      latestOtherParticipantReadAt >=
                        createdAt;

                    return (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        currentUserId={currentUserId}
                        senderName="Global Scholars Advisor"
                        isRead={isRead}
                        isEditing={
                          editingMessageId === message.id
                        }
                        isDeleting={
                          deletingMessageId === message.id
                        }
                        onEdit={async (
                          messageId,
                          body,
                        ) => {
                          await onEditMessage({
                            messageId,
                            body,
                          });
                        }}
                        onDelete={async (messageId) => {
                          await onDeleteMessage(messageId);
                        }}
                        onOpenAttachment={
                          onOpenAttachment
                            ? async (
                                selectedMessage,
                              ) => {
                                await onOpenAttachment(
                                  selectedMessage,
                                );
                              }
                            : undefined
                        }
                        onDownloadAttachment={
                          onDownloadAttachment
                            ? async (
                                selectedMessage,
                              ) => {
                                await onDownloadAttachment(
                                  selectedMessage,
                                );
                              }
                            : undefined
                        }
                        onGetAttachmentPreviewUrl={
                          onGetAttachmentPreviewUrl
                        }
                        onReply={setReplyToMessage}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {conversation.status === "open" ? (
        <div className="shrink-0 border-t border-slate-200 bg-white">
          {typingParticipants.length > 0 ? (
            <div
              className="flex min-h-10 items-center gap-2 px-4 pt-3 text-xs font-bold text-slate-500 md:px-6"
              role="status"
              aria-live="polite"
            >
              <span>{getTypingLabel(typingParticipants)}</span>
              <span className="inline-flex items-end gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C8A24A] [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C8A24A] [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#C8A24A]" />
              </span>
            </div>
          ) : null}

          <MessageInput
          disabled={composerDisabled}
          isSending={isSendingMessage}
          isSendingAttachment={isSendingAttachment}
          uploadingAttachmentName={
            uploadingAttachmentName
          }
          replyToMessage={replyToMessage}
          onCancelReply={() =>
            setReplyToMessage(null)
          }
          onSendAttachment={
            onSendAttachment
              ? async (input) => {
                  await onSendAttachment(input);
                  setReplyToMessage(null);
                }
              : undefined
          }
          onTypingChange={onTypingChange}
          onSend={async (input) => {
            await onSendMessage(input);
            setReplyToMessage(null);
          }}
          />
        </div>
      ) : (
        <div className="shrink-0 border-t border-slate-200 bg-white p-4 md:p-5">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F4F7FA] px-4 py-3">
            <div>
              <p className="text-sm font-black text-[#071526]">
                Conversation {conversation.status}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Reopen this conversation to send another
                message.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void handleStatusUpdate("open");
              }}
              disabled={conversationIsUpdating}
              className={[
                "inline-flex shrink-0 items-center gap-2 rounded-xl",
                "bg-[#0F2747] px-4 py-2.5 text-sm font-black text-white",
                "transition hover:bg-[#173B68]",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[#C8A24A] focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
            >
              {conversationIsUpdating ? (
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <RotateCcw
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              )}

              Reopen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
