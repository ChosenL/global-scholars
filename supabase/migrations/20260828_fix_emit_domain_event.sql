begin;

create or replace function crm.emit_domain_event(
  new_event_type text,
  new_aggregate_type text,
  new_aggregate_id uuid,
  target_student_profile_id uuid default null,
  new_payload jsonb default '{}'::jsonb,
  new_correlation_id uuid default null,
  new_causation_id uuid default null
)
returns crm.domain_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  result crm.domain_events;
begin
  insert into crm.domain_events (
    event_type, aggregate_type, aggregate_id, student_profile_id,
    actor_profile_id, payload, correlation_id, causation_id
  ) values (
    new_event_type, new_aggregate_type, new_aggregate_id,
    target_student_profile_id, crm.current_profile_id(),
    coalesce(new_payload, '{}'::jsonb),
    coalesce(new_correlation_id, gen_random_uuid()), new_causation_id
  ) returning * into result;
  return result;
end;
$$;

revoke all on function crm.emit_domain_event(
  text, text, uuid, uuid, jsonb, uuid, uuid
) from public;

commit;
