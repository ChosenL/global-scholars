begin;

alter function public.create_student_conversation(text)
  set search_path = '';
alter function public.is_conversation_participant(uuid)
  set search_path = '';
alter function public.update_conversation_after_message()
  set search_path = '';

do $legacy_public_functions$
declare
  legacy_function regprocedure;
begin
  foreach legacy_function in array array[
    to_regprocedure('public.attach_assigned_advisors_to_conversation()'),
    to_regprocedure('public.current_platform_role()'),
    to_regprocedure('public.is_assigned_advisor(text)')
  ]
  loop
    if legacy_function is not null then
      execute format(
        'alter function %s set search_path = ''''',
        legacy_function
      );
    end if;
  end loop;
end;
$legacy_public_functions$;

alter function public.current_clerk_user_id()
  set search_path = '';
alter function public.set_updated_at()
  set search_path = '';

revoke all on function public.update_conversation_after_message()
  from public, anon, authenticated;
revoke all on function public.create_student_conversation(text)
  from public, anon;
revoke all on function public.is_conversation_participant(uuid)
  from public, anon;

grant execute on function public.create_student_conversation(text)
  to authenticated;
grant execute on function public.is_conversation_participant(uuid)
  to authenticated;

do $legacy_public_privileges$
declare
  legacy_function regprocedure;
begin
  foreach legacy_function in array array[
    to_regprocedure('public.attach_assigned_advisors_to_conversation()'),
    to_regprocedure('public.current_platform_role()'),
    to_regprocedure('public.is_assigned_advisor(text)')
  ]
  loop
    if legacy_function is not null then
      execute format(
        'revoke all on function %s from public, anon, authenticated',
        legacy_function
      );
    end if;
  end loop;

  foreach legacy_function in array array[
    to_regprocedure('public.current_platform_role()'),
    to_regprocedure('public.is_assigned_advisor(text)')
  ]
  loop
    if legacy_function is not null then
      execute format(
        'grant execute on function %s to authenticated',
        legacy_function
      );
    end if;
  end loop;
end;
$legacy_public_privileges$;

do $verification$
declare
  insecure_function text;
begin
  select format(
    '%I.%I(%s)',
    namespace.nspname,
    procedure.proname,
    pg_get_function_identity_arguments(procedure.oid)
  )
  into insecure_function
  from pg_proc as procedure
  join pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where procedure.prosecdef
    and namespace.nspname in ('crm', 'public')
    and (
      has_function_privilege('anon', procedure.oid, 'EXECUTE')
      or not coalesce(
        procedure.proconfig @> array['search_path=""']::text[],
        false
      )
    )
  order by namespace.nspname, procedure.proname
  limit 1;

  if insecure_function is not null then
    raise exception
      'SECURITY DEFINER hardening verification failed for %.',
      insecure_function;
  end if;
end;
$verification$;

rollback;
