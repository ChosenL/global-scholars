begin;

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
  'cleanup-regression'::text as run_id,
  'e2e-preview-cleanup-regression'::text as prefix,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:advisor-1') as advisor_one_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:advisor-2') as advisor_two_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:organization-student') as organization_student_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:application-student') as application_student_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:country') as country_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:university') as university_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:campus') as campus_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:program') as program_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:intake') as intake_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:organization') as organization_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:application') as application_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:application-conversation') as application_conversation_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:application-conversation:advisor-1') as advisor_one_participant_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:application-conversation:advisor-2') as advisor_two_participant_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:application-conversation:student') as application_student_participant_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:unrelated-profile') as unrelated_profile_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:unrelated-advisor') as unrelated_advisor_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:unrelated-conversation') as unrelated_conversation_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:unrelated-participant') as unrelated_participant_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:unrelated-organization') as unrelated_organization_id,
  pg_temp.preview_e2e_uuid('e2e-preview-cleanup-regression:remaining-university') as remaining_university_id;

insert into crm.profiles (id, clerk_user_id, display_name, role)
select fixture.advisor_one_id, fixture.prefix || '-advisor-1', 'Cleanup Advisor One', 'advisor'
from preview_e2e_context as fixture
union all
select fixture.advisor_two_id, fixture.prefix || '-advisor-2', 'Cleanup Advisor Two', 'advisor'
from preview_e2e_context as fixture
union all
select fixture.organization_student_id, fixture.prefix || '-organization-student', 'Cleanup Organization Student', 'student'
from preview_e2e_context as fixture
union all
select fixture.application_student_id, fixture.prefix || '-application-student', 'Cleanup Application Student', 'student'
from preview_e2e_context as fixture
union all
select fixture.unrelated_profile_id, 'cleanup-regression-unrelated', 'Cleanup Unrelated Admin', 'admin'
from preview_e2e_context as fixture
union all
select fixture.unrelated_advisor_id, 'cleanup-regression-unrelated-advisor', 'Cleanup Unrelated Advisor', 'advisor'
from preview_e2e_context as fixture;

insert into crm.student_profiles (profile_id)
select fixture.organization_student_id from preview_e2e_context as fixture
union all
select fixture.application_student_id from preview_e2e_context as fixture;

insert into crm.conversations (id, created_by_profile_id, subject, status)
select fixture.application_conversation_id, fixture.application_student_id,
       'Cleanup Fixture Application Authorization', 'open'
from preview_e2e_context as fixture
union all
select fixture.unrelated_conversation_id, fixture.unrelated_profile_id,
       'Cleanup Unrelated Conversation', 'open'
from preview_e2e_context as fixture;

insert into crm.conversation_participants (
  id, conversation_id, profile_id, participant_role
)
select fixture.advisor_one_participant_id, fixture.application_conversation_id,
       fixture.advisor_one_id, 'advisor'
from preview_e2e_context as fixture
union all
select fixture.advisor_two_participant_id, fixture.application_conversation_id,
       fixture.advisor_two_id, 'advisor'
from preview_e2e_context as fixture
union all
select fixture.application_student_participant_id, fixture.application_conversation_id,
       fixture.application_student_id, 'student'
from preview_e2e_context as fixture
union all
select fixture.unrelated_participant_id, fixture.unrelated_conversation_id,
       fixture.unrelated_advisor_id, 'advisor'
from preview_e2e_context as fixture;

insert into crm.countries (id, iso_code, name, default_currency)
select fixture.country_id, 'QZ', 'Cleanup Regression Country', 'USD'
from preview_e2e_context as fixture;

insert into crm.universities (id, country_id, name, slug, institution_type)
select fixture.university_id, fixture.country_id, 'Cleanup Fixture University',
       fixture.prefix || '-university', 'synthetic test institution'
from preview_e2e_context as fixture
union all
select fixture.remaining_university_id, fixture.country_id, 'Cleanup Remaining University',
       'cleanup-regression-remaining-university', 'synthetic test institution'
from preview_e2e_context as fixture;

insert into crm.campuses (id, university_id, name, city)
select fixture.campus_id, fixture.university_id, 'Cleanup Fixture Campus', 'Preview City'
from preview_e2e_context as fixture;

insert into crm.programs (id, university_id, name, program_code, credential_level)
select fixture.program_id, fixture.university_id, 'Cleanup Fixture Program',
       'CLEANUP-REGRESSION', 'bachelor'
from preview_e2e_context as fixture;

insert into crm.program_campuses (program_id, campus_id)
select fixture.program_id, fixture.campus_id
from preview_e2e_context as fixture;

insert into crm.intakes (id, program_id, campus_id, name, start_date, status)
select fixture.intake_id, fixture.program_id, fixture.campus_id,
       'Cleanup Fixture Intake', current_date + 365, 'open'
from preview_e2e_context as fixture;

insert into crm.organizations (id, name, slug, organization_type)
select fixture.organization_id, 'Cleanup Fixture Organization',
       fixture.prefix || '-organization', 'partner_school'
from preview_e2e_context as fixture
union all
select fixture.unrelated_organization_id, 'Cleanup Unrelated Organization',
       'cleanup-regression-unrelated-organization', 'partner_school'
from preview_e2e_context as fixture;

set local session_replication_role = replica;

insert into crm.organization_advisors (organization_id, advisor_profile_id)
select fixture.organization_id, fixture.advisor_one_id
from preview_e2e_context as fixture;

insert into crm.organization_students (organization_id, student_profile_id, is_primary)
select fixture.organization_id, fixture.organization_student_id, true
from preview_e2e_context as fixture;

set local session_replication_role = origin;

insert into crm.student_applications (
  id, student_profile_id, intake_id, advisor_profile_id, created_by_profile_id
)
select fixture.application_id, fixture.application_student_id, fixture.intake_id,
       fixture.advisor_two_id, fixture.unrelated_profile_id
from preview_e2e_context as fixture;

insert into crm.application_status_history (
  application_id, to_status, changed_by_profile_id
)
select fixture.application_id, 'draft', fixture.unrelated_profile_id
from preview_e2e_context as fixture;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'cleanup-regression-unrelated')::text,
  true
);

select crm.assign_application_advisor(application_id, advisor_one_id)
from preview_e2e_context;

select crm.assign_application_advisor(application_id, advisor_two_id)
from preview_e2e_context;

do $application_advisor_authorization$
declare
  fixture preview_e2e_context%rowtype;
begin
  select * into strict fixture from preview_e2e_context;

  if (
    select count(*)
    from crm.conversation_participants as participant
    where participant.conversation_id = fixture.application_conversation_id
      and participant.deleted_at is null
      and (
        (participant.profile_id in (fixture.advisor_one_id, fixture.advisor_two_id)
          and participant.participant_role = 'advisor')
        or (participant.profile_id = fixture.application_student_id
          and participant.participant_role = 'student')
      )
  ) <> 3 then
    raise exception 'Fixture conversation does not contain all three active participants.';
  end if;

  if not exists (
    select 1 from crm.student_applications
    where id = fixture.application_id
      and advisor_profile_id = fixture.advisor_two_id
  ) then
    raise exception 'Both fixture advisors were not authorized for the application student.';
  end if;

  begin
    perform crm.assign_application_advisor(
      fixture.application_id,
      fixture.unrelated_advisor_id
    );
    raise exception 'Unrelated profile was unexpectedly authorized for the application student.';
  exception when raise_exception then
    if sqlerrm <> 'Application advisor is not authorized for this student.' then
      raise;
    end if;
  end;
end
$application_advisor_authorization$;

create temporary table preview_e2e_applications on commit drop as
select application.id as application_id
from crm.student_applications as application
join preview_e2e_context as fixture
  on application.student_profile_id = fixture.application_student_id
 and application.intake_id = fixture.intake_id;

set local session_replication_role = replica;
delete from crm.application_status_history as status_history
where status_history.application_id in (
  select fixture_application.application_id
  from preview_e2e_applications as fixture_application
);
delete from crm.student_applications as application
where application.id in (
  select fixture_application.application_id
  from preview_e2e_applications as fixture_application
);
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
);
delete from crm.organization_students as membership
where membership.organization_id in (
  select organization.id
  from crm.organizations as organization
  cross join preview_e2e_context as fixture
  where organization.slug like fixture.prefix || '-%'
);
delete from crm.organizations as organization
using preview_e2e_context as fixture
where organization.slug like fixture.prefix || '-%';
set local session_replication_role = origin;
delete from crm.student_profiles as student_profile
using preview_e2e_context as fixture
where student_profile.profile_id in (
  fixture.organization_student_id,
  fixture.application_student_id
);
update crm.profiles as profile
set deleted_at = coalesce(profile.deleted_at, now()), updated_at = now()
from preview_e2e_context as fixture
where profile.id in (
  fixture.advisor_one_id,
  fixture.advisor_two_id,
  fixture.organization_student_id,
  fixture.application_student_id
)
and profile.clerk_user_id like fixture.prefix || '-%';
delete from crm.intakes as intake
using preview_e2e_context as fixture
where intake.id = fixture.intake_id;
delete from crm.program_campuses as program_campus
using preview_e2e_context as fixture
where program_campus.program_id = fixture.program_id
  and program_campus.campus_id = fixture.campus_id;
delete from crm.programs as catalog_program
using preview_e2e_context as fixture
where catalog_program.id = fixture.program_id;
delete from crm.campuses as campus
using preview_e2e_context as fixture
where campus.id = fixture.campus_id;
delete from crm.universities as university
using preview_e2e_context as fixture
where university.id = fixture.university_id;
delete from crm.countries as country
using preview_e2e_context as fixture
where country.id = fixture.country_id
and not exists (
  select 1 from crm.universities as remaining_university
  where remaining_university.country_id = country.id
);

do $cleanup_verification$
declare
  fixture preview_e2e_context%rowtype;
begin
  select * into strict fixture from preview_e2e_context;

  if exists (select 1 from crm.universities where id = fixture.university_id)
     or exists (select 1 from crm.campuses where id = fixture.campus_id)
     or exists (select 1 from crm.programs where id = fixture.program_id)
     or exists (
       select 1 from crm.program_campuses
       where program_id = fixture.program_id and campus_id = fixture.campus_id
     )
     or exists (select 1 from crm.intakes where id = fixture.intake_id)
     or exists (select 1 from crm.organizations where id = fixture.organization_id)
     or exists (
       select 1 from crm.organization_advisors
       where organization_id = fixture.organization_id
     )
     or exists (
       select 1 from crm.organization_students
       where organization_id = fixture.organization_id
     )
     or exists (
       select 1 from crm.student_applications where id = fixture.application_id
     )
     or exists (
       select 1 from crm.application_status_history
       where application_id = fixture.application_id
     )
     or exists (
       select 1 from crm.conversations
       where id = fixture.application_conversation_id
     )
     or exists (
       select 1 from crm.conversation_participants
       where conversation_id = fixture.application_conversation_id
     ) then
    raise exception 'Preview cleanup left deterministic fixture data behind.';
  end if;

  if exists (
    select 1 from crm.profiles
    where id in (
      fixture.advisor_one_id,
      fixture.advisor_two_id,
      fixture.organization_student_id,
      fixture.application_student_id
    )
    and deleted_at is null
  ) then
    raise exception 'Preview cleanup did not soft-deactivate fixture profiles.';
  end if;

  if not exists (
    select 1 from crm.profiles
    where id = fixture.unrelated_profile_id and deleted_at is null
  ) or not exists (
    select 1 from crm.organizations
    where id = fixture.unrelated_organization_id
  ) or not exists (
    select 1 from crm.conversations
    where id = fixture.unrelated_conversation_id
  ) or not exists (
    select 1 from crm.conversation_participants
    where id = fixture.unrelated_participant_id
  ) then
    raise exception 'Preview cleanup modified unrelated data.';
  end if;

  if not exists (select 1 from crm.countries where id = fixture.country_id) then
    raise exception 'Preview cleanup removed a country that is still referenced.';
  end if;
end
$cleanup_verification$;

delete from crm.universities as university
using preview_e2e_context as fixture
where university.id = fixture.remaining_university_id;
delete from crm.countries as country
using preview_e2e_context as fixture
where country.id = fixture.country_id
and not exists (
  select 1 from crm.universities as remaining_university
  where remaining_university.country_id = country.id
);

do $country_verification$
begin
  if exists (
    select 1
    from crm.countries as country
    join preview_e2e_context as fixture on fixture.country_id = country.id
  ) then
    raise exception 'Preview cleanup left the unused synthetic country behind.';
  end if;
end
$country_verification$;

rollback;
