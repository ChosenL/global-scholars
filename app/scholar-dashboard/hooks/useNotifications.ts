"use client";

import { useSession } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchNotifications,
  type CrmNotification,
} from "@/lib/crm/notifications";
import { createClerkSupabaseClient } from "@/lib/supabase";

export function useNotifications(profileId: string | null) {
  const { session } = useSession();
  const sessionRef = useRef(session);
  const [notifications, setNotifications] = useState<CrmNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const refresh = useCallback(async () => {
    if (!profileId || !sessionRef.current) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClerkSupabaseClient(
        () => sessionRef.current?.getToken() ?? Promise.resolve(null),
      );
      setNotifications(await fetchNotifications(supabase, profileId));
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  return { notifications, isLoading, refresh };
}
