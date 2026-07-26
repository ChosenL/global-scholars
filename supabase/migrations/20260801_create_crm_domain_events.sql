begin;

create table crm.domain_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  student_profile_id uuid,
  actor_profile_id uuid,
  occurred_at timestamptz not null default statement_timestamp(),
  payload jsonb not null default '{}'::jsonb,
  correlation_id uuid not null default gen_random_uuid(),
  causation_id uuid,

  constraint domain_events_student_fkey
    foreign key (student_profile_id) references crm.profiles(id) on delete restrict,
  constraint domain_events_actor_fkey
    foreign key (actor_profile_id) references crm.profiles(id) on delete restrict,
  constraint domain_events_causation_fkey
    foreign key (causation_id) references crm.domain_events(id) on delete restrict,
  constraint domain_events_event_type_check
    check (event_type ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  constraint domain_events_aggregate_type_check
    check (aggregate_type in ('student_profile', 'document', 'task', 'note')),
  constraint domain_events_payload_object_check
    check (jsonb_typeof(payload) = 'object')
);

comment on table crm.domain_events is
  'Append-only integration events for business actions. Identity is referenced by CRM UUID only.';

create index domain_events_aggregate_idx
  on crm.domain_events (aggregate_type, aggregate_id, occurred_at, id);
create index domain_events_student_idx
  on crm.domain_events (student_profile_id, occurred_at desc, id desc)
  where student_profile_id is not null;
create index domain_events_type_idx
  on crm.domain_events (event_type, occurred_at desc);
create index domain_events_correlation_idx
  on crm.domain_events (correlation_id);

create or replace function crm.prevent_domain_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Domain events are immutable.';
end;
$$;
revoke all on function crm.prevent_domain_event_mutation() from public;

create trigger domain_events_immutable
before update or delete on crm.domain_events
for each row execute function crm.prevent_domain_event_mutation();

create or replace function crm.capture_student_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  aggregate_name text := tg_argv[0];
  student_id uuid;
  event_payload jsonb := '{}'::jsonb;
begin
  if aggregate_name = 'document' then
    student_id := new.profile_id;
    if tg_op = 'INSERT' then event_name := 'document.created';
    elsif new.deleted_at is not null and old.deleted_at is null then event_name := 'document.deleted';
    elsif new.status is distinct from old.status then
      event_name := 'document.status_changed';
      event_payload := jsonb_build_object('from', old.status, 'to', new.status);
    else event_name := 'document.updated';
    end if;
  elsif aggregate_name = 'task' then
    student_id := new.student_profile_id;
    if tg_op = 'INSERT' then event_name := 'task.created';
    elsif new.deleted_at is not null and old.deleted_at is null then event_name := 'task.deleted';
    elsif new.status is distinct from old.status then
      event_name := 'task.status_changed';
      event_payload := jsonb_build_object('from', old.status, 'to', new.status);
    else event_name := 'task.updated';
    end if;
  elsif aggregate_name = 'note' then
    student_id := new.student_profile_id;
    if tg_op = 'INSERT' then event_name := 'note.created';
    elsif new.deleted_at is not null and old.deleted_at is null then event_name := 'note.deleted';
    elsif new.is_pinned is distinct from old.is_pinned then
      event_name := case when new.is_pinned then 'note.pinned' else 'note.unpinned' end;
      event_payload := jsonb_build_object('is_pinned', new.is_pinned);
    else event_name := 'note.updated';
    end if;
  else
    raise exception 'Unsupported domain event aggregate.';
  end if;

  insert into crm.domain_events (
    event_type, aggregate_type, aggregate_id, student_profile_id,
    actor_profile_id, payload
  ) values (
    event_name, aggregate_name, new.id, student_id,
    crm.current_profile_id(), event_payload
  );
  return new;
end;
$$;
revoke all on function crm.capture_student_domain_event() from public;

create trigger student_documents_emit_domain_event
after insert or update on crm.student_documents
for each row execute function crm.capture_student_domain_event('document');
create trigger student_tasks_emit_domain_event
after insert or update on crm.student_tasks
for each row execute function crm.capture_student_domain_event('task');
create trigger student_notes_emit_domain_event
after insert or update on crm.student_notes
for each row execute function crm.capture_student_domain_event('note');

alter table crm.domain_events enable row level security;
alter table crm.domain_events force row level security;
grant select on crm.domain_events to authenticated;

create policy "domain_events_select_authorized_staff"
on crm.domain_events for select to authenticated
using (
  crm.is_current_admin()
  or (
    student_profile_id is not null
    and crm.can_manage_student(student_profile_id)
  )
);

commit;
