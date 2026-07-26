begin;

create table crm.audit_log (
  id uuid primary key default gen_random_uuid(),
  domain_event_id uuid not null,
  actor_profile_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  previous_values jsonb,
  new_values jsonb,
  occurred_at timestamptz not null,
  correlation_id uuid not null,
  causation_id uuid,
  ip_address inet,
  device_metadata jsonb,
  created_at timestamptz not null default now(),

  constraint audit_log_domain_event_fkey
    foreign key (domain_event_id) references crm.domain_events(id) on delete restrict,
  constraint audit_log_actor_fkey
    foreign key (actor_profile_id) references crm.profiles(id) on delete restrict,
  constraint audit_log_causation_fkey
    foreign key (causation_id) references crm.domain_events(id) on delete restrict,
  constraint audit_log_domain_event_unique unique (domain_event_id),
  constraint audit_log_entity_type_length
    check (char_length(trim(entity_type)) between 2 and 100),
  constraint audit_log_action_length
    check (char_length(trim(action)) between 2 and 100),
  constraint audit_log_previous_object_check
    check (previous_values is null or jsonb_typeof(previous_values) = 'object'),
  constraint audit_log_new_object_check
    check (new_values is null or jsonb_typeof(new_values) = 'object'),
  constraint audit_log_device_object_check
    check (device_metadata is null or jsonb_typeof(device_metadata) = 'object')
);

comment on table crm.audit_log is
  'Immutable administrator-only history projected from domain events. Separate from Timeline and Activity Feed.';

create index audit_log_order_idx
  on crm.audit_log (occurred_at desc, id desc);
create index audit_log_actor_idx
  on crm.audit_log (actor_profile_id, occurred_at desc)
  where actor_profile_id is not null;
create index audit_log_entity_idx
  on crm.audit_log (entity_type, entity_id, occurred_at desc);
create index audit_log_correlation_idx
  on crm.audit_log (correlation_id, occurred_at);

create or replace function crm.current_request_metadata()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  headers jsonb;
begin
  begin
    headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    headers := null;
  end;
  return coalesce(headers, '{}'::jsonb);
end;
$$;
revoke all on function crm.current_request_metadata() from public;

create or replace function crm.project_domain_event_to_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers jsonb := crm.current_request_metadata();
  prior jsonb;
  current_values jsonb;
  request_ip inet;
begin
  prior := case
    when new.payload ? 'previous' then new.payload->'previous'
    when new.payload ? 'from' then jsonb_build_object('value', new.payload->'from')
    else null
  end;
  current_values := case
    when new.payload ? 'new' then new.payload->'new'
    when new.payload ? 'to' then jsonb_build_object('value', new.payload->'to')
    when new.payload = '{}'::jsonb then null
    else new.payload
  end;
  begin
    request_ip := coalesce(
      nullif(split_part(headers->>'x-forwarded-for', ',', 1), '')::inet,
      nullif(headers->>'x-real-ip', '')::inet
    );
  exception when others then
    request_ip := null;
  end;

  insert into crm.audit_log (
    domain_event_id, actor_profile_id, entity_type, entity_id, action,
    previous_values, new_values, occurred_at, correlation_id, causation_id,
    ip_address, device_metadata
  ) values (
    new.id, new.actor_profile_id, new.aggregate_type, new.aggregate_id,
    new.event_type, prior, current_values, new.occurred_at,
    new.correlation_id, new.causation_id, request_ip,
    jsonb_strip_nulls(jsonb_build_object(
      'user_agent', headers->>'user-agent',
      'forwarded_for', headers->>'x-forwarded-for',
      'request_id', headers->>'x-request-id'
    ))
  )
  on conflict (domain_event_id) do nothing;
  return new;
end;
$$;
revoke all on function crm.project_domain_event_to_audit_log() from public;
create trigger domain_events_project_audit_log
after insert on crm.domain_events
for each row execute function crm.project_domain_event_to_audit_log();

insert into crm.audit_log (
  domain_event_id, actor_profile_id, entity_type, entity_id, action,
  previous_values, new_values, occurred_at, correlation_id, causation_id,
  device_metadata
)
select
  event.id, event.actor_profile_id, event.aggregate_type, event.aggregate_id,
  event.event_type,
  case
    when event.payload ? 'previous' then event.payload->'previous'
    when event.payload ? 'from' then jsonb_build_object('value', event.payload->'from')
    else null
  end,
  case
    when event.payload ? 'new' then event.payload->'new'
    when event.payload ? 'to' then jsonb_build_object('value', event.payload->'to')
    when event.payload = '{}'::jsonb then null
    else event.payload
  end,
  event.occurred_at, event.correlation_id, event.causation_id, '{}'::jsonb
from crm.domain_events as event
on conflict (domain_event_id) do nothing;

create or replace function crm.prevent_audit_log_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Audit log records are immutable.';
end;
$$;
revoke all on function crm.prevent_audit_log_mutation() from public;
create trigger audit_log_immutable
before update or delete on crm.audit_log
for each row execute function crm.prevent_audit_log_mutation();

alter table crm.audit_log enable row level security;
alter table crm.audit_log force row level security;
grant select on crm.audit_log to authenticated;
create policy "audit_log_select_admin"
on crm.audit_log for select to authenticated
using (crm.is_current_admin());

commit;
