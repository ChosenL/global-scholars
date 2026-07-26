begin;

alter table crm.domain_events
  drop constraint domain_events_aggregate_type_check;
alter table crm.domain_events
  add constraint domain_events_aggregate_type_check
  check (aggregate_type in (
    'student_profile', 'document', 'task', 'note',
    'document_requirement', 'readiness', 'notification', 'workflow',
    'analytics', 'application', 'visa_case', 'ai_invocation'
  ));

create table crm.ai_invocations (
  id uuid primary key default gen_random_uuid(),
  requester_profile_id uuid not null references crm.profiles(id) on delete restrict,
  student_profile_id uuid not null references crm.profiles(id) on delete restrict,
  capability text not null,
  requester_role text not null,
  model text not null,
  status text not null default 'pending',
  request_metadata jsonb not null default '{}'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  usage_metadata jsonb not null default '{}'::jsonb,
  latency_ms integer,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ai_invocations_capability_check check (capability in (
    'student_advice', 'timeline_summary', 'next_action',
    'readiness_explanation', 'advisor_reply', 'application_summary',
    'natural_language_search'
  )),
  constraint ai_invocations_role_check check (requester_role in ('student', 'advisor', 'admin')),
  constraint ai_invocations_status_check check (status in ('pending', 'completed', 'failed', 'refused')),
  constraint ai_invocations_metadata_object_check check (jsonb_typeof(request_metadata) = 'object'),
  constraint ai_invocations_citations_array_check check (jsonb_typeof(citations) = 'array'),
  constraint ai_invocations_usage_object_check check (jsonb_typeof(usage_metadata) = 'object'),
  constraint ai_invocations_latency_check check (latency_ms is null or latency_ms >= 0),
  constraint ai_invocations_completion_check check (
    (status = 'pending' and completed_at is null)
    or (status <> 'pending' and completed_at is not null)
  )
);

create index ai_invocations_requester_created_idx
  on crm.ai_invocations (requester_profile_id, created_at desc);
create index ai_invocations_student_created_idx
  on crm.ai_invocations (student_profile_id, created_at desc);

alter table crm.ai_invocations enable row level security;
alter table crm.ai_invocations force row level security;
grant select on crm.ai_invocations to authenticated;

create policy "ai_invocations_select_authorized" on crm.ai_invocations
for select to authenticated using (
  requester_profile_id = crm.current_profile_id()
  or (crm.current_profile_role() in ('advisor', 'admin')
    and crm.can_access_student(student_profile_id))
);

create or replace function crm.begin_ai_invocation(
  target_student_profile_id uuid,
  requested_capability text,
  requested_model text,
  safe_request_metadata jsonb default '{}'::jsonb
)
returns crm.ai_invocations
language plpgsql security definer set search_path = ''
as $$
declare
  actor_id uuid := crm.current_profile_id();
  actor_role text := crm.current_profile_role();
  result crm.ai_invocations;
begin
  if actor_id is null or not crm.can_access_student(target_student_profile_id) then
    raise exception 'AI context access denied.';
  end if;
  if requested_capability not in (
    'student_advice', 'timeline_summary', 'next_action',
    'readiness_explanation', 'advisor_reply', 'application_summary',
    'natural_language_search'
  ) then raise exception 'Unsupported AI capability.'; end if;
  if requested_capability = 'advisor_reply'
    and actor_role not in ('advisor', 'admin') then
    raise exception 'Advisor capability access denied.';
  end if;
  if jsonb_typeof(coalesce(safe_request_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'AI request metadata must be an object.';
  end if;

  insert into crm.ai_invocations (
    requester_profile_id, student_profile_id, capability,
    requester_role, model, request_metadata
  ) values (
    actor_id, target_student_profile_id, requested_capability,
    actor_role, left(requested_model, 100),
    coalesce(safe_request_metadata, '{}'::jsonb) - 'prompt' - 'messages' - 'context'
  ) returning * into result;

  perform crm.emit_domain_event(
    'ai.requested', 'ai_invocation', result.id, target_student_profile_id,
    jsonb_build_object('capability', requested_capability, 'model', requested_model)
  );
  return result;
end;
$$;

create or replace function crm.complete_ai_invocation(
  target_invocation_id uuid,
  completion_status text,
  validated_citations jsonb default '[]'::jsonb,
  safe_usage_metadata jsonb default '{}'::jsonb,
  measured_latency_ms integer default null,
  completion_error_code text default null
)
returns crm.ai_invocations
language plpgsql security definer set search_path = ''
as $$
declare result crm.ai_invocations;
begin
  if completion_status not in ('completed', 'failed', 'refused') then
    raise exception 'Invalid AI completion status.';
  end if;
  update crm.ai_invocations
  set status = completion_status,
      citations = coalesce(validated_citations, '[]'::jsonb),
      usage_metadata = coalesce(safe_usage_metadata, '{}'::jsonb),
      latency_ms = measured_latency_ms,
      error_code = left(completion_error_code, 100),
      completed_at = now()
  where id = target_invocation_id
    and requester_profile_id = crm.current_profile_id()
    and status = 'pending'
  returning * into result;
  if result.id is null then raise exception 'AI invocation completion denied.'; end if;

  perform crm.emit_domain_event(
    'ai.' || completion_status, 'ai_invocation', result.id, result.student_profile_id,
    jsonb_build_object(
      'capability', result.capability,
      'latency_ms', measured_latency_ms,
      'citation_count', jsonb_array_length(result.citations),
      'error_code', completion_error_code
    )
  );
  return result;
end;
$$;

revoke all on function crm.begin_ai_invocation(uuid,text,text,jsonb) from public;
revoke all on function crm.complete_ai_invocation(uuid,text,jsonb,jsonb,integer,text) from public;
grant execute on function crm.begin_ai_invocation(uuid,text,text,jsonb) to authenticated;
grant execute on function crm.complete_ai_invocation(uuid,text,jsonb,jsonb,integer,text) to authenticated;

create or replace function crm.calculate_ai_analytics(
  target_period_start timestamptz,
  target_period_end timestamptz
)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when crm.is_current_admin() then jsonb_build_object(
    'requests', count(*) filter (where event_type = 'ai.requested'),
    'completed', count(*) filter (where event_type = 'ai.completed'),
    'failed', count(*) filter (where event_type = 'ai.failed'),
    'refused', count(*) filter (where event_type = 'ai.refused')
  ) else null end
  from crm.domain_events
  where aggregate_type = 'ai_invocation'
    and occurred_at >= target_period_start and occurred_at < target_period_end;
$$;
revoke all on function crm.calculate_ai_analytics(timestamptz,timestamptz) from public;
grant execute on function crm.calculate_ai_analytics(timestamptz,timestamptz) to authenticated;

commit;
