import type { SupabaseClient } from "@supabase/supabase-js";

export interface NotificationPreferences {
  profile_id: string;
  in_app_enabled: boolean;
  event_preferences: Record<string, boolean>;
  future_channels: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface CrmNotification {
  id: string;
  recipient_profile_id: string;
  actor_profile_id: string | null;
  domain_event_id: string;
  notification_type: string;
  title: string;
  body: string;
  severity: "info" | "success" | "warning" | "critical";
  data: Record<string, unknown>;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export async function fetchNotifications(
  supabase: SupabaseClient,
  recipientProfileId: string,
): Promise<CrmNotification[]> {
  const { data, error } = await supabase
    .schema("crm")
    .from("notifications")
    .select("*")
    .eq("recipient_profile_id", recipientProfileId)
    .is("deleted_at", null)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CrmNotification[];
}

export async function updateNotificationReadState(
  supabase: SupabaseClient,
  notificationId: string,
  isRead: boolean,
): Promise<CrmNotification> {
  const { data, error } = await supabase.schema("crm").rpc(
    "mark_notification_read",
    { target_notification_id: notificationId, new_is_read: isRead },
  );
  if (error) throw error;
  return data as CrmNotification;
}

export async function dismissNotification(
  supabase: SupabaseClient,
  notificationId: string,
): Promise<void> {
  const { error } = await supabase.schema("crm").rpc(
    "dismiss_notification",
    { target_notification_id: notificationId },
  );
  if (error) throw error;
}

export async function saveNotificationPreferences(
  supabase: SupabaseClient,
  preferences: Pick<
    NotificationPreferences,
    "profile_id" | "in_app_enabled" | "event_preferences"
  >,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase.schema("crm").rpc(
    "upsert_notification_preferences",
    {
      target_profile_id: preferences.profile_id,
      new_in_app_enabled: preferences.in_app_enabled,
      new_event_preferences: preferences.event_preferences,
    },
  );
  if (error) throw error;
  return data as NotificationPreferences;
}
