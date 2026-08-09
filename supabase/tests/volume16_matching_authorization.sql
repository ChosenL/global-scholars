begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into crm.profiles (id, clerk_user_id, display_name, role) values
  ('a1000000-0000-4000-8000-000000000001', 'h2-advisor-authorized', 'H2 Authorized Advisor', 'advisor'),
  ('a1000000-0000-4000-8000-000000000002', 'h2-advisor-isolated', 'H2 Isolated Advisor', 'advisor'),
  ('a1000000-0000-4000-8000-000000000003', 'h2-admin', 'H2 Administrator', 'admin'),
  ('a1000000-0000-4000-8000-000000000004', 'h2-student-authorized', 'H2 Authorized Student', 'student'),
  ('a1000000-0000-4000-8000-000000000005', 'h2-student-isolated', 'H2 Isolated Student', 'student');

insert into crm.student_profiles (profile_id, preferred_destination_country, preferred_degree, preferred_program)
values
  ('a1000000-0000-4000-8000-000000000004', 'US', 'bachelor', 'Computer Science'),
  ('a1000000-0000-4000-8000-000000000005', 'US', 'bachelor', 'Business Administration');

insert into crm.conversations (id, created_by_profile_id, subject)
values ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'H2 authorization fixture');

insert into crm.conversation_participants (conversation_id, profile_id, participant_role) values
  ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'advisor'),
  ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000004', 'student');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"h2-advisor-authorized"}', true);
select ok(crm.can_access_student('a1000000-0000-4000-8000-000000000004'), 'authorized advisor can access assigned student');
select is((select count(*) from crm.student_profiles where profile_id = 'a1000000-0000-4000-8000-000000000004'), 1::bigint, 'RLS returns authorized student');
select ok(not crm.can_access_student('a1000000-0000-4000-8000-000000000005'), 'advisor cannot access isolated student');
select is((select count(*) from crm.student_profiles where profile_id = 'a1000000-0000-4000-8000-000000000005'), 0::bigint, 'organization-isolated student is hidden by RLS');

select set_config('request.jwt.claims', '{"sub":"h2-advisor-isolated"}', true);
select is((select count(*) from crm.student_profiles where profile_id = 'a1000000-0000-4000-8000-000000000004'), 0::bigint, 'inaccessible student existence is not disclosed');
select ok(not crm.can_access_student('a1000000-0000-4000-8000-999999999999'), 'missing student returns the same inaccessible result');
select is((select count(*) from crm.student_profiles where profile_id = 'a1000000-0000-4000-8000-999999999999'), 0::bigint, 'missing student query returns no row');

select set_config('request.jwt.claims', '{"sub":"h2-admin"}', true);
select ok(crm.can_access_student('a1000000-0000-4000-8000-000000000005'), 'administrator retains established access');
select is((select count(*) from crm.student_profiles where profile_id = 'a1000000-0000-4000-8000-000000000005'), 1::bigint, 'administrator can read active student profile');

select set_config('request.jwt.claims', '{"sub":"h2-advisor-authorized"}', true);
select is((select count(*) from crm.student_profiles), 1::bigint, 'direct table access cannot bypass crm.can_access_student RLS');

select * from finish();
rollback;
