begin;

create or replace function crm.create_organization(
  new_name text,
  new_slug text,
  new_organization_type text,
  new_email text default null,
  new_phone text default null,
  new_website text default null,
  new_address text default null
)
returns crm.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  result crm.organizations;
begin
  if not crm.is_current_admin() then
    raise exception 'Organization creation access denied.';
  end if;

  insert into crm.organizations (
    name, slug, organization_type, email, phone, website, address
  ) values (
    trim(new_name),
    lower(trim(new_slug)),
    new_organization_type,
    nullif(trim(new_email), ''),
    nullif(trim(new_phone), ''),
    nullif(trim(new_website), ''),
    nullif(trim(new_address), '')
  )
  returning * into result;

  return result;
end;
$$;

create or replace function crm.update_organization(
  target_organization_id uuid,
  new_values jsonb
)
returns crm.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization crm.organizations;
  result crm.organizations;
begin
  if not crm.is_current_admin() then
    raise exception 'Organization update access denied.';
  end if;
  if jsonb_typeof(new_values) <> 'object'
    or new_values = '{}'::jsonb
    or exists (
      select 1
      from jsonb_object_keys(new_values) as field_name
      where field_name not in (
        'name', 'slug', 'organization_type',
        'email', 'phone', 'website', 'address'
      )
    )
  then
    raise exception 'Invalid organization update fields.';
  end if;

  select * into organization
  from crm.organizations
  where id = target_organization_id
  for update;

  if organization.id is null then
    raise exception 'Organization not found.';
  end if;
  if organization.status <> 'active' then
    raise exception 'Archived organizations cannot be updated.';
  end if;

  update crm.organizations
  set
    name = case
      when new_values ? 'name' then trim(new_values->>'name')
      else organization.name
    end,
    slug = case
      when new_values ? 'slug' then lower(trim(new_values->>'slug'))
      else organization.slug
    end,
    organization_type = case
      when new_values ? 'organization_type'
        then new_values->>'organization_type'
      else organization.organization_type
    end,
    email = case
      when new_values ? 'email' then nullif(trim(new_values->>'email'), '')
      else organization.email
    end,
    phone = case
      when new_values ? 'phone' then nullif(trim(new_values->>'phone'), '')
      else organization.phone
    end,
    website = case
      when new_values ? 'website' then nullif(trim(new_values->>'website'), '')
      else organization.website
    end,
    address = case
      when new_values ? 'address' then nullif(trim(new_values->>'address'), '')
      else organization.address
    end
  where id = organization.id
  returning * into result;

  return result;
end;
$$;

create or replace function crm.archive_organization(
  target_organization_id uuid
)
returns crm.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization crm.organizations;
  result crm.organizations;
begin
  if not crm.is_current_admin() then
    raise exception 'Organization archive access denied.';
  end if;

  select * into organization
  from crm.organizations
  where id = target_organization_id
  for update;

  if organization.id is null then
    raise exception 'Organization not found.';
  end if;
  if organization.status = 'archived' then
    raise exception 'Organization is already archived.';
  end if;

  update crm.organizations
  set status = 'archived',
      archived_at = statement_timestamp()
  where id = organization.id
  returning * into result;

  return result;
end;
$$;

create or replace function crm.assign_organization_advisor(
  target_organization_id uuid,
  target_advisor_profile_id uuid,
  new_assignment_role text default 'support',
  new_starts_at timestamptz default statement_timestamp()
)
returns crm.organization_advisors
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization crm.organizations;
  result crm.organization_advisors;
begin
  if not crm.is_current_admin() then
    raise exception 'Organization advisor assignment access denied.';
  end if;

  select * into organization
  from crm.organizations
  where id = target_organization_id
  for update;

  if organization.id is null or organization.status <> 'active' then
    raise exception 'Active organization not found.';
  end if;
  if not exists (
    select 1
    from crm.profiles as advisor
    where advisor.id = target_advisor_profile_id
      and advisor.role = 'advisor'
      and advisor.deleted_at is null
  )
  then
    raise exception 'Active advisor profile not found.';
  end if;

  insert into crm.organization_advisors (
    organization_id, advisor_profile_id, assignment_role, starts_at
  ) values (
    organization.id, target_advisor_profile_id,
    new_assignment_role, new_starts_at
  )
  returning * into result;

  return result;
end;
$$;

create or replace function crm.remove_organization_advisor(
  target_assignment_id uuid
)
returns crm.organization_advisors
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment crm.organization_advisors;
  result crm.organization_advisors;
begin
  if not crm.is_current_admin() then
    raise exception 'Organization advisor removal access denied.';
  end if;

  select * into assignment
  from crm.organization_advisors
  where id = target_assignment_id
  for update;

  if assignment.id is null then
    raise exception 'Organization advisor assignment not found.';
  end if;
  if assignment.ends_at is not null then
    raise exception 'Organization advisor assignment has already ended.';
  end if;

  update crm.organization_advisors
  set ends_at = statement_timestamp()
  where id = assignment.id
  returning * into result;

  return result;
end;
$$;

create or replace function crm.assign_organization_student(
  target_organization_id uuid,
  target_student_profile_id uuid,
  new_membership_type text default 'client',
  new_is_primary boolean default false,
  new_external_student_reference text default null,
  new_starts_at timestamptz default statement_timestamp()
)
returns crm.organization_students
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization crm.organizations;
  result crm.organization_students;
begin
  if not crm.is_current_admin() then
    raise exception 'Organization student assignment access denied.';
  end if;

  select * into organization
  from crm.organizations
  where id = target_organization_id
  for update;

  if organization.id is null or organization.status <> 'active' then
    raise exception 'Active organization not found.';
  end if;
  if not exists (
    select 1
    from crm.profiles as student
    where student.id = target_student_profile_id
      and student.role = 'student'
      and student.deleted_at is null
  )
  then
    raise exception 'Active student profile not found.';
  end if;

  insert into crm.organization_students (
    organization_id, student_profile_id, membership_type,
    is_primary, external_student_reference, starts_at
  ) values (
    organization.id, target_student_profile_id, new_membership_type,
    new_is_primary, nullif(trim(new_external_student_reference), ''),
    new_starts_at
  )
  returning * into result;

  return result;
end;
$$;

create or replace function crm.remove_organization_student(
  target_membership_id uuid
)
returns crm.organization_students
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership crm.organization_students;
  result crm.organization_students;
begin
  if not crm.is_current_admin() then
    raise exception 'Organization student removal access denied.';
  end if;

  select * into membership
  from crm.organization_students
  where id = target_membership_id
  for update;

  if membership.id is null then
    raise exception 'Organization student membership not found.';
  end if;
  if membership.status = 'ended' then
    raise exception 'Organization student membership has already ended.';
  end if;

  update crm.organization_students
  set status = 'ended',
      is_primary = false,
      ends_at = statement_timestamp()
  where id = membership.id
  returning * into result;

  return result;
end;
$$;

revoke all on function crm.create_organization(
  text, text, text, text, text, text, text
) from public;
revoke all on function crm.update_organization(uuid, jsonb) from public;
revoke all on function crm.archive_organization(uuid) from public;
revoke all on function crm.assign_organization_advisor(
  uuid, uuid, text, timestamptz
) from public;
revoke all on function crm.remove_organization_advisor(uuid) from public;
revoke all on function crm.assign_organization_student(
  uuid, uuid, text, boolean, text, timestamptz
) from public;
revoke all on function crm.remove_organization_student(uuid) from public;

grant execute on function crm.create_organization(
  text, text, text, text, text, text, text
) to authenticated;
grant execute on function crm.update_organization(uuid, jsonb)
  to authenticated;
grant execute on function crm.archive_organization(uuid)
  to authenticated;
grant execute on function crm.assign_organization_advisor(
  uuid, uuid, text, timestamptz
) to authenticated;
grant execute on function crm.remove_organization_advisor(uuid)
  to authenticated;
grant execute on function crm.assign_organization_student(
  uuid, uuid, text, boolean, text, timestamptz
) to authenticated;
grant execute on function crm.remove_organization_student(uuid)
  to authenticated;

comment on function crm.create_organization(
  text, text, text, text, text, text, text
) is 'Creates an organization atomically after trusted administrator authorization.';
comment on function crm.update_organization(uuid, jsonb) is
  'Updates validated organization fields atomically after trusted administrator authorization.';
comment on function crm.archive_organization(uuid) is
  'Archives an organization without deleting its relationship history.';
comment on function crm.assign_organization_advisor(
  uuid, uuid, text, timestamptz
) is 'Creates an effective-dated advisor assignment for an active organization.';
comment on function crm.remove_organization_advisor(uuid) is
  'Ends an advisor assignment without deleting history.';
comment on function crm.assign_organization_student(
  uuid, uuid, text, boolean, text, timestamptz
) is 'Creates an effective-dated student membership for an active organization.';
comment on function crm.remove_organization_student(uuid) is
  'Ends a student organization membership without deleting history.';

commit;
