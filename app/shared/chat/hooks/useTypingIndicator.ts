"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createClerkSupabaseClient } from "@/lib/supabase";

import type { PortalRole, TypingEvent, TypingIndicator } from "../types";

const TYPING_EVENT = "typing";
const INACTIVITY_MS = 1_800;
const REFRESH_MS = 1_200;
const REMOTE_EXPIRY_MS = 4_000;

export interface TypingParticipant {
  userId: string;
  displayName: string;
  role: PortalRole;
}

interface UseTypingIndicatorOptions {
  conversationId: string | null;
  displayName: string;
  role?: PortalRole;
  userId?: string | null;
}

interface UseTypingIndicatorResult {
  typingParticipants: TypingParticipant[];
  typingIndicators: TypingIndicator[];
  notifyTyping: (isTyping: boolean) => void;
}

function isTypingEvent(value: unknown): value is TypingEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<TypingEvent>;

  return (
    typeof event.conversationId === "string" &&
    typeof event.userId === "string" &&
    typeof event.displayName === "string" &&
    (event.role === "advisor" ||
      event.role === "student" ||
      event.role === "admin") &&
    typeof event.isTyping === "boolean" &&
    typeof event.sentAt === "string"
  );
}

export function useTypingIndicator({
  conversationId,
  displayName,
  role = "student",
  userId: providedUserId,
}: UseTypingIndicatorOptions): UseTypingIndicatorResult {
  const { user } = useUser();
  const { session } = useSession();
  const sessionId = session?.id ?? null;
  const sessionRef = useRef(session);
  const userId = providedUserId ?? user?.id ?? null;
  const normalizedDisplayName =
    displayName.trim() ||
    (role === "advisor"
      ? "Global Scholars Advisor"
      : role === "admin"
        ? "Administrator"
        : "Student");

  const [remoteTyping, setRemoteTyping] = useState(
    new Map<string, TypingEvent>(),
  );
  const sendEventRef = useRef<(isTyping: boolean) => void>(() => undefined);
  const isLocallyTypingRef = useRef(false);
  const inactivityTimerRef = useRef<number | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const expiryTimersRef = useRef(new Map<string, number>());

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const clearLocalTimers = useCallback((): void => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const stopTyping = useCallback((): void => {
    clearLocalTimers();

    if (isLocallyTypingRef.current) {
      isLocallyTypingRef.current = false;
      sendEventRef.current(false);
    }
  }, [clearLocalTimers]);

  const notifyTyping = useCallback(
    (isTyping: boolean): void => {
      if (!isTyping) {
        stopTyping();
        return;
      }

      if (!isLocallyTypingRef.current) {
        isLocallyTypingRef.current = true;
        sendEventRef.current(true);
      }

      if (inactivityTimerRef.current !== null) {
        window.clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = window.setTimeout(stopTyping, INACTIVITY_MS);

      if (refreshTimerRef.current === null) {
        refreshTimerRef.current = window.setTimeout(() => {
          refreshTimerRef.current = null;

          if (isLocallyTypingRef.current) {
            sendEventRef.current(true);
          }
        }, REFRESH_MS);
      }
    },
    [stopTyping],
  );

  useEffect(() => {
    stopTyping();

    if (!conversationId || !userId) {
      sendEventRef.current = () => undefined;
      return;
    }

    const expiryTimers = expiryTimersRef.current;
    const handleEvent = (event: TypingEvent): void => {
      if (
        event.conversationId !== conversationId ||
        event.userId === userId
      ) {
        return;
      }

      const existingTimer = expiryTimers.get(event.userId);
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
        expiryTimers.delete(event.userId);
      }

      setRemoteTyping((current) => {
        const next = new Map(current);
        if (event.isTyping) {
          next.set(event.userId, event);
        } else {
          next.delete(event.userId);
        }
        return next;
      });

      if (event.isTyping) {
        const timer = window.setTimeout(() => {
          setRemoteTyping((current) => {
            const next = new Map(current);
            next.delete(event.userId);
            return next;
          });
          expiryTimers.delete(event.userId);
        }, REMOTE_EXPIRY_MS);
        expiryTimers.set(event.userId, timer);
      }
    };

    const createEvent = (isTyping: boolean): TypingEvent => ({
      conversationId,
      userId,
      displayName: normalizedDisplayName,
      role,
      isTyping,
      sentAt: new Date().toISOString(),
    });

    let disposeTransport = (): void => undefined;

    const currentSession = sessionRef.current;

    if (sessionId && currentSession) {
      const supabase = createClerkSupabaseClient(() => currentSession.getToken());
      const channel = supabase.channel(`conversation:${conversationId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on(
          "broadcast",
          { event: TYPING_EVENT },
          ({ payload }: { payload: unknown }) => {
            if (isTypingEvent(payload)) {
              handleEvent(payload);
            }
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "CLOSED") {
            setRemoteTyping(new Map());
          }
        });

      sendEventRef.current = (isTyping) => {
        void channel.send({
          type: "broadcast",
          event: TYPING_EVENT,
          payload: createEvent(isTyping),
        });
      };
      disposeTransport = () => {
        void supabase.removeChannel(channel);
      };
    } else if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(`conversation:${conversationId}`);
      channel.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (isTypingEvent(data)) {
          handleEvent(data);
        }
      };
      sendEventRef.current = (isTyping) => channel.postMessage(createEvent(isTyping));
      disposeTransport = () => channel.close();
    }

    const handleDisconnect = (): void => stopTyping();
    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        stopTyping();
      }
    };
    window.addEventListener("offline", handleDisconnect);
    window.addEventListener("pagehide", handleDisconnect);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTyping();
      sendEventRef.current = () => undefined;
      disposeTransport();
      window.removeEventListener("offline", handleDisconnect);
      window.removeEventListener("pagehide", handleDisconnect);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      for (const timer of expiryTimers.values()) {
        window.clearTimeout(timer);
      }
      expiryTimers.clear();
    };
  }, [
    conversationId,
    normalizedDisplayName,
    role,
    sessionId,
    stopTyping,
    userId,
  ]);

  const typingIndicators = useMemo(
    () =>
      Array.from(remoteTyping.values())
        .filter((event) => event.conversationId === conversationId)
        .map((event) => ({
          conversationId: event.conversationId,
          userId: event.userId,
          displayName: event.displayName,
          role: event.role,
          isTyping: true,
          updatedAt: event.sentAt,
        })),
    [conversationId, remoteTyping],
  );

  const typingParticipants = useMemo(
    () =>
      typingIndicators.map((indicator) => ({
        userId: indicator.userId,
        displayName: indicator.displayName,
        role: indicator.role,
      })),
    [typingIndicators],
  );

  return { notifyTyping, typingIndicators, typingParticipants };
}
