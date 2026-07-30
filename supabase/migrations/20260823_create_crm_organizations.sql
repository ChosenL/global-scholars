begin;

alter table crm.domain_events
  drop constraint domain_events_aggregate_type_check;
alter table crm.domain_events
  add constraint domain_events_aggregate_type_check
  check (aggregate_type in (
    'student_profile', 'document', 'task', 'note',
    'document_requirement', 'readiness', 'notification', 'workflow',
    'analytics', 'application', 'visa_case', 'ai_invocation',
    'organization', 'organization_advisor', 'organization_student'
  ));

create table crm.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  organization_type text not null,
  status text not null default 'active',
  email text,
  phone text,
  website text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,

  constraint organizations_slug_unique unique (slug),
  constraint organizations_name_length
    check (char_length(trim(name)) between 2 and 200),
  constraint organizations_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_type_check
    check (organization_type in (
      'partner_school', 'advising_agency', 'sponsor', 'operating_unit'
    )),
  constraint organizations_status_check
    check (status in ('active', 'archived')),
  constraint organizations_email_check
    check (
      email is null
      or (
        char_length(trim(email)) between 3 and 320
        and position('@' in email) > 1
      )
    ),
  constraint organizations_phone_check
    check (phone is null or char_length(trim(phone)) between 7 and 50),
  constraint organizations_website_check
    check (
      website is null
      or (
        char_length(trim(website)) <= 2048
        and website ~* '^https?://'
      )
    ),
  constraint organizations_address_check
    check (address is null or char_length(trim(address)) between 2 and 1000),
  constraint organizations_archive_check
    check (
      (status = 'active' and archived_at is null)
      or (status = 'archived' and archived_at is not null)
    )
);

comment on table crm.organizations is
  'Customer and partner organizations using Global Scholars OS; separate from the university admissions catalog.';

create unique index organizations_name_lower_unique
  on crm.organizations (lower(btrim(name)));
create index organizations_active_name_idx
  on crm.organizations (name, id)
  where status = 'active';
create index organizations_type_status_idx
  on crm.organizations (organization_type, status, name);

create table crm.organization_advisors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  advisor_profile_id uuid not null,
  assignment_role text not null default 'support',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organization_advisors_organization_fkey
    foreign key (organization_id)
    references crm.organizations(id) on delete restrict,
  constraint organization_advisors_profile_fkey
    foreign key (advisor_profile_id)
    references crm.profiles(id) on delete restrict,
  constraint organization_advisors_role_check
    check (assignment_role in ('primary', 'support', 'manager')),
  constraint organization_advisors_dates_check
    check (ends_at is null or ends_at >= starts_at)
);

comment on table crm.organization_advisors is
  'Effective-dated advisor membership in a customer organization using CRM profile UUID identity.';

create unique index organization_advisors_active_unique
  on crm.organization_advisors (organization_id, advisor_profile_id)
  where ends_at is null;
create unique index organization_advisors_primary_unique
  on crm.organization_advisors (organization_id)
  where assignment_role = 'primary' and ends_at is null;
create index organization_advisors_profile_active_idx
  on crm.organization_advisors (advisor_profile_id, organization_id)
  where ends_at is null;
create index organization_advisors_organization_history_idx
  on crm.organization_advisors (organization_id, starts_at desc, id);

create table crm.organization_students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  student_profile_id uuid not null,
  membership_type text not null default 'client',
  status text not null default 'active',
  is_primary boolean not null default false,
  external_student_reference text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organization_students_organization_fkey
    foreign key (organization_id)
    references crm.organizations(id) on delete restrict,
  constraint organization_students_profile_fkey
    foreign key (student_profile_id)
    references crm.profiles(id) on delete restrict,
  constraint organization_students_membership_type_check
    check (membership_type in ('client', 'sponsored', 'referred', 'managed')),
  constraint organization_students_status_check
    check (status in ('active', 'ended')),
  constraint organization_students_reference_check
    check (
      external_student_reference is null
      or char_length(trim(external_student_reference)) between 1 and 150
    ),
  constraint organization_students_lifecycle_check
    check (
      (status = 'active' and ends_at is null)
      or (
        status = 'ended'
        and ends_at is not null
        and ends_at >= starts_at
        and not is_primary
      )
    )
);

comment on table crm.organization_students is
  'Effective-dated student membership in a customer organization; unrelated to university applications.';

create unique index organization_students_active_unique
  on crm.organization_students (organization_id, student_profile_id)
  where status = 'active';
create unique index organization_students_primary_unique
  on crm.organization_students (student_profile_id)
  where status = 'active' and is_primary;
create unique index organization_students_external_reference_unique
  on crm.organization_students (organization_id, external_student_reference)
  where external_student_reference is not null;
create index organization_students_profile_active_idx
  on crm.organization_students (student_profile_id, organization_id)
  where status = 'active';
create index organization_students_organization_active_idx
  on crm.organization_students (organization_id, student_profile_id)
  where status = 'active';
create index organization_students_organization_history_idx
  on crm.organization_students (organization_id, starts_at desc, id);

create or replace function crm.is_organization_advisor(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from crm.organization_advisors as membership
    join crm.profiles as advisor
      on advisor.id = membership.advisor_profile_id
     and advisor.role = 'advisor'
     and advisor.deleted_at is null
    where membership.organization_id = target_organization_id
      and membership.advisor_profile_id = crm.current_profile_id()
      and membership.ends_at is null
  );
$$;
revoke all on function crm.is_organization_advisor(uuid) from public;
grant execute on function crm.is_organization_advisor(uuid)
  to authenticated, service_role;

create or replace function crm.is_organization_student(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from crm.organization_students as membership
    join crm.profiles as student
      on student.id = membership.student_profile_id
     and student.role = 'student'
     and student.deleted_at is null
    where membership.organization_id = target_organization_id
      and membership.student_profile_id = crm.current_profile_id()
      and membership.status = 'active'
  );
$$;
revoke all on function crm.is_organization_student(uuid) from public;
grant execute on function crm.is_organization_student(uuid)
  to authenticated, service_role;

create or replace function crm.can_access_organization(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from crm.organizations as organization
    where organization.id = target_organization_id
      and (
        crm.is_current_admin()
        or (
          organization.status = 'active'
          and (
            (
              crm.current_profile_role() = 'advisor'
              and crm.is_organization_advisor(organization.id)
            )
            or (
              crm.current_profile_role() = 'student'
              and crm.is_organization_student(organization.id)
            )
          )
        )
      )
  );
$$;
revoke all on function crm.can_access_organization(uuid) from public;
grant execute on function crm.can_access_organization(uuid)
  to authenticated, service_role;

create or replace function crm.validate_organization_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_role text;
  target_profile_id uuid;
begin
  if tg_table_name = 'organization_advisors' then
    expected_role := 'advisor';
    target_profile_id := new.advisor_profile_id;

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
  else
    expected_role := 'student';
    target_profile_id := new.student_profile_id;

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
  end if;

  if (
    tg_op = 'INSERT'
    or (
      tg_table_name = 'organization_advisors'
      and new.ends_at is null
    )
    or (
      tg_table_name = 'organization_students'
      and new.status = 'active'
    )
  )
  and not exists (
      select 1
      from crm.organizations as organization
      where organization.id = new.organization_id
        and organization.status = 'active'
    )
  then
    raise exception 'Organization memberships require an active organization.';
  end if;

  if (
    tg_op = 'INSERT'
    or (
      tg_table_name = 'organization_advisors'
      and new.ends_at is null
    )
    or (
      tg_table_name = 'organization_students'
      and new.status = 'active'
    )
  )
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

create or replace function crm.prevent_organization_record_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Organization records and memberships preserve history and cannot be deleted.';
end;
$$;
revoke all on function crm.prevent_organization_record_delete() from public;

create or replace function crm.capture_organization_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_name text;
  aggregate_name text;
  aggregate_id uuid := new.id;
  student_id uuid;
  prior jsonb;
  current_values jsonb;
begin
  if tg_table_name = 'organizations' then
    aggregate_name := 'organization';
    event_name := case
      when tg_op = 'INSERT' then 'organization.created'
      when new.status = 'archived' and old.status = 'active'
        then 'organization.archived'
      when new.status = 'active' and old.status = 'archived'
        then 'organization.reactivated'
      else 'organization.updated'
    end;
    prior := case when tg_op = 'UPDATE' then
      jsonb_build_object(
        'name', old.name,
        'organization_type', old.organization_type,
        'status', old.status
      )
    else null end;
    current_values := jsonb_build_object(
      'name', new.name,
      'organization_type', new.organization_type,
      'status', new.status
    );
  elsif tg_table_name = 'organization_advisors' then
    aggregate_name := 'organization_advisor';
    event_name := case
      when tg_op = 'INSERT' then 'organization.advisor_assigned'
      when new.ends_at is not null and old.ends_at is null
        then 'organization.advisor_ended'
      else 'organization.advisor_updated'
    end;
    prior := case when tg_op = 'UPDATE' then
      jsonb_build_object(
        'organization_id', old.organization_id,
        'advisor_profile_id', old.advisor_profile_id,
        'assignment_role', old.assignment_role,
        'ends_at', old.ends_at
      )
    else null end;
    current_values := jsonb_build_object(
      'organization_id', new.organization_id,
      'advisor_profile_id', new.advisor_profile_id,
      'assignment_role', new.assignment_role,
      'ends_at', new.ends_at
    );
  else
    aggregate_name := 'organization_student';
    student_id := new.student_profile_id;
    event_name := case
      when tg_op = 'INSERT' then 'organization.student_associated'
      when new.status = 'ended' and old.status = 'active'
        then 'organization.student_ended'
      else 'organization.student_updated'
    end;
    prior := case when tg_op = 'UPDATE' then
      jsonb_build_object(
        'organization_id', old.organization_id,
        'student_profile_id', old.student_profile_id,
        'membership_type', old.membership_type,
        'status', old.status,
        'is_primary', old.is_primary
      )
    else null end;
    current_values := jsonb_build_object(
      'organization_id', new.organization_id,
      'student_profile_id', new.student_profile_id,
      'membership_type', new.membership_type,
      'status', new.status,
      'is_primary', new.is_primary
    );
  end if;

  perform crm.emit_domain_event(
    event_name,
    aggregate_name,
    aggregate_id,
    student_id,
    jsonb_strip_nulls(jsonb_build_object(
      'previous', prior,
      'new', current_values
    ))
  );
  return new;
end;
$$;
revoke all on function crm.capture_organization_domain_event() from public;

create trigger organizations_set_updated_at
before update on crm.organizations
for each row execute function crm.set_updated_at();
create trigger organization_advisors_set_updated_at
before update on crm.organization_advisors
for each row execute function crm.set_updated_at();
create trigger organization_students_set_updated_at
before update on crm.organization_students
for each row execute function crm.set_updated_at();

create trigger organization_advisors_validate
before insert or update on crm.organization_advisors
for each row execute function crm.validate_organization_membership();
create trigger organization_students_validate
before insert or update on crm.organization_students
for each row execute function crm.validate_organization_membership();

create trigger organizations_prevent_delete
before delete on crm.organizations
for each row execute function crm.prevent_organization_record_delete();
create trigger organization_advisors_prevent_delete
before delete on crm.organization_advisors
for each row execute function crm.prevent_organization_record_delete();
create trigger organization_students_prevent_delete
before delete on crm.organization_students
for each row execute function crm.prevent_organization_record_delete();

create trigger organizations_emit_domain_event
after insert or update on crm.organizations
for each row execute function crm.capture_organization_domain_event();
create trigger organization_advisors_emit_domain_event
after insert or update on crm.organization_advisors
for each row execute function crm.capture_organization_domain_event();
create trigger organization_students_emit_domain_event
after insert or update on crm.organization_students
for each row execute function crm.capture_organization_domain_event();

alter table crm.organizations enable row level security;
alter table crm.organizations force row level security;
alter table crm.organization_advisors enable row level security;
alter table crm.organization_advisors force row level security;
alter table crm.organization_students enable row level security;
alter table crm.organization_students force row level security;

grant usage on schema crm to service_role;
grant select on crm.organizations, crm.organization_advisors,
  crm.organization_students to authenticated;
grant select, insert, update on crm.organizations, crm.organization_advisors,
  crm.organization_students to service_role;

create policy "organizations_select_authorized"
on crm.organizations for select to authenticated
using (crm.can_access_organization(id));

create policy "organization_advisors_select_authorized"
on crm.organization_advisors for select to authenticated
using (
  crm.is_current_admin()
  or advisor_profile_id = crm.current_profile_id()
);

create policy "organization_students_select_authorized"
on crm.organization_students for select to authenticated
using (
  crm.is_current_admin()
  or student_profile_id = crm.current_profile_id()
  or (
    status = 'active'
    and crm.is_organization_advisor(organization_id)
    and crm.can_access_student(student_profile_id)
  )
);

commit;
