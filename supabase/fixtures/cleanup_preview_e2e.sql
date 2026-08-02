\set ON_ERROR_STOP on

-- PREVIEW ONLY. The run_id must be the same value used for provisioning.
-- Cleanup is limited to deterministic IDs and the e2e-preview run prefix.

begin;

create temporary table preview_e2e_seed on commit drop as
select
  lower(:'run_id') as run_id,
  'e2e-preview-' || lower(:'run_id') as prefix;

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

create temporary table preview_e2e_context on commit drop as
select
  seed.run_id,
  seed.prefix,
  pg_temp.preview_e2e_uuid(seed.prefix || ':advisor-1') as advisor_one_id,
  pg_temp.preview_e2e_uuid(seed.prefix || ':advisor-2') as advisor_two_id,
  pg_temp.preview_e2e_uuid(seed.prefix || ':organization-student') as organization_student_id,
  pg_temp.preview_e2e_uuid(seed.prefix || ':application-student') as application_student_id,
  pg_temp.preview_e2e_uuid('e2e-preview:country:xz') as country_id,
  pg_temp.preview_e2e_uuid(seed.prefix || ':university') as university_id,
  pg_temp.preview_e2e_uuid(seed.prefix || ':campus') as campus_id,
  pg_temp.preview_e2e_uuid(seed.prefix || ':program') as program_id,
  pg_temp.preview_e2e_uuid(seed.prefix || ':intake') as intake_id,
  pg_temp.preview_e2e_uuid(seed.prefix || ':application-conversation') as application_conversation_id,
  md5(seed.prefix || ':advisor-1')::uuid as legacy_advisor_one_id,
  md5(seed.prefix || ':advisor-2')::uuid as legacy_advisor_two_id,
  md5(seed.prefix || ':organization-student')::uuid as legacy_organization_student_id,
  md5(seed.prefix || ':application-student')::uuid as legacy_application_student_id,
  md5('e2e-preview:country:xz')::uuid as legacy_country_id,
  md5(seed.prefix || ':university')::uuid as legacy_university_id,
  md5(seed.prefix || ':campus')::uuid as legacy_campus_id,
  md5(seed.prefix || ':program')::uuid as legacy_program_id,
  md5(seed.prefix || ':intake')::uuid as legacy_intake_id
from preview_e2e_seed as seed;

do $guard$
declare
  fixture_run_id text := (
    select fixture.run_id from preview_e2e_context as fixture
  );
begin
  if fixture_run_id !~ '^[a-z0-9][a-z0-9-]{0,39}$' then
    raise exception 'run_id must match ^[a-z0-9][a-z0-9-]{0,39}$';
  end if;
end
$guard$;

create temporary table preview_e2e_applications on commit drop as
select application.id as application_id
from crm.student_applications as application
join preview_e2e_context as fixture
  on application.student_profile_id in (
       fixture.application_student_id,
       fixture.legacy_application_student_id
     )
 and application.intake_id in (fixture.intake_id, fixture.legacy_intake_id);

delete from crm.student_tasks as task
where task.application_id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
delete from crm.visa_cases as visa_case
where visa_case.application_id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
delete from crm.application_scholarships as scholarship
where scholarship.application_id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
delete from crm.application_notes as note
where note.application_id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
delete from crm.application_document_requirements as requirement
where requirement.application_id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
delete from crm.application_waitlists as waitlist
where waitlist.application_id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
delete from crm.application_deferrals as deferral
where deferral.application_id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
delete from crm.application_deposits as deposit
where deposit.application_id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
delete from crm.application_decisions as decision
where decision.application_id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
set local session_replication_role = replica;
delete from crm.application_status_history as status_history
where status_history.application_id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
delete from crm.student_applications as application
where application.id in (select fixture_application.application_id from preview_e2e_applications as fixture_application);
set local session_replication_role = origin;

delete from crm.attachments as attachment
where attachment.message_id in (
  select message.id
  from crm.messages as message
  join preview_e2e_context as fixture
    on message.conversation_id = fixture.application_conversation_id
);
delete from crm.messages as message
using preview_e2e_context as fixture
where message.conversation_id = fixture.application_conversation_id;
delete from crm.conversation_participants as participant
using preview_e2e_context as fixture
where participant.conversation_id = fixture.application_conversation_id;
delete from crm.conversations as conversation
using preview_e2e_context as fixture
where conversation.id = fixture.application_conversation_id;

set local session_replication_role = replica;
delete from crm.organization_advisors as assignment
where assignment.organization_id in (
  select organization.id
  from crm.organizations as organization
  cross join preview_e2e_context as fixture
  where organization.slug like fixture.prefix || '-%'
     or organization.slug ~ (
       '^e2e-partner-' || fixture.run_id || '-[0-9]+$'
     )
);
delete from crm.organization_students as membership
where membership.organization_id in (
  select organization.id
  from crm.organizations as organization
  cross join preview_e2e_context as fixture
  where organization.slug like fixture.prefix || '-%'
     or organization.slug ~ (
       '^e2e-partner-' || fixture.run_id || '-[0-9]+$'
     )
);
delete from crm.organizations as organization
using preview_e2e_context as fixture
where organization.slug like fixture.prefix || '-%'
   or organization.slug ~ (
     '^e2e-partner-' || fixture.run_id || '-[0-9]+$'
   );
set local session_replication_role = origin;

delete from crm.student_profiles as student_profile
using preview_e2e_context as fixture
where student_profile.profile_id in (
  fixture.organization_student_id,
  fixture.application_student_id,
  fixture.legacy_organization_student_id,
  fixture.legacy_application_student_id
);

update crm.profiles as profile
set deleted_at = coalesce(profile.deleted_at, now()), updated_at = now()
from preview_e2e_context as fixture
where profile.id in (
  fixture.advisor_one_id,
  fixture.advisor_two_id,
  fixture.organization_student_id,
  fixture.application_student_id,
  fixture.legacy_advisor_one_id,
  fixture.legacy_advisor_two_id,
  fixture.legacy_organization_student_id,
  fixture.legacy_application_student_id
)
and profile.clerk_user_id like fixture.prefix || '-%';

delete from crm.intakes as intake
using preview_e2e_context as fixture
where intake.id in (fixture.intake_id, fixture.legacy_intake_id);
delete from crm.program_campuses as program_campus
using preview_e2e_context as fixture
where program_campus.program_id in (
    fixture.program_id,
    fixture.legacy_program_id
  )
  and program_campus.campus_id in (
    fixture.campus_id,
    fixture.legacy_campus_id
  );
delete from crm.programs as catalog_program
using preview_e2e_context as fixture
where catalog_program.id in (fixture.program_id, fixture.legacy_program_id);
delete from crm.campuses as campus
using preview_e2e_context as fixture
where campus.id in (fixture.campus_id, fixture.legacy_campus_id);
delete from crm.universities as university
using preview_e2e_context as fixture
where university.id in (fixture.university_id, fixture.legacy_university_id);
delete from crm.countries as country
using preview_e2e_context as fixture
where country.id in (fixture.country_id, fixture.legacy_country_id)
and not exists (
  select 1
  from crm.universities as remaining_university
  where remaining_university.country_id = country.id
);

commit;
