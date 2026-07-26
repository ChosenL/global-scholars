begin;
select plan(7);

select policies_are(
  'crm', 'timeline_events',
  array['timeline_events_select_authorized_staff', 'timeline_events_select_own_safe_history'],
  'Timeline has separate staff and safe student policies'
);
select is(
  (select cmd from pg_policies where schemaname = 'crm'
    and tablename = 'timeline_events'
    and policyname = 'timeline_events_select_own_safe_history'),
  'SELECT',
  'Student timeline policy is read-only'
);
select has_index('crm', 'domain_events', 'domain_events_processing_idx', 'Event processing index exists');
select has_index('crm', 'audit_log', 'audit_log_actor_occurred_idx', 'Audit actor index exists');
select has_index('crm', 'timeline_events', 'timeline_events_student_occurred_idx', 'Timeline journey index exists');
select has_index('crm', 'ai_invocations', 'ai_invocations_status_created_idx', 'AI operations index exists');
select table_privs_are('crm', 'audit_log', 'authenticated', array['SELECT'], 'Audit log has no direct write grants');

select * from finish();
rollback;
