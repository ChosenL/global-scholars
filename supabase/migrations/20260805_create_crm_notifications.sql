begin;

create table crm.notification_preferences (
  profile_id uuid primary key,
  in_app_enabled boolean not null default true,
  event_preferences jsonb not null default '{}'::jsonb,
  future_channels jsonb not null default jsonb_build_object(
    'email', false, 'sms', false, 'push', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_preferences_profile_fkey
    foreign key (profile_id) references crm.profiles(id) on delete restrict,
  constraint notification_preferences_event_object_check
    check (jsonb_typeof(event_preferences) = 'object'),
  constraint notification_preferences_channels_object_check
    check (jsonb_typeof(future_channels) = 'object')
);

create table crm.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null,
  actor_profile_id uuid,
  domain_event_id uuid not null,
  notification_type text not null,
  title text not null,
  body text not null,
  severity text not null default 'info',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint notifications_recipient_fkey
    foreign key (recipient_profile_id) references crm.profiles(id) on delete restrict,
  constraint notifications_actor_fkey
    foreign key (actor_profile_id) references crm.profiles(id) on delete restrict,
  constraint notifications_domain_event_fkey
    foreign key (domain_event_id) references crm.domain_events(id) on delete restrict,
  constraint notifications_event_recipient_unique
    unique (domain_event_id, recipient_profile_id),
  constraint notifications_type_length
    check (char_length(trim(notification_type)) between 3 and 100),
  constraint notifications_title_length
    check (char_length(trim(title)) between 2 and 200),
  constraint notifications_body_length
    check (char_length(trim(body)) between 2 and 2000),
  constraint notifications_severity_check
    check (severity in ('info', 'success', 'warning', 'critical')),
  constraint notifications_data_object_check
    check (jsonb_typeof(data) = 'object'),
  constraint notifications_timestamp_check
    check (
      (read_at is null or read_at >= created_at)
      and (dismissed_at is null or dismissed_at >= created_at)
      and (deleted_at is null or deleted_at >= created_at)
    )
);

comment on table crm.notifications is
  'In-app notification records created from domain events.';
comment on column crm.notification_preferences.future_channels is
  'Reserved channel configuration for future delivery providers; no delivery is implemented.';

create index notifications_recipient_active_idx
  on crm.notifications (recipient_profile_id, created_at desc)
  where deleted_at is null and dismissed_at is null;
create index notifications_recipient_unread_idx
  on crm.notifications (recipient_profile_id, created_at desc)
  where deleted_at is null and dismissed_at is null and read_at is null;

create trigger notification_preferences_set_updated_at
before update on crm.notification_preferences
for each row execute function crm.set_updated_at();

create or replace function crm.upsert_notification_preferences(
  target_profile_id uuid,
  new_in_app_enabled boolean,
  new_event_preferences jsonb
)
returns crm.notification_preferences
language plpgsql
security definer
set search_path = ''
as $$
declare
  result crm.notification_preferences;
begin
  if target_profile_id <> crm.current_profile_id()
    and not crm.is_current_admin()
  then
    raise exception 'Notification preference access denied.';
  end if;
  insert into crm.notification_preferences (
    profile_id, in_app_enabled, event_preferences
  ) values (
    target_profile_id, new_in_app_enabled,
    coalesce(new_event_preferences, '{}'::jsonb)
  )
  on conflict (profile_id) do update
  set in_app_enabled = excluded.in_app_enabled,
      event_preferences = excluded.event_preferences
  returning * into result;
  perform crm.emit_domain_event(
    'notification.preferences_updated', 'notification', target_profile_id,
    target_profile_id,
    jsonb_build_object('in_app_enabled', result.in_app_enabled)
  );
  return result;
end;
$$;

create or replace function crm.mark_notification_read(
  target_notification_id uuid,
  new_is_read boolean default true
)
returns crm.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  result crm.notifications;
begin
  update crm.notifications
  set read_at = case when new_is_read then statement_timestamp() else null end
  where id = target_notification_id
    and deleted_at is null
    and (
      recipient_profile_id = crm.current_profile_id()
      or crm.is_current_admin()
    )
  returning * into result;
  if result.id is null then raise exception 'Active notification not found.'; end if;
  perform crm.emit_domain_event(
    case when new_is_read then 'notification.read' else 'notification.unread' end,
    'notification', result.id, result.recipient_profile_id
  );
  return result;
end;
$$;

create or replace function crm.dismiss_notification(
  target_notification_id uuid
)
returns crm.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  result crm.notifications;
begin
  update crm.notifications
  set dismissed_at = statement_timestamp()
  where id = target_notification_id
    and deleted_at is null
    and (
      recipient_profile_id = crm.current_profile_id()
      or crm.is_current_admin()
    )
  returning * into result;
  if result.id is null then raise exception 'Active notification not found.'; end if;
  perform crm.emit_domain_event(
    'notification.dismissed', 'notification', result.id,
    result.recipient_profile_id
  );
  return result;
end;
$$;

create or replace function crm.create_notification_from_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  notification_title text;
  notification_body text;
  notification_severity text := 'info';
  should_notify boolean := false;
  recipient_id uuid := new.student_profile_id;
  created_notification crm.notifications;
begin
  if recipient_id is null then return new; end if;

  if new.event_type = 'document.status_changed' then
    should_notify := true;
    notification_title := 'Document status updated';
    notification_body := 'A document review status has changed.';
    notification_severity := case
      when new.payload->>'to' in ('rejected', 'needs_revision') then 'warning'
      when new.payload->>'to' = 'approved' then 'success'
      else 'info'
    end;
  elsif new.event_type in ('task.created', 'task.status_changed')
    and exists (
      select 1 from crm.student_tasks as task
      where task.id = new.aggregate_id
        and task.visibility = 'student'
    )
  then
    should_notify := true;
    notification_title := case
      when new.event_type = 'task.created' then 'New task assigned'
      else 'Task status updated'
    end;
    notification_body := case
      when new.event_type = 'task.created'
        then 'A new task is available in your student workspace.'
      else 'The status of one of your tasks has changed.'
    end;
  end if;

  if not should_notify then return new; end if;
  if not coalesce((
    select preference.in_app_enabled
      and coalesce(
        (preference.event_preferences->>new.event_type)::boolean, true
      )
    from crm.notification_preferences as preference
    where preference.profile_id = recipient_id
  ), true) then
    return new;
  end if;

  insert into crm.notifications (
    recipient_profile_id, actor_profile_id, domain_event_id,
    notification_type, title, body, severity, data
  ) values (
    recipient_id, new.actor_profile_id, new.id, new.event_type,
    notification_title, notification_body, notification_severity,
    jsonb_build_object(
      'aggregate_type', new.aggregate_type,
      'aggregate_id', new.aggregate_id
    )
  )
  on conflict (domain_event_id, recipient_profile_id) do nothing
  returning * into created_notification;

  if created_notification.id is not null then
    perform crm.emit_domain_event(
      'notification.created', 'notification', created_notification.id,
      recipient_id,
      jsonb_build_object('notification_type', created_notification.notification_type),
      new.correlation_id, new.id
    );
  end if;
  return new;
end;
$$;
revoke all on function crm.create_notification_from_domain_event() from public;

create trigger domain_events_create_notification
after insert on crm.domain_events
for each row execute function crm.create_notification_from_domain_event();

revoke all on function crm.upsert_notification_preferences(uuid,boolean,jsonb) from public;
revoke all on function crm.mark_notification_read(uuid,boolean) from public;
revoke all on function crm.dismiss_notification(uuid) from public;
grant execute on function crm.upsert_notification_preferences(uuid,boolean,jsonb) to authenticated;
grant execute on function crm.mark_notification_read(uuid,boolean) to authenticated;
grant execute on function crm.dismiss_notification(uuid) to authenticated;

alter table crm.notification_preferences enable row level security;
alter table crm.notification_preferences force row level security;
alter table crm.notifications enable row level security;
alter table crm.notifications force row level security;
grant select on crm.notification_preferences to authenticated;
grant select on crm.notifications to authenticated;

create policy "notification_preferences_select_owner_or_admin"
on crm.notification_preferences for select to authenticated
using (profile_id = crm.current_profile_id() or crm.is_current_admin());
create policy "notifications_select_recipient_or_admin"
on crm.notifications for select to authenticated
using (
  deleted_at is null
  and (
    recipient_profile_id = crm.current_profile_id()
    or crm.is_current_admin()
  )
);

commit;
