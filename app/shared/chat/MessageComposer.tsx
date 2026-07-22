"use client";

import { Paperclip, Send, X } from "lucide-react";
import Image from "next/image";
import {
  ChangeEvent,
  KeyboardEvent,
  useRef,
  useState,
} from "react";

import {
  PendingAttachment,
  getAttachmentKind,
} from "./types";

interface MessageComposerProps {
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
  onSend: (
    message: string,
    attachments: File[],
  ) => void | Promise<void>;
}

export default function MessageComposer({
  disabled = false,
  isSending = false,
  placeholder = "Type a message...",
  onSend,
}: MessageComposerProps) {
  const [message, setMessage] = useState("");

  const [attachments, setAttachments] = useState<
    PendingAttachment[]
  >([]);

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const resetComposer = () => {
    setMessage("");

    attachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(
          attachment.previewUrl,
        );
      }
    });

    setAttachments([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = async () => {
    if (
      isSending ||
      disabled ||
      (message.trim() === "" &&
        attachments.length === 0)
    ) {
      return;
    }

    await onSend(
      message.trim(),
      attachments.map((a) => a.file),
    );

    resetComposer();
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handleFiles = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(
      e.target.files ?? [],
    );

    const pending =
      files.map<PendingAttachment>(
        (file) => ({
          id:
            crypto.randomUUID(),
          file,
          kind:
            getAttachmentKind(
              file.type,
              file.name,
            ),
          previewUrl:
            file.type.startsWith(
              "image/",
            )
              ? URL.createObjectURL(file)
              : null,
          uploadProgress: 0,
          status: "pending",
        }),
      );

    setAttachments((previous) => [
      ...previous,
      ...pending,
    ]);
  };

  const removeAttachment = (
    id: string,
  ) => {
    setAttachments((previous) =>
      previous.filter((attachment) => {
        if (
          attachment.id === id &&
          attachment.previewUrl
        ) {
          URL.revokeObjectURL(
            attachment.previewUrl,
          );
        }

        return attachment.id !== id;
      }),
    );
  };

  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white p-4">
      {attachments.length > 0 && (
        <div className="mb-4 flex gap-3 overflow-x-auto pb-2">
          {attachments.map(
            (attachment) => (
              <div
                key={attachment.id}
                className="relative w-28 shrink-0"
              >
                {attachment.previewUrl ? (
                  <Image
                    src={
                      attachment.previewUrl
                    }
                    alt={
                      attachment.file.name
                    }
                    width={112}
                    height={96}
                    unoptimized
                    className="h-24 w-full rounded-xl object-cover border"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-xl border bg-slate-100 text-center text-xs font-bold px-2">
                    {
                      attachment.file
                        .name
                    }
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    removeAttachment(
                      attachment.id,
                    )
                  }
                  className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ),
          )}
        </div>
      )}

      <div className="flex items-end gap-3">
        <input
          ref={fileInputRef}
          hidden
          multiple
          type="file"
          onChange={handleFiles}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            fileInputRef.current?.click()
          }
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-300 hover:bg-slate-50"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <textarea
          rows={1}
          value={message}
          disabled={disabled}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          onChange={(e) =>
            setMessage(
              e.target.value,
            )
          }
          className="max-h-40 min-h-[48px] flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#C8A24A]"
        />

        <button
          type="button"
          disabled={
            disabled ||
            isSending
          }
          onClick={() => {
            void sendMessage();
          }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0F2747] text-white transition hover:bg-[#16375f] disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </footer>
  );
}
