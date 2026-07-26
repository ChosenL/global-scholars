begin;
select plan(12);

select has_table('crm', 'ai_invocations', 'AI invocation table exists');
select has_column('crm', 'ai_invocations', 'requester_profile_id', 'Invocation uses CRM requester UUID');
select has_column('crm', 'ai_invocations', 'student_profile_id', 'Invocation uses CRM student UUID');
select has_column('crm', 'ai_invocations', 'citations', 'Validated citations are recorded');
select has_function('crm', 'begin_ai_invocation', array['uuid', 'text', 'text', 'jsonb'], 'Begin RPC exists');
select has_function('crm', 'complete_ai_invocation', array['uuid', 'text', 'jsonb', 'jsonb', 'integer', 'text'], 'Completion RPC exists');
select has_function('crm', 'calculate_ai_analytics', array['timestamp with time zone', 'timestamp with time zone'], 'Event analytics RPC exists');
select row_security_active('crm.ai_invocations'::regclass, 'AI invocation RLS is active');
select is((select relforcerowsecurity from pg_class where oid = 'crm.ai_invocations'::regclass), true, 'AI invocation RLS is forced');
select function_privs_are('crm', 'begin_ai_invocation', array['uuid', 'text', 'text', 'jsonb'], 'authenticated', array['EXECUTE'], 'Authenticated users can begin authorized invocations');
select function_privs_are('crm', 'complete_ai_invocation', array['uuid', 'text', 'jsonb', 'jsonb', 'integer', 'text'], 'authenticated', array['EXECUTE'], 'Authenticated users can complete their invocation');
select table_privs_are('crm', 'ai_invocations', 'authenticated', array['SELECT'], 'Direct writes are denied');

select * from finish();
rollback;
