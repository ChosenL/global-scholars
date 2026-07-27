begin;

create table crm.operational_rate_limits (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash, window_started_at),
  constraint operational_rate_limits_scope_check
    check (scope in ('public_chat', 'crm_ai')),
  constraint operational_rate_limits_hash_check
    check (key_hash ~ '^[a-f0-9]{64}$'),
  constraint operational_rate_limits_count_check
    check (request_count between 1 and 1000000)
);

create table crm.ai_daily_usage (
  profile_id uuid not null references crm.profiles(id) on delete restrict,
  usage_date date not null,
  request_count integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  failed_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, usage_date),
  constraint ai_daily_usage_nonnegative_check check (
    request_count >= 0 and input_tokens >= 0
    and output_tokens >= 0 and failed_count >= 0
  )
);

create index operational_rate_limits_cleanup_idx
  on crm.operational_rate_limits (window_started_at);
create index ai_invocations_circuit_idx
  on crm.ai_invocations (completed_at)
  where status = 'failed';

alter table crm.operational_rate_limits enable row level security;
alter table crm.operational_rate_limits force row level security;
alter table crm.ai_daily_usage enable row level security;
alter table crm.ai_daily_usage force row level security;

grant select on crm.ai_daily_usage to authenticated;
create policy "ai_daily_usage_select_self_or_admin"
on crm.ai_daily_usage for select to authenticated
using (
  profile_id = crm.current_profile_id()
  or crm.is_current_admin()
);

create or replace function crm.consume_operational_rate_limit(
  rate_scope text,
  rate_key_hash text,
  request_limit integer,
  window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz;
  current_count integer;
begin
  if rate_scope not in ('public_chat', 'crm_ai')
    or rate_key_hash !~ '^[a-f0-9]{64}$'
    or request_limit not between 1 and 10000
    or window_seconds not between 1 and 86400
  then
    raise exception 'Invalid operational rate-limit request.';
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from statement_timestamp()) / window_seconds)
      * window_seconds
  );

  insert into crm.operational_rate_limits (
    scope, key_hash, window_started_at, request_count
  ) values (
    rate_scope, rate_key_hash, current_window, 1
  )
  on conflict (scope, key_hash, window_started_at)
  do update set
    request_count = least(
      crm.operational_rate_limits.request_count + 1,
      1000000
    ),
    updated_at = statement_timestamp()
  returning request_count into current_count;

  return jsonb_build_object(
    'allowed', current_count <= request_limit,
    'limit', request_limit,
    'remaining', greatest(request_limit - current_count, 0),
    'retry_after_seconds', greatest(
      ceil(extract(epoch from (
        current_window + make_interval(secs => window_seconds)
        - statement_timestamp()
      )))::integer,
      1
    )
  );
end;
$$;

revoke all on function crm.consume_operational_rate_limit(text,text,integer,integer)
  from public;
-- Intentional anonymous allowlist: this RPC accepts only a server-generated
-- SHA-256 key and bounded counters; it exposes no CRM or identity data.
grant execute on function crm.consume_operational_rate_limit(text,text,integer,integer)
  to anon, authenticated;

create or replace function crm.consume_ai_daily_quota(
  daily_request_limit integer,
  daily_token_limit bigint,
  circuit_failure_threshold integer,
  circuit_window_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := crm.current_profile_id();
  usage crm.ai_daily_usage;
  recent_failures integer;
begin
  if actor_id is null then raise exception 'Authentication required.'; end if;
  if daily_request_limit not between 1 and 10000
    or daily_token_limit not between 1000 and 1000000000
    or circuit_failure_threshold not between 1 and 1000
    or circuit_window_minutes not between 1 and 1440
  then raise exception 'Invalid AI operational limits.'; end if;

  select count(*)::integer into recent_failures
  from crm.ai_invocations
  where status = 'failed'
    and completed_at >= statement_timestamp()
      - make_interval(mins => circuit_window_minutes);

  if recent_failures >= circuit_failure_threshold then
    return jsonb_build_object(
      'allowed', false, 'reason', 'circuit_open',
      'retry_after_seconds', circuit_window_minutes * 60
    );
  end if;

  insert into crm.ai_daily_usage (
    profile_id, usage_date, request_count
  ) values (
    actor_id, current_date, 1
  )
  on conflict (profile_id, usage_date)
  do update set
    request_count = crm.ai_daily_usage.request_count + 1,
    updated_at = statement_timestamp()
  returning * into usage;

  return jsonb_build_object(
    'allowed',
      usage.request_count <= daily_request_limit
      and usage.input_tokens + usage.output_tokens < daily_token_limit,
    'reason', case
      when usage.request_count > daily_request_limit then 'daily_requests'
      when usage.input_tokens + usage.output_tokens >= daily_token_limit
        then 'daily_tokens'
      else 'allowed'
    end,
    'request_count', usage.request_count,
    'token_count', usage.input_tokens + usage.output_tokens,
    'request_limit', daily_request_limit,
    'token_limit', daily_token_limit,
    'retry_after_seconds',
      greatest(
        ceil(extract(epoch from (
          date_trunc('day', statement_timestamp())
          + interval '1 day' - statement_timestamp()
        )))::integer,
        1
      )
  );
end;
$$;
revoke all on function crm.consume_ai_daily_quota(integer,bigint,integer,integer)
  from public;
grant execute on function crm.consume_ai_daily_quota(integer,bigint,integer,integer)
  to authenticated;

create or replace function crm.capture_ai_daily_usage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status <> 'pending' then
    insert into crm.ai_daily_usage (
      profile_id, usage_date, input_tokens, output_tokens, failed_count
    ) values (
      new.requester_profile_id,
      new.created_at::date,
      coalesce((new.usage_metadata->>'input_tokens')::bigint, 0),
      coalesce((new.usage_metadata->>'output_tokens')::bigint, 0),
      case when new.status = 'failed' then 1 else 0 end
    )
    on conflict (profile_id, usage_date)
    do update set
      input_tokens = crm.ai_daily_usage.input_tokens + excluded.input_tokens,
      output_tokens = crm.ai_daily_usage.output_tokens + excluded.output_tokens,
      failed_count = crm.ai_daily_usage.failed_count + excluded.failed_count,
      updated_at = statement_timestamp();
  end if;
  return new;
end;
$$;
revoke all on function crm.capture_ai_daily_usage() from public;
create trigger ai_invocations_capture_daily_usage
after update of status on crm.ai_invocations
for each row execute function crm.capture_ai_daily_usage();

commit;
