"use client";

import {
  Inbox,
  Loader2,
  MessageCirclePlus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ConversationWithDetails } from "../types/dashboard";
import ConversationCard from "./ConversationCard";

interface ConversationListProps {
  conversations: ConversationWithDetails[];
  activeConversationId: string | null;
  isLoading: boolean;
  isCreatingConversation?: boolean;
  onSelectConversation: (
    conversationId: string,
  ) => void | Promise<void>;
  onStartConversation?: () => void;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export default function ConversationList({
  conversations,
  activeConversationId,
  isLoading,
  isCreatingConversation = false,
  onSelectConversation,
  onStartConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedSearchQuery =
    normalizeSearchValue(searchQuery);

  const filteredConversations = useMemo(() => {
    if (!normalizedSearchQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const latestMessageBody =
        conversation.latest_message?.body ?? "";

      const searchableText = [
        conversation.subject,
        latestMessageBody,
        conversation.status,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        normalizedSearchQuery,
      );
    });
  }, [conversations, normalizedSearchQuery]);

  const unreadConversationCount = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          conversation.unread_count > 0,
      ).length,
    [conversations],
  );

  return (
    <aside className="flex min-h-0 flex-col rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Inbox
                aria-hidden="true"
                className="h-5 w-5 text-[#C8A24A]"
              />

              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#C8A24A]">
                Inbox
              </p>
            </div>

            <h2 className="mt-2 text-2xl font-black text-[#071526]">
              Conversations
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {unreadConversationCount > 0
                ? `${unreadConversationCount} unread ${
                    unreadConversationCount === 1
                      ? "conversation"
                      : "conversations"
                  }`
                : "You are all caught up."}
            </p>
          </div>

          {onStartConversation ? (
            <button
              type="button"
              onClick={onStartConversation}
              disabled={isCreatingConversation}
              className={[
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                "bg-[#0F2747] text-white shadow-sm transition",
                "hover:bg-[#173B68]",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[#C8A24A] focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
              aria-label="Start a new conversation"
              title="Start a new conversation"
            >
              {isCreatingConversation ? (
                <Loader2
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin"
                />
              ) : (
                <MessageCirclePlus
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              )}
            </button>
          ) : null}
        </div>

        <label className="relative mt-5 block">
          <span className="sr-only">
            Search conversations
          </span>

          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(event.target.value)
            }
            placeholder="Search conversations"
            className={[
              "h-12 w-full rounded-xl border border-slate-200 bg-[#F8FAFC]",
              "pl-11 pr-4 text-sm text-[#071526] outline-none transition",
              "placeholder:text-slate-400",
              "focus:border-[#C8A24A] focus:bg-white",
              "focus:ring-2 focus:ring-[#C8A24A]/20",
            ].join(" ")}
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        {isLoading ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <Loader2
              aria-hidden="true"
              className="h-7 w-7 animate-spin text-[#C8A24A]"
            />

            <p className="mt-4 text-sm font-bold text-[#071526]">
              Loading conversations
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Please wait while we retrieve your messages.
            </p>
          </div>
        ) : filteredConversations.length > 0 ? (
          <div className="space-y-3">
            {filteredConversations.map(
              (conversation) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  isActive={
                    conversation.id ===
                    activeConversationId
                  }
                  onSelect={(conversationId) => {
                    void onSelectConversation(
                      conversationId,
                    );
                  }}
                />
              ),
            )}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0F2747] shadow-sm">
              <Inbox
                aria-hidden="true"
                className="h-6 w-6"
              />
            </div>

            <h3 className="mt-5 text-lg font-black text-[#071526]">
              No conversations yet
            </h3>

            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
              Start a conversation whenever you need help
              with admissions, documents, appointments, or
              your study pathway.
            </p>

            {onStartConversation ? (
              <button
                type="button"
                onClick={onStartConversation}
                disabled={isCreatingConversation}
                className={[
                  "mt-5 inline-flex items-center justify-center gap-2 rounded-xl",
                  "bg-[#0F2747] px-4 py-3 text-sm font-black text-white",
                  "transition hover:bg-[#173B68]",
                  "focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-[#C8A24A] focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
              >
                {isCreatingConversation ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  <MessageCirclePlus
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                )}

                Start conversation
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[#F8FAFC] px-6 py-10 text-center">
            <Search
              aria-hidden="true"
              className="h-7 w-7 text-slate-400"
            />

            <h3 className="mt-4 text-base font-black text-[#071526]">
              No matching conversations
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Try searching with a different subject or
              message keyword.
            </p>

            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-4 text-sm font-black text-[#8A6A1F] underline decoration-[#C8A24A]/50 underline-offset-4"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}