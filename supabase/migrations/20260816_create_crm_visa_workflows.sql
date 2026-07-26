begin;

alter table crm.visa_checklists add column reminder_sent_at timestamptz;

create table crm.visa_case_readiness (
  visa_case_id uuid primary key,
  total_score numeric(5,2) not null,
  checklist_score numeric(5,2) not null,
  document_score numeric(5,2) not null,
  interview_score numeric(5,2) not null,
  passport_score numeric(5,2) not null,
  travel_score numeric(5,2) not null,
  components jsonb not null,
  calculated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint visa_case_readiness_case_fkey
    foreign key (visa_case_id) references crm.visa_cases(id) on delete restrict,
  constraint visa_case_readiness_scores_check
    check (
      total_score between 0 and 100
      and checklist_score between 0 and 100
      and document_score between 0 and 100
      and interview_score between 0 and 100
      and passport_score between 0 and 100
      and travel_score between 0 and 100
    ),
  constraint visa_case_readiness_components_check
    check (jsonb_typeof(components) = 'object')
);

create or replace function crm.visa_transition_allowed(
  old_stage text, new_stage text
)
returns boolean language sql immutable set search_path = ''
as $$
  select (old_stage, new_stage) in (
    ('preparation', 'document_collection'),
    ('preparation', 'withdrawn'),
    ('document_collection', 'application_ready'),
    ('document_collection', 'withdrawn'),
    ('application_ready', 'document_collection'),
    ('application_ready', 'submitted'),
    ('submitted', 'biometrics'),
    ('submitted', 'interview'),
    ('submitted', 'processing'),
    ('biometrics', 'interview'),
    ('biometrics', 'processing'),
    ('interview', 'processing'),
    ('processing', 'approved'),
    ('processing', 'refused'),
    ('approved', 'passport_submission'),
    ('approved', 'visa_issued'),
    ('passport_submission', 'visa_issued'),
    ('visa_issued', 'travel_ready'),
    ('travel_ready', 'closed'),
    ('refused', 'closed'),
    ('withdrawn', 'closed')
  );
$$;
revoke all on function crm.visa_transition_allowed(text,text) from public;

create or replace function crm.calculate_visa_readiness(target_visa_case_id uuid)
returns crm.visa_case_readiness
language plpgsql security definer set search_path = ''
as $$
declare
  visa_case crm.visa_cases;
  required_items integer := 0;
  completed_items integer := 0;
  document_count integer := 0;
  accepted_document_count integer := 0;
  checklist_percent numeric(5,2);
  document_percent numeric(5,2);
  interview_percent numeric(5,2);
  passport_percent numeric(5,2);
  travel_percent numeric(5,2);
  total_percent numeric(5,2);
  result crm.visa_case_readiness;
begin
  select * into visa_case from crm.visa_cases
  where id = target_visa_case_id and deleted_at is null;
  if visa_case.id is null or not crm.can_access_visa_case(visa_case.id) then
    raise exception 'Visa readiness access denied.';
  end if;
  select count(*), count(*) filter (where status in ('completed', 'waived'))
  into required_items, completed_items from crm.visa_checklists
  where visa_case_id = visa_case.id and is_required;
  select count(*), count(*) filter (where status in ('linked', 'accepted'))
  into document_count, accepted_document_count from crm.visa_documents
  where visa_case_id = visa_case.id;

  checklist_percent := case when required_items = 0 then 100
    else round(completed_items * 100.0 / required_items, 2) end;
  document_percent := case when document_count = 0 then 0
    else round(accepted_document_count * 100.0 / document_count, 2) end;
  interview_percent := case
    when exists (select 1 from crm.visa_interviews
      where visa_case_id = visa_case.id and status = 'completed') then 100
    when visa_case.stage in ('preparation', 'document_collection', 'application_ready') then 100
    else 0 end;
  passport_percent := case when exists (
    select 1 from crm.passports
    where student_profile_id = visa_case.student_profile_id
      and status = 'active' and expires_at > current_date
  ) then 100 else 0 end;
  travel_percent := case when exists (
    select 1 from crm.travel_plans
    where visa_case_id = visa_case.id and status in ('booked', 'completed')
  ) then 100 when visa_case.stage not in ('visa_issued', 'travel_ready', 'closed')
    then 100 else 0 end;
  total_percent := round(
    checklist_percent * 0.50 + document_percent * 0.25
    + interview_percent * 0.10 + passport_percent * 0.10
    + travel_percent * 0.05, 2
  );
  insert into crm.visa_case_readiness (
    visa_case_id, total_score, checklist_score, document_score,
    interview_score, passport_score, travel_score, components, calculated_at
  ) values (
    visa_case.id, total_percent, checklist_percent, document_percent,
    interview_percent, passport_percent, travel_percent,
    jsonb_build_object(
      'checklist', jsonb_build_object('required', required_items, 'completed', completed_items, 'weight', 0.50),
      'documents', jsonb_build_object('total', document_count, 'accepted', accepted_document_count, 'weight', 0.25),
      'interview', jsonb_build_object('weight', 0.10),
      'passport', jsonb_build_object('weight', 0.10),
      'travel', jsonb_build_object('weight', 0.05)
    ), statement_timestamp()
  )
  on conflict (visa_case_id) do update set
    total_score = excluded.total_score,
    checklist_score = excluded.checklist_score,
    document_score = excluded.document_score,
    interview_score = excluded.interview_score,
    passport_score = excluded.passport_score,
    travel_score = excluded.travel_score,
    components = excluded.components,
    calculated_at = excluded.calculated_at,
    updated_at = statement_timestamp()
  returning * into result;
  perform crm.emit_domain_event(
    'visa.readiness_calculated', 'visa_case', visa_case.id,
    visa_case.student_profile_id,
    jsonb_build_object('total_score', result.total_score)
  );
  return result;
end;
$$;

create or replace function crm.create_visa_case(
  target_student_profile_id uuid,
  target_destination_country_id uuid,
  new_visa_type text,
  target_application_id uuid default null,
  target_embassy_id uuid default null,
  target_advisor_profile_id uuid default null,
  new_target_submission_date date default null,
  initial_checklist jsonb default '[]'::jsonb
)
returns crm.visa_cases
language plpgsql security definer set search_path = ''
as $$
declare
  result crm.visa_cases;
  item jsonb;
begin
  if not crm.can_manage_student(target_student_profile_id) then
    raise exception 'Visa case creation access denied.';
  end if;
  if not exists (select 1 from crm.countries where id = target_destination_country_id and is_active) then
    raise exception 'Active destination country not found.';
  end if;
  if target_application_id is not null and not exists (
    select 1 from crm.student_applications
    where id = target_application_id
      and student_profile_id = target_student_profile_id and deleted_at is null
  ) then raise exception 'Visa application link must belong to the same student.'; end if;
  if target_embassy_id is not null and not exists (
    select 1 from crm.embassies where id = target_embassy_id
      and country_id = target_destination_country_id and is_active
  ) then raise exception 'Embassy must serve the destination country.'; end if;
  if target_advisor_profile_id is not null and not exists (
    select 1 from crm.profiles as advisor
    where advisor.id = target_advisor_profile_id
      and advisor.role in ('advisor', 'admin') and advisor.deleted_at is null
      and (
        advisor.role = 'admin'
        or exists (
          select 1 from crm.conversation_participants as advisor_membership
          join crm.conversation_participants as student_membership
            on student_membership.conversation_id = advisor_membership.conversation_id
           and student_membership.profile_id = target_student_profile_id
           and student_membership.deleted_at is null
          where advisor_membership.profile_id = advisor.id
            and advisor_membership.deleted_at is null
        )
      )
  ) then raise exception 'Visa advisor must be an active advisor or administrator.'; end if;
  if jsonb_typeof(initial_checklist) <> 'array' then
    raise exception 'Initial visa checklist must be an array.';
  end if;

  insert into crm.visa_cases (
    student_profile_id, application_id, destination_country_id,
    embassy_id, advisor_profile_id, visa_type, target_submission_date,
    created_by_profile_id
  ) values (
    target_student_profile_id, target_application_id,
    target_destination_country_id, target_embassy_id,
    target_advisor_profile_id, trim(new_visa_type),
    new_target_submission_date, crm.current_profile_id()
  ) returning * into result;
  insert into crm.visa_stage_history (
    visa_case_id, from_stage, to_stage, changed_by_profile_id
  ) values (result.id, null, 'preparation', crm.current_profile_id());

  for item in select value from jsonb_array_elements(initial_checklist)
  loop
    insert into crm.visa_checklists (
      visa_case_id, item_key, title, description, is_required,
      due_at, position
    ) values (
      result.id, item->>'key', item->>'title',
      nullif(item->>'description', ''),
      coalesce((item->>'required')::boolean, true),
      (item->>'due_at')::timestamptz,
      coalesce((item->>'position')::integer, 0)
    );
  end loop;
  perform crm.emit_domain_event(
    'visa.case_created', 'visa_case', result.id,
    result.student_profile_id,
    jsonb_build_object(
      'stage', result.stage, 'country_id', result.destination_country_id,
      'visa_type', result.visa_type)
  );
  perform crm.calculate_visa_readiness(result.id);
  return result;
end;
$$;

create or replace function crm.update_visa_stage(
  target_visa_case_id uuid,
  new_stage text,
  transition_reason text default null
)
returns crm.visa_cases
language plpgsql security definer set search_path = ''
as $$
declare old_case crm.visa_cases; result crm.visa_cases;
begin
  select * into old_case from crm.visa_cases
  where id = target_visa_case_id and deleted_at is null for update;
  if old_case.id is null or not crm.can_manage_visa_case(old_case.id) then
    raise exception 'Visa stage access denied.';
  end if;
  if not crm.visa_transition_allowed(old_case.stage, new_stage) then
    raise exception 'Invalid visa transition from % to %.', old_case.stage, new_stage;
  end if;
  if new_stage = 'application_ready' and exists (
    select 1 from crm.visa_checklists
    where visa_case_id = old_case.id and is_required
      and status not in ('completed', 'waived')
  ) then raise exception 'Required visa checklist items are incomplete.'; end if;
  update crm.visa_cases set
    stage = new_stage,
    submitted_at = case when new_stage = 'submitted'
      then statement_timestamp() else submitted_at end,
    closed_at = case when new_stage in ('closed', 'withdrawn')
      then statement_timestamp() else closed_at end
  where id = old_case.id returning * into result;
  insert into crm.visa_stage_history (
    visa_case_id, from_stage, to_stage, reason, changed_by_profile_id
  ) values (
    result.id, old_case.stage, new_stage,
    nullif(trim(transition_reason), ''), crm.current_profile_id()
  );
  perform crm.emit_domain_event(
    'visa.stage_changed', 'visa_case', result.id, result.student_profile_id,
    jsonb_build_object('from', old_case.stage, 'to', new_stage)
  );
  perform crm.calculate_visa_readiness(result.id);
  perform crm.calculate_student_readiness(result.student_profile_id);
  return result;
end;
$$;

create or replace function crm.schedule_visa_interview(
  target_visa_case_id uuid,
  target_embassy_id uuid,
  new_interview_type text,
  new_scheduled_at timestamptz,
  new_timezone text,
  new_location_details text default null
)
returns crm.visa_interviews
language plpgsql security definer set search_path = ''
as $$
declare visa_case crm.visa_cases; result crm.visa_interviews;
begin
  select * into visa_case from crm.visa_cases where id = target_visa_case_id and deleted_at is null;
  if visa_case.id is null or not crm.can_manage_visa_case(visa_case.id) then
    raise exception 'Visa interview access denied.';
  end if;
  if target_embassy_id is not null and not exists (
    select 1 from crm.embassies where id = target_embassy_id
      and country_id = visa_case.destination_country_id and is_active
  ) then raise exception 'Interview embassy is invalid for this visa case.'; end if;
  insert into crm.visa_interviews (
    visa_case_id, embassy_id, interview_type, scheduled_at,
    timezone, location_details, scheduled_by_profile_id
  ) values (
    visa_case.id, target_embassy_id, new_interview_type,
    new_scheduled_at, new_timezone, nullif(trim(new_location_details), ''),
    crm.current_profile_id()
  ) returning * into result;
  perform crm.emit_domain_event(
    'visa.interview_scheduled', 'visa_case', visa_case.id,
    visa_case.student_profile_id,
    jsonb_build_object(
      'interview_id', result.id, 'scheduled_at', result.scheduled_at,
      'interview_type', result.interview_type)
  );
  return result;
end;
$$;

create or replace function crm.record_visa_decision(
  target_visa_case_id uuid,
  new_decision text,
  new_decision_date date,
  new_valid_from date default null,
  new_valid_until date default null,
  new_refusal_reasons text default null,
  new_conditions text default null
)
returns crm.visa_decisions
language plpgsql security definer set search_path = ''
as $$
declare visa_case crm.visa_cases; result crm.visa_decisions; target_stage text;
begin
  select * into visa_case from crm.visa_cases where id = target_visa_case_id and deleted_at is null;
  if visa_case.id is null or not crm.can_manage_visa_case(visa_case.id) then
    raise exception 'Visa decision access denied.';
  end if;
  target_stage := case new_decision
    when 'approved' then 'approved'
    when 'refused' then 'refused'
    when 'withdrawn' then 'withdrawn'
    else null end;
  if target_stage is not null
    and not crm.visa_transition_allowed(visa_case.stage, target_stage)
  then raise exception 'Decision is invalid from the current visa stage.'; end if;
  insert into crm.visa_decisions (
    visa_case_id, decision, decision_date, valid_from, valid_until,
    refusal_reasons, conditions, recorded_by_profile_id
  ) values (
    visa_case.id, new_decision, new_decision_date, new_valid_from,
    new_valid_until, nullif(trim(new_refusal_reasons), ''),
    nullif(trim(new_conditions), ''), crm.current_profile_id()
  ) returning * into result;
  if target_stage is not null then
    perform crm.update_visa_stage(
      visa_case.id, target_stage, 'Visa decision recorded.'
    );
  end if;
  perform crm.emit_domain_event(
    'visa.decision_recorded', 'visa_case', visa_case.id,
    visa_case.student_profile_id,
    jsonb_build_object('decision_id', result.id, 'decision', result.decision)
  );
  return result;
end;
$$;

create or replace function crm.upload_visa_document(
  target_visa_case_id uuid,
  target_student_document_id uuid,
  new_document_purpose text,
  target_checklist_item_id uuid default null
)
returns crm.visa_documents
language plpgsql security definer set search_path = ''
as $$
declare visa_case crm.visa_cases; result crm.visa_documents;
begin
  select * into visa_case from crm.visa_cases where id = target_visa_case_id and deleted_at is null;
  if visa_case.id is null or not (
    crm.can_manage_visa_case(visa_case.id)
    or crm.current_profile_id() = visa_case.student_profile_id
  ) then raise exception 'Visa document access denied.'; end if;
  if not exists (
    select 1 from crm.student_documents
    where id = target_student_document_id
      and profile_id = visa_case.student_profile_id and deleted_at is null
  ) then raise exception 'Visa document must belong to the same student.'; end if;
  if target_checklist_item_id is not null and not exists (
    select 1 from crm.visa_checklists
    where id = target_checklist_item_id and visa_case_id = visa_case.id
  ) then raise exception 'Checklist item must belong to the same visa case.'; end if;
  insert into crm.visa_documents (
    visa_case_id, student_document_id, checklist_item_id,
    document_purpose, linked_by_profile_id
  ) values (
    visa_case.id, target_student_document_id, target_checklist_item_id,
    trim(new_document_purpose), crm.current_profile_id()
  ) returning * into result;
  perform crm.emit_domain_event(
    'visa.document_uploaded', 'visa_case', visa_case.id,
    visa_case.student_profile_id,
    jsonb_build_object(
      'visa_document_id', result.id,
      'student_document_id', result.student_document_id,
      'document_purpose', result.document_purpose)
  );
  perform crm.calculate_visa_readiness(visa_case.id);
  perform crm.calculate_student_readiness(visa_case.student_profile_id);
  return result;
end;
$$;

create or replace function crm.update_visa_checklist_item(
  target_checklist_item_id uuid,
  new_status text
)
returns crm.visa_checklists
language plpgsql security definer set search_path = ''
as $$
declare item crm.visa_checklists; visa_case crm.visa_cases; result crm.visa_checklists;
begin
  select * into item from crm.visa_checklists where id = target_checklist_item_id;
  select * into visa_case from crm.visa_cases where id = item.visa_case_id and deleted_at is null;
  if item.id is null or visa_case.id is null or not (
    crm.can_manage_visa_case(visa_case.id)
    or (
      crm.current_profile_id() = visa_case.student_profile_id
      and new_status in ('pending', 'in_progress', 'completed')
    )
  ) then raise exception 'Visa checklist access denied.'; end if;
  update crm.visa_checklists set
    status = new_status,
    completed_by_profile_id = case when new_status = 'completed'
      then crm.current_profile_id() else null end,
    completed_at = case when new_status = 'completed'
      then statement_timestamp() else null end
  where id = item.id returning * into result;
  perform crm.emit_domain_event(
    'visa.checklist_updated', 'visa_case', visa_case.id,
    visa_case.student_profile_id,
    jsonb_build_object(
      'checklist_item_id', result.id, 'from', item.status, 'to', result.status)
  );
  perform crm.calculate_visa_readiness(visa_case.id);
  return result;
end;
$$;

create or replace function crm.emit_due_visa_reminders()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare item record; emitted integer := 0;
begin
  if not crm.is_current_admin() then
    raise exception 'Only administrators may emit visa deadline reminders.';
  end if;
  for item in
    select checklist.id, checklist.visa_case_id, checklist.title,
      checklist.due_at, visa_case.student_profile_id
    from crm.visa_checklists as checklist
    join crm.visa_cases as visa_case on visa_case.id = checklist.visa_case_id
    where checklist.status in ('pending', 'in_progress', 'blocked')
      and checklist.due_at <= statement_timestamp() + interval '48 hours'
      and checklist.reminder_sent_at is null
      and visa_case.deleted_at is null
  loop
    perform crm.emit_domain_event(
      'visa.checklist_due', 'visa_case', item.visa_case_id,
      item.student_profile_id,
      jsonb_build_object(
        'checklist_item_id', item.id, 'title', item.title, 'due_at', item.due_at)
    );
    update crm.visa_checklists set reminder_sent_at = statement_timestamp()
    where id = item.id;
    emitted := emitted + 1;
  end loop;
  return emitted;
end;
$$;

create or replace function crm.update_visa_interview_status(
  target_interview_id uuid,
  new_status text,
  new_outcome_notes text default null
)
returns crm.visa_interviews
language plpgsql security definer set search_path = ''
as $$
declare interview crm.visa_interviews; visa_case crm.visa_cases; result crm.visa_interviews;
begin
  select * into interview from crm.visa_interviews where id = target_interview_id;
  select * into visa_case from crm.visa_cases
  where id = interview.visa_case_id and deleted_at is null;
  if interview.id is null or visa_case.id is null
    or not crm.can_manage_visa_case(visa_case.id)
  then raise exception 'Visa interview update access denied.'; end if;
  update crm.visa_interviews set status = new_status,
    outcome_notes = nullif(trim(new_outcome_notes), '')
  where id = interview.id returning * into result;
  perform crm.emit_domain_event(
    'visa.interview_updated', 'visa_case', visa_case.id,
    visa_case.student_profile_id,
    jsonb_build_object(
      'interview_id', result.id, 'from', interview.status, 'to', result.status)
  );
  perform crm.calculate_visa_readiness(visa_case.id);
  return result;
end;
$$;

create or replace function crm.record_visa_passport(
  target_visa_case_id uuid,
  target_student_document_id uuid,
  target_issuing_country_id uuid,
  new_passport_last_four text,
  new_issued_at date,
  new_expires_at date,
  new_is_primary boolean default true
)
returns crm.passports
language plpgsql security definer set search_path = ''
as $$
declare visa_case crm.visa_cases; result crm.passports;
begin
  select * into visa_case from crm.visa_cases
  where id = target_visa_case_id and deleted_at is null;
  if visa_case.id is null or not (
    crm.can_manage_visa_case(visa_case.id)
    or crm.current_profile_id() = visa_case.student_profile_id
  ) then raise exception 'Passport access denied.'; end if;
  if target_student_document_id is not null and not exists (
    select 1 from crm.student_documents
    where id = target_student_document_id
      and profile_id = visa_case.student_profile_id and deleted_at is null
  ) then raise exception 'Passport document must belong to the same student.'; end if;
  if new_is_primary then
    update crm.passports set is_primary = false, status = 'replaced'
    where student_profile_id = visa_case.student_profile_id
      and is_primary and status = 'active';
  end if;
  insert into crm.passports (
    student_profile_id, student_document_id, issuing_country_id,
    passport_last_four, issued_at, expires_at, is_primary,
    created_by_profile_id
  ) values (
    visa_case.student_profile_id, target_student_document_id,
    target_issuing_country_id, upper(new_passport_last_four),
    new_issued_at, new_expires_at, new_is_primary, crm.current_profile_id()
  ) returning * into result;
  perform crm.emit_domain_event(
    'visa.passport_recorded', 'visa_case', visa_case.id,
    visa_case.student_profile_id,
    jsonb_build_object('passport_id', result.id, 'expires_at', result.expires_at)
  );
  perform crm.calculate_visa_readiness(visa_case.id);
  return result;
end;
$$;

create or replace function crm.upsert_visa_travel_plan(
  target_travel_plan_id uuid,
  target_visa_case_id uuid,
  target_departure_country_id uuid,
  target_arrival_country_id uuid,
  new_departure_at timestamptz,
  new_arrival_at timestamptz,
  new_departure_airport text,
  new_arrival_airport text,
  new_accommodation_details jsonb,
  new_itinerary_metadata jsonb,
  new_status text
)
returns crm.travel_plans
language plpgsql security definer set search_path = ''
as $$
declare visa_case crm.visa_cases; result crm.travel_plans;
begin
  select * into visa_case from crm.visa_cases
  where id = target_visa_case_id and deleted_at is null;
  if visa_case.id is null or not (
    crm.can_manage_visa_case(visa_case.id)
    or crm.current_profile_id() = visa_case.student_profile_id
  ) then raise exception 'Travel plan access denied.'; end if;
  if target_travel_plan_id is null then
    insert into crm.travel_plans (
      visa_case_id, departure_country_id, arrival_country_id,
      departure_at, arrival_at, departure_airport, arrival_airport,
      accommodation_details, itinerary_metadata, status,
      created_by_profile_id
    ) values (
      visa_case.id, target_departure_country_id, target_arrival_country_id,
      new_departure_at, new_arrival_at,
      nullif(trim(new_departure_airport), ''),
      nullif(trim(new_arrival_airport), ''),
      coalesce(new_accommodation_details, '{}'::jsonb),
      coalesce(new_itinerary_metadata, '{}'::jsonb),
      new_status, crm.current_profile_id()
    ) returning * into result;
  else
    update crm.travel_plans set
      departure_country_id = target_departure_country_id,
      arrival_country_id = target_arrival_country_id,
      departure_at = new_departure_at, arrival_at = new_arrival_at,
      departure_airport = nullif(trim(new_departure_airport), ''),
      arrival_airport = nullif(trim(new_arrival_airport), ''),
      accommodation_details = coalesce(new_accommodation_details, '{}'::jsonb),
      itinerary_metadata = coalesce(new_itinerary_metadata, '{}'::jsonb),
      status = new_status
    where id = target_travel_plan_id and visa_case_id = visa_case.id
    returning * into result;
    if result.id is null then raise exception 'Travel plan not found.'; end if;
  end if;
  perform crm.emit_domain_event(
    'visa.travel_plan_updated', 'visa_case', visa_case.id,
    visa_case.student_profile_id,
    jsonb_build_object('travel_plan_id', result.id, 'status', result.status)
  );
  perform crm.calculate_visa_readiness(visa_case.id);
  return result;
end;
$$;

create or replace function crm.close_visa_case(
  target_visa_case_id uuid,
  closure_reason text
)
returns crm.visa_cases
language plpgsql security definer set search_path = ''
as $$
declare visa_case crm.visa_cases; result crm.visa_cases;
begin
  select * into visa_case from crm.visa_cases where id = target_visa_case_id and deleted_at is null;
  if visa_case.id is null or not crm.can_manage_visa_case(visa_case.id) then
    raise exception 'Visa case closure access denied.';
  end if;
  if visa_case.stage not in ('travel_ready', 'refused', 'withdrawn') then
    raise exception 'Visa case cannot close from its current stage.';
  end if;
  if char_length(trim(closure_reason)) not between 2 and 2000 then
    raise exception 'Closure reason must contain 2-2000 characters.';
  end if;
  result := crm.update_visa_stage(
    visa_case.id, 'closed',
    trim(closure_reason)
  );
  perform crm.emit_domain_event(
    'visa.case_closed', 'visa_case', result.id,
    result.student_profile_id, jsonb_build_object('reason', closure_reason)
  );
  return result;
end;
$$;

revoke all on function crm.calculate_visa_readiness(uuid) from public;
revoke all on function crm.create_visa_case(uuid,uuid,text,uuid,uuid,uuid,date,jsonb) from public;
revoke all on function crm.update_visa_stage(uuid,text,text) from public;
revoke all on function crm.schedule_visa_interview(uuid,uuid,text,timestamptz,text,text) from public;
revoke all on function crm.record_visa_decision(uuid,text,date,date,date,text,text) from public;
revoke all on function crm.upload_visa_document(uuid,uuid,text,uuid) from public;
revoke all on function crm.update_visa_checklist_item(uuid,text) from public;
revoke all on function crm.emit_due_visa_reminders() from public;
revoke all on function crm.update_visa_interview_status(uuid,text,text) from public;
revoke all on function crm.record_visa_passport(uuid,uuid,uuid,text,date,date,boolean) from public;
revoke all on function crm.upsert_visa_travel_plan(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb,text) from public;
revoke all on function crm.close_visa_case(uuid,text) from public;
grant execute on function crm.calculate_visa_readiness(uuid) to authenticated;
grant execute on function crm.create_visa_case(uuid,uuid,text,uuid,uuid,uuid,date,jsonb) to authenticated;
grant execute on function crm.update_visa_stage(uuid,text,text) to authenticated;
grant execute on function crm.schedule_visa_interview(uuid,uuid,text,timestamptz,text,text) to authenticated;
grant execute on function crm.record_visa_decision(uuid,text,date,date,date,text,text) to authenticated;
grant execute on function crm.upload_visa_document(uuid,uuid,text,uuid) to authenticated;
grant execute on function crm.update_visa_checklist_item(uuid,text) to authenticated;
grant execute on function crm.emit_due_visa_reminders() to authenticated;
grant execute on function crm.update_visa_interview_status(uuid,text,text) to authenticated;
grant execute on function crm.record_visa_passport(uuid,uuid,uuid,text,date,date,boolean) to authenticated;
grant execute on function crm.upsert_visa_travel_plan(uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text,jsonb,jsonb,text) to authenticated;
grant execute on function crm.close_visa_case(uuid,text) to authenticated;

alter table crm.visa_case_readiness enable row level security;
alter table crm.visa_case_readiness force row level security;
grant select on crm.visa_case_readiness to authenticated;
create policy "visa_case_readiness_select_authorized"
on crm.visa_case_readiness for select to authenticated
using (crm.can_access_visa_case(visa_case_id));

commit;
