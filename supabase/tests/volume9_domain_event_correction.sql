begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select lives_ok(
  $$select crm.emit_domain_event(
    'profile.identity_updated',
    'student_profile',
    md5('volume9:direct-event')::uuid,
    null,
    jsonb_build_object('source', 'volume9')
  )$$,
  'emit_domain_event executes outside trigger context'
);

select lives_ok(
  $$insert into crm.profiles (
    id, clerk_user_id, email, display_name, role, deleted_at
  )
  select md5('volume9:advisor-1')::uuid, 'e2e-preview-volume9-advisor-1',
         'e2e-preview-volume9-advisor-1@example.invalid',
         'E2E Preview Volume9 Advisor One', 'advisor', null::timestamptz
  union all
  select md5('volume9:advisor-2')::uuid, 'e2e-preview-volume9-advisor-2',
         'e2e-preview-volume9-advisor-2@example.invalid',
         'E2E Preview Volume9 Advisor Two', 'advisor', null::timestamptz
  union all
  select md5('volume9:organization-student')::uuid,
         'e2e-preview-volume9-organization-student',
         'e2e-preview-volume9-organization-student@example.invalid',
         'E2E Preview Volume9 Organization Student', 'student', null::timestamptz
  union all
  select md5('volume9:application-student')::uuid,
         'e2e-preview-volume9-application-student',
         'e2e-preview-volume9-application-student@example.invalid',
         'E2E Preview Volume9 Application Student', 'student', null::timestamptz
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    role = excluded.role,
    deleted_at = null,
    updated_at = now()$$,
  'Preview profile UPSERT executes with a typed deleted_at union'
);

select is(
  (select count(*) from crm.profiles
   where clerk_user_id like 'e2e-preview-volume9-%'),
  4::bigint,
  'Preview profile UPSERT creates all four synthetic profiles'
);

select is(
  (select count(*) from crm.domain_events
   where aggregate_id = md5('volume9:advisor-1')::uuid
     and event_type = 'profile.identity_created'),
  1::bigint,
  'Profile creation emits exactly one domain event'
);

select lives_ok(
  $$insert into crm.student_profiles (profile_id, deleted_at)
    select md5('volume9:organization-student')::uuid, null::timestamptz
    union all
    select md5('volume9:application-student')::uuid, null::timestamptz
    on conflict (profile_id) do update set
      deleted_at = null,
      updated_at = now()$$,
  'Preview student-profile UPSERT executes with a typed deleted_at union'
);

select is(
  (select count(*) from crm.student_profiles
   where profile_id in (
     md5('volume9:organization-student')::uuid,
     md5('volume9:application-student')::uuid
   )),
  2::bigint,
  'Preview student-profile UPSERT creates both synthetic extensions'
);

select is(
  (select count(*) from crm.domain_events
   where aggregate_id = md5('volume9:organization-student')::uuid
     and event_type = 'student_profile.created'),
  1::bigint,
  'Student-profile creation emits exactly one domain event'
);

select throws_ok(
  $$update crm.audit_log
    set action = action
    where domain_event_id = (
      select id from crm.domain_events
      where aggregate_id = md5('volume9:advisor-1')::uuid
        and event_type = 'profile.identity_created'
    )$$,
  'P0001',
  'Audit log records are immutable.',
  'Audit log immutability remains enforced'
);

do $verification$
declare
  audit_blocked boolean := false;
begin
  perform crm.emit_domain_event(
    'profile.identity_updated',
    'student_profile',
    md5('volume9:verification-direct-event')::uuid,
    null,
    jsonb_build_object('source', 'volume9-verification')
  );

  if (select count(*) from crm.profiles
      where clerk_user_id like 'e2e-preview-volume9-%') <> 4 then
    raise exception 'Preview profile UPSERT regression failed.';
  end if;

  if (select count(*) from crm.domain_events
      where aggregate_id = md5('volume9:advisor-1')::uuid
        and event_type = 'profile.identity_created') <> 1 then
    raise exception 'Profile domain-event count regression failed.';
  end if;

  if (select count(*) from crm.domain_events
      where aggregate_id = md5('volume9:organization-student')::uuid
        and event_type = 'student_profile.created') <> 1 then
    raise exception 'Student-profile domain-event count regression failed.';
  end if;

  if (select count(*) from crm.student_profiles
      where profile_id in (
        md5('volume9:organization-student')::uuid,
        md5('volume9:application-student')::uuid
      )) <> 2 then
    raise exception 'Preview student-profile UPSERT regression failed.';
  end if;

  begin
    update crm.audit_log
    set action = action
    where domain_event_id = (
      select id from crm.domain_events
      where aggregate_id = md5('volume9:advisor-1')::uuid
        and event_type = 'profile.identity_created'
    );
  exception
    when sqlstate 'P0001' then
      if sqlerrm = 'Audit log records are immutable.' then
        audit_blocked := true;
      else
        raise;
      end if;
  end;

  if not audit_blocked then
    raise exception 'Audit log immutability regression failed.';
  end if;
end
$verification$;

select * from finish();
rollback;

do $rollback_verification$
begin
  if exists (
    select 1 from crm.profiles
    where id in (
      md5('volume9:advisor-1')::uuid,
      md5('volume9:advisor-2')::uuid,
      md5('volume9:organization-student')::uuid,
      md5('volume9:application-student')::uuid
    )
  ) then
    raise exception 'Fixture rollback left profile rows behind.';
  end if;

  if exists (
    select 1 from crm.student_profiles
    where profile_id in (
      md5('volume9:organization-student')::uuid,
      md5('volume9:application-student')::uuid
    )
  ) then
    raise exception 'Fixture rollback left student-profile rows behind.';
  end if;

  if exists (
    select 1 from crm.domain_events
    where aggregate_id in (
      md5('volume9:direct-event')::uuid,
      md5('volume9:verification-direct-event')::uuid,
      md5('volume9:advisor-1')::uuid,
      md5('volume9:advisor-2')::uuid,
      md5('volume9:organization-student')::uuid,
      md5('volume9:application-student')::uuid
    )
  ) then
    raise exception 'Fixture rollback left domain-event rows behind.';
  end if;
end
$rollback_verification$;
