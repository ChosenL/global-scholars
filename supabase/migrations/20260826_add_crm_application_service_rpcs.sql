begin;

create or replace function crm.update_student_application(
  target_application_id uuid,
  new_values jsonb
)
returns crm.student_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application crm.student_applications;
  result crm.student_applications;
  next_organization_id uuid;
begin
  if jsonb_typeof(new_values) <> 'object'
    or new_values = '{}'::jsonb
    or exists (
      select 1
      from jsonb_object_keys(new_values) as field_name
      where field_name not in ('external_reference', 'organization_id')
    )
  then
    raise exception 'Invalid application update fields.';
  end if;

  select * into application
  from crm.student_applications
  where id = target_application_id and deleted_at is null
  for update;

  if application.id is null then
    raise exception 'Active application not found.';
  end if;
  if not crm.can_manage_application(application.id) then
    raise exception 'Application update access denied.';
  end if;
  if application.archived_at is not null then
    raise exception 'Archived applications cannot be updated.';
  end if;

  if new_values ? 'organization_id' then
    begin
      next_organization_id := nullif(new_values->>'organization_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Invalid organization identifier.';
    end;

    if next_organization_id is not null and not exists (
      select 1
      from crm.organizations as organization
      join crm.organization_students as membership
        on membership.organization_id = organization.id
       and membership.student_profile_id = application.student_profile_id
       and membership.status = 'active'
       and membership.ends_at is null
      where organization.id = next_organization_id
        and organization.status = 'active'
    )
    then
      raise exception 'Active student organization membership not found.';
    end if;
  else
    next_organization_id := application.organization_id;
  end if;

  update crm.student_applications
  set
    external_reference = case
      when new_values ? 'external_reference'
        then nullif(trim(new_values->>'external_reference'), '')
      else application.external_reference
    end,
    organization_id = next_organization_id
  where id = application.id
  returning * into result;

  perform crm.emit_domain_event(
    'application.updated',
    'application',
    result.id,
    result.student_profile_id,
    jsonb_build_object(
      'external_reference_changed',
      result.external_reference is distinct from application.external_reference,
      'organization_changed',
      result.organization_id is distinct from application.organization_id
    )
  );

  return result;
end;
$$;

create or replace function crm.assign_application_advisor(
  target_application_id uuid,
  target_advisor_profile_id uuid
)
returns crm.student_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application crm.student_applications;
  result crm.student_applications;
begin
  select * into application
  from crm.student_applications
  where id = target_application_id and deleted_at is null
  for update;

  if application.id is null then
    raise exception 'Active application not found.';
  end if;
  if not crm.can_manage_application(application.id) then
    raise exception 'Application advisor assignment access denied.';
  end if;
  if application.archived_at is not null then
    raise exception 'Archived applications cannot be updated.';
  end if;
  if not exists (
    select 1
    from crm.profiles as advisor
    where advisor.id = target_advisor_profile_id
      and advisor.role in ('advisor', 'admin')
      and advisor.deleted_at is null
      and (
        advisor.role = 'admin'
        or (
          exists (
            select 1
            from crm.conversation_participants as advisor_participant
            join crm.conversation_participants as student_participant
              on student_participant.conversation_id =
                advisor_participant.conversation_id
             and student_participant.profile_id =
                application.student_profile_id
             and student_participant.deleted_at is null
            where advisor_participant.profile_id = advisor.id
              and advisor_participant.deleted_at is null
          )
          and (
            application.organization_id is null
            or exists (
              select 1
              from crm.organization_advisors as assignment
              where assignment.organization_id = application.organization_id
                and assignment.advisor_profile_id = advisor.id
                and assignment.ends_at is null
            )
          )
        )
      )
  )
  then
    raise exception 'Application advisor is not authorized for this student.';
  end if;

  update crm.student_applications
  set advisor_profile_id = target_advisor_profile_id
  where id = application.id
  returning * into result;

  perform crm.emit_domain_event(
    'application.advisor_assigned',
    'application',
    result.id,
    result.student_profile_id,
    jsonb_build_object(
      'previous_advisor_profile_id', application.advisor_profile_id,
      'advisor_profile_id', result.advisor_profile_id
    )
  );

  return result;
end;
$$;

create or replace function crm.update_application_financial_details(
  target_application_id uuid,
  new_tuition_amount numeric,
  new_tuition_currency text,
  new_tuition_source text
)
returns crm.student_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application crm.student_applications;
  result crm.student_applications;
  normalized_currency text := upper(nullif(trim(new_tuition_currency), ''));
  normalized_source text := nullif(trim(new_tuition_source), '');
begin
  select * into application
  from crm.student_applications
  where id = target_application_id and deleted_at is null
  for update;

  if application.id is null then
    raise exception 'Active application not found.';
  end if;
  if not crm.can_manage_application(application.id) then
    raise exception 'Application financial update access denied.';
  end if;
  if application.archived_at is not null then
    raise exception 'Archived applications cannot be updated.';
  end if;
  if not (
    (
      new_tuition_amount is null
      and normalized_currency is null
      and normalized_source is null
    )
    or coalesce((
      new_tuition_amount >= 0
      and normalized_currency ~ '^[A-Z]{3}$'
      and char_length(normalized_source) between 2 and 200
    ), false)
  )
  then
    raise exception 'Invalid application financial details.';
  end if;

  update crm.student_applications
  set tuition_amount = new_tuition_amount,
      tuition_currency = normalized_currency,
      tuition_source = normalized_source
  where id = application.id
  returning * into result;

  perform crm.emit_domain_event(
    'application.financial_details_updated',
    'application',
    result.id,
    result.student_profile_id,
    jsonb_build_object(
      'currency', result.tuition_currency,
      'has_tuition_snapshot', result.tuition_amount is not null
    )
  );

  return result;
end;
$$;

revoke all on function crm.update_student_application(uuid,jsonb) from public;
revoke all on function crm.assign_application_advisor(uuid,uuid) from public;
revoke all on function crm.update_application_financial_details(
  uuid,numeric,text,text
) from public;

grant execute on function crm.update_student_application(uuid,jsonb)
  to authenticated;
grant execute on function crm.assign_application_advisor(uuid,uuid)
  to authenticated;
grant execute on function crm.update_application_financial_details(
  uuid,numeric,text,text
) to authenticated;

commit;
