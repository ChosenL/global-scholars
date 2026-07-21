begin;

create extension if not exists pgcrypto;

-- =========================================================
-- PRESERVE THE EXISTING LEGACY MESSAGES TABLE
-- =========================================================
-- Your project already contains a simple public.messages table with:
-- student_id, sender_type, sender_name, subject, message, is_read, etc.
-- This migration preserves that table and its data by renaming it before
-- creating the new conversation-based messaging system.

do $$
declare
  has_messages_table boolean;
  has_new_sender_id boolean;
  has_new_conversation_id boolean;
begin
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'messages'
  )
  into has_messages_table;

  if has_messages_table then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'messages'
        and column_name = 'sender_id'
    )
    into has_new_sender_id;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'messages'
        and column_name = 'conversation_id'
    )
    into has_new_conversation_id;

    if not has_new_sender_id or not has_new_conversation_id then
      if exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'student_messages_legacy'
      ) then
        raise exception
          'Both public.messages and public.student_messages_legacy exist. Resolve the duplicate legacy table before rerunning this migration.';
      end if;

      alter table public.messages
        rename to student_messages_legacy;

      if to_regclass('public.messages_pkey') is not null then
        alter index public.messages_pkey
          rename to student_messages_legacy_pkey;
      end if;

      if to_regclass('public.messages_student_id_idx') is not null then
        alter index public.messages_student_id_idx
          rename to student_messages_legacy_student_id_idx;
      end if;

      if to_regclass('public.messages_created_at_idx') is not null then
        alter index public.messages_created_at_idx
          rename to student_messages_legacy_created_at_idx;
      end if;
    end if;
  end if;
end
$$;

-- =========================================================
-- ENUMS
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'conversation_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.conversation_status as enum (
      'open',
      'resolved',
      'archived'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'conversation_participant_role'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.conversation_participant_role as enum (
      'student',
      'advisor',
      'admin'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'message_type'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.message_type as enum (
      'text',
      'file',
      'system'
    );
  end if;
end
$$;

-- =========================================================
-- CLERK AUTH HELPER
-- =========================================================

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

-- =========================================================
-- CONVERSATIONS
-- =========================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  subject text not null default 'General Support',
  status public.conversation_status not null default 'open',
  created_by text not null,
  last_message_at timestamptz,
  resolved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint conversations_subject_length_check
    check (char_length(trim(subject)) between 1 and 150),

  constraint conversations_created_by_length_check
    check (char_length(trim(created_by)) > 0)
);

-- =========================================================
-- CONVERSATION PARTICIPANTS
-- =========================================================

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,

  user_id text not null,
  role public.conversation_participant_role not null,

  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted_at timestamptz,
  removed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint conversation_participants_user_id_length_check
    check (char_length(trim(user_id)) > 0),

  constraint conversation_participants_unique_user
    unique (conversation_id, user_id)
);

-- =========================================================
-- NEW CONVERSATION-BASED MESSAGES TABLE
-- =========================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.conversations(id)
    on delete cascade,

  sender_id text not null,
  message_type public.message_type not null default 'text',

  body text,

  attachment_name text,
  attachment_path text,
  attachment_type text,
  attachment_size bigint,

  reply_to_message_id uuid
    references public.messages(id)
    on delete set null,

  edited_at timestamptz,
  deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint messages_sender_id_length_check
    check (char_length(trim(sender_id)) > 0),

  constraint messages_content_check
    check (
      (
        message_type = 'text'
        and body is not null
        and char_length(trim(body)) between 1 and 5000
      )
      or
      (
        message_type = 'file'
        and attachment_path is not null
        and char_length(trim(attachment_path)) > 0
      )
      or
      (
        message_type = 'system'
        and body is not null
        and char_length(trim(body)) between 1 and 5000
      )
    ),

  constraint messages_attachment_size_check
    check (attachment_size is null or attachment_size >= 0)
);

-- =========================================================
-- READ RECEIPTS
-- =========================================================

create table if not exists public.message_read_receipts (
  id uuid primary key default gen_random_uuid(),

  message_id uuid not null
    references public.messages(id)
    on delete cascade,

  user_id text not null,
  read_at timestamptz not null default now(),

  constraint message_read_receipts_user_id_length_check
    check (char_length(trim(user_id)) > 0),

  constraint message_read_receipts_unique_user
    unique (message_id, user_id)
);

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists conversations_created_by_idx
  on public.conversations(created_by);

create index if not exists conversations_status_idx
  on public.conversations(status);

create index if not exists conversations_last_message_at_idx
  on public.conversations(last_message_at desc nulls last);

create index if not exists conversation_participants_user_id_idx
  on public.conversation_participants(user_id);

create index if not exists conversation_participants_conversation_id_idx
  on public.conversation_participants(conversation_id);

create index if not exists messages_conversation_created_at_idx
  on public.messages(conversation_id, created_at asc);

create index if not exists messages_sender_id_idx
  on public.messages(sender_id);

create index if not exists messages_reply_to_message_id_idx
  on public.messages(reply_to_message_id);

create index if not exists message_read_receipts_user_id_idx
  on public.message_read_receipts(user_id);

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_set_updated_at
  on public.conversations;

create trigger conversations_set_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

drop trigger if exists conversation_participants_set_updated_at
  on public.conversation_participants;

create trigger conversation_participants_set_updated_at
before update on public.conversation_participants
for each row
execute function public.set_updated_at();

drop trigger if exists messages_set_updated_at
  on public.messages;

create trigger messages_set_updated_at
before update on public.messages
for each row
execute function public.set_updated_at();

-- =========================================================
-- PARTICIPANT ACCESS HELPER
-- =========================================================

create or replace function public.is_conversation_participant(
  target_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants
    where conversation_id = target_conversation_id
      and user_id = public.current_clerk_user_id()
      and removed_at is null
  );
$$;

revoke all on function public.is_conversation_participant(uuid)
  from public;

grant execute on function public.is_conversation_participant(uuid)
  to authenticated;

-- =========================================================
-- CREATE STUDENT CONVERSATION RPC
-- =========================================================

create or replace function public.create_student_conversation(
  conversation_subject text default 'General Support'
)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_user_id text;
  created_conversation public.conversations;
  normalized_subject text;
begin
  authenticated_user_id := public.current_clerk_user_id();
  normalized_subject := trim(conversation_subject);

  if authenticated_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if normalized_subject is null
    or char_length(normalized_subject) = 0
  then
    normalized_subject := 'General Support';
  end if;

  if char_length(normalized_subject) > 150 then
    raise exception 'Conversation subject cannot exceed 150 characters.';
  end if;

  insert into public.conversations (
    subject,
    created_by
  )
  values (
    normalized_subject,
    authenticated_user_id
  )
  returning *
  into created_conversation;

  insert into public.conversation_participants (
    conversation_id,
    user_id,
    role
  )
  values (
    created_conversation.id,
    authenticated_user_id,
    'student'
  );

  return created_conversation;
end;
$$;

revoke all on function public.create_student_conversation(text)
  from public;

grant execute on function public.create_student_conversation(text)
  to authenticated;

-- =========================================================
-- MESSAGE ACTIVITY TRIGGER
-- =========================================================

create or replace function public.update_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_at = new.created_at,
    updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists messages_update_conversation_activity
  on public.messages;

create trigger messages_update_conversation_activity
after insert on public.messages
for each row
execute function public.update_conversation_after_message();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_read_receipts enable row level security;

drop policy if exists
  "Participants can view conversations"
  on public.conversations;

create policy
  "Participants can view conversations"
on public.conversations
for select
to authenticated
using (
  public.is_conversation_participant(id)
);

drop policy if exists
  "Participants can update conversations"
  on public.conversations;

create policy
  "Participants can update conversations"
on public.conversations
for update
to authenticated
using (
  public.is_conversation_participant(id)
)
with check (
  public.is_conversation_participant(id)
);

drop policy if exists
  "Participants can view conversation members"
  on public.conversation_participants;

create policy
  "Participants can view conversation members"
on public.conversation_participants
for select
to authenticated
using (
  public.is_conversation_participant(conversation_id)
);

drop policy if exists
  "Users can update their participant record"
  on public.conversation_participants;

create policy
  "Users can update their participant record"
on public.conversation_participants
for update
to authenticated
using (
  user_id = public.current_clerk_user_id()
)
with check (
  user_id = public.current_clerk_user_id()
  and public.is_conversation_participant(conversation_id)
);

drop policy if exists
  "Participants can view messages"
  on public.messages;

create policy
  "Participants can view messages"
on public.messages
for select
to authenticated
using (
  public.is_conversation_participant(conversation_id)
);

drop policy if exists
  "Participants can send messages"
  on public.messages;

create policy
  "Participants can send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = public.current_clerk_user_id()
  and public.is_conversation_participant(conversation_id)
  and message_type in ('text', 'file')
);

drop policy if exists
  "Senders can update their messages"
  on public.messages;

create policy
  "Senders can update their messages"
on public.messages
for update
to authenticated
using (
  sender_id = public.current_clerk_user_id()
  and public.is_conversation_participant(conversation_id)
)
with check (
  sender_id = public.current_clerk_user_id()
  and public.is_conversation_participant(conversation_id)
);

drop policy if exists
  "Participants can view read receipts"
  on public.message_read_receipts;

create policy
  "Participants can view read receipts"
on public.message_read_receipts
for select
to authenticated
using (
  exists (
    select 1
    from public.messages
    where messages.id = message_read_receipts.message_id
      and public.is_conversation_participant(
        messages.conversation_id
      )
  )
);

drop policy if exists
  "Users can create their own read receipts"
  on public.message_read_receipts;

create policy
  "Users can create their own read receipts"
on public.message_read_receipts
for insert
to authenticated
with check (
  user_id = public.current_clerk_user_id()
  and exists (
    select 1
    from public.messages
    where messages.id = message_read_receipts.message_id
      and public.is_conversation_participant(
        messages.conversation_id
      )
  )
);

drop policy if exists
  "Users can update their own read receipts"
  on public.message_read_receipts;

create policy
  "Users can update their own read receipts"
on public.message_read_receipts
for update
to authenticated
using (
  user_id = public.current_clerk_user_id()
)
with check (
  user_id = public.current_clerk_user_id()
);

-- =========================================================
-- REALTIME
-- =========================================================

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime
      add table public.conversations;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_participants'
  ) then
    alter publication supabase_realtime
      add table public.conversation_participants;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime
      add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_read_receipts'
  ) then
    alter publication supabase_realtime
      add table public.message_read_receipts;
  end if;
end
$$;

commit;