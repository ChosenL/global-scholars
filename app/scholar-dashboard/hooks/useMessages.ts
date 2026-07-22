"use client";

import { useSession, useUser } from "@clerk/nextjs";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";
import type {
  Conversation,
  ConversationWithDetails,
  CreateConversationInput,
  Message,
  SendFileMessageInput,
  SendMessageInput,
} from "../types/dashboard";
import {
  createStudentConversation,
  deleteConversationMessage,
  getConversation,
  listConversationMessages,
  getMessageAttachmentUrl,
  listStudentConversations,
  markConversationAsRead,
  sendConversationFileMessage,
  sendConversationMessage,
  updateConversationMessage,
  updateConversationStatus,
} from "../services/messages";

interface EditMessageRequest {
  messageId: string;
  body: string;
}

interface UpdateConversationStatusRequest {
  conversationId: string;
  status: Conversation["status"];
}

interface UseMessagesResult {
  conversations: ConversationWithDetails[];
  activeConversation: ConversationWithDetails | null;
  activeConversationId: string | null;
  messages: Message[];

  totalUnreadCount: number;

  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isCreatingConversation: boolean;
  isSendingMessage: boolean;
  isSendingAttachment: boolean;
  uploadingAttachmentName: string | null;
  editingMessageId: string | null;
  deletingMessageId: string | null;
  updatingConversationId: string | null;

  error: string;
  successMessage: string;

  refreshConversations: () => Promise<void>;
  refreshMessages: (
    conversationId?: string,
  ) => Promise<void>;

  selectConversation: (
    conversationId: string | null,
  ) => Promise<void>;

  createConversation: (
    input: CreateConversationInput,
  ) => Promise<Conversation>;

  sendMessage: (
    input: Omit<SendMessageInput, "conversationId">,
  ) => Promise<Message>;

  sendAttachment: (
    input: Omit<SendFileMessageInput, "conversationId">,
  ) => Promise<Message>;

  openAttachment: (
    message: Message,
  ) => Promise<void>;

  downloadAttachment: (
    message: Message,
  ) => Promise<void>;

  getAttachmentPreviewUrl: (
    message: Message,
    forceRefresh?: boolean,
  ) => Promise<string>;

  editMessage: (
    request: EditMessageRequest,
  ) => Promise<Message>;

  deleteMessage: (
    messageId: string,
  ) => Promise<void>;

  setConversationStatus: (
    request: UpdateConversationStatusRequest,
  ) => Promise<Conversation>;

  clearFeedback: () => void;
}

interface SupabaseErrorLike {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
  error?: unknown;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    return error.message.trim() || fallback;
  }

  if (typeof error === "string") {
    return error.trim() || fallback;
  }

  if (error && typeof error === "object") {
    const candidate = error as SupabaseErrorLike;

    const message =
      readText(candidate.message) ||
      readText(candidate.error);

    const details = readText(candidate.details);
    const hint = readText(candidate.hint);
    const code = readText(candidate.code);

    const sections = [
      message,
      details,
      hint ? `Hint: ${hint}` : "",
      code ? `Code: ${code}` : "",
    ].filter(Boolean);

    if (sections.length > 0) {
      return sections.join(" ");
    }

    try {
      const serialized = JSON.stringify(error);

      if (serialized && serialized !== "{}") {
        return serialized;
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function sortConversations(
  conversations: ConversationWithDetails[],
): ConversationWithDetails[] {
  return [...conversations].sort((first, second) => {
    const firstTimestamp = new Date(
      first.last_message_at ?? first.created_at,
    ).getTime();

    const secondTimestamp = new Date(
      second.last_message_at ?? second.created_at,
    ).getTime();

    return secondTimestamp - firstTimestamp;
  });
}

function sortMessages(messages: Message[]): Message[] {
  return [...messages].sort(
    (first, second) =>
      new Date(first.created_at).getTime() -
      new Date(second.created_at).getTime(),
  );
}

function upsertMessage(
  messages: Message[],
  nextMessage: Message,
): Message[] {
  const existingIndex = messages.findIndex(
    (message) => message.id === nextMessage.id,
  );

  if (existingIndex === -1) {
    return sortMessages([...messages, nextMessage]);
  }

  return sortMessages(
    messages.map((message) =>
      message.id === nextMessage.id
        ? nextMessage
        : message,
    ),
  );
}

function replaceConversation(
  conversations: ConversationWithDetails[],
  replacement: ConversationWithDetails,
): ConversationWithDetails[] {
  const exists = conversations.some(
    (conversation) =>
      conversation.id === replacement.id,
  );

  if (!exists) {
    return sortConversations([
      ...conversations,
      replacement,
    ]);
  }

  return sortConversations(
    conversations.map((conversation) =>
      conversation.id === replacement.id
        ? replacement
        : conversation,
    ),
  );
}

export function useMessages(): UseMessagesResult {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();

  const [conversations, setConversations] = useState<
    ConversationWithDetails[]
  >([]);

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const [isLoadingConversations, setIsLoadingConversations] =
    useState(true);

  const [isLoadingMessages, setIsLoadingMessages] =
    useState(false);

  const [isCreatingConversation, setIsCreatingConversation] =
    useState(false);

  const [isSendingMessage, setIsSendingMessage] =
    useState(false);

  const [isSendingAttachment, setIsSendingAttachment] =
    useState(false);

  const [
    uploadingAttachmentName,
    setUploadingAttachmentName,
  ] = useState<string | null>(null);

  const [editingMessageId, setEditingMessageId] =
    useState<string | null>(null);

  const [deletingMessageId, setDeletingMessageId] =
    useState<string | null>(null);

  const [updatingConversationId, setUpdatingConversationId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const conversationRequestIdRef = useRef(0);
  const messageRequestIdRef = useRef(0);
  const hasLoadedConversationsRef = useRef(false);
  const loadedMessageConversationIdsRef = useRef(new Set<string>());
  const realtimeRefreshTimerRef = useRef<number | null>(
    null,
  );
  const activeConversationIdRef = useRef<string | null>(
    null,
  );

  const attachmentPreviewCacheRef = useRef(
    new Map<
      string,
      {
        url: string;
        expiresAt: number;
      }
    >(),
  );

  const userId = user?.id ?? null;
  const sessionId = session?.id ?? null;
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    activeConversationIdRef.current =
      activeConversationId;
  }, [activeConversationId]);

  const clearFeedback = useCallback((): void => {
    setError("");
    setSuccessMessage("");
  }, []);

  const getSupabase = useCallback(() => {
    const currentSession = sessionRef.current;

    if (!currentSession) {
      throw new Error(
        "Your session is unavailable. Please sign in again.",
      );
    }

    return createClerkSupabaseClient(
      () => currentSession.getToken(),
    );
  }, []);

  const refreshConversations =
    useCallback(async (): Promise<void> => {
      const requestId =
        ++conversationRequestIdRef.current;

      if (
        !isLoaded ||
        !isSignedIn ||
        !userId ||
        !sessionId
      ) {
        if (isLoaded && !isSignedIn) {
          setConversations([]);
          setActiveConversationId(null);
          setMessages([]);
          hasLoadedConversationsRef.current = true;
        }
        setIsLoadingConversations(false);
        return;
      }

      if (!hasLoadedConversationsRef.current) {
        setIsLoadingConversations(true);
      }

      try {
        const nextConversations =
          await listStudentConversations(
            getSupabase(),
            userId,
          );

        if (
          requestId !==
          conversationRequestIdRef.current
        ) {
          return;
        }

        const sortedConversations =
          sortConversations(nextConversations);

        setConversations(sortedConversations);
        hasLoadedConversationsRef.current = true;
        setError("");

        setActiveConversationId(
          (currentConversationId) => {
            if (
              currentConversationId &&
              sortedConversations.some(
                (conversation) =>
                  conversation.id ===
                  currentConversationId,
              )
            ) {
              return currentConversationId;
            }

            return (
              sortedConversations[0]?.id ?? null
            );
          },
        );
      } catch (loadError) {
        if (
          requestId ===
          conversationRequestIdRef.current
        ) {
          setError(
            getErrorMessage(
              loadError,
              "We could not load your conversations. Please try again.",
            ),
          );
        }
      } finally {
        if (
          requestId ===
          conversationRequestIdRef.current
        ) {
          setIsLoadingConversations(false);
        }
      }
    }, [
      getSupabase,
      isLoaded,
      isSignedIn,
      sessionId,
      userId,
    ]);

  const refreshMessages = useCallback(
    async (
      conversationId?: string,
    ): Promise<void> => {
      const targetConversationId =
        conversationId ??
        activeConversationIdRef.current;

      const requestId =
        ++messageRequestIdRef.current;

      if (
        !targetConversationId ||
        !isLoaded ||
        !isSignedIn ||
        !userId ||
        !sessionId
      ) {
        setMessages([]);
        setIsLoadingMessages(false);
        return;
      }

      const isInitialConversationLoad =
        !loadedMessageConversationIdsRef.current.has(
          targetConversationId,
        );

      if (isInitialConversationLoad) {
        setIsLoadingMessages(true);
      }

      try {
        const supabase = getSupabase();

        const [
          nextMessages,
          nextConversation,
        ] = await Promise.all([
          listConversationMessages(
            supabase,
            targetConversationId,
          ),
          getConversation(
            supabase,
            targetConversationId,
            userId,
          ),
        ]);

        if (
          requestId !== messageRequestIdRef.current ||
          targetConversationId !==
            activeConversationIdRef.current
        ) {
          return;
        }

        const sortedMessages =
          sortMessages(nextMessages);

        loadedMessageConversationIdsRef.current.add(
          targetConversationId,
        );

        setMessages(sortedMessages);
        setConversations(
          (currentConversations) =>
            replaceConversation(
              currentConversations,
              nextConversation,
            ),
        );

        if (nextConversation.unread_count > 0) {
          await markConversationAsRead(
            supabase,
            userId,
            targetConversationId,
            sortedMessages,
          );

          if (
            targetConversationId ===
            activeConversationIdRef.current
          ) {
            setConversations(
              (currentConversations) =>
                currentConversations.map(
                  (conversation) =>
                    conversation.id ===
                    targetConversationId
                      ? {
                          ...conversation,
                          unread_count: 0,
                        }
                      : conversation,
                ),
            );
          }
        }

        setError("");
      } catch (loadError) {
        if (
          requestId === messageRequestIdRef.current
        ) {
          setError(
            getErrorMessage(
              loadError,
              "We could not load this conversation. Please try again.",
            ),
          );
        }
      } finally {
        if (
          requestId === messageRequestIdRef.current
        ) {
          setIsLoadingMessages(false);
        }
      }
    },
    [
      getSupabase,
      isLoaded,
      isSignedIn,
      sessionId,
      userId,
    ],
  );

  const selectConversation = useCallback(
    async (
      conversationId: string | null,
    ): Promise<void> => {
      messageRequestIdRef.current += 1;
      const conversationChanged =
        activeConversationIdRef.current !== conversationId;
      setActiveConversationId(conversationId);
      activeConversationIdRef.current =
        conversationId;
      if (conversationChanged) {
        setMessages([]);
      }
      clearFeedback();

      if (conversationId) {
        await refreshMessages(conversationId);
      }
    },
    [clearFeedback, refreshMessages],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshConversations();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      conversationRequestIdRef.current += 1;
      messageRequestIdRef.current += 1;
    };
  }, [refreshConversations, sessionId]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshMessages(
        activeConversationId,
      );
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      messageRequestIdRef.current += 1;
    };
  }, [
    activeConversationId,
    refreshMessages,
    sessionId,
  ]);

  useEffect(() => {
    if (
      !isLoaded ||
      !isSignedIn ||
      !userId ||
      !sessionId
    ) {
      return;
    }

    const supabase = getSupabase();

    const scheduleRealtimeRefresh = (): void => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(
          realtimeRefreshTimerRef.current,
        );
      }

      realtimeRefreshTimerRef.current =
        window.setTimeout(() => {
          void refreshConversations();

          const currentConversationId =
            activeConversationIdRef.current;

          if (currentConversationId) {
            void refreshMessages(
              currentConversationId,
            );
          }
        }, 150);
    };

    const channel = supabase
      .channel(`student-messaging:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        scheduleRealtimeRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        scheduleRealtimeRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
        },
        scheduleRealtimeRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_read_receipts",
        },
        scheduleRealtimeRefresh,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setError(
            "Live messaging is temporarily unavailable. Messages can still be refreshed manually.",
          );
        }
      });

    return () => {
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(
          realtimeRefreshTimerRef.current,
        );
        realtimeRefreshTimerRef.current =
          null;
      }

      void supabase.removeChannel(channel);
    };
  }, [
    getSupabase,
    isLoaded,
    isSignedIn,
    refreshConversations,
    refreshMessages,
    sessionId,
    userId,
  ]);

  const createConversation = useCallback(
    async (
      input: CreateConversationInput,
    ): Promise<Conversation> => {
      if (!userId) {
        throw new Error(
          "You must be signed in before starting a conversation.",
        );
      }

      setIsCreatingConversation(true);
      clearFeedback();

      try {
        const conversation =
          await createStudentConversation(
            getSupabase(),
            input,
          );

        const conversationDetails =
          await getConversation(
            getSupabase(),
            conversation.id,
            userId,
          );

        setConversations(
          (currentConversations) =>
            replaceConversation(
              currentConversations,
              conversationDetails,
            ),
        );

        setActiveConversationId(
          conversation.id,
        );
        activeConversationIdRef.current =
          conversation.id;
        setMessages([]);

        setSuccessMessage(
          "Your conversation was started successfully.",
        );

        return conversation;
      } catch (createError) {
        const message = getErrorMessage(
          createError,
          "The conversation could not be started. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setIsCreatingConversation(false);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const sendMessage = useCallback(
    async (
      input: Omit<
        SendMessageInput,
        "conversationId"
      >,
    ): Promise<Message> => {
      const conversationId =
        activeConversationIdRef.current;

      if (!userId) {
        throw new Error(
          "You must be signed in before sending a message.",
        );
      }

      if (!conversationId) {
        throw new Error(
          "Please select a conversation before sending a message.",
        );
      }

      const optimisticMessage: Message = {
        id: `temporary-${crypto.randomUUID()}`,
        conversation_id: conversationId,
        sender_id: userId,
        message_type: "text",
        body: input.body.trim(),
        attachment_name: null,
        attachment_path: null,
        attachment_type: null,
        attachment_size: null,
        reply_to_message_id:
          input.replyToMessageId ?? null,
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (!optimisticMessage.body) {
        throw new Error(
          "Please enter a message.",
        );
      }

      setIsSendingMessage(true);
      clearFeedback();

      setMessages((currentMessages) =>
        sortMessages([
          ...currentMessages,
          optimisticMessage,
        ]),
      );

      try {
        const message =
          await sendConversationMessage(
            getSupabase(),
            userId,
            {
              conversationId,
              body: input.body,
              replyToMessageId:
                input.replyToMessageId,
            },
          );

        setMessages((currentMessages) =>
          sortMessages(
            currentMessages
              .filter(
                (currentMessage) =>
                  currentMessage.id !==
                  optimisticMessage.id,
              )
              .concat(message),
          ),
        );

        setConversations(
          (currentConversations) =>
            sortConversations(
              currentConversations.map(
                (conversation) =>
                  conversation.id ===
                  conversationId
                    ? {
                        ...conversation,
                        latest_message: message,
                        last_message_at:
                          message.created_at,
                      }
                    : conversation,
              ),
            ),
        );

        setError("");
        return message;
      } catch (sendError) {
        setMessages((currentMessages) =>
          currentMessages.filter(
            (message) =>
              message.id !==
              optimisticMessage.id,
          ),
        );

        const message = getErrorMessage(
          sendError,
          "Your message could not be sent. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const sendAttachment = useCallback(
    async (
      input: Omit<
        SendFileMessageInput,
        "conversationId"
      >,
    ): Promise<Message> => {
      const conversationId =
        activeConversationIdRef.current;

      if (!userId) {
        throw new Error(
          "You must be signed in before sending an attachment.",
        );
      }

      if (!conversationId) {
        throw new Error(
          "Please select a conversation before sending an attachment.",
        );
      }

      const optimisticMessage: Message = {
        id: `temporary-${crypto.randomUUID()}`,
        conversation_id: conversationId,
        sender_id: userId,
        message_type: "file",
        body: null,
        attachment_name: input.file.name,
        attachment_path: null,
        attachment_type: input.file.type,
        attachment_size: input.file.size,
        reply_to_message_id:
          input.replyToMessageId ?? null,
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setIsSendingAttachment(true);
      setUploadingAttachmentName(input.file.name);
      clearFeedback();

      setMessages((currentMessages) =>
        sortMessages([
          ...currentMessages,
          optimisticMessage,
        ]),
      );

      try {
        const { message } =
          await sendConversationFileMessage(
            getSupabase(),
            userId,
            {
              conversationId,
              file: input.file,
              replyToMessageId:
                input.replyToMessageId,
            },
          );

        setMessages((currentMessages) =>
          sortMessages(
            currentMessages
              .filter(
                (currentMessage) =>
                  currentMessage.id !==
                  optimisticMessage.id,
              )
              .concat(message),
          ),
        );

        setConversations(
          (currentConversations) =>
            sortConversations(
              currentConversations.map(
                (conversation) =>
                  conversation.id ===
                  conversationId
                    ? {
                        ...conversation,
                        latest_message: message,
                        last_message_at:
                          message.created_at,
                      }
                    : conversation,
              ),
            ),
        );

        setSuccessMessage(
          "Your attachment was sent successfully.",
        );

        return message;
      } catch (sendError) {
        setMessages((currentMessages) =>
          currentMessages.filter(
            (message) =>
              message.id !==
              optimisticMessage.id,
          ),
        );

        const message = getErrorMessage(
          sendError,
          "Your attachment could not be sent. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setIsSendingAttachment(false);
        setUploadingAttachmentName(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const getAttachmentPreviewUrl = useCallback(
    async (
      message: Message,
      forceRefresh = false,
    ): Promise<string> => {
      const attachmentPath =
        message.attachment_path?.trim();

      if (!attachmentPath) {
        throw new Error(
          "This message does not contain a previewable attachment.",
        );
      }

      const cacheKey = `${message.id}:${attachmentPath}`;
      const cachedPreview =
        attachmentPreviewCacheRef.current.get(cacheKey);
      const now = Date.now();

      if (
        !forceRefresh &&
        cachedPreview &&
        cachedPreview.expiresAt > now
      ) {
        return cachedPreview.url;
      }

      const url = await getMessageAttachmentUrl(
        getSupabase(),
        message,
      );

      attachmentPreviewCacheRef.current.set(cacheKey, {
        url,
        expiresAt: now + 8 * 60 * 1_000,
      });

      return url;
    },
    [getSupabase],
  );

  const openAttachment = useCallback(
    async (message: Message): Promise<void> => {
      clearFeedback();

      try {
        const url = await getMessageAttachmentUrl(
          getSupabase(),
          message,
        );

        const openedWindow = window.open(
          url,
          "_blank",
          "noopener,noreferrer",
        );

        if (!openedWindow) {
          window.location.assign(url);
        }
      } catch (openError) {
        const errorMessage = getErrorMessage(
          openError,
          "The attachment could not be opened. Please try again.",
        );

        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [
      clearFeedback,
      getSupabase,
    ],
  );

  const downloadAttachment = useCallback(
    async (message: Message): Promise<void> => {
      clearFeedback();

      try {
        const url = await getMessageAttachmentUrl(
          getSupabase(),
          message,
          {
            download: true,
          },
        );

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download =
          message.attachment_name ?? "attachment";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } catch (downloadError) {
        const errorMessage = getErrorMessage(
          downloadError,
          "The attachment could not be downloaded. Please try again.",
        );

        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [
      clearFeedback,
      getSupabase,
    ],
  );

  const editMessage = useCallback(
    async ({
      messageId,
      body,
    }: EditMessageRequest): Promise<Message> => {
      if (!userId) {
        throw new Error(
          "You must be signed in before editing a message.",
        );
      }

      setEditingMessageId(messageId);
      clearFeedback();

      try {
        const message =
          await updateConversationMessage(
            getSupabase(),
            userId,
            {
              messageId,
              body,
            },
          );

        setMessages((currentMessages) =>
          upsertMessage(
            currentMessages,
            message,
          ),
        );

        setConversations(
          (currentConversations) =>
            currentConversations.map(
              (conversation) =>
                conversation.latest_message?.id ===
                message.id
                  ? {
                      ...conversation,
                      latest_message: message,
                    }
                  : conversation,
            ),
        );

        setSuccessMessage(
          "Your message was updated.",
        );

        return message;
      } catch (editError) {
        const message = getErrorMessage(
          editError,
          "Your message could not be updated. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setEditingMessageId(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      if (!userId) {
        throw new Error(
          "You must be signed in before deleting a message.",
        );
      }

      setDeletingMessageId(messageId);
      clearFeedback();

      try {
        await deleteConversationMessage(
          getSupabase(),
          userId,
          messageId,
        );

        setMessages((currentMessages) =>
          currentMessages.filter(
            (message) =>
              message.id !== messageId,
          ),
        );

        const conversationId =
          activeConversationIdRef.current;

        if (conversationId) {
          await refreshConversations();
          await refreshMessages(
            conversationId,
          );
        }

        setSuccessMessage(
          "The message was deleted.",
        );
      } catch (deleteError) {
        const message = getErrorMessage(
          deleteError,
          "The message could not be deleted. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setDeletingMessageId(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
      refreshConversations,
      refreshMessages,
      userId,
    ],
  );

  const setConversationStatus = useCallback(
    async ({
      conversationId,
      status,
    }: UpdateConversationStatusRequest): Promise<Conversation> => {
      if (!userId) {
        throw new Error(
          "You must be signed in before updating a conversation.",
        );
      }

      setUpdatingConversationId(
        conversationId,
      );
      clearFeedback();

      try {
        const conversation =
          await updateConversationStatus(
            getSupabase(),
            conversationId,
            status,
          );

        const conversationDetails =
          await getConversation(
            getSupabase(),
            conversation.id,
            userId,
          );

        setConversations(
          (currentConversations) =>
            replaceConversation(
              currentConversations,
              conversationDetails,
            ),
        );

        setSuccessMessage(
          status === "resolved"
            ? "The conversation was marked as resolved."
            : status === "archived"
              ? "The conversation was archived."
              : "The conversation was reopened.",
        );

        return conversation;
      } catch (updateError) {
        const message = getErrorMessage(
          updateError,
          "The conversation could not be updated. Please try again.",
        );

        setError(message);
        throw new Error(message);
      } finally {
        setUpdatingConversationId(null);
      }
    },
    [
      clearFeedback,
      getSupabase,
      userId,
    ],
  );

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) =>
          conversation.id ===
          activeConversationId,
      ) ?? null,
    [
      activeConversationId,
      conversations,
    ],
  );

  const totalUnreadCount = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) =>
          total + conversation.unread_count,
        0,
      ),
    [conversations],
  );

  return {
    conversations,
    activeConversation,
    activeConversationId,
    messages,

    totalUnreadCount,

    isLoadingConversations,
    isLoadingMessages,
    isCreatingConversation,
    isSendingMessage,
    isSendingAttachment,
    uploadingAttachmentName,
    editingMessageId,
    deletingMessageId,
    updatingConversationId,

    error,
    successMessage,

    refreshConversations,
    refreshMessages,
    selectConversation,
    createConversation,
    sendMessage,
    sendAttachment,
    openAttachment,
    downloadAttachment,
    getAttachmentPreviewUrl,
    editMessage,
    deleteMessage,
    setConversationStatus,

    clearFeedback,
  };
}
