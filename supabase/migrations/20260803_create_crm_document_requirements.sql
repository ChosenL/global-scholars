begin;

alter table crm.domain_events
  drop constraint domain_events_aggregate_type_check;
alter table crm.domain_events
  add constraint domain_events_aggregate_type_check
  check (aggregate_type in (
    'student_profile', 'document', 'task', 'note',
    'document_requirement', 'readiness', 'notification'
  ));

create or replace function crm.emit_domain_event(
  new_event_type text,
  new_aggregate_type text,
  new_aggregate_id uuid,
  target_student_profile_id uuid default null,
  new_payload jsonb default '{}'::jsonb,
  new_correlation_id uuid default null,
  new_causation_id uuid default null
)
returns crm.domain_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  result crm.domain_events;
begin
  if new.requirement_level = 'conditional'
    and (
      not (new.condition_definition ? 'field')
      or not (new.condition_definition ? 'operator')
      or new.condition_definition->>'field' not in (
        'nationality', 'current_country', 'preferred_degree',
        'preferred_program', 'intended_intake', 'english_test_type'
      )
      or new.condition_definition->>'operator' not in (
        'equals', 'not_equals', 'present', 'absent'
      )
      or (
        new.condition_definition->>'operator' in ('equals', 'not_equals')
        and not (new.condition_definition ? 'value')
      )
    )
  then
    raise exception 'Conditional requirement definition is invalid.';
  end if;

  insert into crm.domain_events (
    event_type, aggregate_type, aggregate_id, student_profile_id,
    actor_profile_id, payload, correlation_id, causation_id
  ) values (
    new_event_type, new_aggregate_type, new_aggregate_id,
    target_student_profile_id, crm.current_profile_id(),
    coalesce(new_payload, '{}'::jsonb),
    coalesce(new_correlation_id, gen_random_uuid()), new_causation_id
  ) returning * into result;
  return result;
end;
$$;
revoke all on function crm.emit_domain_event(text,text,uuid,uuid,jsonb,uuid,uuid)
  from public;

create table crm.document_requirements (
  id uuid primary key default gen_random_uuid(),
  parent_requirement_id uuid,
  scope_type text not null,
  country_code text not null,
  university_key text,
  program_key text,
  document_type text not null,
  custom_document_name text,
  requirement_level text not null default 'required',
  condition_definition jsonb,
  guidance text,
  created_by_profile_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint document_requirements_parent_fkey
    foreign key (parent_requirement_id)
    references crm.document_requirements(id) on delete restrict,
  constraint document_requirements_creator_fkey
    foreign key (created_by_profile_id)
    references crm.profiles(id) on delete restrict,
  constraint document_requirements_scope_check
    check (
      (scope_type = 'country' and university_key is null and program_key is null)
      or (scope_type = 'university' and university_key is not null and program_key is null)
      or (scope_type = 'program' and university_key is not null and program_key is not null)
    ),
  constraint document_requirements_country_check
    check (char_length(trim(country_code)) between 2 and 100),
  constraint document_requirements_keys_check
    check (
      (university_key is null or char_length(trim(university_key)) between 2 and 150)
      and (program_key is null or char_length(trim(program_key)) between 2 and 200)
    ),
  constraint document_requirements_type_check
    check (document_type in (
      'passport', 'transcript', 'degree_certificate',
      'english_test_result', 'cv_resume', 'statement_of_purpose',
      'recommendation_letter', 'financial_document', 'visa_document',
      'birth_certificate', 'national_id', 'application_form',
      'offer_letter', 'other'
    )),
  constraint document_requirements_custom_name_check
    check (
      (document_type = 'other' and custom_document_name is not null
        and char_length(trim(custom_document_name)) between 2 and 150)
      or (document_type <> 'other' and custom_document_name is null)
    ),
  constraint document_requirements_level_check
    check (requirement_level in ('required', 'optional', 'conditional', 'waived')),
  constraint document_requirements_condition_check
    check (
      (requirement_level = 'conditional'
        and condition_definition is not null
        and jsonb_typeof(condition_definition) = 'object')
      or (requirement_level <> 'conditional' and condition_definition is null)
    ),
  constraint document_requirements_guidance_length
    check (guidance is null or char_length(trim(guidance)) between 2 and 2000),
  constraint document_requirements_parent_self_check
    check (parent_requirement_id is null or parent_requirement_id <> id),
  constraint document_requirements_deleted_at_check
    check (deleted_at is null or deleted_at >= created_at)
);

create unique index document_requirements_active_scope_document_idx
  on crm.document_requirements (
    country_code, coalesce(university_key, ''), coalesce(program_key, ''),
    document_type, coalesce(custom_document_name, '')
  ) where deleted_at is null;
create index document_requirements_parent_idx
  on crm.document_requirements (parent_requirement_id)
  where parent_requirement_id is not null;
create index document_requirements_resolution_idx
  on crm.document_requirements (
    country_code, university_key, program_key, scope_type
  ) where deleted_at is null;

create or replace function crm.validate_document_requirement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent crm.document_requirements;
begin
  if not exists (
    select 1 from crm.profiles as profile
    where profile.id = new.created_by_profile_id
      and profile.role = 'admin' and profile.deleted_at is null
  ) then
    raise exception 'Document requirement creator must be an active administrator.';
  end if;

  if new.parent_requirement_id is not null then
    select * into parent from crm.document_requirements
    where id = new.parent_requirement_id and deleted_at is null;
    if parent.id is null
      or parent.country_code <> new.country_code
      or parent.document_type <> new.document_type
      or (parent.scope_type = 'country' and new.scope_type not in ('university', 'program'))
      or (parent.scope_type = 'university' and new.scope_type <> 'program')
      or parent.scope_type = 'program'
    then
      raise exception 'Requirement parent must be an active, less-specific matching scope.';
    end if;
  end if;

  if tg_op = 'UPDATE' and (
    new.id <> old.id
    or new.created_by_profile_id <> old.created_by_profile_id
    or new.created_at <> old.created_at
  ) then
    raise exception 'Requirement identity, creator, and creation time are immutable.';
  end if;
  return new;
end;
$$;
revoke all on function crm.validate_document_requirement() from public;
create trigger document_requirements_validate
before insert or update on crm.document_requirements
for each row execute function crm.validate_document_requirement();
create trigger document_requirements_set_updated_at
before update on crm.document_requirements
for each row execute function crm.set_updated_at();

create or replace function crm.upsert_document_requirement(
  target_requirement_id uuid,
  target_parent_requirement_id uuid,
  new_scope_type text,
  new_country_code text,
  new_university_key text,
  new_program_key text,
  new_document_type text,
  new_custom_document_name text,
  new_requirement_level text,
  new_condition_definition jsonb,
  new_guidance text
)
returns crm.document_requirements
language plpgsql
security definer
set search_path = ''
as $$
declare
  result crm.document_requirements;
begin
  if not crm.is_current_admin() then
    raise exception 'Only administrators may configure document requirements.';
  end if;

  if target_requirement_id is null then
    insert into crm.document_requirements (
      parent_requirement_id, scope_type, country_code, university_key,
      program_key, document_type, custom_document_name, requirement_level,
      condition_definition, guidance, created_by_profile_id
    ) values (
      target_parent_requirement_id, new_scope_type, upper(trim(new_country_code)),
      nullif(trim(new_university_key), ''), nullif(trim(new_program_key), ''),
      new_document_type, nullif(trim(new_custom_document_name), ''),
      new_requirement_level, new_condition_definition,
      nullif(trim(new_guidance), ''), crm.current_profile_id()
    ) returning * into result;
    perform crm.emit_domain_event(
      'document_requirement.created', 'document_requirement', result.id,
      null, jsonb_build_object('scope_type', result.scope_type)
    );
  else
    update crm.document_requirements
    set parent_requirement_id = target_parent_requirement_id,
        scope_type = new_scope_type,
        country_code = upper(trim(new_country_code)),
        university_key = nullif(trim(new_university_key), ''),
        program_key = nullif(trim(new_program_key), ''),
        document_type = new_document_type,
        custom_document_name = nullif(trim(new_custom_document_name), ''),
        requirement_level = new_requirement_level,
        condition_definition = new_condition_definition,
        guidance = nullif(trim(new_guidance), '')
    where id = target_requirement_id and deleted_at is null
    returning * into result;
    if result.id is null then raise exception 'Active requirement not found.'; end if;
    perform crm.emit_domain_event(
      'document_requirement.updated', 'document_requirement', result.id,
      null, jsonb_build_object('scope_type', result.scope_type)
    );
  end if;
  return result;
end;
$$;

create or replace function crm.soft_delete_document_requirement(
  target_requirement_id uuid
)
returns crm.document_requirements
language plpgsql
security definer
set search_path = ''
as $$
declare
  result crm.document_requirements;
begin
  if not crm.is_current_admin() then
    raise exception 'Only administrators may delete document requirements.';
  end if;
  update crm.document_requirements
  set deleted_at = statement_timestamp()
  where id = target_requirement_id and deleted_at is null
  returning * into result;
  if result.id is null then raise exception 'Active requirement not found.'; end if;
  perform crm.emit_domain_event(
    'document_requirement.deleted', 'document_requirement', result.id
  );
  return result;
end;
$$;

create or replace function crm.get_effective_document_requirements(
  target_student_profile_id uuid,
  target_country_code text default null,
  target_university_key text default null,
  target_program_key text default null
)
returns setof crm.document_requirements
language sql
stable
security definer
set search_path = ''
as $$
  with student_context as (
    select
      upper(coalesce(target_country_code, profile.preferred_destination_country)) as country_code,
      nullif(trim(target_university_key), '') as university_key,
      coalesce(nullif(trim(target_program_key), ''), profile.preferred_program) as program_key
    from crm.student_profiles as profile
    where profile.profile_id = target_student_profile_id
      and profile.deleted_at is null
      and crm.can_access_student(profile.profile_id)
  ),
  candidates as (
    select requirement.*,
      case requirement.scope_type
        when 'program' then 3 when 'university' then 2 else 1
      end as specificity
    from crm.document_requirements as requirement
    cross join student_context as context
    where requirement.deleted_at is null
      and requirement.country_code = context.country_code
      and (
        requirement.scope_type = 'country'
        or (
          requirement.scope_type = 'university'
          and requirement.university_key = context.university_key
        )
        or (
          requirement.scope_type = 'program'
          and requirement.university_key = context.university_key
          and requirement.program_key = context.program_key
        )
      )
  )
  select distinct on (document_type, coalesce(custom_document_name, ''))
    id, parent_requirement_id, scope_type, country_code, university_key,
    program_key, document_type, custom_document_name, requirement_level,
    condition_definition, guidance, created_by_profile_id, created_at,
    updated_at, deleted_at
  from candidates
  order by document_type, coalesce(custom_document_name, ''), specificity desc;
$$;

create or replace function crm.document_requirement_applies(
  target_requirement_id uuid,
  target_student_profile_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requirement crm.document_requirements;
  profile crm.student_profiles;
  field_value text;
  operator_name text;
  expected_value text;
begin
  select * into requirement from crm.document_requirements
  where id = target_requirement_id and deleted_at is null;
  if requirement.id is null then return false; end if;
  if requirement.requirement_level <> 'conditional' then
    return requirement.requirement_level = 'required';
  end if;
  if not crm.can_access_student(target_student_profile_id) then return false; end if;

  select * into profile from crm.student_profiles
  where profile_id = target_student_profile_id and deleted_at is null;
  field_value := case requirement.condition_definition->>'field'
    when 'nationality' then profile.nationality
    when 'current_country' then profile.current_country
    when 'preferred_degree' then profile.preferred_degree
    when 'preferred_program' then profile.preferred_program
    when 'intended_intake' then profile.intended_intake
    when 'english_test_type' then profile.english_test_type
  end;
  operator_name := requirement.condition_definition->>'operator';
  expected_value := requirement.condition_definition->>'value';

  return case operator_name
    when 'equals' then lower(coalesce(field_value, '')) = lower(expected_value)
    when 'not_equals' then lower(coalesce(field_value, '')) <> lower(expected_value)
    when 'present' then nullif(trim(field_value), '') is not null
    when 'absent' then nullif(trim(field_value), '') is null
    else false
  end;
end;
$$;

create or replace function crm.get_missing_document_requirements(
  target_student_profile_id uuid,
  target_country_code text default null,
  target_university_key text default null,
  target_program_key text default null
)
returns setof crm.document_requirements
language sql
stable
security definer
set search_path = ''
as $$
  select requirement.*
  from crm.get_effective_document_requirements(
    target_student_profile_id, target_country_code,
    target_university_key, target_program_key
  ) as requirement
  where (
      requirement.requirement_level = 'required'
      or (
        requirement.requirement_level = 'conditional'
        and crm.document_requirement_applies(
          requirement.id, target_student_profile_id
        )
      )
    )
    and not exists (
      select 1 from crm.student_documents as document
      where document.profile_id = target_student_profile_id
        and document.document_type = requirement.document_type
        and (
          requirement.document_type <> 'other'
          or document.custom_document_name = requirement.custom_document_name
        )
        and document.status in ('uploaded', 'under_review', 'approved')
        and document.deleted_at is null
    );
$$;

revoke all on function crm.upsert_document_requirement(uuid,uuid,text,text,text,text,text,text,text,jsonb,text) from public;
revoke all on function crm.soft_delete_document_requirement(uuid) from public;
revoke all on function crm.get_effective_document_requirements(uuid,text,text,text) from public;
revoke all on function crm.get_missing_document_requirements(uuid,text,text,text) from public;
revoke all on function crm.document_requirement_applies(uuid,uuid) from public;
grant execute on function crm.upsert_document_requirement(uuid,uuid,text,text,text,text,text,text,text,jsonb,text) to authenticated;
grant execute on function crm.soft_delete_document_requirement(uuid) to authenticated;
grant execute on function crm.get_effective_document_requirements(uuid,text,text,text) to authenticated;
grant execute on function crm.get_missing_document_requirements(uuid,text,text,text) to authenticated;
grant execute on function crm.document_requirement_applies(uuid,uuid) to authenticated;

alter table crm.document_requirements enable row level security;
alter table crm.document_requirements force row level security;
grant select on crm.document_requirements to authenticated;
create policy "document_requirements_select_authenticated"
on crm.document_requirements for select to authenticated
using (deleted_at is null);

commit;
