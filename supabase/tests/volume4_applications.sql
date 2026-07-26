begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

select has_table('crm', 'countries');
select has_table('crm', 'universities');
select has_table('crm', 'campuses');
select has_table('crm', 'programs');
select has_table('crm', 'intakes');
select has_table('crm', 'student_applications');
select has_table('crm', 'application_status_history');
select has_table('crm', 'application_decisions');
select has_table('crm', 'application_deposits');
select has_table('crm', 'application_document_requirements');
select has_function('crm', 'can_access_application', array['uuid']);
select has_function('crm', 'create_student_application', array['uuid', 'uuid', 'uuid']);
select has_function('crm', 'update_application_status', array['uuid', 'text', 'text']);
select has_function('crm', 'submit_student_application', array['uuid']);
select is(
  (select relforcerowsecurity from pg_class
    where oid = 'crm.student_applications'::regclass),
  true,
  'student applications force RLS'
);

select * from finish();
rollback;
