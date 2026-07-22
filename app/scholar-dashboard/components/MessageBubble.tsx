/* eslint-disable @next/next/no-img-element */
"use client";

import {
  Check,
  CheckCheck,
  CornerUpLeft,
  Download,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Message } from "../types/dashboard";

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  senderName?: string;
  isRead?: boolean;
  isEditing?: boolean;
  isDeleting?: boolean;
  onEdit?: (
    messageId: string,
    body: string,
  ) => void | Promise<void>;
  onDelete?: (
    messageId: string,
  ) => void | Promise<void>;
  onReply?: (message: Message) => void;
  onOpenAttachment?: (
    message: Message,
  ) => void | Promise<void>;
  onDownloadAttachment?: (
    message: Message,
  ) => void | Promise<void>;
  onGetAttachmentPreviewUrl?: (
    message: Message,
    forceRefresh?: boolean,
  ) => Promise<string>;
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

function formatFileSize(size: number | null): string {
  if (!size || size <= 0) {
    return "";
  }

  if (size < 1_024) {
    return `${size} B`;
  }

  if (size < 1_048_576) {
    return `${(size / 1_024).toFixed(1)} KB`;
  }

  return `${(size / 1_048_576).toFixed(1)} MB`;
}

interface ImageAttachmentPreviewProps {
  message: Message;
  isOwnMessage: boolean;
  onGetAttachmentPreviewUrl: (
    message: Message,
    forceRefresh?: boolean,
  ) => Promise<string>;
  onOpenAttachment?: (
    message: Message,
  ) => void | Promise<void>;
  onDownloadAttachment?: (
    message: Message,
  ) => void | Promise<void>;
}

function ImageAttachmentPreview({
  message,
  isOwnMessage,
  onGetAttachmentPreviewUrl,
  onOpenAttachment,
  onDownloadAttachment,
}: ImageAttachmentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    void onGetAttachmentPreviewUrl(message)
      .then((url) => {
        if (isActive) {
          setPreviewUrl(url);
          setPreviewError("");
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setPreviewError(
            error instanceof Error
              ? error.message
              : "The image preview could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsPreviewLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [message, onGetAttachmentPreviewUrl]);

  useEffect(() => {
    if (!isLightboxOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLightboxOpen]);

  const retryPreview = async (): Promise<void> => {
    setIsPreviewLoading(true);
    setPreviewError("");

    try {
      const url = await onGetAttachmentPreviewUrl(message, true);
      setPreviewUrl(url);
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "The image preview could not be loaded.",
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleImageError = (): void => {
    setIsLightboxOpen(false);
    setPreviewUrl("");
    setPreviewError(
      "The preview link expired or the image could not be loaded.",
    );
  };

  return (
    <>
      <div
        className={[
          "relative aspect-[4/3] w-full overflow-hidden",
          isOwnMessage ? "bg-white/10" : "bg-slate-100",
        ].join(" ")}
      >
        {isPreviewLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2
              aria-hidden="true"
              className={[
                "h-6 w-6 animate-spin",
                isOwnMessage ? "text-white" : "text-[#C8A24A]",
              ].join(" ")}
            />
            <span
              className={[
                "text-xs font-bold",
                isOwnMessage ? "text-white/70" : "text-slate-500",
              ].join(" ")}
            >
              Loading preview
            </span>
          </div>
        ) : previewUrl ? (
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="group/preview block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C8A24A]"
            aria-label={`Preview ${message.attachment_name ?? "image attachment"}`}
          >
            <img
              src={previewUrl}
              alt={message.attachment_name ?? "Message attachment"}
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover/preview:scale-[1.02]"
              onError={handleImageError}
            />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-black text-white opacity-0 backdrop-blur transition group-hover/preview:opacity-100 group-focus-visible/preview:opacity-100">
              <ZoomIn aria-hidden="true" className="h-3.5 w-3.5" />
              View
            </span>
          </button>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
            <FileImage
              aria-hidden="true"
              className={[
                "h-7 w-7",
                isOwnMessage ? "text-white/60" : "text-slate-400",
              ].join(" ")}
            />
            <p
              className={[
                "mt-2 text-xs leading-5",
                isOwnMessage ? "text-white/70" : "text-slate-500",
              ].join(" ")}
            >
              {previewError || "Preview unavailable"}
            </p>
            <button
              type="button"
              onClick={() => {
                void retryPreview();
              }}
              className={[
                "mt-2 rounded-lg px-3 py-1.5 text-xs font-black transition",
                isOwnMessage
                  ? "bg-white/15 text-white hover:bg-white/20"
                  : "bg-white text-[#0F2747] shadow-sm hover:bg-slate-50",
              ].join(" ")}
            >
              Retry preview
            </button>
          </div>
        )}
      </div>

      {isLightboxOpen && previewUrl ? (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-[#020817]/95 p-4 backdrop-blur-sm md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={
            message.attachment_name
              ? `Preview ${message.attachment_name}`
              : "Image preview"
          }
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsLightboxOpen(false);
            }
          }}
        >
          <div className="relative flex max-h-full w-full max-w-6xl flex-col">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {message.attachment_name ?? "Image attachment"}
                </p>
                <p className="mt-0.5 text-xs text-white/60">
                  Press Escape or click outside to close
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A24A]"
                aria-label="Close image preview"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-black/30 p-2 md:p-4">
              <img
                src={previewUrl}
                alt={message.attachment_name ?? "Message attachment"}
                className="mx-auto max-h-[78vh] max-w-full object-contain"
                onError={handleImageError}
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {onOpenAttachment ? (
                <button
                  type="button"
                  onClick={() => {
                    void onOpenAttachment(message);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/20"
                >
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  Open original
                </button>
              ) : null}
              {onDownloadAttachment ? (
                <button
                  type="button"
                  onClick={() => {
                    void onDownloadAttachment(message);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#C8A24A] px-4 py-2.5 text-sm font-black text-[#071526] transition hover:bg-[#D5B35D]"
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  Download
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function MessageBubble({
  message,
  currentUserId,
  senderName,
  isRead = false,
  isEditing = false,
  isDeleting = false,
  onEdit,
  onDelete,
  onReply,
  onOpenAttachment,
  onDownloadAttachment,
  onGetAttachmentPreviewUrl,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftBody, setDraftBody] = useState(
    message.body ?? "",
  );

  const isOwnMessage =
    message.sender_id === currentUserId;

  const isTemporary =
    message.id.startsWith("temporary-");

  const isDeleted = Boolean(message.deleted_at);

  const canEdit =
    isOwnMessage &&
    !isDeleted &&
    !isTemporary &&
    message.message_type === "text" &&
    Boolean(onEdit);

  const canDelete =
    isOwnMessage &&
    !isDeleted &&
    !isTemporary &&
    Boolean(onDelete);

  const canReply =
    !isDeleted &&
    !isTemporary &&
    Boolean(onReply);

  const timeLabel = formatMessageTime(
    message.created_at,
  );

  const attachmentSize = useMemo(
    () => formatFileSize(message.attachment_size),
    [message.attachment_size],
  );

  const isImageAttachment =
    message.attachment_type === "image/jpeg" ||
    message.attachment_type === "image/png";

  const canAccessAttachment =
    Boolean(message.attachment_path) &&
    !isDeleted &&
    !isTemporary;

  const handleEditSubmit = async (): Promise<void> => {
    const normalizedBody = draftBody.trim();

    if (
      !normalizedBody ||
      normalizedBody === message.body?.trim() ||
      !onEdit
    ) {
      return;
    }

    await onEdit(message.id, normalizedBody);
    setMenuOpen(false);
  };

  const handleDelete = async (): Promise<void> => {
    if (!onDelete) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this message? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    await onDelete(message.id);
    setMenuOpen(false);
  };

  return (
    <article
      className={[
        "group flex w-full gap-3",
        isOwnMessage
          ? "justify-end"
          : "justify-start",
      ].join(" ")}
    >
      <div
        className={[
          "flex max-w-[88%] flex-col md:max-w-[75%]",
          isOwnMessage ? "items-end" : "items-start",
        ].join(" ")}
      >
        {!isOwnMessage && senderName ? (
          <p className="mb-1 px-1 text-xs font-black text-[#0F2747]">
            {senderName}
          </p>
        ) : null}

        <div
          className={[
            "relative rounded-2xl px-4 py-3 shadow-sm",
            isOwnMessage
              ? "rounded-br-md bg-[#0F2747] text-white"
              : "rounded-bl-md border border-slate-200 bg-white text-[#071526]",
            isDeleted
              ? "italic opacity-70"
              : "",
          ].join(" ")}
        >
          {!isDeleted &&
          (canEdit || canDelete || canReply) ? (
            <div
              className={[
                "absolute top-1/2 -translate-y-1/2",
                isOwnMessage
                  ? "-left-11"
                  : "-right-11",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() =>
                  setMenuOpen((current) => !current)
                }
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  "border border-slate-200 bg-white text-slate-500 shadow-sm",
                  "opacity-0 transition hover:text-[#0F2747]",
                  "focus-visible:opacity-100 focus-visible:outline-none",
                  "focus-visible:ring-2 focus-visible:ring-[#C8A24A]",
                  "group-hover:opacity-100",
                ].join(" ")}
                aria-label="Message actions"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              </button>

              {menuOpen ? (
                <div
                  className={[
                    "absolute top-10 z-20 min-w-36 overflow-hidden rounded-xl",
                    "border border-slate-200 bg-white p-1 shadow-xl",
                    isOwnMessage ? "left-0" : "right-0",
                  ].join(" ")}
                >
                  {canReply ? (
                    <button
                      type="button"
                      onClick={() => {
                        onReply?.(message);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <CornerUpLeft
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                      Reply
                    </button>
                  ) : null}

                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftBody(
                          message.body ?? "",
                        );
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Pencil
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                      Edit
                    </button>
                  ) : null}

                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleDelete();
                      }}
                      disabled={isDeleting}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      {isDeleting ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />
                      ) : (
                        <Trash2
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                      )}
                      Delete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {isEditing ? (
            <div className="min-w-64 space-y-3">
              <textarea
                value={draftBody}
                onChange={(event) =>
                  setDraftBody(event.target.value)
                }
                rows={3}
                maxLength={5_000}
                className={[
                  "w-full resize-none rounded-xl border px-3 py-2 text-sm",
                  "text-[#071526] outline-none",
                  "focus:border-[#C8A24A] focus:ring-2",
                  "focus:ring-[#C8A24A]/20",
                ].join(" ")}
                autoFocus
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraftBody(message.body ?? "")
                  }
                  className="rounded-lg px-3 py-2 text-xs font-black text-slate-500 hover:bg-slate-100"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleEditSubmit();
                  }}
                  disabled={
                    !draftBody.trim() ||
                    draftBody.trim() ===
                      message.body?.trim()
                  }
                  className="rounded-lg bg-[#C8A24A] px-3 py-2 text-xs font-black text-[#071526] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.reply_to_message_id ? (
                <div
                  className={[
                    "mb-3 rounded-xl border-l-4 px-3 py-2 text-xs",
                    isOwnMessage
                      ? "border-[#C8A24A] bg-white/10 text-white/80"
                      : "border-[#C8A24A] bg-slate-50 text-slate-500",
                  ].join(" ")}
                >
                  Replying to an earlier message
                </div>
              ) : null}

              {message.body ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  {message.body}
                </p>
              ) : null}

              {message.attachment_name ? (
                <div
                  className={[
                    "mt-3 overflow-hidden rounded-xl border",
                    isOwnMessage
                      ? "border-white/15 bg-white/10"
                      : "border-slate-200 bg-[#F8FAFC]",
                  ].join(" ")}
                >
                  {isImageAttachment &&
                  onGetAttachmentPreviewUrl ? (
                    <ImageAttachmentPreview
                      key={message.id}
                      message={message}
                      isOwnMessage={isOwnMessage}
                      onGetAttachmentPreviewUrl={
                        onGetAttachmentPreviewUrl
                      }
                      onOpenAttachment={onOpenAttachment}
                      onDownloadAttachment={
                        onDownloadAttachment
                      }
                    />
                  ) : null}

                  <div className="flex items-center gap-3 p-3">
                    <div
                      className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                        isOwnMessage
                          ? "bg-white/15 text-white"
                          : "bg-white text-[#0F2747] shadow-sm",
                      ].join(" ")}
                    >
                      {isImageAttachment ? (
                        <FileImage
                          aria-hidden="true"
                          className="h-5 w-5"
                        />
                      ) : (
                        <FileText
                          aria-hidden="true"
                          className="h-5 w-5"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">
                        {message.attachment_name}
                      </p>

                      <div
                        className={[
                          "mt-0.5 flex flex-wrap items-center gap-1.5 text-xs",
                          isOwnMessage
                            ? "text-white/60"
                            : "text-slate-400",
                        ].join(" ")}
                      >
                        {attachmentSize ? (
                          <span>{attachmentSize}</span>
                        ) : null}

                        {attachmentSize &&
                        message.attachment_type ? (
                          <span aria-hidden="true">•</span>
                        ) : null}

                        {message.attachment_type ? (
                          <span>
                            {isImageAttachment
                              ? "Image"
                              : message.attachment_type ===
                                  "application/pdf"
                                ? "PDF"
                                : "Document"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {canAccessAttachment &&
                  (onOpenAttachment ||
                    onDownloadAttachment) ? (
                    <div
                      className={[
                        "grid border-t",
                        onOpenAttachment &&
                        onDownloadAttachment
                          ? "grid-cols-2"
                          : "grid-cols-1",
                        isOwnMessage
                          ? "border-white/15"
                          : "border-slate-200",
                      ].join(" ")}
                    >
                      {onOpenAttachment ? (
                        <button
                          type="button"
                          onClick={() => {
                            void onOpenAttachment(message);
                          }}
                          className={[
                            "inline-flex min-h-10 items-center justify-center gap-2 px-3 py-2",
                            "text-xs font-black transition",
                            isOwnMessage
                              ? "text-white hover:bg-white/10"
                              : "text-[#0F2747] hover:bg-white",
                          ].join(" ")}
                        >
                          <ExternalLink
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                          Open
                        </button>
                      ) : null}

                      {onDownloadAttachment ? (
                        <button
                          type="button"
                          onClick={() => {
                            void onDownloadAttachment(
                              message,
                            );
                          }}
                          className={[
                            "inline-flex min-h-10 items-center justify-center gap-2 px-3 py-2",
                            "text-xs font-black transition",
                            onOpenAttachment
                              ? isOwnMessage
                                ? "border-l border-white/15"
                                : "border-l border-slate-200"
                              : "",
                            isOwnMessage
                              ? "text-white hover:bg-white/10"
                              : "text-[#0F2747] hover:bg-white",
                          ].join(" ")}
                        >
                          <Download
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                          Download
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div
          className={[
            "mt-1 flex items-center gap-1.5 px-1 text-[11px]",
            isOwnMessage
              ? "justify-end text-slate-400"
              : "justify-start text-slate-400",
          ].join(" ")}
        >
          {timeLabel ? (
            <time dateTime={message.created_at}>
              {timeLabel}
            </time>
          ) : null}

          {message.edited_at && !isDeleted ? (
            <>
              <span aria-hidden="true">•</span>
              <span>Edited</span>
            </>
          ) : null}

          {isOwnMessage && !isDeleted ? (
            <>
              <span aria-hidden="true">•</span>

              {isTemporary ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2
                    aria-hidden="true"
                    className="h-3 w-3 animate-spin"
                  />
                  Sending
                </span>
              ) : isRead ? (
                <span
                  className="inline-flex items-center gap-1 text-[#8A6A1F]"
                  aria-label="Read"
                >
                  <CheckCheck
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  />
                  Read
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1"
                  aria-label="Sent"
                >
                  <Check
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  />
                  Sent
                </span>
              )}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}