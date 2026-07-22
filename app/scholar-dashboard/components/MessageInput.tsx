"use client";

import {
  AlertCircle,
  CornerUpLeft,
  FileText,
  Loader2,
  Paperclip,
  Send,
  UploadCloud,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ACCEPTED_MESSAGE_ATTACHMENT_EXTENSIONS,
  validateMessageAttachmentFile,
} from "../services/messages";
import type { Message } from "../types/dashboard";

const MAX_ATTACHMENT_COUNT = 5;

interface MessageInputProps {
  disabled?: boolean;
  isSending?: boolean;
  isSendingAttachment?: boolean;
  uploadingAttachmentName?: string | null;
  replyToMessage?: Message | null;
  placeholder?: string;
  maxLength?: number;
  onSend: (input: {
    body: string;
    replyToMessageId?: string;
  }) => void | Promise<void>;
  onSendAttachment?: (input: {
    file: File;
    replyToMessageId?: string;
  }) => void | Promise<void>;
  onCancelReply?: () => void;
  onTypingChange?: (isTyping: boolean) => void;
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

function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function MessageInput({
  disabled = false,
  isSending = false,
  isSendingAttachment = false,
  uploadingAttachmentName = null,
  replyToMessage = null,
  placeholder = "Type your message...",
  maxLength = 5_000,
  onSend,
  onSendAttachment,
  onCancelReply,
  onTypingChange,
}: MessageInputProps) {
  const [body, setBody] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [isUploadingQueue, setIsUploadingQueue] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const typingStopTimerRef = useRef<number | null>(null);

  const normalizedBody = body.trim();
  const composerIsBusy =
    isSending || isSendingAttachment || isUploadingQueue;

  const canSend =
    normalizedBody.length > 0 &&
    !disabled &&
    !composerIsBusy;

  const remainingCharacters = maxLength - body.length;

  const replyPreview = useMemo(
    () =>
      replyToMessage
        ? getReplyPreview(replyToMessage)
        : "",
    [replyToMessage],
  );

  const stopTyping = (): void => {
    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }

    onTypingChange?.(false);
  };

  const handleBodyChange = (value: string): void => {
    setBody(value);

    if (!value.trim() || disabled || composerIsBusy) {
      stopTyping();
      return;
    }

    onTypingChange?.(true);

    if (typingStopTimerRef.current) {
      window.clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = window.setTimeout(() => {
      typingStopTimerRef.current = null;
      onTypingChange?.(false);
    }, 1_800);
  };

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
      }

      onTypingChange?.(false);
    };
  }, [onTypingChange]);

  const resetComposer = (): void => {
    setBody("");

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const resetFileInput = (): void => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearQueuedFiles = (): void => {
    setQueuedFiles([]);
    resetFileInput();
  };

  const submitMessage = async (): Promise<void> => {
    if (!canSend) {
      return;
    }

    stopTyping();

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

  const validateAndQueueFiles = (
    incomingFiles: File[],
  ): void => {
    if (!onSendAttachment || incomingFiles.length === 0) {
      return;
    }

    const existingKeys = new Set(
      queuedFiles.map(getFileKey),
    );

    const uniqueIncomingFiles = incomingFiles.filter(
      (file) => !existingKeys.has(getFileKey(file)),
    );

    const availableSlots =
      MAX_ATTACHMENT_COUNT - queuedFiles.length;

    if (availableSlots <= 0) {
      setAttachmentError(
        `You can upload up to ${MAX_ATTACHMENT_COUNT} files at a time.`,
      );
      return;
    }

    const filesToValidate = uniqueIncomingFiles.slice(
      0,
      availableSlots,
    );

    for (const file of filesToValidate) {
      const validationError =
        validateMessageAttachmentFile(file);

      if (validationError) {
        setAttachmentError(
          `${file.name}: ${validationError}`,
        );
        return;
      }
    }

    if (uniqueIncomingFiles.length > availableSlots) {
      setAttachmentError(
        `Only the first ${availableSlots} file${
          availableSlots === 1 ? "" : "s"
        } were added. The limit is ${MAX_ATTACHMENT_COUNT}.`,
      );
    } else {
      setAttachmentError("");
    }

    setQueuedFiles((current) => [
      ...current,
      ...filesToValidate,
    ]);
  };

  const handleAttachmentChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    const files = Array.from(event.target.files ?? []);
    validateAndQueueFiles(files);
    resetFileInput();
  };

  const removeQueuedFile = (fileKey: string): void => {
    setQueuedFiles((current) =>
      current.filter(
        (file) => getFileKey(file) !== fileKey,
      ),
    );
  };

  const uploadQueuedFiles = async (): Promise<void> => {
    if (
      queuedFiles.length === 0 ||
      !onSendAttachment ||
      composerIsBusy
    ) {
      return;
    }

    setAttachmentError("");
    setIsUploadingQueue(true);

    try {
      for (const file of queuedFiles) {
        await onSendAttachment({
          file,
          replyToMessageId:
            replyToMessage?.id ?? undefined,
        });
      }

      clearQueuedFiles();
    } catch (error) {
      setAttachmentError(
        error instanceof Error
          ? error.message
          : "One or more attachments could not be uploaded.",
      );
    } finally {
      setIsUploadingQueue(false);
    }
  };

  const handleDragEnter = (
    event: DragEvent<HTMLDivElement>,
  ): void => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled || composerIsBusy || !onSendAttachment) {
      return;
    }

    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>,
  ): void => {
    event.preventDefault();
    event.stopPropagation();

    if (
      event.dataTransfer &&
      !disabled &&
      !composerIsBusy &&
      onSendAttachment
    ) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (
    event: DragEvent<HTMLDivElement>,
  ): void => {
    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current = Math.max(
      0,
      dragDepthRef.current - 1,
    );

    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ): void => {
    event.preventDefault();
    event.stopPropagation();

    dragDepthRef.current = 0;
    setIsDragging(false);

    if (disabled || composerIsBusy || !onSendAttachment) {
      return;
    }

    const files = Array.from(
      event.dataTransfer.files ?? [],
    );

    validateAndQueueFiles(files);
  };

  return (
    <div
      className="relative border-t border-slate-200 bg-white p-4 md:p-5"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging ? (
        <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#C8A24A] bg-[#FFF9EA]/95 backdrop-blur-sm">
          <div className="text-center">
            <UploadCloud
              aria-hidden="true"
              className="mx-auto h-9 w-9 text-[#8A6A1F]"
            />

            <p className="mt-3 font-black text-[#071526]">
              Drop files to attach
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Up to {MAX_ATTACHMENT_COUNT} files
            </p>
          </div>
        </div>
      ) : null}

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
            disabled={composerIsBusy}
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              "text-slate-500 transition hover:bg-white hover:text-[#071526]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[#C8A24A]",
              "disabled:cursor-not-allowed disabled:opacity-50",
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

      {attachmentError ? (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />

          <p className="min-w-0 flex-1 leading-5">
            {attachmentError}
          </p>

          <button
            type="button"
            onClick={() => setAttachmentError("")}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-red-100"
            aria-label="Dismiss attachment error"
          >
            <X
              aria-hidden="true"
              className="h-3.5 w-3.5"
            />
          </button>
        </div>
      ) : null}

      {queuedFiles.length > 0 ? (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#0F2747]">
                Ready to upload
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {queuedFiles.length} of {MAX_ATTACHMENT_COUNT} files selected
              </p>
            </div>

            <button
              type="button"
              onClick={clearQueuedFiles}
              disabled={composerIsBusy}
              className="text-xs font-black text-slate-500 transition hover:text-red-600 disabled:opacity-50"
            >
              Clear all
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {queuedFiles.map((file) => {
              const fileKey = getFileKey(file);

              return (
                <div
                  key={fileKey}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F7FA] text-[#0F2747]">
                    <FileText
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#071526]">
                      {file.name}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {(file.size / 1_048_576).toFixed(2)} MB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeQueuedFile(fileKey)
                    }
                    disabled={composerIsBusy}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              void uploadQueuedFiles();
            }}
            disabled={composerIsBusy}
            className={[
              "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl",
              "bg-[#C8A24A] px-4 py-3 text-sm font-black text-[#071526]",
              "transition hover:bg-[#D5B35D]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-[#0F2747] focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            ].join(" ")}
          >
            {isUploadingQueue || isSendingAttachment ? (
              <Loader2
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
            ) : (
              <UploadCloud
                aria-hidden="true"
                className="h-4 w-4"
              />
            )}

            {isUploadingQueue || isSendingAttachment
              ? `Uploading ${
                  uploadingAttachmentName ?? "file"
                }`
              : `Upload ${
                  queuedFiles.length === 1
                    ? "attachment"
                    : "attachments"
                }`}
          </button>
        </div>
      ) : null}

      {isSendingAttachment && queuedFiles.length === 0 ? (
        <div
          role="status"
          className="mb-3 flex items-center gap-3 rounded-xl border border-[#C8A24A]/30 bg-[#FFF9EA] px-3 py-3"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#8A6A1F] shadow-sm">
            <Loader2
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
            />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#8A6A1F]">
              Uploading attachment
            </p>

            <p className="mt-1 truncate text-sm text-slate-600">
              {uploadingAttachmentName ??
                "Preparing your file..."}
            </p>
          </div>
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
            handleBodyChange(event.target.value)
          }
          onBlur={stopTyping}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          maxLength={maxLength}
          disabled={disabled || composerIsBusy}
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
            {onSendAttachment ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={
                    ACCEPTED_MESSAGE_ATTACHMENT_EXTENSIONS
                  }
                  onChange={handleAttachmentChange}
                  disabled={disabled || composerIsBusy}
                  className="sr-only"
                  aria-label="Choose message attachments"
                />

                <button
                  type="button"
                  onClick={() => {
                    setAttachmentError("");
                    fileInputRef.current?.click();
                  }}
                  disabled={
                    disabled ||
                    composerIsBusy ||
                    queuedFiles.length >= MAX_ATTACHMENT_COUNT
                  }
                  className={[
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                    "text-slate-500 transition hover:bg-slate-100 hover:text-[#0F2747]",
                    "focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-[#C8A24A]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  ].join(" ")}
                  aria-label="Add attachments"
                  title="Add PDF, DOCX, JPG, or PNG attachments"
                >
                  <Paperclip
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                </button>
              </>
            ) : null}

            <div className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex">
              <FileText
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />

              Drag files here or choose up to {MAX_ATTACHMENT_COUNT}
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