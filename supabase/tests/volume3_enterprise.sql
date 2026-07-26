begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select has_table('crm', 'workflow_definitions');
select has_table('crm', 'workflow_runs');
select has_table('crm', 'scheduled_work');
select has_table('crm', 'audit_log');
select has_table('crm', 'analytics_snapshots');
select has_function('crm', 'process_workflow_run', array['uuid']);
select has_function('crm', 'global_search', array['text', 'integer', 'integer']);
select has_function(
  'crm',
  'calculate_platform_analytics',
  array['timestamp with time zone', 'timestamp with time zone']
);
select is(
  (select relforcerowsecurity from pg_class
    where oid = 'crm.audit_log'::regclass),
  true,
  'audit_log forces RLS'
);
select is(
  (select relforcerowsecurity from pg_class
    where oid = 'crm.workflow_runs'::regclass),
  true,
  'workflow_runs forces RLS'
);
select is(
  (select relforcerowsecurity from pg_class
    where oid = 'crm.analytics_snapshots'::regclass),
  true,
  'analytics_snapshots forces RLS'
);
select has_trigger(
  'crm', 'audit_log', 'audit_log_immutable',
  'audit log has an immutability trigger'
);

select * from finish();
rollback;
