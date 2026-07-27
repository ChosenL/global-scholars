begin;

create or replace function crm.operational_readiness()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select jsonb_build_object(
    'database', true,
    'checked_at', statement_timestamp()
  );
$function$;

comment on function crm.operational_readiness() is
  'Non-privileged readiness probe. Returns no business, identity, or configuration data.';

revoke all on function crm.operational_readiness() from public;
grant execute on function crm.operational_readiness() to anon, authenticated;

commit;
