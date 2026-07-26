begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

select has_table('crm', 'visa_cases');
select has_table('crm', 'visa_stage_history');
select has_table('crm', 'visa_documents');
select has_table('crm', 'visa_checklists');
select has_table('crm', 'visa_interviews');
select has_table('crm', 'visa_decisions');
select has_table('crm', 'passports');
select has_table('crm', 'travel_plans');
select has_table('crm', 'embassies');
select has_function('crm', 'can_access_visa_case', array['uuid']);
select has_function('crm', 'create_visa_case',
  array['uuid','uuid','text','uuid','uuid','uuid','date','jsonb']);
select has_function('crm', 'update_visa_stage', array['uuid','text','text']);
select has_function('crm', 'upload_visa_document', array['uuid','uuid','text','uuid']);
select has_function('crm', 'calculate_visa_readiness', array['uuid']);
select is(
  (select relforcerowsecurity from pg_class
    where oid = 'crm.visa_cases'::regclass),
  true,
  'visa cases force RLS'
);

select * from finish();
rollback;
