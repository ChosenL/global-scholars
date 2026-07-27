begin;

-- Rollback-only PostgreSQL parser check. The workflow table may not exist when
-- its migration is the one currently being validated.
create table if not exists crm.workflow_definitions (
  event_pattern text,
  conditions jsonb
);

create or replace function crm.workflow_matches_event(
  definition crm.workflow_definitions,
  event crm.domain_events
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      definition.event_pattern = event.event_type
      or (
        split_part(definition.event_pattern, '.', 2) = '*'
        and split_part(definition.event_pattern, '.', 1)
          = split_part(event.event_type, '.', 1)
      )
      or definition.event_pattern = '*.*'
    )
    and (
      definition.conditions = '{}'::jsonb
      or (
        (not (definition.conditions ? 'aggregate_type')
          or (
            (definition.conditions ->> 'aggregate_type')
              = event.aggregate_type
          ))
        and (not (definition.conditions ? 'has_student')
          or (
            ((definition.conditions ->> 'has_student')::boolean)
              = (event.student_profile_id is not null)
          ))
        and (not (definition.conditions ? 'payload_contains')
          or (
            event.payload
              @> (definition.conditions -> 'payload_contains')
          ))
      )
    );
$$;

rollback;
