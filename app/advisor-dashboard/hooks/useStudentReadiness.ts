"use client";

import { useSession } from "@clerk/nextjs";
import { useEffect, useState } from "react";

import {
  calculateStudentReadiness,
  type StudentReadiness,
} from "@/lib/crm/readiness";
import { createClerkSupabaseClient } from "@/lib/supabase";

export function useStudentReadiness(studentProfileId: string) {
  const { session } = useSession();
  const [readiness, setReadiness] = useState<StudentReadiness | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const supabase = createClerkSupabaseClient(() => session.getToken());
    void calculateStudentReadiness(supabase, studentProfileId)
      .then((result) => {
        if (active) setReadiness(result);
      })
      .catch(() => {
        if (active) setReadiness(null);
      });
    return () => {
      active = false;
    };
  }, [session, studentProfileId]);

  return readiness;
}
