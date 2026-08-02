begin;

-- Apply the forward definition transactionally so this regression can run
-- against a linked database before the migration is deployed. ROLLBACK below
-- restores the database's previously installed definition.
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
      select 1 from crm.organizations as organization
      where organization.id = new.organization_id
        and organization.status = 'active'
    )
  then
    raise exception 'Organization memberships require an active organization.';
  end if;

  if requires_active_relationship
    and not exists (
      select 1 from crm.profiles as profile
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

create function pg_temp.volume11_uuid(source text)
returns uuid
language sql
immutable
strict
as $$ select md5(source)::uuid $$;

insert into crm.profiles (id, clerk_user_id, display_name, role)
values
  (pg_temp.volume11_uuid('volume11:advisor'), 'volume11-advisor', 'Volume 11 Advisor', 'advisor'),
  (pg_temp.volume11_uuid('volume11:student'), 'volume11-student', 'Volume 11 Student', 'student'),
  (pg_temp.volume11_uuid('volume11:wrong-role'), 'volume11-wrong-role', 'Volume 11 Wrong Role', 'student');

insert into crm.organizations (id, name, slug, organization_type)
values
  (pg_temp.volume11_uuid('volume11:active-organization'), 'Volume 11 Active Organization',
   'volume-11-active-organization', 'partner_school'),
  (pg_temp.volume11_uuid('volume11:archived-organization'), 'Volume 11 Archived Organization',
   'volume-11-archived-organization', 'partner_school');

update crm.organizations
set status = 'archived', archived_at = now()
where id = pg_temp.volume11_uuid('volume11:archived-organization');

insert into crm.organization_advisors (
  id, organization_id, advisor_profile_id, assignment_role
)
values (
  pg_temp.volume11_uuid('volume11:advisor-assignment'),
  pg_temp.volume11_uuid('volume11:active-organization'),
  pg_temp.volume11_uuid('volume11:advisor'),
  'support'
);

do $advisor_expiry_validation$
begin
  begin
    update crm.organization_advisors
    set ends_at = starts_at - interval '1 second'
    where id = pg_temp.volume11_uuid('volume11:advisor-assignment');
    raise exception 'Advisor expiry validation unexpectedly accepted an invalid end time.';
  exception when check_violation then
    null;
  end;
end
$advisor_expiry_validation$;

insert into crm.organization_students (
  id, organization_id, student_profile_id, membership_type, status
)
values (
  pg_temp.volume11_uuid('volume11:student-membership'),
  pg_temp.volume11_uuid('volume11:active-organization'),
  pg_temp.volume11_uuid('volume11:student'),
  'client',
  'active'
);

do $student_status_validation$
begin
  begin
    update crm.organization_students
    set status = 'ended'
    where id = pg_temp.volume11_uuid('volume11:student-membership');
    raise exception 'Student status validation unexpectedly accepted an ended membership without ends_at.';
  exception when check_violation then
    null;
  end;
end
$student_status_validation$;

do $invalid_role_validation$
begin
  begin
    insert into crm.organization_advisors (
      organization_id, advisor_profile_id, assignment_role
    ) values (
      pg_temp.volume11_uuid('volume11:active-organization'),
      pg_temp.volume11_uuid('volume11:wrong-role'),
      'support'
    );
    raise exception 'Advisor validation unexpectedly accepted a student profile.';
  exception
    when raise_exception then
      if sqlerrm <> 'Organization membership profile role is invalid.' then
        raise;
      end if;
  end;
end
$invalid_role_validation$;

do $inactive_organization_validation$
begin
  begin
    insert into crm.organization_students (
      organization_id, student_profile_id, membership_type, status
    ) values (
      pg_temp.volume11_uuid('volume11:archived-organization'),
      pg_temp.volume11_uuid('volume11:student'),
      'client',
      'active'
    );
    raise exception 'Membership validation unexpectedly accepted an archived organization.';
  exception
    when raise_exception then
      if sqlerrm <> 'Organization memberships require an active organization.' then
        raise;
      end if;
  end;
end
$inactive_organization_validation$;

do $valid_relationship_verification$
begin
  if not exists (
    select 1 from crm.organization_advisors
    where id = pg_temp.volume11_uuid('volume11:advisor-assignment')
      and ends_at is null
  ) then
    raise exception 'Valid advisor assignment was not retained.';
  end if;

  if not exists (
    select 1 from crm.organization_students
    where id = pg_temp.volume11_uuid('volume11:student-membership')
      and status = 'active'
  ) then
    raise exception 'Valid student membership was not retained.';
  end if;
end
$valid_relationship_verification$;

rollback;

do $rollback_verification$
begin
  if exists (
    select 1 from crm.profiles where clerk_user_id like 'volume11-%'
  ) or exists (
    select 1 from crm.organizations where slug like 'volume-11-%'
  ) then
    raise exception 'Volume 11 rollback left test rows behind.';
  end if;
end
$rollback_verification$;
