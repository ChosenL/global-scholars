begin;

create table crm.activity_feed_entries (
  id uuid primary key default gen_random_uuid(),
  domain_event_id uuid not null,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  student_profile_id uuid,
  actor_profile_id uuid,
  occurred_at timestamptz not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint activity_feed_domain_event_fkey
    foreign key (domain_event_id) references crm.domain_events(id) on delete restrict,
  constraint activity_feed_student_fkey
    foreign key (student_profile_id) references crm.profiles(id) on delete restrict,
  constraint activity_feed_actor_fkey
    foreign key (actor_profile_id) references crm.profiles(id) on delete restrict,
  constraint activity_feed_domain_event_unique unique (domain_event_id),
  constraint activity_feed_details_object_check
    check (jsonb_typeof(details) = 'object')
);

comment on table crm.activity_feed_entries is
  'Administrator-only operational projection. Separate from student business timeline and audit records.';

create index activity_feed_order_idx
  on crm.activity_feed_entries (occurred_at desc, id desc);
create index activity_feed_student_idx
  on crm.activity_feed_entries (student_profile_id, occurred_at desc)
  where student_profile_id is not null;
create index activity_feed_type_idx
  on crm.activity_feed_entries (event_type, occurred_at desc);

create or replace function crm.project_domain_event_to_activity_feed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into crm.activity_feed_entries (
    domain_event_id, event_type, aggregate_type, aggregate_id,
    student_profile_id, actor_profile_id, occurred_at, details
  ) values (
    new.id, new.event_type, new.aggregate_type, new.aggregate_id,
    new.student_profile_id, new.actor_profile_id, new.occurred_at, new.payload
  )
  on conflict (domain_event_id) do nothing;
  return new;
end;
$$;
revoke all on function crm.project_domain_event_to_activity_feed() from public;

create trigger domain_events_project_activity_feed
after insert on crm.domain_events
for each row execute function crm.project_domain_event_to_activity_feed();

insert into crm.activity_feed_entries (
  domain_event_id, event_type, aggregate_type, aggregate_id,
  student_profile_id, actor_profile_id, occurred_at, details
)
select
  event.id, event.event_type, event.aggregate_type, event.aggregate_id,
  event.student_profile_id, event.actor_profile_id, event.occurred_at,
  event.payload
from crm.domain_events as event
on conflict (domain_event_id) do nothing;

create or replace function crm.prevent_activity_feed_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Activity feed entries are immutable projections.';
end;
$$;
revoke all on function crm.prevent_activity_feed_mutation() from public;
create trigger activity_feed_entries_immutable
before update or delete on crm.activity_feed_entries
for each row execute function crm.prevent_activity_feed_mutation();

alter table crm.activity_feed_entries enable row level security;
alter table crm.activity_feed_entries force row level security;
grant select on crm.activity_feed_entries to authenticated;
create policy "activity_feed_select_admin"
on crm.activity_feed_entries for select to authenticated
using (crm.is_current_admin());

commit;
