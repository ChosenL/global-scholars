begin;

alter table crm.domain_events
  drop constraint domain_events_aggregate_type_check;
alter table crm.domain_events
  add constraint domain_events_aggregate_type_check
  check (aggregate_type in (
    'student_profile', 'document', 'task', 'note',
    'document_requirement', 'readiness', 'notification', 'workflow',
    'analytics', 'application', 'visa_case'
  ));

create table crm.embassies (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null,
  name text not null,
  city text not null,
  region text,
  timezone text,
  website_url text,
  contact_details jsonb not null default '{}'::jsonb,
  external_reference text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint embassies_country_fkey
    foreign key (country_id) references crm.countries(id) on delete restrict,
  constraint embassies_country_name_unique unique (country_id, name, city),
  constraint embassies_name_length check (char_length(trim(name)) between 2 and 200),
  constraint embassies_city_length check (char_length(trim(city)) between 2 and 150),
  constraint embassies_contact_object_check
    check (jsonb_typeof(contact_details) = 'object')
);

create table crm.visa_cases (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null,
  application_id uuid,
  destination_country_id uuid not null,
  embassy_id uuid,
  advisor_profile_id uuid,
  visa_type text not null,
  stage text not null default 'preparation',
  external_reference text,
  target_submission_date date,
  submitted_at timestamptz,
  closed_at timestamptz,
  created_by_profile_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint visa_cases_student_fkey
    foreign key (student_profile_id) references crm.profiles(id) on delete restrict,
  constraint visa_cases_application_fkey
    foreign key (application_id) references crm.student_applications(id) on delete restrict,
  constraint visa_cases_country_fkey
    foreign key (destination_country_id) references crm.countries(id) on delete restrict,
  constraint visa_cases_embassy_fkey
    foreign key (embassy_id) references crm.embassies(id) on delete restrict,
  constraint visa_cases_advisor_fkey
    foreign key (advisor_profile_id) references crm.profiles(id) on delete restrict,
  constraint visa_cases_creator_fkey
    foreign key (created_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint visa_cases_type_length
    check (char_length(trim(visa_type)) between 2 and 100),
  constraint visa_cases_stage_check
    check (stage in (
      'preparation', 'document_collection', 'application_ready',
      'submitted', 'biometrics', 'interview', 'processing',
      'approved', 'refused', 'passport_submission', 'visa_issued',
      'travel_ready', 'closed', 'withdrawn'
    )),
  constraint visa_cases_reference_length
    check (external_reference is null or char_length(trim(external_reference)) between 2 and 150),
  constraint visa_cases_timestamps_check
    check (
      (submitted_at is null or submitted_at >= created_at)
      and (closed_at is null or closed_at >= created_at)
      and (deleted_at is null or deleted_at >= created_at)
    )
);

create table crm.visa_stage_history (
  id uuid primary key default gen_random_uuid(),
  visa_case_id uuid not null,
  from_stage text,
  to_stage text not null,
  reason text,
  changed_by_profile_id uuid not null,
  changed_at timestamptz not null default now(),
  constraint visa_stage_history_case_fkey
    foreign key (visa_case_id) references crm.visa_cases(id) on delete restrict,
  constraint visa_stage_history_actor_fkey
    foreign key (changed_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint visa_stage_history_change_check
    check (from_stage is null or from_stage <> to_stage),
  constraint visa_stage_history_reason_length
    check (reason is null or char_length(trim(reason)) between 2 and 2000)
);

create table crm.visa_checklists (
  id uuid primary key default gen_random_uuid(),
  visa_case_id uuid not null,
  item_key text not null,
  title text not null,
  description text,
  is_required boolean not null default true,
  status text not null default 'pending',
  due_at timestamptz,
  completed_by_profile_id uuid,
  completed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visa_checklists_case_fkey
    foreign key (visa_case_id) references crm.visa_cases(id) on delete restrict,
  constraint visa_checklists_completer_fkey
    foreign key (completed_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint visa_checklists_case_key_unique unique (visa_case_id, item_key),
  constraint visa_checklists_key_check check (item_key ~ '^[a-z][a-z0-9_]{1,99}$'),
  constraint visa_checklists_title_length check (char_length(trim(title)) between 2 and 200),
  constraint visa_checklists_description_length
    check (description is null or char_length(trim(description)) between 2 and 2000),
  constraint visa_checklists_status_check
    check (status in ('pending', 'in_progress', 'completed', 'waived', 'blocked')),
  constraint visa_checklists_completion_check
    check (
      (status = 'completed' and completed_by_profile_id is not null and completed_at is not null)
      or (status <> 'completed' and completed_by_profile_id is null and completed_at is null)
    ),
  constraint visa_checklists_position_check check (position >= 0)
);

create table crm.visa_documents (
  id uuid primary key default gen_random_uuid(),
  visa_case_id uuid not null,
  student_document_id uuid not null,
  checklist_item_id uuid,
  document_purpose text not null,
  status text not null default 'linked',
  linked_by_profile_id uuid not null,
  linked_at timestamptz not null default now(),
  reviewed_by_profile_id uuid,
  reviewed_at timestamptz,
  review_notes text,
  constraint visa_documents_case_fkey
    foreign key (visa_case_id) references crm.visa_cases(id) on delete restrict,
  constraint visa_documents_document_fkey
    foreign key (student_document_id) references crm.student_documents(id) on delete restrict,
  constraint visa_documents_checklist_fkey
    foreign key (checklist_item_id) references crm.visa_checklists(id) on delete restrict,
  constraint visa_documents_linker_fkey
    foreign key (linked_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint visa_documents_reviewer_fkey
    foreign key (reviewed_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint visa_documents_unique unique (visa_case_id, student_document_id),
  constraint visa_documents_purpose_length
    check (char_length(trim(document_purpose)) between 2 and 150),
  constraint visa_documents_status_check
    check (status in ('linked', 'under_review', 'accepted', 'rejected', 'expired')),
  constraint visa_documents_review_check
    check (
      (reviewed_at is null and reviewed_by_profile_id is null)
      or (reviewed_at is not null and reviewed_by_profile_id is not null)
    )
);

create table crm.visa_interviews (
  id uuid primary key default gen_random_uuid(),
  visa_case_id uuid not null,
  embassy_id uuid,
  interview_type text not null,
  scheduled_at timestamptz not null,
  timezone text not null,
  location_details text,
  status text not null default 'scheduled',
  outcome_notes text,
  scheduled_by_profile_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visa_interviews_case_fkey
    foreign key (visa_case_id) references crm.visa_cases(id) on delete restrict,
  constraint visa_interviews_embassy_fkey
    foreign key (embassy_id) references crm.embassies(id) on delete restrict,
  constraint visa_interviews_scheduler_fkey
    foreign key (scheduled_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint visa_interviews_type_check
    check (interview_type in ('visa_interview', 'biometrics', 'medical', 'document_dropoff', 'other')),
  constraint visa_interviews_status_check
    check (status in ('scheduled', 'completed', 'cancelled', 'rescheduled', 'missed')),
  constraint visa_interviews_notes_length
    check (outcome_notes is null or char_length(trim(outcome_notes)) between 2 and 5000)
);

create table crm.visa_decisions (
  id uuid primary key default gen_random_uuid(),
  visa_case_id uuid not null,
  decision text not null,
  decision_date date not null,
  valid_from date,
  valid_until date,
  refusal_reasons text,
  conditions text,
  recorded_by_profile_id uuid not null,
  created_at timestamptz not null default now(),
  constraint visa_decisions_case_fkey
    foreign key (visa_case_id) references crm.visa_cases(id) on delete restrict,
  constraint visa_decisions_actor_fkey
    foreign key (recorded_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint visa_decisions_type_check
    check (decision in ('approved', 'refused', 'withdrawn', 'administrative_processing')),
  constraint visa_decisions_refusal_check
    check (
      (decision = 'refused' and refusal_reasons is not null
        and char_length(trim(refusal_reasons)) between 2 and 5000)
      or (decision <> 'refused'
        and (refusal_reasons is null or char_length(trim(refusal_reasons)) between 2 and 5000))
    ),
  constraint visa_decisions_validity_check
    check (valid_until is null or (valid_from is not null and valid_until >= valid_from))
);

create table crm.passports (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null,
  student_document_id uuid,
  issuing_country_id uuid not null,
  passport_last_four text not null,
  issued_at date,
  expires_at date not null,
  is_primary boolean not null default true,
  status text not null default 'active',
  created_by_profile_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint passports_student_fkey
    foreign key (student_profile_id) references crm.profiles(id) on delete restrict,
  constraint passports_document_fkey
    foreign key (student_document_id) references crm.student_documents(id) on delete restrict,
  constraint passports_country_fkey
    foreign key (issuing_country_id) references crm.countries(id) on delete restrict,
  constraint passports_creator_fkey
    foreign key (created_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint passports_last_four_check check (passport_last_four ~ '^[A-Z0-9]{4}$'),
  constraint passports_dates_check check (issued_at is null or expires_at > issued_at),
  constraint passports_status_check
    check (status in ('active', 'expired', 'cancelled', 'replaced'))
);

create unique index passports_one_primary_idx
  on crm.passports (student_profile_id) where is_primary and status = 'active';

create table crm.travel_plans (
  id uuid primary key default gen_random_uuid(),
  visa_case_id uuid not null,
  departure_country_id uuid not null,
  arrival_country_id uuid not null,
  departure_at timestamptz,
  arrival_at timestamptz,
  departure_airport text,
  arrival_airport text,
  accommodation_details jsonb not null default '{}'::jsonb,
  itinerary_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'planned',
  created_by_profile_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint travel_plans_case_fkey
    foreign key (visa_case_id) references crm.visa_cases(id) on delete restrict,
  constraint travel_plans_departure_country_fkey
    foreign key (departure_country_id) references crm.countries(id) on delete restrict,
  constraint travel_plans_arrival_country_fkey
    foreign key (arrival_country_id) references crm.countries(id) on delete restrict,
  constraint travel_plans_creator_fkey
    foreign key (created_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint travel_plans_dates_check
    check (arrival_at is null or departure_at is null or arrival_at >= departure_at),
  constraint travel_plans_accommodation_check
    check (jsonb_typeof(accommodation_details) = 'object'),
  constraint travel_plans_itinerary_check
    check (jsonb_typeof(itinerary_metadata) = 'object'),
  constraint travel_plans_status_check
    check (status in ('planned', 'booked', 'completed', 'cancelled'))
);

create table crm.visa_notes (
  visa_case_id uuid not null,
  note_id uuid not null,
  linked_by_profile_id uuid not null,
  linked_at timestamptz not null default now(),
  primary key (visa_case_id, note_id),
  constraint visa_notes_case_fkey
    foreign key (visa_case_id) references crm.visa_cases(id) on delete restrict,
  constraint visa_notes_note_fkey
    foreign key (note_id) references crm.student_notes(id) on delete restrict,
  constraint visa_notes_linker_fkey
    foreign key (linked_by_profile_id) references crm.profiles(id) on delete restrict
);

create index visa_cases_student_idx on crm.visa_cases
  (student_profile_id, stage, created_at desc) where deleted_at is null;
create index visa_cases_advisor_idx on crm.visa_cases
  (advisor_profile_id, stage, updated_at desc) where deleted_at is null;
create index visa_stage_history_order_idx on crm.visa_stage_history
  (visa_case_id, changed_at, id);
create index visa_checklists_due_idx on crm.visa_checklists
  (due_at, visa_case_id) where status in ('pending', 'in_progress', 'blocked');
create index visa_interviews_schedule_idx on crm.visa_interviews
  (scheduled_at, visa_case_id) where status = 'scheduled';
create index visa_documents_case_idx on crm.visa_documents (visa_case_id, status);

create trigger embassies_set_updated_at before update on crm.embassies
for each row execute function crm.set_updated_at();
create trigger visa_cases_set_updated_at before update on crm.visa_cases
for each row execute function crm.set_updated_at();
create trigger visa_checklists_set_updated_at before update on crm.visa_checklists
for each row execute function crm.set_updated_at();
create trigger visa_interviews_set_updated_at before update on crm.visa_interviews
for each row execute function crm.set_updated_at();
create trigger passports_set_updated_at before update on crm.passports
for each row execute function crm.set_updated_at();
create trigger travel_plans_set_updated_at before update on crm.travel_plans
for each row execute function crm.set_updated_at();

create or replace function crm.can_access_visa_case(target_visa_case_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from crm.visa_cases as visa_case
    where visa_case.id = target_visa_case_id and visa_case.deleted_at is null
      and crm.can_access_student(visa_case.student_profile_id)
  );
$$;
create or replace function crm.can_manage_visa_case(target_visa_case_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from crm.visa_cases as visa_case
    where visa_case.id = target_visa_case_id and visa_case.deleted_at is null
      and crm.can_manage_student(visa_case.student_profile_id)
  );
$$;
revoke all on function crm.can_access_visa_case(uuid) from public;
revoke all on function crm.can_manage_visa_case(uuid) from public;
grant execute on function crm.can_access_visa_case(uuid) to authenticated;
grant execute on function crm.can_manage_visa_case(uuid) to authenticated;

create or replace function crm.prevent_visa_history_mutation()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin raise exception 'Visa history records are immutable.'; end; $$;
revoke all on function crm.prevent_visa_history_mutation() from public;
create trigger visa_stage_history_immutable before update or delete on crm.visa_stage_history
for each row execute function crm.prevent_visa_history_mutation();
create trigger visa_decisions_immutable before update or delete on crm.visa_decisions
for each row execute function crm.prevent_visa_history_mutation();

alter table crm.embassies enable row level security;
alter table crm.embassies force row level security;
alter table crm.visa_cases enable row level security;
alter table crm.visa_cases force row level security;
alter table crm.visa_stage_history enable row level security;
alter table crm.visa_stage_history force row level security;
alter table crm.visa_checklists enable row level security;
alter table crm.visa_checklists force row level security;
alter table crm.visa_documents enable row level security;
alter table crm.visa_documents force row level security;
alter table crm.visa_interviews enable row level security;
alter table crm.visa_interviews force row level security;
alter table crm.visa_decisions enable row level security;
alter table crm.visa_decisions force row level security;
alter table crm.passports enable row level security;
alter table crm.passports force row level security;
alter table crm.travel_plans enable row level security;
alter table crm.travel_plans force row level security;
alter table crm.visa_notes enable row level security;
alter table crm.visa_notes force row level security;

grant select on crm.embassies, crm.visa_cases, crm.visa_stage_history,
  crm.visa_checklists, crm.visa_documents, crm.visa_interviews,
  crm.visa_decisions, crm.passports, crm.travel_plans, crm.visa_notes
  to authenticated;
create policy "embassies_select_authenticated" on crm.embassies
for select to authenticated using (is_active or crm.is_current_admin());
create policy "visa_cases_select_authorized" on crm.visa_cases
for select to authenticated using (crm.can_access_visa_case(id));
create policy "visa_stage_history_select_authorized" on crm.visa_stage_history
for select to authenticated using (crm.can_access_visa_case(visa_case_id));
create policy "visa_checklists_select_authorized" on crm.visa_checklists
for select to authenticated using (crm.can_access_visa_case(visa_case_id));
create policy "visa_documents_select_authorized" on crm.visa_documents
for select to authenticated using (crm.can_access_visa_case(visa_case_id));
create policy "visa_interviews_select_authorized" on crm.visa_interviews
for select to authenticated using (crm.can_access_visa_case(visa_case_id));
create policy "visa_decisions_select_authorized" on crm.visa_decisions
for select to authenticated using (crm.can_access_visa_case(visa_case_id));
create policy "passports_select_authorized" on crm.passports
for select to authenticated using (crm.can_access_student(student_profile_id));
create policy "travel_plans_select_authorized" on crm.travel_plans
for select to authenticated using (crm.can_access_visa_case(visa_case_id));
create policy "visa_notes_select_staff" on crm.visa_notes
for select to authenticated using (crm.can_manage_visa_case(visa_case_id));

commit;
