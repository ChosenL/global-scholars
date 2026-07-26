begin;

alter table crm.domain_events
  drop constraint domain_events_aggregate_type_check;
alter table crm.domain_events
  add constraint domain_events_aggregate_type_check
  check (aggregate_type in (
    'student_profile', 'document', 'task', 'note',
    'document_requirement', 'readiness', 'notification', 'workflow',
    'analytics', 'application'
  ));

create table crm.student_applications (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null,
  intake_id uuid not null,
  advisor_profile_id uuid,
  status text not null default 'draft',
  external_reference text,
  submitted_at timestamptz,
  closed_at timestamptz,
  withdrawn_at timestamptz,
  archived_at timestamptz,
  created_by_profile_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint student_applications_student_fkey
    foreign key (student_profile_id) references crm.profiles(id) on delete restrict,
  constraint student_applications_intake_fkey
    foreign key (intake_id) references crm.intakes(id) on delete restrict,
  constraint student_applications_advisor_fkey
    foreign key (advisor_profile_id) references crm.profiles(id) on delete restrict,
  constraint student_applications_creator_fkey
    foreign key (created_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint student_applications_active_intake_unique
    unique (student_profile_id, intake_id),
  constraint student_applications_status_check
    check (status in (
      'draft', 'ready_for_review', 'submitted', 'under_review',
      'additional_documents_requested', 'interview',
      'conditional_offer', 'unconditional_offer', 'deposit_paid',
      'visa_stage', 'enrolled', 'closed', 'withdrawn', 'rejected',
      'waitlisted', 'deferred'
    )),
  constraint student_applications_reference_length
    check (external_reference is null or char_length(trim(external_reference)) between 2 and 100),
  constraint student_applications_timestamps_check
    check (
      (submitted_at is null or submitted_at >= created_at)
      and (closed_at is null or closed_at >= created_at)
      and (withdrawn_at is null or withdrawn_at >= created_at)
      and (archived_at is null or archived_at >= created_at)
      and (deleted_at is null or deleted_at >= created_at)
    )
);

create table crm.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  from_status text,
  to_status text not null,
  reason text,
  changed_by_profile_id uuid not null,
  changed_at timestamptz not null default now(),
  constraint application_status_history_application_fkey
    foreign key (application_id) references crm.student_applications(id) on delete restrict,
  constraint application_status_history_actor_fkey
    foreign key (changed_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint application_status_history_status_check
    check (
      (from_status is null or from_status in (
        'draft', 'ready_for_review', 'submitted', 'under_review',
        'additional_documents_requested', 'interview',
        'conditional_offer', 'unconditional_offer', 'deposit_paid',
        'visa_stage', 'enrolled', 'closed', 'withdrawn', 'rejected',
        'waitlisted', 'deferred'
      ))
      and to_status in (
        'draft', 'ready_for_review', 'submitted', 'under_review',
        'additional_documents_requested', 'interview',
        'conditional_offer', 'unconditional_offer', 'deposit_paid',
        'visa_stage', 'enrolled', 'closed', 'withdrawn', 'rejected',
        'waitlisted', 'deferred'
      )
    ),
  constraint application_status_history_transition_check
    check (from_status is null or from_status <> to_status),
  constraint application_status_history_reason_length
    check (reason is null or char_length(trim(reason)) between 2 and 2000)
);

create table crm.application_decisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  decision_type text not null,
  conditions text,
  decision_date date not null,
  offer_expires_at date,
  recorded_by_profile_id uuid not null,
  created_at timestamptz not null default now(),
  constraint application_decisions_application_fkey
    foreign key (application_id) references crm.student_applications(id) on delete restrict,
  constraint application_decisions_actor_fkey
    foreign key (recorded_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint application_decisions_type_check
    check (decision_type in (
      'conditional_offer', 'unconditional_offer', 'rejected', 'waitlisted'
    )),
  constraint application_decisions_conditions_check
    check (
      (decision_type = 'conditional_offer'
        and conditions is not null
        and char_length(trim(conditions)) between 2 and 5000)
      or (decision_type <> 'conditional_offer'
        and (conditions is null or char_length(trim(conditions)) between 2 and 5000))
    ),
  constraint application_decisions_expiry_check
    check (offer_expires_at is null or offer_expires_at >= decision_date)
);

create table crm.application_deposits (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  amount numeric(14,2) not null,
  currency text not null,
  status text not null,
  due_date date,
  paid_at timestamptz,
  reference text,
  recorded_by_profile_id uuid not null,
  created_at timestamptz not null default now(),
  constraint application_deposits_application_fkey
    foreign key (application_id) references crm.student_applications(id) on delete restrict,
  constraint application_deposits_actor_fkey
    foreign key (recorded_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint application_deposits_amount_check check (amount > 0),
  constraint application_deposits_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint application_deposits_status_check
    check (status in ('required', 'pending', 'paid', 'refunded', 'waived')),
  constraint application_deposits_paid_check
    check ((status = 'paid' and paid_at is not null) or status <> 'paid'),
  constraint application_deposits_reference_length
    check (reference is null or char_length(trim(reference)) between 2 and 150)
);

create table crm.application_deferrals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  from_intake_id uuid not null,
  to_intake_id uuid not null,
  status text not null default 'requested',
  reason text not null,
  requested_by_profile_id uuid not null,
  requested_at timestamptz not null default now(),
  resolved_by_profile_id uuid,
  resolved_at timestamptz,
  constraint application_deferrals_application_fkey
    foreign key (application_id) references crm.student_applications(id) on delete restrict,
  constraint application_deferrals_from_intake_fkey
    foreign key (from_intake_id) references crm.intakes(id) on delete restrict,
  constraint application_deferrals_to_intake_fkey
    foreign key (to_intake_id) references crm.intakes(id) on delete restrict,
  constraint application_deferrals_requester_fkey
    foreign key (requested_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint application_deferrals_resolver_fkey
    foreign key (resolved_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint application_deferrals_intake_check check (from_intake_id <> to_intake_id),
  constraint application_deferrals_status_check
    check (status in ('requested', 'approved', 'declined', 'cancelled')),
  constraint application_deferrals_reason_length
    check (char_length(trim(reason)) between 2 and 2000)
);

create table crm.application_waitlists (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  position integer,
  status text not null default 'active',
  entered_at timestamptz not null default now(),
  exited_at timestamptz,
  recorded_by_profile_id uuid not null,
  constraint application_waitlists_application_fkey
    foreign key (application_id) references crm.student_applications(id) on delete restrict,
  constraint application_waitlists_actor_fkey
    foreign key (recorded_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint application_waitlists_position_check check (position is null or position > 0),
  constraint application_waitlists_status_check
    check (status in ('active', 'offered', 'declined', 'expired')),
  constraint application_waitlists_exit_check
    check ((status = 'active' and exited_at is null) or status <> 'active')
);

create table crm.application_document_requirements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  document_requirement_id uuid not null,
  student_document_id uuid,
  status text not null default 'missing',
  waived_by_profile_id uuid,
  waived_at timestamptz,
  waiver_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_document_requirements_application_fkey
    foreign key (application_id) references crm.student_applications(id) on delete restrict,
  constraint application_document_requirements_requirement_fkey
    foreign key (document_requirement_id)
    references crm.document_requirements(id) on delete restrict,
  constraint application_document_requirements_document_fkey
    foreign key (student_document_id)
    references crm.student_documents(id) on delete restrict,
  constraint application_document_requirements_waiver_fkey
    foreign key (waived_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint application_document_requirements_unique
    unique (application_id, document_requirement_id),
  constraint application_document_requirements_status_check
    check (status in ('missing', 'linked', 'accepted', 'rejected', 'waived')),
  constraint application_document_requirements_waiver_check
    check (
      (status = 'waived' and waived_by_profile_id is not null
        and waived_at is not null and waiver_reason is not null)
      or (status <> 'waived' and waived_by_profile_id is null
        and waived_at is null and waiver_reason is null)
    )
);

create table crm.application_notes (
  application_id uuid not null,
  note_id uuid not null,
  linked_by_profile_id uuid not null,
  linked_at timestamptz not null default now(),
  primary key (application_id, note_id),
  constraint application_notes_application_fkey
    foreign key (application_id) references crm.student_applications(id) on delete restrict,
  constraint application_notes_note_fkey
    foreign key (note_id) references crm.student_notes(id) on delete restrict,
  constraint application_notes_linker_fkey
    foreign key (linked_by_profile_id) references crm.profiles(id) on delete restrict
);

create table crm.application_scholarships (
  application_id uuid not null,
  scholarship_id uuid not null,
  status text not null default 'interested',
  awarded_amount numeric(14,2),
  awarded_currency text,
  recorded_by_profile_id uuid not null,
  recorded_at timestamptz not null default now(),
  primary key (application_id, scholarship_id),
  constraint application_scholarships_application_fkey
    foreign key (application_id) references crm.student_applications(id) on delete restrict,
  constraint application_scholarships_scholarship_fkey
    foreign key (scholarship_id) references crm.scholarships(id) on delete restrict,
  constraint application_scholarships_actor_fkey
    foreign key (recorded_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint application_scholarships_status_check
    check (status in ('interested', 'applied', 'awarded', 'declined', 'not_eligible')),
  constraint application_scholarships_award_check
    check (
      (status = 'awarded' and awarded_amount is not null
        and awarded_amount > 0 and awarded_currency ~ '^[A-Z]{3}$')
      or (status <> 'awarded' and awarded_amount is null and awarded_currency is null)
    )
);

create index student_applications_student_idx
  on crm.student_applications (student_profile_id, status, created_at desc)
  where deleted_at is null;
create index student_applications_advisor_idx
  on crm.student_applications (advisor_profile_id, status, updated_at desc)
  where deleted_at is null;
create index application_status_history_order_idx
  on crm.application_status_history (application_id, changed_at, id);
create index application_decisions_order_idx
  on crm.application_decisions (application_id, decision_date desc, created_at desc);
create index application_deposits_order_idx
  on crm.application_deposits (application_id, created_at desc);
create index application_documents_application_idx
  on crm.application_document_requirements (application_id, status);

create trigger student_applications_set_updated_at
before update on crm.student_applications
for each row execute function crm.set_updated_at();
create trigger application_document_requirements_set_updated_at
before update on crm.application_document_requirements
for each row execute function crm.set_updated_at();

create or replace function crm.can_access_application(target_application_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from crm.student_applications as application
    where application.id = target_application_id
      and application.deleted_at is null
      and crm.can_access_student(application.student_profile_id)
  );
$$;
create or replace function crm.can_manage_application(target_application_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from crm.student_applications as application
    where application.id = target_application_id
      and application.deleted_at is null
      and crm.can_manage_student(application.student_profile_id)
  );
$$;
revoke all on function crm.can_access_application(uuid) from public;
revoke all on function crm.can_manage_application(uuid) from public;
grant execute on function crm.can_access_application(uuid) to authenticated;
grant execute on function crm.can_manage_application(uuid) to authenticated;

create or replace function crm.application_transition_allowed(
  old_status text, new_status text
)
returns boolean language sql immutable set search_path = ''
as $$
  select (old_status, new_status) in (
    ('draft', 'ready_for_review'),
    ('draft', 'withdrawn'),
    ('ready_for_review', 'draft'),
    ('ready_for_review', 'submitted'),
    ('ready_for_review', 'withdrawn'),
    ('submitted', 'under_review'),
    ('submitted', 'withdrawn'),
    ('under_review', 'additional_documents_requested'),
    ('under_review', 'interview'),
    ('under_review', 'conditional_offer'),
    ('under_review', 'unconditional_offer'),
    ('under_review', 'rejected'),
    ('under_review', 'waitlisted'),
    ('additional_documents_requested', 'under_review'),
    ('additional_documents_requested', 'withdrawn'),
    ('interview', 'under_review'),
    ('interview', 'conditional_offer'),
    ('interview', 'unconditional_offer'),
    ('interview', 'rejected'),
    ('conditional_offer', 'unconditional_offer'),
    ('conditional_offer', 'deposit_paid'),
    ('conditional_offer', 'withdrawn'),
    ('unconditional_offer', 'deposit_paid'),
    ('unconditional_offer', 'visa_stage'),
    ('unconditional_offer', 'withdrawn'),
    ('deposit_paid', 'visa_stage'),
    ('visa_stage', 'enrolled'),
    ('waitlisted', 'conditional_offer'),
    ('waitlisted', 'unconditional_offer'),
    ('waitlisted', 'rejected'),
    ('waitlisted', 'withdrawn'),
    ('deferred', 'ready_for_review'),
    ('enrolled', 'closed'),
    ('rejected', 'closed'),
    ('withdrawn', 'closed')
  );
$$;
revoke all on function crm.application_transition_allowed(text,text) from public;

create or replace function crm.prevent_application_history_mutation()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin raise exception 'Application history records are immutable.'; end; $$;
revoke all on function crm.prevent_application_history_mutation() from public;
create trigger application_status_history_immutable before update or delete
on crm.application_status_history for each row
execute function crm.prevent_application_history_mutation();
create trigger application_decisions_immutable before update or delete
on crm.application_decisions for each row
execute function crm.prevent_application_history_mutation();

create or replace function crm.create_student_application(
  target_student_profile_id uuid,
  target_intake_id uuid,
  target_advisor_profile_id uuid default null
)
returns crm.student_applications
language plpgsql security definer set search_path = ''
as $$
declare
  actor_id uuid := crm.current_profile_id();
  actor_role text := crm.current_profile_role();
  result crm.student_applications;
begin
  if not (
    (actor_role = 'student' and actor_id = target_student_profile_id)
    or crm.can_manage_student(target_student_profile_id)
  ) then raise exception 'Application creation access denied.'; end if;
  if not exists (
    select 1 from crm.intakes as intake
    join crm.programs as program on program.id = intake.program_id and program.is_active
    join crm.universities as university on university.id = program.university_id and university.is_active
    where intake.id = target_intake_id and intake.status = 'open'
  ) then raise exception 'Active intake not found.'; end if;
  if target_advisor_profile_id is not null and not exists (
    select 1 from crm.profiles as advisor
    where advisor.id = target_advisor_profile_id
      and advisor.role in ('advisor', 'admin') and advisor.deleted_at is null
      and (
        advisor.role = 'admin'
        or exists (
          select 1 from crm.conversation_participants as mine
          join crm.conversation_participants as student
            on student.conversation_id = mine.conversation_id
           and student.profile_id = target_student_profile_id
           and student.deleted_at is null
          where mine.profile_id = advisor.id and mine.deleted_at is null
        )
      )
  ) then raise exception 'Application advisor is not authorized for this student.'; end if;

  insert into crm.student_applications (
    student_profile_id, intake_id, advisor_profile_id, created_by_profile_id
  ) values (
    target_student_profile_id, target_intake_id,
    target_advisor_profile_id, actor_id
  ) returning * into result;
  insert into crm.application_status_history (
    application_id, from_status, to_status, changed_by_profile_id
  ) values (result.id, null, 'draft', actor_id);

  insert into crm.application_document_requirements (
    application_id, document_requirement_id, student_document_id, status
  )
  select result.id, requirement.id, document.id,
    case when document.id is null then 'missing' else 'linked' end
  from crm.intakes as intake
  join crm.programs as program on program.id = intake.program_id
  join crm.universities as university on university.id = program.university_id
  join crm.countries as country on country.id = university.country_id
  cross join lateral crm.get_effective_document_requirements(
    target_student_profile_id, country.name, university.slug, program.name
  ) as requirement
  left join lateral (
    select candidate.id
    from crm.student_documents as candidate
    where candidate.profile_id = target_student_profile_id
      and candidate.document_type = requirement.document_type
      and candidate.deleted_at is null
      and candidate.status in ('uploaded', 'under_review', 'approved')
    order by candidate.revision_number desc
    limit 1
  ) as document on true
  where intake.id = target_intake_id
    and (
      requirement.requirement_level = 'required'
      or (
        requirement.requirement_level = 'conditional'
        and crm.document_requirement_applies(
          requirement.id, target_student_profile_id
        )
      )
    );

  perform crm.emit_domain_event(
    'application.created', 'application', result.id,
    result.student_profile_id,
    jsonb_build_object('status', result.status, 'intake_id', result.intake_id)
  );
  perform crm.calculate_student_readiness(result.student_profile_id);
  return result;
end;
$$;

create or replace function crm.update_application_status(
  target_application_id uuid,
  new_status text,
  transition_reason text default null
)
returns crm.student_applications
language plpgsql security definer set search_path = ''
as $$
declare
  application crm.student_applications;
  result crm.student_applications;
begin
  select * into application from crm.student_applications
  where id = target_application_id and deleted_at is null for update;
  if application.id is null then raise exception 'Active application not found.'; end if;
  if not crm.can_manage_application(application.id)
    and not (
      crm.current_profile_id() = application.student_profile_id
      and new_status in ('draft', 'ready_for_review', 'submitted', 'withdrawn')
    )
  then raise exception 'Application status access denied.'; end if;
  if not crm.application_transition_allowed(application.status, new_status) then
    raise exception 'Invalid application status transition from % to %.',
      application.status, new_status;
  end if;

  update crm.student_applications
  set status = new_status,
      submitted_at = case when new_status = 'submitted'
        then statement_timestamp() else submitted_at end,
      closed_at = case when new_status = 'closed'
        then statement_timestamp() else closed_at end,
      withdrawn_at = case when new_status = 'withdrawn'
        then statement_timestamp() else withdrawn_at end
  where id = application.id returning * into result;
  insert into crm.application_status_history (
    application_id, from_status, to_status, reason, changed_by_profile_id
  ) values (
    result.id, application.status, new_status,
    nullif(trim(transition_reason), ''), crm.current_profile_id()
  );
  perform crm.emit_domain_event(
    'application.status_changed', 'application', result.id,
    result.student_profile_id,
    jsonb_build_object('from', application.status, 'to', new_status)
  );
  perform crm.calculate_student_readiness(result.student_profile_id);
  return result;
end;
$$;

create or replace function crm.submit_student_application(
  target_application_id uuid
)
returns crm.student_applications
language plpgsql security definer set search_path = ''
as $$
declare application crm.student_applications;
begin
  select * into application from crm.student_applications
  where id = target_application_id and deleted_at is null;
  if application.id is null then raise exception 'Active application not found.'; end if;
  if not crm.can_manage_application(application.id)
    and crm.current_profile_id() <> application.student_profile_id
  then raise exception 'Application submission access denied.'; end if;
  if application.status <> 'ready_for_review' then
    raise exception 'Application must be ready for review before submission.';
  end if;
  if exists (
    select 1
    from crm.application_document_requirements as link
    join crm.document_requirements as requirement
      on requirement.id = link.document_requirement_id
    where link.application_id = application.id
      and requirement.requirement_level in ('required', 'conditional')
      and link.status not in ('linked', 'accepted', 'waived')
  ) then raise exception 'Application has missing required documents.'; end if;
  return crm.update_application_status(application.id, 'submitted', 'Application submitted.');
end;
$$;

create or replace function crm.record_application_decision(
  target_application_id uuid,
  new_decision_type text,
  new_conditions text,
  new_decision_date date,
  new_offer_expires_at date default null
)
returns crm.application_decisions
language plpgsql security definer set search_path = ''
as $$
declare
  application crm.student_applications;
  result crm.application_decisions;
begin
  select * into application from crm.student_applications
  where id = target_application_id and deleted_at is null;
  if application.id is null or not crm.can_manage_application(application.id) then
    raise exception 'Application decision access denied.';
  end if;
  insert into crm.application_decisions (
    application_id, decision_type, conditions, decision_date,
    offer_expires_at, recorded_by_profile_id
  ) values (
    application.id, new_decision_type, nullif(trim(new_conditions), ''),
    new_decision_date, new_offer_expires_at, crm.current_profile_id()
  ) returning * into result;
  perform crm.update_application_status(
    application.id, new_decision_type, 'Admission decision recorded.'
  );
  if new_decision_type = 'waitlisted' then
    insert into crm.application_waitlists (
      application_id, recorded_by_profile_id
    ) values (application.id, crm.current_profile_id());
  end if;
  perform crm.emit_domain_event(
    'application.decision_recorded', 'application', application.id,
    application.student_profile_id,
    jsonb_build_object('decision_type', result.decision_type)
  );
  return result;
end;
$$;

create or replace function crm.record_application_deposit(
  target_application_id uuid,
  new_amount numeric,
  new_currency text,
  new_status text,
  new_due_date date default null,
  new_paid_at timestamptz default null,
  new_reference text default null
)
returns crm.application_deposits
language plpgsql security definer set search_path = ''
as $$
declare
  application crm.student_applications;
  result crm.application_deposits;
begin
  select * into application from crm.student_applications
  where id = target_application_id and deleted_at is null;
  if application.id is null or not crm.can_manage_application(application.id) then
    raise exception 'Application deposit access denied.';
  end if;
  insert into crm.application_deposits (
    application_id, amount, currency, status, due_date, paid_at,
    reference, recorded_by_profile_id
  ) values (
    application.id, new_amount, upper(new_currency), new_status,
    new_due_date, new_paid_at, nullif(trim(new_reference), ''),
    crm.current_profile_id()
  ) returning * into result;
  if new_status = 'paid'
    and application.status in ('conditional_offer', 'unconditional_offer')
  then
    perform crm.update_application_status(
      application.id, 'deposit_paid', 'Deposit payment recorded.'
    );
  end if;
  perform crm.emit_domain_event(
    'application.deposit_recorded', 'application', application.id,
    application.student_profile_id,
    jsonb_build_object('deposit_id', result.id, 'status', result.status)
  );
  return result;
end;
$$;

create or replace function crm.archive_student_application(
  target_application_id uuid
)
returns crm.student_applications
language plpgsql security definer set search_path = ''
as $$
declare result crm.student_applications;
begin
  if not crm.can_manage_application(target_application_id) then
    raise exception 'Application archive access denied.';
  end if;
  update crm.student_applications
  set archived_at = statement_timestamp()
  where id = target_application_id and deleted_at is null
    and archived_at is null
  returning * into result;
  if result.id is null then raise exception 'Active unarchived application not found.'; end if;
  perform crm.emit_domain_event(
    'application.archived', 'application', result.id,
    result.student_profile_id, jsonb_build_object('status', result.status)
  );
  return result;
end;
$$;

revoke all on function crm.create_student_application(uuid,uuid,uuid) from public;
revoke all on function crm.update_application_status(uuid,text,text) from public;
revoke all on function crm.submit_student_application(uuid) from public;
revoke all on function crm.record_application_decision(uuid,text,text,date,date) from public;
revoke all on function crm.record_application_deposit(uuid,numeric,text,text,date,timestamptz,text) from public;
revoke all on function crm.archive_student_application(uuid) from public;
grant execute on function crm.create_student_application(uuid,uuid,uuid) to authenticated;
grant execute on function crm.update_application_status(uuid,text,text) to authenticated;
grant execute on function crm.submit_student_application(uuid) to authenticated;
grant execute on function crm.record_application_decision(uuid,text,text,date,date) to authenticated;
grant execute on function crm.record_application_deposit(uuid,numeric,text,text,date,timestamptz,text) to authenticated;
grant execute on function crm.archive_student_application(uuid) to authenticated;

alter table crm.student_applications enable row level security;
alter table crm.student_applications force row level security;
alter table crm.application_status_history enable row level security;
alter table crm.application_status_history force row level security;
alter table crm.application_decisions enable row level security;
alter table crm.application_decisions force row level security;
alter table crm.application_deposits enable row level security;
alter table crm.application_deposits force row level security;
alter table crm.application_deferrals enable row level security;
alter table crm.application_deferrals force row level security;
alter table crm.application_waitlists enable row level security;
alter table crm.application_waitlists force row level security;
alter table crm.application_document_requirements enable row level security;
alter table crm.application_document_requirements force row level security;
alter table crm.application_notes enable row level security;
alter table crm.application_notes force row level security;
alter table crm.application_scholarships enable row level security;
alter table crm.application_scholarships force row level security;
grant select on crm.student_applications, crm.application_status_history,
  crm.application_decisions, crm.application_deposits, crm.application_deferrals,
  crm.application_waitlists, crm.application_document_requirements
  to authenticated;
grant select on crm.application_notes to authenticated;
grant select on crm.application_scholarships to authenticated;

create policy "student_applications_select_authorized"
on crm.student_applications for select to authenticated
using (crm.can_access_application(id));
create policy "application_status_history_select_authorized"
on crm.application_status_history for select to authenticated
using (crm.can_access_application(application_id));
create policy "application_decisions_select_authorized"
on crm.application_decisions for select to authenticated
using (crm.can_access_application(application_id));
create policy "application_deposits_select_authorized"
on crm.application_deposits for select to authenticated
using (crm.can_access_application(application_id));
create policy "application_deferrals_select_authorized"
on crm.application_deferrals for select to authenticated
using (crm.can_access_application(application_id));
create policy "application_waitlists_select_authorized"
on crm.application_waitlists for select to authenticated
using (crm.can_access_application(application_id));
create policy "application_documents_select_authorized"
on crm.application_document_requirements for select to authenticated
using (crm.can_access_application(application_id));
create policy "application_notes_select_staff"
on crm.application_notes for select to authenticated
using (crm.can_manage_application(application_id));
create policy "application_scholarships_select_authorized"
on crm.application_scholarships for select to authenticated
using (crm.can_access_application(application_id));

commit;
