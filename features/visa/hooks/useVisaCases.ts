"use client";

import { useSession } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import { createClerkSupabaseClient } from "@/lib/supabase";

import { fetchStudentVisaCases } from "../services/visaCases";
import type { VisaCase } from "../types";

export function useVisaCases(studentProfileId: string | null) {
  const { session } = useSession();
  const sessionRef = useRef(session);
  const [cases, setCases] = useState<VisaCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const refresh = useCallback(async () => {
    if (!studentProfileId || !sessionRef.current) {
      setCases([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClerkSupabaseClient(
        () => sessionRef.current?.getToken() ?? Promise.resolve(null),
      );
      setCases(await fetchStudentVisaCases(supabase, studentProfileId));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load visa cases.");
    } finally {
      setIsLoading(false);
    }
  }, [studentProfileId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  return { cases, isLoading, error, refresh };
}
