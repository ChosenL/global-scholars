import type { SupabaseClient } from "@supabase/supabase-js";

import { requireLimit, requireTrimmedText } from "./validation";

export type GlobalSearchResultType =
  | "profile"
  | "student"
  | "document"
  | "task"
  | "note"
  | "application";

export interface GlobalSearchResult {
  result_type: GlobalSearchResultType;
  result_id: string;
  student_profile_id: string | null;
  title: string;
  summary: string;
  rank: number;
  metadata: Record<string, unknown>;
}

export async function globalSearch(
  supabase: SupabaseClient,
  searchQuery: string,
  limit = 50,
  offset = 0,
): Promise<GlobalSearchResult[]> {
  const { data, error } = await supabase.schema("crm").rpc("global_search", {
    search_query: requireTrimmedText(searchQuery, "Search query", 2, 200),
    result_limit: requireLimit(limit),
    result_offset: Math.max(0, Math.trunc(offset)),
  });
  if (error) throw error;
  return (data ?? []) as GlobalSearchResult[];
}
