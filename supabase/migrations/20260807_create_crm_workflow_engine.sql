begin;

alter table crm.domain_events
  drop constraint domain_events_aggregate_type_check;
alter table crm.domain_events
  add constraint domain_events_aggregate_type_check
  check (aggregate_type in (
    'student_profile', 'document', 'task', 'note',
    'document_requirement', 'readiness', 'notification', 'workflow'
  ));

create table crm.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  event_pattern text not null,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null,
  priority smallint not null default 100,
  is_enabled boolean not null default true,
  created_by_profile_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint workflow_definitions_creator_fkey
    foreign key (created_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint workflow_definitions_name_length
    check (char_length(trim(name)) between 2 and 150),
  constraint workflow_definitions_description_length
    check (description is null or char_length(trim(description)) between 2 and 2000),
  constraint workflow_definitions_pattern_check
    check (event_pattern ~ '^[a-z*][a-z0-9_*]*\.[a-z*][a-z0-9_*]*$'),
  constraint workflow_definitions_conditions_object_check
    check (jsonb_typeof(conditions) = 'object'),
  constraint workflow_definitions_actions_array_check
    check (jsonb_typeof(actions) = 'array' and jsonb_array_length(actions) > 0),
  constraint workflow_definitions_priority_check
    check (priority between 1 and 1000),
  constraint workflow_definitions_deleted_at_check
    check (deleted_at is null or deleted_at >= created_at)
);

create table crm.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_definition_id uuid not null,
  domain_event_id uuid not null,
  status text not null default 'queued',
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0,
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint workflow_runs_definition_fkey
    foreign key (workflow_definition_id)
    references crm.workflow_definitions(id) on delete restrict,
  constraint workflow_runs_domain_event_fkey
    foreign key (domain_event_id) references crm.domain_events(id) on delete restrict,
  constraint workflow_runs_event_definition_unique
    unique (workflow_definition_id, domain_event_id),
  constraint workflow_runs_status_check
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  constraint workflow_runs_attempt_check
    check (attempt_count between 0 and 100),
  constraint workflow_runs_result_object_check
    check (result is null or jsonb_typeof(result) = 'object'),
  constraint workflow_runs_error_length
    check (error_message is null or char_length(error_message) <= 5000)
);

create table crm.scheduled_work (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null,
  student_profile_id uuid,
  work_type text not null,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null,
  status text not null default 'scheduled',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint scheduled_work_run_fkey
    foreign key (workflow_run_id) references crm.workflow_runs(id) on delete restrict,
  constraint scheduled_work_student_fkey
    foreign key (student_profile_id) references crm.profiles(id) on delete restrict,
  constraint scheduled_work_type_length
    check (char_length(trim(work_type)) between 2 and 100),
  constraint scheduled_work_payload_object_check
    check (jsonb_typeof(payload) = 'object'),
  constraint scheduled_work_status_check
    check (status in ('scheduled', 'running', 'completed', 'cancelled', 'failed'))
);

create index workflow_definitions_match_idx
  on crm.workflow_definitions (is_enabled, priority, event_pattern)
  where deleted_at is null;
create index workflow_runs_queue_idx
  on crm.workflow_runs (status, scheduled_for, created_at)
  where status = 'queued';
create index scheduled_work_due_idx
  on crm.scheduled_work (status, scheduled_for)
  where status = 'scheduled';

create trigger workflow_definitions_set_updated_at
before update on crm.workflow_definitions
for each row execute function crm.set_updated_at();
create trigger workflow_runs_set_updated_at
before update on crm.workflow_runs
for each row execute function crm.set_updated_at();
create trigger scheduled_work_set_updated_at
before update on crm.scheduled_work
for each row execute function crm.set_updated_at();

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
          or definition.conditions->>'aggregate_type' = event.aggregate_type)
        and (not (definition.conditions ? 'has_student')
          or (definition.conditions->>'has_student')::boolean
            = (event.student_profile_id is not null))
        and (not (definition.conditions ? 'payload_contains')
          or event.payload @> definition.conditions->'payload_contains')
      )
    );
$$;
revoke all on function crm.workflow_matches_event(crm.workflow_definitions,crm.domain_events)
  from public;

create or replace function crm.enqueue_event_workflows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into crm.workflow_runs (
    workflow_definition_id, domain_event_id, scheduled_for
  )
  select definition.id, new.id, new.occurred_at
  from crm.workflow_definitions as definition
  where definition.is_enabled
    and definition.deleted_at is null
    and crm.workflow_matches_event(definition, new)
  order by definition.priority, definition.id
  on conflict (workflow_definition_id, domain_event_id) do nothing;
  return new;
end;
$$;
revoke all on function crm.enqueue_event_workflows() from public;
create trigger domain_events_enqueue_workflows
after insert on crm.domain_events
for each row execute function crm.enqueue_event_workflows();

create or replace function crm.upsert_workflow_definition(
  target_workflow_id uuid,
  new_name text,
  new_description text,
  new_event_pattern text,
  new_conditions jsonb,
  new_actions jsonb,
  new_priority smallint,
  new_is_enabled boolean
)
returns crm.workflow_definitions
language plpgsql
security definer
set search_path = ''
as $$
declare
  result crm.workflow_definitions;
  action jsonb;
begin
  if not crm.is_current_admin() then
    raise exception 'Only administrators may configure workflows.';
  end if;
  for action in select value from jsonb_array_elements(new_actions)
  loop
    if action->>'type' not in (
      'assign_task', 'recalculate_readiness',
      'create_notification', 'schedule_work'
    ) then
      raise exception 'Unsupported workflow action type.';
    end if;
  end loop;

  if target_workflow_id is null then
    insert into crm.workflow_definitions (
      name, description, event_pattern, conditions, actions,
      priority, is_enabled, created_by_profile_id
    ) values (
      trim(new_name), nullif(trim(new_description), ''), new_event_pattern,
      coalesce(new_conditions, '{}'::jsonb), new_actions, new_priority,
      new_is_enabled, crm.current_profile_id()
    ) returning * into result;
    perform crm.emit_domain_event(
      'workflow.created', 'workflow', result.id, null,
      jsonb_build_object('name', result.name)
    );
  else
    update crm.workflow_definitions
    set name = trim(new_name),
        description = nullif(trim(new_description), ''),
        event_pattern = new_event_pattern,
        conditions = coalesce(new_conditions, '{}'::jsonb),
        actions = new_actions,
        priority = new_priority,
        is_enabled = new_is_enabled
    where id = target_workflow_id and deleted_at is null
    returning * into result;
    if result.id is null then raise exception 'Active workflow not found.'; end if;
    perform crm.emit_domain_event(
      'workflow.updated', 'workflow', result.id, null,
      jsonb_build_object('name', result.name, 'is_enabled', result.is_enabled)
    );
  end if;
  return result;
end;
$$;

create or replace function crm.process_workflow_run(target_workflow_run_id uuid)
returns crm.workflow_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  run crm.workflow_runs;
  definition crm.workflow_definitions;
  source_event crm.domain_events;
  action jsonb;
  action_results jsonb := '[]'::jsonb;
  notification_id uuid;
begin
  if not crm.is_current_admin() then
    raise exception 'Only administrators may process workflows.';
  end if;
  select * into run from crm.workflow_runs
  where id = target_workflow_run_id and status in ('queued', 'failed')
    and scheduled_for <= statement_timestamp()
  for update;
  if run.id is null then raise exception 'Runnable workflow run not found.'; end if;

  select * into definition from crm.workflow_definitions
  where id = run.workflow_definition_id and is_enabled and deleted_at is null;
  select * into source_event from crm.domain_events where id = run.domain_event_id;
  if definition.id is null or source_event.id is null then
    raise exception 'Workflow configuration or source event is unavailable.';
  end if;

  update crm.workflow_runs
  set status = 'running', started_at = statement_timestamp(),
      attempt_count = attempt_count + 1, error_message = null
  where id = run.id;

  begin
    for action in select value from jsonb_array_elements(definition.actions)
    loop
      if action->>'type' = 'recalculate_readiness' then
        if source_event.student_profile_id is null then
          raise exception 'Readiness action requires a student event.';
        end if;
        perform crm.calculate_student_readiness(source_event.student_profile_id);
      elsif action->>'type' = 'assign_task' then
        if source_event.student_profile_id is null then
          raise exception 'Task action requires a student event.';
        end if;
        perform crm.create_student_task(
          source_event.student_profile_id,
          action->>'title',
          coalesce(action->>'description', ''),
          coalesce(action->>'priority', 'normal'),
          coalesce(action->>'visibility', 'student'),
          coalesce((action->>'assigned_to_profile_id')::uuid, crm.current_profile_id()),
          case when action ? 'due_in_hours'
            then statement_timestamp()
              + make_interval(hours => (action->>'due_in_hours')::integer)
            else null end,
          null
        );
      elsif action->>'type' = 'create_notification' then
        if source_event.student_profile_id is null then
          raise exception 'Notification action requires a student event.';
        end if;
        insert into crm.notifications (
          recipient_profile_id, actor_profile_id, domain_event_id,
          notification_type, title, body, severity, data
        ) values (
          source_event.student_profile_id, crm.current_profile_id(),
          source_event.id, 'workflow',
          action->>'title', action->>'body',
          coalesce(action->>'severity', 'info'),
          jsonb_build_object('workflow_id', definition.id)
        )
        on conflict (domain_event_id, recipient_profile_id) do nothing
        returning id into notification_id;
      elsif action->>'type' = 'schedule_work' then
        insert into crm.scheduled_work (
          workflow_run_id, student_profile_id, work_type, payload, scheduled_for
        ) values (
          run.id, source_event.student_profile_id, action->>'work_type',
          coalesce(action->'payload', '{}'::jsonb),
          statement_timestamp()
            + make_interval(hours => coalesce((action->>'delay_hours')::integer, 0))
        );
      end if;
      action_results := action_results || jsonb_build_array(
        jsonb_build_object('type', action->>'type', 'status', 'completed')
      );
    end loop;

    update crm.workflow_runs
    set status = 'completed', completed_at = statement_timestamp(),
        result = jsonb_build_object('actions', action_results)
    where id = run.id returning * into run;
    perform crm.emit_domain_event(
      'workflow.completed', 'workflow', run.id,
      source_event.student_profile_id,
      jsonb_build_object('workflow_definition_id', definition.id),
      source_event.correlation_id, source_event.id
    );
  exception when others then
    update crm.workflow_runs
    set status = 'failed', error_message = left(sqlerrm, 5000)
    where id = run.id returning * into run;
    perform crm.emit_domain_event(
      'workflow.failed', 'workflow', run.id,
      source_event.student_profile_id,
      jsonb_build_object(
        'workflow_definition_id', definition.id,
        'error', run.error_message
      ),
      source_event.correlation_id, source_event.id
    );
  end;
  return run;
end;
$$;

revoke all on function crm.upsert_workflow_definition(uuid,text,text,text,jsonb,jsonb,smallint,boolean) from public;
revoke all on function crm.process_workflow_run(uuid) from public;
grant execute on function crm.upsert_workflow_definition(uuid,text,text,text,jsonb,jsonb,smallint,boolean) to authenticated;
grant execute on function crm.process_workflow_run(uuid) to authenticated;

alter table crm.workflow_definitions enable row level security;
alter table crm.workflow_definitions force row level security;
alter table crm.workflow_runs enable row level security;
alter table crm.workflow_runs force row level security;
alter table crm.scheduled_work enable row level security;
alter table crm.scheduled_work force row level security;
grant select on crm.workflow_definitions, crm.workflow_runs, crm.scheduled_work
  to authenticated;
create policy "workflow_definitions_select_admin" on crm.workflow_definitions
for select to authenticated using (crm.is_current_admin());
create policy "workflow_runs_select_admin" on crm.workflow_runs
for select to authenticated using (crm.is_current_admin());
create policy "scheduled_work_select_admin" on crm.scheduled_work
for select to authenticated using (crm.is_current_admin());

commit;
