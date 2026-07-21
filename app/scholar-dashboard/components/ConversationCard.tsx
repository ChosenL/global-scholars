"use client";

import {
  Archive,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import type { ConversationWithDetails } from "../types/dashboard";

interface ConversationCardProps {
  conversation: ConversationWithDetails;
  isActive: boolean;
  onSelect: (conversationId: string) => void;
  disabled?: boolean;
}

function formatConversationTime(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) {
    return "Yesterday";
  }

  const isCurrentYear =
    date.getFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(isCurrentYear ? {} : { year: "numeric" }),
  }).format(date);
}

function getConversationPreview(
  conversation: ConversationWithDetails,
): string {
  const latestMessage = conversation.latest_message;

  if (!latestMessage) {
    return "No messages yet. Start the conversation.";
  }

  if (latestMessage.deleted_at) {
    return "This message was deleted.";
  }

  const body = latestMessage.body?.trim();

  if (body) {
    return body;
  }

  if (latestMessage.attachment_name) {
    return `Attachment: ${latestMessage.attachment_name}`;
  }

  return "New message";
}

function getStatusLabel(
  status: ConversationWithDetails["status"],
): string {
  switch (status) {
    case "resolved":
      return "Resolved";
    case "archived":
      return "Archived";
    default:
      return "Open";
  }
}

function StatusIcon({
  status,
}: {
  status: ConversationWithDetails["status"];
}) {
  if (status === "resolved") {
    return (
      <CheckCircle2
        aria-hidden="true"
        className="h-3.5 w-3.5"
      />
    );
  }

  if (status === "archived") {
    return (
      <Archive
        aria-hidden="true"
        className="h-3.5 w-3.5"
      />
    );
  }

  return (
    <MessageCircle
      aria-hidden="true"
      className="h-3.5 w-3.5"
    />
  );
}

export default function ConversationCard({
  conversation,
  isActive,
  onSelect,
  disabled = false,
}: ConversationCardProps) {
  const preview = getConversationPreview(conversation);

  const timestamp = formatConversationTime(
    conversation.last_message_at ??
      conversation.latest_message?.created_at ??
      conversation.created_at,
  );

  const unreadCount = Math.max(
    0,
    conversation.unread_count,
  );

  const hasUnreadMessages = unreadCount > 0;

  const statusLabel = getStatusLabel(
    conversation.status,
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      disabled={disabled}
      aria-current={isActive ? "true" : undefined}
      aria-label={`Open conversation: ${conversation.subject}`}
      className={[
        "group relative w-full rounded-2xl border p-4 text-left",
        "transition duration-200",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-[#C8A24A] focus-visible:ring-offset-2",
        isActive
          ? "border-[#C8A24A]/60 bg-[#FFF9EA] shadow-sm"
          : "border-slate-200 bg-white hover:border-[#C8A24A]/40 hover:bg-slate-50",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer",
      ].join(" ")}
    >
      {isActive ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-[#C8A24A]"
        />
      ) : null}

      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            isActive
              ? "bg-[#0F2747] text-white"
              : "bg-[#F4F7FA] text-[#0F2747]",
          ].join(" ")}
        >
          <MessageCircle
            aria-hidden="true"
            className="h-5 w-5"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p
              className={[
                "truncate text-sm text-[#071526]",
                hasUnreadMessages
                  ? "font-black"
                  : "font-bold",
              ].join(" ")}
            >
              {conversation.subject}
            </p>

            {timestamp ? (
              <time
                dateTime={
                  conversation.last_message_at ??
                  conversation.latest_message?.created_at ??
                  conversation.created_at
                }
                className={[
                  "shrink-0 text-[11px]",
                  hasUnreadMessages
                    ? "font-black text-[#8A6A1F]"
                    : "font-semibold text-slate-400",
                ].join(" ")}
              >
                {timestamp}
              </time>
            ) : null}
          </div>

          <p
            className={[
              "mt-1 line-clamp-2 text-sm leading-5",
              hasUnreadMessages
                ? "font-semibold text-slate-700"
                : "text-slate-500",
            ].join(" ")}
          >
            {preview}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
                "text-[10px] font-black uppercase tracking-[0.12em]",
                conversation.status === "resolved"
                  ? "bg-emerald-100 text-emerald-700"
                  : conversation.status === "archived"
                    ? "bg-slate-200 text-slate-600"
                    : "bg-[#0F2747]/10 text-[#0F2747]",
              ].join(" ")}
            >
              <StatusIcon status={conversation.status} />
              {statusLabel}
            </span>

            {hasUnreadMessages ? (
              <span
                aria-label={`${unreadCount} unread ${
                  unreadCount === 1 ? "message" : "messages"
                }`}
                className="inline-flex min-w-6 items-center justify-center rounded-full bg-[#C8A24A] px-2 py-1 text-xs font-black text-[#071526]"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}