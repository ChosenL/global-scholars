begin;

create or replace function crm.create_student_conversation(
  conversation_subject text default 'General Support'
)
returns crm.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_profile crm.profiles;
  advisor_profile crm.profiles;
  assigned_advisor_clerk_id text;
  created_conversation crm.conversations;
  normalized_subject text;
begin
  select *
  into student_profile
  from crm.profiles
  where id = crm.current_profile_id()
    and deleted_at is null;

  if student_profile.id is null then
    raise exception 'An active CRM profile is required.';
  end if;

  if student_profile.role <> 'student' then
    raise exception 'Only students can use this conversation initializer.';
  end if;

  normalized_subject := nullif(trim(conversation_subject), '');
  normalized_subject := coalesce(normalized_subject, 'General Support');

  if char_length(normalized_subject) > 200 then
    raise exception 'Conversation subjects cannot exceed 200 characters.';
  end if;

  -- Existing installations may keep advisor assignments in the legacy public
  -- schema. Dynamic SQL keeps this migration compatible when that optional
  -- assignment table is not installed.
  if to_regclass('public.advisor_student_assignments') is not null then
    begin
      execute $assignment$
        select advisor_id::text
        from public.advisor_student_assignments
        where student_id = $1
          and ended_at is null
        order by assigned_at asc
        limit 1
      $assignment$
      into assigned_advisor_clerk_id
      using student_profile.clerk_user_id;
    exception
      when undefined_column then
        assigned_advisor_clerk_id := null;
    end;
  end if;

  if assigned_advisor_clerk_id is not null then
    select *
    into advisor_profile
    from crm.profiles
    where clerk_user_id = assigned_advisor_clerk_id
      and role in ('advisor', 'admin')
      and deleted_at is null
    limit 1;
  end if;

  -- Development/default routing: an explicit assignment is preferred, but a
  -- student is never blocked when an active advisor profile already exists.
  if advisor_profile.id is null then
    select *
    into advisor_profile
    from crm.profiles
    where role = 'advisor'
      and deleted_at is null
    order by created_at asc, id asc
    limit 1;
  end if;

  if advisor_profile.id is null then
    raise exception 'No active advisor profile is available for messaging.';
  end if;

  insert into crm.conversations (
    created_by_profile_id,
    subject
  )
  values (
    student_profile.id,
    normalized_subject
  )
  returning *
  into created_conversation;

  insert into crm.conversation_participants (
    conversation_id,
    profile_id,
    participant_role
  )
  values
    (
      created_conversation.id,
      student_profile.id,
      student_profile.role
    ),
    (
      created_conversation.id,
      advisor_profile.id,
      advisor_profile.role
    );

  return created_conversation;
end;
$$;

comment on function crm.create_student_conversation(text) is
  'Atomically creates a student/advisor conversation, preferring an explicit assignment and falling back to the first active advisor.';

revoke all on function crm.create_student_conversation(text) from public;
grant execute on function crm.create_student_conversation(text)
  to authenticated;

commit;
