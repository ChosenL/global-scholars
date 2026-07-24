"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import { ensureCrmProfile } from "@/app/scholar-dashboard/services/crmProfile";
import type {
  ConversationParticipantRole,
  CrmProfile,
} from "@/app/scholar-dashboard/types/dashboard";
import { createClerkSupabaseClient } from "@/lib/supabase";

interface UseCrmProfileResult {
  profile: CrmProfile | null;
  isLoading: boolean;
  error: string;
  refreshProfile: () => Promise<void>;
}

function resolveRole(value: unknown): ConversationParticipantRole {
  return value === "advisor" || value === "admin"
    ? value
    : "student";
}

export function useCrmProfile(): UseCrmProfileResult {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();
  const [profile, setProfile] = useState<CrmProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const loadProfile = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    const currentSession = sessionRef.current;

    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user || !currentSession) {
      setProfile(null);
      setError("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClerkSupabaseClient(() =>
        currentSession.getToken(),
      );
      const nextProfile = await ensureCrmProfile(
        supabase,
        currentSession.id,
        {
          clerkUserId: user.id,
          email:
            user.primaryEmailAddress?.emailAddress ?? null,
          displayName:
            user.fullName ??
            user.firstName ??
            user.primaryEmailAddress?.emailAddress ??
            "",
          avatarUrl: user.imageUrl || null,
          role: resolveRole(user.publicMetadata.role),
        },
      );

      if (requestId === requestIdRef.current) {
        setProfile(nextProfile);
        setError("");
      }
    } catch (profileError) {
      if (requestId === requestIdRef.current) {
        setProfile(null);
        setError(
          profileError instanceof Error
            ? profileError.message
            : "Your CRM profile could not be loaded.",
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestIdRef.current += 1;
    };
  }, [loadProfile]);

  return {
    profile,
    isLoading,
    error,
    refreshProfile: loadProfile,
  };
}
