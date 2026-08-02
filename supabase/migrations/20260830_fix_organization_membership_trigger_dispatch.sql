begin;

create or replace function crm.validate_organization_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_relation text := tg_table_schema || '.' || tg_table_name;
  expected_role text;
  target_profile_id uuid;
  requires_active_relationship boolean;
begin
  if target_relation = 'crm.organization_advisors' then
    expected_role := 'advisor';
    target_profile_id := new.advisor_profile_id;
    requires_active_relationship := tg_op = 'INSERT' or new.ends_at is null;

    if tg_op = 'UPDATE'
      and (
        new.organization_id is distinct from old.organization_id
        or new.advisor_profile_id is distinct from old.advisor_profile_id
        or new.created_at is distinct from old.created_at
        or new.starts_at is distinct from old.starts_at
      )
    then
      raise exception 'Advisor organization identity and creation fields are immutable.';
    end if;
  elsif target_relation = 'crm.organization_students' then
    expected_role := 'student';
    target_profile_id := new.student_profile_id;
    requires_active_relationship := tg_op = 'INSERT' or new.status = 'active';

    if tg_op = 'UPDATE'
      and (
        new.organization_id is distinct from old.organization_id
        or new.student_profile_id is distinct from old.student_profile_id
        or new.created_at is distinct from old.created_at
        or new.starts_at is distinct from old.starts_at
      )
    then
      raise exception 'Student organization identity and creation fields are immutable.';
    end if;
  else
    raise exception 'Unsupported organization membership trigger relation: %',
      target_relation;
  end if;

  if requires_active_relationship
    and not exists (
      select 1
      from crm.organizations as organization
      where organization.id = new.organization_id
        and organization.status = 'active'
    )
  then
    raise exception 'Organization memberships require an active organization.';
  end if;

  if requires_active_relationship
    and not exists (
      select 1
      from crm.profiles as profile
      where profile.id = target_profile_id
        and profile.role = expected_role
        and profile.deleted_at is null
    )
  then
    raise exception 'Organization membership profile role is invalid.';
  end if;

  return new;
end;
$$;

revoke all on function crm.validate_organization_membership() from public;

commit;
