"use client";

import {
  CornerUpLeft,
  Loader2,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Message } from "../types/dashboard";

interface MessageInputProps {
  disabled?: boolean;
  isSending?: boolean;
  replyToMessage?: Message | null;
  placeholder?: string;
  maxLength?: number;
  onSend: (input: {
    body: string;
    replyToMessageId?: string;
  }) => void | Promise<void>;
  onCancelReply?: () => void;
  onRequestAttachment?: () => void;
}

function getReplyPreview(message: Message): string {
  const body = message.body?.trim();

  if (body) {
    return body;
  }

  if (message.attachment_name) {
    return `Attachment: ${message.attachment_name}`;
  }

  return "Earlier message";
}

export default function MessageInput({
  disabled = false,
  isSending = false,
  replyToMessage = null,
  placeholder = "Type your message...",
  maxLength = 5_000,
  onSend,
  onCancelReply,
  onRequestAttachment,
}: MessageInputProps) {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(
    null,
  );

  const normalizedBody = body.trim();
  const canSend =
    normalizedBody.length > 0 &&
    !disabled &&
    !isSending;

  const remainingCharacters = maxLength - body.length;

  const replyPreview = useMemo(
    () =>
      replyToMessage
        ? getReplyPreview(replyToMessage)
        : "",
    [replyToMessage],
  );

  const resetComposer = (): void => {
    setBody("");

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const submitMessage = async (): Promise<void> => {
    if (!canSend) {
      return;
    }

    await onSend({
      body: normalizedBody,
      replyToMessageId:
        replyToMessage?.id ?? undefined,
    });

    resetComposer();
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ): void => {
    event.preventDefault();
    void submitMessage();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ): void => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void submitMessage();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-4 md:p-5">
      {replyToMessage ? (
        <div className="mb-3 flex items-start gap-3 rounded-xl border border-[#C8A24A]/30 bg-[#FFF9EA] px-3 py-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#8A6A1F] shadow-sm">
            <CornerUpLeft
              aria-hidden="true"
              className="h-4 w-4"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8A6A1F]">
              Replying to message
            </p>

            <p className="mt-1 truncate text-sm text-slate-600">
              {replyPreview}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancelReply}
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              "text-slate-500 transition hover:bg-white hover:text-[#071526]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[#C8A24A]",
            ].join(" ")}
            aria-label="Cancel reply"
          >
            <X
              aria-hidden="true"
              className="h-4 w-4"
            />
          </button>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3 transition focus-within:border-[#C8A24A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#C8A24A]/20"
      >
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(event) =>
            setBody(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          maxLength={maxLength}
          disabled={disabled}
          aria-label="Message"
          className={[
            "min-h-24 w-full resize-none bg-transparent px-1 py-1",
            "text-sm leading-6 text-[#071526] outline-none",
            "placeholder:text-slate-400",
            "disabled:cursor-not-allowed disabled:opacity-60",
          ].join(" ")}
        />

        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            {onRequestAttachment ? (
              <button
                type="button"
                onClick={onRequestAttachment}
                disabled={disabled || isSending}
                className={[
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                  "text-slate-500 transition hover:bg-slate-100 hover:text-[#0F2747]",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-[#C8A24A]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                ].join(" ")}
                aria-label="Add attachment"
                title="Add attachment"
              >
                <Paperclip
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </button>
            ) : null}

            <div className="hidden text-xs text-slate-400 sm:block">
              Press Enter to send. Shift + Enter for a new
              line.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={[
                "text-xs font-semibold",
                remainingCharacters <= 100
                  ? "text-amber-600"
                  : "text-slate-400",
              ].join(" ")}
              aria-live="polite"
            >
              {remainingCharacters.toLocaleString()}
            </span>

            <button
              type="submit"
              disabled={!canSend}
              className={[
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl",
                "bg-[#0F2747] px-4 py-2.5 text-sm font-black text-white",
                "shadow-sm transition hover:bg-[#173B68]",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[#C8A24A] focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
            >
              {isSending ? (
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <Send
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              )}

              <span className="hidden sm:inline">
                {isSending ? "Sending" : "Send"}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}