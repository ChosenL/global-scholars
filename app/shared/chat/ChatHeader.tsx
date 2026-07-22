"use client";

import {
  MoreVertical,
  Phone,
  Search,
  Video,
} from "lucide-react";
import Image from "next/image";

import type { ChatParticipant } from "./types";

interface ChatHeaderProps {
  participant: ChatParticipant;
  onSearch?: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
  onMore?: () => void;
}

function formatLastSeen(
  value?: string | null,
): string {
  if (!value) {
    return "Offline";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Offline";
  }

  return `Last seen ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)}`;
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default function ChatHeader({
  participant,
  onSearch,
  onVoiceCall,
  onVideoCall,
  onMore,
}: ChatHeaderProps) {
  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        {participant.avatarUrl ? (
          <Image
            src={participant.avatarUrl}
            alt={participant.displayName}
            width={48}
            height={48}
            unoptimized
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F2747] font-black text-white">
            {initials(participant.displayName)}
          </div>
        )}

        <div>
          <h2 className="text-lg font-black text-[#071526]">
            {participant.displayName}
          </h2>

          {participant.isOnline ? (
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

              <span className="text-sm font-medium text-emerald-600">
                Online
              </span>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {formatLastSeen(
                participant.lastSeenAt,
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSearch}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-50"
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onVoiceCall}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-50"
        >
          <Phone className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onVideoCall}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-50"
        >
          <Video className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onMore}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-50"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
