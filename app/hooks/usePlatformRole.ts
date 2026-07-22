"use client";

import { useSession, useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClerkSupabaseClient } from "@/lib/supabase";

export type PlatformRole = "student" | "advisor" | "admin";

interface UsePlatformRoleResult {
  role: PlatformRole | null;
  isLoading: boolean;
  error: string;
  isStudent: boolean;
  isAdvisor: boolean;
  isAdmin: boolean;
}

function isPlatformRole(value: unknown): value is PlatformRole {
  return value === "student" || value === "advisor" || value === "admin";
}

export function usePlatformRole(): UsePlatformRoleResult {
  const { isLoaded, isSignedIn, user } = useUser();
  const { session } = useSession();

  const [role, setRole] = useState<PlatformRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const requestIdRef = useRef(0);

  const clerkRole = useMemo(() => {
    const value = (user?.publicMetadata as Record<string, unknown> | undefined)?.role;
    return isPlatformRole(value) ? value : null;
  }, [user?.publicMetadata]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let cancelled = false;

    async function loadRole() {
      if (!isLoaded) return;

      if (!isSignedIn || !user || !session) {
        if (!cancelled && requestId === requestIdRef.current) {
          setRole(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const supabase = createClerkSupabaseClient(() => session.getToken());

        const { data, error: dbError } = await supabase
          .from("platform_users")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (dbError) throw dbError;

        const dbRole = isPlatformRole(data?.role) ? data.role : null;

        if (!cancelled && requestId === requestIdRef.current) {
          setRole(dbRole ?? clerkRole ?? "student");
          setError("");
        }
      } catch (err) {
        if (!cancelled && requestId === requestIdRef.current) {
          setRole(clerkRole ?? "student");
          setError(err instanceof Error ? err.message : "Unable to determine platform role.");
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, session, clerkRole]);

  return {
    role,
    isLoading,
    error,
    isStudent: role === "student",
    isAdvisor: role === "advisor" || role === "admin",
    isAdmin: role === "admin",
  };
}