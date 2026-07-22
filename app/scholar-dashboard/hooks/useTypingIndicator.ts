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

const TYPING_EVENT = "typing";
const TYPING_EXPIRY_MS = 4_000;

export interface TypingParticipant {
  userId: string;
  displayName: string;
  role: "student" | "advisor";
}

interface TypingBroadcastPayload {
  conversationId: string;
  userId: string;
  displayName: string;
  role: "student" | "advisor";
  isTyping: boolean;
  sentAt: string;
}

interface UseTypingIndicatorOptions {
  conversationId: string | null;
  displayName: string;
  role?: "student" | "advisor";
}

interface UseTypingIndicatorResult {
  typingParticipants: TypingParticipant[];
  notifyTyping: (isTyping: boolean) => void;
}

function isTypingPayload(
  value: unknown,
): value is TypingBroadcastPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<TypingBroadcastPayload>;

  return (
    typeof payload.conversationId === "string" &&
    typeof payload.userId === "string" &&
    typeof payload.displayName === "string" &&
    (payload.role === "student" || payload.role === "advisor") &&
    typeof payload.isTyping === "boolean" &&
    typeof payload.sentAt === "string"
  );
}

export function useTypingIndicator({
  conversationId,
  displayName,
  role = "student",
}: UseTypingIndicatorOptions): UseTypingIndicatorResult {
  const { user } = useUser();
  const { session } = useSession();

  const [typingByUser, setTypingByUser] = useState(
    new Map<string, TypingParticipant & { conversationId: string }>(),
  );

  const channelRef = useRef<
    ReturnType<ReturnType<typeof createClerkSupabaseClient>["channel"]> | null
  >(null);

  const expiryTimersRef = useRef(
    new Map<string, number>(),
  );

  const userId = user?.id ?? null;
  const normalizedDisplayName =
    displayName.trim() || (role === "advisor" ? "Advisor" : "Student");

  useEffect(() => {
    if (!session || !userId || !conversationId) {
      return;
    }

    const supabase = createClerkSupabaseClient(
      () => session.getToken(),
    );

    const channel = supabase.channel(
      `conversation-typing:${conversationId}`,
      {
        config: {
          broadcast: {
            self: false,
          },
        },
      },
    );

    channelRef.current = channel;

    channel
      .on(
        "broadcast",
        { event: TYPING_EVENT },
        ({ payload }: { payload: unknown }) => {
          if (!isTypingPayload(payload)) {
            return;
          }

          if (
            payload.conversationId !== conversationId ||
            payload.userId === userId
          ) {
            return;
          }

          const existingTimer = expiryTimersRef.current.get(
            payload.userId,
          );

          if (existingTimer) {
            window.clearTimeout(existingTimer);
            expiryTimersRef.current.delete(payload.userId);
          }

          if (!payload.isTyping) {
            setTypingByUser((current) => {
              const next = new Map(current);
              next.delete(payload.userId);
              return next;
            });
            return;
          }

          setTypingByUser((current) => {
            const next = new Map(current);
            next.set(payload.userId, {
              conversationId: payload.conversationId,
              userId: payload.userId,
              displayName:
                payload.displayName.trim() ||
                (payload.role === "advisor" ? "Advisor" : "Student"),
              role: payload.role,
            });
            return next;
          });

          const expiryTimer = window.setTimeout(() => {
            setTypingByUser((current) => {
              const next = new Map(current);
              next.delete(payload.userId);
              return next;
            });
            expiryTimersRef.current.delete(payload.userId);
          }, TYPING_EXPIRY_MS);

          expiryTimersRef.current.set(
            payload.userId,
            expiryTimer,
          );
        },
      )
      .subscribe();

    return () => {
      if (channelRef.current === channel) {
        channelRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [conversationId, session, userId]);

  useEffect(() => {
    const timers = expiryTimersRef.current;

    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const notifyTyping = useCallback(
    (isTyping: boolean): void => {
      if (!conversationId || !userId) {
        return;
      }

      const channel = channelRef.current;

      if (!channel) {
        return;
      }

      const payload: TypingBroadcastPayload = {
        conversationId,
        userId,
        displayName: normalizedDisplayName,
        role,
        isTyping,
        sentAt: new Date().toISOString(),
      };

      void channel.send({
        type: "broadcast",
        event: TYPING_EVENT,
        payload,
      });
    }, [
      conversationId,
      normalizedDisplayName,
      role,
      userId,
    ],
  );

  const typingParticipants = useMemo(
    () =>
      Array.from(typingByUser.values())
        .filter(
          (participant) =>
            participant.conversationId === conversationId,
        )
        .map(({ userId: id, displayName: name, role: participantRole }) => ({
          userId: id,
          displayName: name,
          role: participantRole,
        })),
    [conversationId, typingByUser],
  );

  return {
    typingParticipants,
    notifyTyping,
  };
}