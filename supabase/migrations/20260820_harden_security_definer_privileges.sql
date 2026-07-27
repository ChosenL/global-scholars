begin;

-- Legacy public functions predate the CRM authorization layer. Their bodies
-- already schema-qualify all application objects, so an empty search path is
-- safe and prevents caller-controlled object resolution.
alter function public.attach_assigned_advisors_to_conversation()
  set search_path = '';
alter function public.create_student_conversation(text)
  set search_path = '';
alter function public.current_platform_role()
  set search_path = '';
alter function public.is_assigned_advisor(text)
  set search_path = '';
alter function public.is_conversation_participant(uuid)
  set search_path = '';
alter function public.update_conversation_after_message()
  set search_path = '';

-- These helpers are not SECURITY DEFINER, but explicitly hardening their
-- search paths resolves the remaining mutable-path advisor findings.
alter function public.current_clerk_user_id()
  set search_path = '';
alter function public.set_updated_at()
  set search_path = '';

-- Trigger functions are invoked by their triggers, never directly by clients.
revoke all on function public.attach_assigned_advisors_to_conversation()
  from public, anon, authenticated;
revoke all on function public.update_conversation_after_message()
  from public, anon, authenticated;

-- These legacy RPC/helpers remain available to signed-in callers so existing
-- messaging and role behavior is preserved, but anonymous execution is denied.
revoke all on function public.create_student_conversation(text)
  from public, anon;
revoke all on function public.current_platform_role()
  from public, anon;
revoke all on function public.is_assigned_advisor(text)
  from public, anon;
revoke all on function public.is_conversation_participant(uuid)
  from public, anon;

grant execute on function public.create_student_conversation(text)
  to authenticated;
grant execute on function public.current_platform_role()
  to authenticated;
grant execute on function public.is_assigned_advisor(text)
  to authenticated;
grant execute on function public.is_conversation_participant(uuid)
  to authenticated;

-- Fail the migration if any application SECURITY DEFINER function can still be
-- executed anonymously or lacks the approved empty search path.
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

commit;
