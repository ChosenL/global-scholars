begin;

alter table crm.domain_events
  drop constraint domain_events_aggregate_type_check;
alter table crm.domain_events
  add constraint domain_events_aggregate_type_check
  check (aggregate_type in (
    'student_profile', 'document', 'task', 'note',
    'document_requirement', 'readiness', 'notification', 'workflow',
    'analytics'
  ));

create table crm.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_start timestamptz not null,
  period_end timestamptz not null,
  metrics jsonb not null,
  source_event_count bigint not null,
  calculated_by_profile_id uuid not null,
  calculated_at timestamptz not null default now(),

  constraint analytics_snapshots_calculator_fkey
    foreign key (calculated_by_profile_id)
    references crm.profiles(id) on delete restrict,
  constraint analytics_snapshots_period_check
    check (period_end > period_start),
  constraint analytics_snapshots_metrics_object_check
    check (jsonb_typeof(metrics) = 'object'),
  constraint analytics_snapshots_event_count_check
    check (source_event_count >= 0)
);

comment on table crm.analytics_snapshots is
  'Reusable KPI snapshots calculated exclusively from crm.domain_events.';

create index analytics_snapshots_period_idx
  on crm.analytics_snapshots (period_start, period_end, calculated_at desc);

create or replace function crm.calculate_platform_analytics(
  target_period_start timestamptz,
  target_period_end timestamptz
)
returns crm.analytics_snapshots
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_count bigint;
  application_pipeline jsonb;
  document_completion jsonb;
  advisor_workload jsonb;
  readiness_metrics jsonb;
  processing_times jsonb;
  result crm.analytics_snapshots;
begin
  if not crm.is_current_admin() then
    raise exception 'Only administrators may calculate platform analytics.';
  end if;
  if target_period_end <= target_period_start then
    raise exception 'Analytics period is invalid.';
  end if;

  select count(*) into event_count
  from crm.domain_events as event
  where event.occurred_at >= target_period_start
    and event.occurred_at < target_period_end;

  select coalesce(jsonb_object_agg(stage, total), '{}'::jsonb)
  into application_pipeline
  from (
    select event.event_type as stage, count(*) as total
    from crm.domain_events as event
    where event.occurred_at >= target_period_start
      and event.occurred_at < target_period_end
      and event.event_type like 'application.%'
    group by event.event_type
  ) as pipeline;

  select jsonb_build_object(
    'created', count(*) filter (where event.event_type = 'document.created'),
    'approved', count(*) filter (
      where event.event_type = 'document.status_changed'
        and event.payload->>'to' = 'approved'
    ),
    'needs_attention', count(*) filter (
      where event.event_type = 'document.status_changed'
        and event.payload->>'to' in ('rejected', 'needs_revision')
    )
  ) into document_completion
  from crm.domain_events as event
  where event.occurred_at >= target_period_start
    and event.occurred_at < target_period_end;

  select coalesce(jsonb_agg(jsonb_build_object(
    'actor_profile_id', actor_profile_id,
    'event_count', total
  ) order by total desc), '[]'::jsonb)
  into advisor_workload
  from (
    select event.actor_profile_id, count(*) as total
    from crm.domain_events as event
    where event.occurred_at >= target_period_start
      and event.occurred_at < target_period_end
      and event.actor_profile_id is not null
      and event.event_type not like 'readiness.%'
    group by event.actor_profile_id
  ) as workload;

  select jsonb_build_object(
    'calculations', count(*),
    'average_score', coalesce(round(avg(
      (event.payload->>'total_score')::numeric
    ), 2), 0),
    'students_calculated', count(distinct event.student_profile_id)
  ) into readiness_metrics
  from crm.domain_events as event
  where event.occurred_at >= target_period_start
    and event.occurred_at < target_period_end
    and event.event_type = 'readiness.calculated';

  select jsonb_build_object(
    'document_approval_hours', coalesce(round(avg(
      extract(epoch from (approved.occurred_at - created.occurred_at)) / 3600
    )::numeric, 2), 0),
    'workflow_completion_hours', coalesce(round(avg(
      extract(epoch from (completed.occurred_at - source.occurred_at)) / 3600
    )::numeric, 2), 0)
  ) into processing_times
  from crm.domain_events as created
  left join lateral (
    select event.occurred_at
    from crm.domain_events as event
    where event.aggregate_id = created.aggregate_id
      and event.event_type = 'document.status_changed'
      and event.payload->>'to' = 'approved'
      and event.occurred_at >= created.occurred_at
    order by event.occurred_at
    limit 1
  ) as approved on created.event_type = 'document.created'
  left join crm.domain_events as completed
    on completed.causation_id = created.id
   and completed.event_type = 'workflow.completed'
  left join crm.domain_events as source on source.id = completed.causation_id
  where created.occurred_at >= target_period_start
    and created.occurred_at < target_period_end;

  insert into crm.analytics_snapshots (
    period_start, period_end, metrics, source_event_count,
    calculated_by_profile_id
  ) values (
    target_period_start, target_period_end,
    jsonb_build_object(
      'application_pipeline', application_pipeline,
      'document_completion', document_completion,
      'advisor_workload', advisor_workload,
      'student_readiness', readiness_metrics,
      'processing_times', processing_times
    ),
    event_count, crm.current_profile_id()
  ) returning * into result;

  perform crm.emit_domain_event(
    'analytics.snapshot_created', 'analytics', result.id, null,
    jsonb_build_object(
      'period_start', result.period_start,
      'period_end', result.period_end,
      'source_event_count', result.source_event_count
    )
  );
  return result;
end;
$$;

revoke all on function crm.calculate_platform_analytics(timestamptz,timestamptz)
  from public;
grant execute on function crm.calculate_platform_analytics(timestamptz,timestamptz)
  to authenticated;

alter table crm.analytics_snapshots enable row level security;
alter table crm.analytics_snapshots force row level security;
grant select on crm.analytics_snapshots to authenticated;
create policy "analytics_snapshots_select_admin"
on crm.analytics_snapshots for select to authenticated
using (crm.is_current_admin());

commit;
