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
  created_conversation crm.conversations;
  normalized_subject text;
  inserted_participant_count integer;
begin
  select *
  into student_profile
  from crm.profiles
  where id = crm.current_profile_id()
    and role = 'student'
    and deleted_at is null;

  if student_profile.id is null then
    raise exception 'An active student CRM profile is required.';
  end if;

  normalized_subject := coalesce(
    nullif(trim(conversation_subject), ''),
    'General Support'
  );

  if char_length(normalized_subject) > 200 then
    raise exception 'Conversation subjects cannot exceed 200 characters.';
  end if;

  -- Until advisor routing exists in CRM, route deterministically to an active
  -- CRM advisor. Never translate an advisor_id from a legacy/public table.
  select *
  into advisor_profile
  from crm.profiles
  where role = 'advisor'
    and deleted_at is null
  order by created_at asc, id asc
  limit 1;

  if advisor_profile.id is null then
    raise exception 'No active advisor CRM profile is available for messaging.';
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
      'student'
    ),
    (
      created_conversation.id,
      advisor_profile.id,
      'advisor'
    );

  get diagnostics inserted_participant_count = row_count;

  if inserted_participant_count <> 2 then
    raise exception
      'Conversation creation must insert exactly two participants; inserted %.',
      inserted_participant_count;
  end if;

  return created_conversation;
end;
$$;

comment on function crm.create_student_conversation(text) is
  'Atomically creates a conversation with exactly two CRM participants: the authenticated student profile and an active advisor profile.';

revoke all on function crm.create_student_conversation(text) from public;
grant execute on function crm.create_student_conversation(text)
  to authenticated;

commit;
