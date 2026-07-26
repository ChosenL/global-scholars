import type { SupabaseClient } from "@supabase/supabase-js";

import { requireLimit } from "./validation";

export interface AuditLogEntry {
  id: string;
  domain_event_id: string;
  actor_profile_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  occurred_at: string;
  correlation_id: string;
  causation_id: string | null;
  ip_address: string | null;
  device_metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function fetchAuditLog(
  supabase: SupabaseClient,
  limit = 100,
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase.schema("crm").from("audit_log")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(requireLimit(limit));
  if (error) throw error;
  return (data ?? []) as AuditLogEntry[];
}
