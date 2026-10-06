begin;
select plan(8);

select is(
  (
    select count(*)::integer
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where procedure.prosecdef
      and namespace.nspname in ('crm', 'public')
      and has_function_privilege('anon', procedure.oid, 'EXECUTE')
      and not (
        namespace.nspname = 'crm'
        and procedure.proname = 'consume_operational_rate_limit'
        and pg_get_function_identity_arguments(procedure.oid)
          = 'rate_scope text, rate_key_hash text, request_limit integer, window_seconds integer'
      )
  ),
  0,
  'Anonymous users can execute only the intentional bounded rate-limit RPC'
);

select is(
  (
    select count(*)::integer
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where procedure.prosecdef
      and namespace.nspname in ('crm', 'public')
      and not coalesce(
        procedure.proconfig @> array['search_path=""']::text[],
        false
      )
  ),
  0,
  'Every application SECURITY DEFINER function has an empty search path'
);

select is(
  (
    select count(*)::integer
    from unnest(array[
      'public.attach_assigned_advisors_to_conversation()',
      'public.current_platform_role()',
      'public.is_assigned_advisor(text)'
    ]) as legacy(signature)
    where to_regprocedure(legacy.signature) is not null
      and (
        has_function_privilege('anon', to_regprocedure(legacy.signature), 'EXECUTE')
        or not coalesce(
          (
            select procedure.proconfig @> array['search_path=""']::text[]
            from pg_proc as procedure
            where procedure.oid = to_regprocedure(legacy.signature)
          ),
          false
        )
      )
  ),
  0,
  'Optional legacy public functions are hardened whenever present'
);
select function_privs_are(
  'public', 'update_conversation_after_message', array[]::text[],
  'authenticated', array[]::text[],
  'Conversation update trigger cannot be called directly'
);
select function_privs_are(
  'public', 'create_student_conversation', array['text'],
  'authenticated', array['EXECUTE'],
  'Signed-in conversation creation remains available'
);
select function_privs_are(
  'public', 'is_conversation_participant', array['uuid'],
  'authenticated', array['EXECUTE'],
  'Signed-in participant authorization remains available'
);

select isnt(
  to_regprocedure('public.current_clerk_user_id()'),
  null,
  'Repository-defined current_clerk_user_id remains required'
);
select isnt(
  to_regprocedure('public.set_updated_at()'),
  null,
  'Repository-defined set_updated_at remains required'
);

select * from finish();
rollback;
