begin;

-- Students may see their own business journey, but internal-note events and
-- administrative/AI operational events remain staff-only.
create policy "timeline_events_select_own_safe_history"
on crm.timeline_events
for select to authenticated
using (
  student_profile_id = crm.current_profile_id()
  and subject_type not in ('note', 'ai_invocation')
  and event_type not like 'note.%'
  and event_type not like 'ai.%'
);

create index if not exists domain_events_processing_idx
  on crm.domain_events (event_type, occurred_at, id);
create index if not exists audit_log_actor_occurred_idx
  on crm.audit_log (actor_profile_id, occurred_at desc)
  where actor_profile_id is not null;
create index if not exists timeline_events_student_occurred_idx
  on crm.timeline_events (student_profile_id, occurred_at desc);
create index if not exists ai_invocations_status_created_idx
  on crm.ai_invocations (status, created_at)
  where status in ('pending', 'failed');

commit;
