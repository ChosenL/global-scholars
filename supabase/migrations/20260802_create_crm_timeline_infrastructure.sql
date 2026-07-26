begin;

create table crm.timeline_events (
  id uuid primary key default gen_random_uuid(),
  domain_event_id uuid not null,
  student_profile_id uuid not null,
  event_type text not null,
  subject_type text not null,
  subject_id uuid not null,
  actor_profile_id uuid,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),

  constraint timeline_events_domain_event_fkey
    foreign key (domain_event_id) references crm.domain_events(id) on delete restrict,
  constraint timeline_events_student_fkey
    foreign key (student_profile_id) references crm.profiles(id) on delete restrict,
  constraint timeline_events_actor_fkey
    foreign key (actor_profile_id) references crm.profiles(id) on delete restrict,
  constraint timeline_events_domain_event_unique unique (domain_event_id),
  constraint timeline_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

comment on table crm.timeline_events is
  'Immutable business history projected from domain events; separate from administrator audit data.';

create index timeline_events_student_order_idx
  on crm.timeline_events (student_profile_id, occurred_at desc, id desc);
create index timeline_events_subject_idx
  on crm.timeline_events (subject_type, subject_id, occurred_at desc);
create index timeline_events_type_idx
  on crm.timeline_events (event_type, occurred_at desc);

create or replace function crm.project_domain_event_to_timeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.student_profile_id is not null then
    insert into crm.timeline_events (
      domain_event_id, student_profile_id, event_type, subject_type,
      subject_id, actor_profile_id, occurred_at, metadata
    ) values (
      new.id, new.student_profile_id, new.event_type, new.aggregate_type,
      new.aggregate_id, new.actor_profile_id, new.occurred_at, new.payload
    );
  end if;
  return new;
end;
$$;
revoke all on function crm.project_domain_event_to_timeline() from public;

create trigger domain_events_project_timeline
after insert on crm.domain_events
for each row execute function crm.project_domain_event_to_timeline();

insert into crm.timeline_events (
  domain_event_id, student_profile_id, event_type, subject_type,
  subject_id, actor_profile_id, occurred_at, metadata
)
select
  event.id, event.student_profile_id, event.event_type, event.aggregate_type,
  event.aggregate_id, event.actor_profile_id, event.occurred_at, event.payload
from crm.domain_events as event
where event.student_profile_id is not null
on conflict (domain_event_id) do nothing;

create or replace function crm.prevent_timeline_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Timeline events are immutable.';
end;
$$;
revoke all on function crm.prevent_timeline_event_mutation() from public;

create trigger timeline_events_immutable
before update or delete on crm.timeline_events
for each row execute function crm.prevent_timeline_event_mutation();

alter table crm.timeline_events enable row level security;
alter table crm.timeline_events force row level security;
grant select on crm.timeline_events to authenticated;

create policy "timeline_events_select_authorized_staff"
on crm.timeline_events for select to authenticated
using (crm.can_manage_student(student_profile_id));

commit;
