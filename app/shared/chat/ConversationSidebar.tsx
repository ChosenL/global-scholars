"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import type {
  ConversationSummary,
} from "./types";

interface ConversationSidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (
    conversationId: string,
  ) => void;
  className?: string;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const today = new Date();

  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (sameDay) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export default function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  className = "",
}: ConversationSidebarProps) {
  const [search, setSearch] = useState("");

  const filteredConversations = useMemo(() => {
    if (!search.trim()) {
      return conversations;
    }

    const query = search.toLowerCase();

    return conversations.filter((conversation) => {
      return (
        conversation.title
          .toLowerCase()
          .includes(query) ||
        conversation.subtitle
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [conversations, search]);

  return (
    <aside
      className={[
        "flex h-full w-full flex-col border-r border-slate-200 bg-white",
        className,
      ].join(" ")}
    >
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-xl font-black text-[#071526]">
          Inbox
        </h2>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />

          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#C8A24A]"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="text-sm text-slate-500">
              No conversations found.
            </p>
          </div>
        ) : (
          filteredConversations.map(
            (conversation) => {
              const active =
                conversation.id ===
                activeConversationId;

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() =>
                    onSelectConversation(
                      conversation.id,
                    )
                  }
                  className={[
                    "flex w-full items-start gap-3 border-b border-slate-100 px-4 py-4 text-left transition",
                    active
                      ? "bg-[#F5F8FC]"
                      : "hover:bg-slate-50",
                  ].join(" ")}
                >
                  {conversation.avatarUrl ? (
                    <Image
                      src={
                        conversation.avatarUrl
                      }
                      alt={
                        conversation.title
                      }
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0F2747] font-black text-white">
                      {initials(
                        conversation.title,
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-black text-[#071526]">
                        {conversation.title}
                      </h3>

                      <span className="shrink-0 text-xs text-slate-400">
                        {conversation.lastMessage
                          ? formatTime(
                              conversation
                                .lastMessage
                                .createdAt,
                            )
                          : ""}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-sm text-slate-500">
                      {conversation.lastMessage
                        ?.body ||
                        conversation.subtitle ||
                        "No messages"}
                    </p>
                  </div>

                  {conversation.unreadCount >
                    0 && (
                    <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#C8A24A] px-2 text-xs font-black text-white">
                      {
                        conversation.unreadCount
                      }
                    </span>
                  )}
                </button>
              );
            },
          )
        )}
      </div>
    </aside>
  );
}
