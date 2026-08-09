\set ON_ERROR_STOP on

-- PREVIEW ONLY. Run manually with psql -v run_id=<unique-run-id>.
-- Never execute this file against Staging or Production.

begin;

create temporary table preview_e2e_context on commit drop as
select
  lower(:'run_id') as run_id,
  'e2e-preview-' || lower(:'run_id') as prefix;

do $guard$
declare
  fixture_run_id text := (select run_id from preview_e2e_context);
begin
  if fixture_run_id !~ '^[a-z0-9][a-z0-9-]{0,39}$' then
    raise exception 'run_id must match ^[a-z0-9][a-z0-9-]{0,39}$';
  end if;
end
$guard$;

create function pg_temp.preview_e2e_uuid(source text)
returns uuid
language sql
immutable
strict
as $function$
  select (
    substr(hash, 1, 12) || '5' || substr(hash, 14, 3) ||
    'a' || substr(hash, 18, 15)
  )::uuid
  from (select md5(source) as hash) digest;
$function$;

alter table preview_e2e_context
  add column advisor_one_id uuid,
  add column advisor_two_id uuid,
  add column organization_student_id uuid,
  add column application_student_id uuid,
  add column country_id uuid,
  add column university_id uuid,
  add column campus_id uuid,
  add column program_id uuid,
  add column intake_id uuid,
  add column application_conversation_id uuid,
  add column advisor_one_participant_id uuid,
  add column advisor_two_participant_id uuid,
  add column application_student_participant_id uuid;

update preview_e2e_context
set
  advisor_one_id = pg_temp.preview_e2e_uuid(prefix || ':advisor-1'),
  advisor_two_id = pg_temp.preview_e2e_uuid(prefix || ':advisor-2'),
  organization_student_id = pg_temp.preview_e2e_uuid(prefix || ':organization-student'),
  application_student_id = pg_temp.preview_e2e_uuid(prefix || ':application-student'),
  country_id = pg_temp.preview_e2e_uuid('e2e-preview:country:xz'),
  university_id = pg_temp.preview_e2e_uuid(prefix || ':university'),
  campus_id = pg_temp.preview_e2e_uuid(prefix || ':campus'),
  program_id = pg_temp.preview_e2e_uuid(prefix || ':program'),
  intake_id = pg_temp.preview_e2e_uuid(prefix || ':intake'),
  application_conversation_id = pg_temp.preview_e2e_uuid(prefix || ':application-conversation'),
  advisor_one_participant_id = pg_temp.preview_e2e_uuid(prefix || ':application-conversation:advisor-1'),
  advisor_two_participant_id = pg_temp.preview_e2e_uuid(prefix || ':application-conversation:advisor-2'),
  application_student_participant_id = pg_temp.preview_e2e_uuid(prefix || ':application-conversation:student');

do $country_guard$
declare
  expected_id uuid := (select country_id from preview_e2e_context);
begin
  if exists (
    select 1 from crm.countries where iso_code = 'XZ' and id <> expected_id
  ) then
    raise exception 'Reserved synthetic country code XZ is already in use';
  end if;
end
$country_guard$;

insert into crm.profiles (id, clerk_user_id, email, display_name, role, deleted_at)
select advisor_one_id, prefix || '-advisor-1', prefix || '-advisor-1@example.invalid',
       prefix || ' Advisor One', 'advisor', null::timestamptz
from preview_e2e_context
union all
select advisor_two_id, prefix || '-advisor-2', prefix || '-advisor-2@example.invalid',
       prefix || ' Advisor Two', 'advisor', null::timestamptz
from preview_e2e_context
union all
select organization_student_id, prefix || '-organization-student',
       prefix || '-organization-student@example.invalid',
       prefix || ' Organization Student', 'student', null::timestamptz
from preview_e2e_context
union all
select application_student_id, prefix || '-application-student',
       prefix || '-application-student@example.invalid',
       prefix || ' Application Student', 'student', null::timestamptz
from preview_e2e_context
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  deleted_at = null,
  updated_at = now();

insert into crm.conversations (
  id, created_by_profile_id, subject, status, resolved_at, deleted_at
)
select application_conversation_id, application_student_id,
       prefix || ' Application Authorization', 'open', null, null
from preview_e2e_context
on conflict (id) do update set
  subject = excluded.subject,
  status = 'open',
  resolved_at = null,
  deleted_at = null,
  updated_at = now();

insert into crm.conversation_participants (
  id, conversation_id, profile_id, participant_role
)
select advisor_one_participant_id, application_conversation_id,
       advisor_one_id, 'advisor'
from preview_e2e_context
union all
select advisor_two_participant_id, application_conversation_id,
       advisor_two_id, 'advisor'
from preview_e2e_context
union all
select application_student_participant_id, application_conversation_id,
       application_student_id, 'student'
from preview_e2e_context
union all
select pg_temp.preview_e2e_uuid(fixture.prefix || ':application-conversation:admin'),
       fixture.application_conversation_id, profile.id, 'admin'
from preview_e2e_context as fixture
join crm.profiles as profile on lower(profile.email) = lower(:'admin_email')
  and profile.role = 'admin' and profile.deleted_at is null
on conflict (conversation_id, profile_id) do update set
  participant_role = excluded.participant_role,
  deleted_at = null,
  updated_at = now();

insert into crm.student_profiles (
  profile_id, preferred_destination_country, preferred_degree,
  preferred_program, deleted_at
)
select organization_student_id, null, null, null, null::timestamptz
from preview_e2e_context
union all
select application_student_id, 'US', 'bachelor', 'Computer Science', null::timestamptz
from preview_e2e_context
on conflict (profile_id) do update set
  preferred_destination_country = excluded.preferred_destination_country,
  preferred_degree = excluded.preferred_degree,
  preferred_program = excluded.preferred_program,
  deleted_at = null,
  updated_at = now();

insert into crm.countries (id, iso_code, name, default_currency, is_active)
select country_id, 'XZ', 'E2E Preview Synthetic Country', 'USD', true
from preview_e2e_context
on conflict (id) do update set is_active = true, updated_at = now();

insert into crm.universities (
  id, country_id, name, slug, institution_type, catalog_classification,
  degree_granting, accepts_direct_applications, search_eligible, is_active
)
select university_id, country_id, prefix || ' University', prefix || '-university',
       'synthetic test institution', 'degree_granting_institution',
       true, true, true, true
from preview_e2e_context
on conflict (id) do update set
  catalog_classification = excluded.catalog_classification,
  degree_granting = excluded.degree_granting,
  accepts_direct_applications = excluded.accepts_direct_applications,
  search_eligible = excluded.search_eligible,
  is_active = true,
  updated_at = now();

insert into crm.campuses (id, university_id, name, city, region, is_primary, is_active)
select campus_id, university_id, prefix || ' Campus', 'Preview City',
       'Preview Region', true, true
from preview_e2e_context
on conflict (id) do update set is_active = true, updated_at = now();

insert into crm.programs (
  id, university_id, name, program_code, credential_level, duration_months, is_active
)
select program_id, university_id, prefix || ' Program', left('E2E-' || run_id, 50),
       'bachelor', 36, true
from preview_e2e_context
on conflict (id) do update set is_active = true, updated_at = now();

insert into crm.program_campuses (program_id, campus_id)
select program_id, campus_id from preview_e2e_context
on conflict (program_id, campus_id) do nothing;

insert into crm.intakes (
  id, program_id, campus_id, name, start_date, application_deadline,
  international_deadline, capacity, status
)
select intake_id, program_id, campus_id, prefix || ' Intake',
       current_date + 365, current_date + 300, current_date + 270, 25, 'open'
from preview_e2e_context
on conflict (id) do update set
  status = 'open',
  start_date = excluded.start_date,
  application_deadline = excluded.application_deadline,
  international_deadline = excluded.international_deadline,
  updated_at = now();

do $application_guard$
begin
  if exists (
    select 1
    from crm.student_applications application
    join preview_e2e_context fixture
      on application.student_profile_id = fixture.application_student_id
     and application.intake_id = fixture.intake_id
    where application.deleted_at is null
  ) then
    raise exception 'Application student/intake pair already has an active application';
  end if;
end
$application_guard$;

select
  run_id,
  advisor_one_id as e2e_advisor_profile_id,
  advisor_two_id as e2e_second_advisor_profile_id,
  organization_student_id as e2e_student_profile_id,
  application_student_id as e2e_application_student_profile_id,
  intake_id as e2e_application_intake_id
from preview_e2e_context;

commit;
