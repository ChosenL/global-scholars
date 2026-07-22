"use client";

import {
  AlertCircle,
  Check,
  CheckCheck,
  FileText,
  Loader2,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import {
  formatFileSize,
  type ChatAttachment,
  type ChatMessage,
  type TypingIndicator,
} from "./types";

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  typingIndicators?: TypingIndicator[];
  isLoading?: boolean;
  isLoadingOlder?: boolean;
  hasMore?: boolean;
  onLoadOlder?: () => void | Promise<void>;
  onOpenAttachment?: (
    attachment: ChatAttachment,
  ) => void;
  className?: string;
}

function formatMessageTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateLabel(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (first: Date, second: Date) =>
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

  if (isSameDay(date, today)) {
    return "Today";
  }

  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === today.getFullYear()
        ? undefined
        : "numeric",
  }).format(date);
}

function getMessageDateKey(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function DeliveryIcon({
  message,
}: {
  message: ChatMessage;
}) {
  switch (message.deliveryStatus) {
    case "sending":
      return (
        <Loader2
          aria-label="Sending"
          className="h-3.5 w-3.5 animate-spin"
        />
      );

    case "delivered":
      return (
        <CheckCheck
          aria-label="Delivered"
          className="h-3.5 w-3.5"
        />
      );

    case "read":
      return (
        <CheckCheck
          aria-label="Read"
          className="h-3.5 w-3.5 text-sky-500"
        />
      );

    case "failed":
      return (
        <AlertCircle
          aria-label="Failed to send"
          className="h-3.5 w-3.5 text-rose-500"
        />
      );

    case "sent":
    default:
      return (
        <Check
          aria-label="Sent"
          className="h-3.5 w-3.5"
        />
      );
  }
}

function AttachmentPreview({
  attachment,
  onOpen,
}: {
  attachment: ChatAttachment;
  onOpen?: (attachment: ChatAttachment) => void;
}) {
  const handleOpen = () => {
    if (onOpen) {
      onOpen(attachment);
      return;
    }

    window.open(
      attachment.downloadUrl ?? attachment.url,
      "_blank",
      "noopener,noreferrer",
    );
  };

  if (attachment.kind === "image") {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="block w-full overflow-hidden rounded-xl border border-black/10 bg-slate-100 text-left"
      >
        <Image
          src={attachment.thumbnailUrl ?? attachment.url}
          alt={attachment.name}
          width={640}
          height={224}
          loading="lazy"
          unoptimized
          className="h-48 w-full object-cover sm:h-56"
        />

        <span className="block truncate px-3 py-2 text-xs font-bold">
          {attachment.name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white/70 p-3 text-left transition hover:bg-white"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0F2747]">
        <FileText
          aria-hidden="true"
          className="h-5 w-5"
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black">
          {attachment.name}
        </span>

        <span className="mt-0.5 block text-xs opacity-70">
          {formatFileSize(attachment.sizeBytes)}
        </span>
      </span>

      <span className="shrink-0 text-xs font-black">
        Open
      </span>
    </button>
  );
}

export default function MessageList({
  messages,
  currentUserId,
  typingIndicators = [],
  isLoading = false,
  isLoadingOlder = false,
  hasMore = false,
  onLoadOlder,
  onOpenAttachment,
  className = "",
}: MessageListProps) {
  const scrollContainerRef =
    useRef<HTMLDivElement | null>(null);

  const previousMessageCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const initialScrollCompleteRef = useRef(false);
  const isNearBottomRef = useRef(true);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = scrollContainerRef.current;

      if (!container) {
        return;
      }

      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    },
    [],
  );

  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return true;
    }

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    return distanceFromBottom < 160;
  }, []);

  const loadOlderMessages = useCallback(async () => {
    const container = scrollContainerRef.current;

    if (
      !container ||
      !hasMore ||
      !onLoadOlder ||
      isLoadingOlder ||
      loadingOlderRef.current
    ) {
      return;
    }

    loadingOlderRef.current = true;
    previousScrollHeightRef.current =
      container.scrollHeight;

    try {
      await onLoadOlder();
    } finally {
      loadingOlderRef.current = false;
    }
  }, [
    hasMore,
    isLoadingOlder,
    onLoadOlder,
  ]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    isNearBottomRef.current =
      container.scrollHeight -
        container.scrollTop -
        container.clientHeight <
      160;

    if (container.scrollTop <= 80) {
      void loadOlderMessages();
    }
  }, [loadOlderMessages]);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;

    if (!container || messages.length === 0) {
      return;
    }

    const previousCount =
      previousMessageCountRef.current;

    const messagesWerePrepended =
      previousCount > 0 &&
      messages.length > previousCount &&
      previousScrollHeightRef.current > 0 &&
      container.scrollTop < 160;

    if (messagesWerePrepended) {
      const heightDifference =
        container.scrollHeight -
        previousScrollHeightRef.current;

      container.scrollTop += heightDifference;
      previousScrollHeightRef.current = 0;
    } else if (!initialScrollCompleteRef.current) {
      scrollToBottom();
      initialScrollCompleteRef.current = true;
    } else if (
      messages.at(-1)?.senderId === currentUserId ||
      isNearBottomRef.current ||
      isNearBottom()
    ) {
      scrollToBottom("smooth");
    }

    previousMessageCountRef.current =
      messages.length;
  }, [
    isNearBottom,
    currentUserId,
    messages,
    scrollToBottom,
  ]);

  useEffect(() => {
    initialScrollCompleteRef.current = false;
    previousMessageCountRef.current = 0;
    previousScrollHeightRef.current = 0;
  }, []);

  if (isLoading) {
    return (
      <div
        className={[
          "flex min-h-0 flex-1 items-center justify-center bg-[#F8FAFC]",
          className,
        ].join(" ")}
      >
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#C8A24A]" />

          <p className="mt-3 text-sm font-bold text-slate-500">
            Loading messages
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={[
        "min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F8FAFC] px-4 py-5 sm:px-6",
        className,
      ].join(" ")}
    >
      {hasMore ? (
        <div className="mb-5 flex justify-center">
          <button
            type="button"
            onClick={() => {
              void loadOlderMessages();
            }}
            disabled={isLoadingOlder}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingOlder ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading older messages
              </>
            ) : (
              "Load older messages"
            )}
          </button>
        </div>
      ) : null}

      {messages.length === 0 ? (
        <div className="flex min-h-full items-center justify-center">
          <div className="max-w-sm text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
              <MessageCircle className="h-7 w-7" />
            </span>

            <h3 className="mt-4 text-lg font-black text-[#071526]">
              No messages yet
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Send the first message to begin this
              conversation.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message, index) => {
            const previousMessage =
              messages[index - 1];

            const shouldShowDate =
              !previousMessage ||
              getMessageDateKey(
                previousMessage.createdAt,
              ) !==
                getMessageDateKey(
                  message.createdAt,
                );

            const isOwnMessage =
              message.isOwnMessage ??
              message.senderId === currentUserId;

            const hasBody =
              message.body.trim().length > 0;

            return (
              <div key={message.id}>
                {shouldShowDate ? (
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />

                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-500 shadow-sm">
                      {formatDateLabel(
                        message.createdAt,
                      )}
                    </span>

                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                ) : null}

                <div
                  className={[
                    "flex",
                    isOwnMessage
                      ? "justify-end"
                      : "justify-start",
                  ].join(" ")}
                >
                  <article
                    className={[
                      "max-w-[88%] overflow-hidden rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%]",
                      isOwnMessage
                        ? "rounded-br-md bg-[#0F2747] text-white"
                        : "rounded-bl-md border border-slate-200 bg-white text-[#071526]",
                    ].join(" ")}
                  >
                    {!isOwnMessage ? (
                      <p className="mb-1 text-xs font-black text-[#8A6A1F]">
                        {message.senderName}
                      </p>
                    ) : null}

                    {message.attachments.length > 0 ? (
                      <div className="mb-3 space-y-2">
                        {message.attachments.map(
                          (attachment) => (
                            <AttachmentPreview
                              key={attachment.id}
                              attachment={attachment}
                              onOpen={
                                onOpenAttachment
                              }
                            />
                          ),
                        )}
                      </div>
                    ) : null}

                    {hasBody ? (
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.body}
                      </p>
                    ) : null}

                    <div
                      className={[
                        "mt-2 flex items-center justify-end gap-1.5 text-[10px]",
                        isOwnMessage
                          ? "text-white/65"
                          : "text-slate-400",
                      ].join(" ")}
                    >
                      <span>
                        {formatMessageTime(
                          message.createdAt,
                        )}
                      </span>

                      {isOwnMessage ? (
                        <DeliveryIcon
                          message={message}
                        />
                      ) : null}
                    </div>
                  </article>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {typingIndicators.length > 0 ? (
        <div className="mt-4 flex justify-start">
          <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                {typingIndicators.length === 1
                  ? `${typingIndicators[0].displayName} is typing...`
                  : "Several people are typing..."}
              </span>

              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
