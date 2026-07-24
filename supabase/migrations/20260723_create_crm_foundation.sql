begin;

-- Global Scholars Pathway Advisors CRM messaging foundation.
-- Clerk remains the identity provider. Clerk user IDs are stored only as text;
-- UUIDs in this schema are database entity identifiers, not auth user IDs.

create extension if not exists pgcrypto;
create schema if not exists crm;

grant usage on schema crm to authenticated;

-- ---------------------------------------------------------------------------
-- Shared functions
-- ---------------------------------------------------------------------------

create or replace function crm.current_clerk_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

comment on function crm.current_clerk_user_id() is
  'Returns the Clerk user ID from the authenticated request JWT subject.';

revoke all on function crm.current_clerk_user_id() from public;
grant execute on function crm.current_clerk_user_id() to authenticated;

create or replace function crm.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

comment on function crm.set_updated_at() is
  'Maintains updated_at using the transaction statement timestamp.';

revoke all on function crm.set_updated_at() from public;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table crm.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  email text,
  display_name text not null,
  role text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint profiles_clerk_user_id_key unique (clerk_user_id),
  constraint profiles_clerk_user_id_not_blank
    check (char_length(trim(clerk_user_id)) between 1 and 255),
  constraint profiles_email_not_blank
    check (email is null or char_length(trim(email)) between 3 and 320),
  constraint profiles_display_name_length
    check (char_length(trim(display_name)) between 1 and 150),
  constraint profiles_role_check
    check (role in ('student', 'advisor', 'admin')),
  constraint profiles_avatar_url_not_blank
    check (avatar_url is null or char_length(trim(avatar_url)) > 0),
  constraint profiles_deleted_at_check
    check (deleted_at is null or deleted_at >= created_at)
);

comment on table crm.profiles is
  'Application profiles keyed to immutable Clerk user IDs.';
comment on column crm.profiles.id is
  'Internal CRM entity ID. This is not a Supabase Auth user ID.';
comment on column crm.profiles.clerk_user_id is
  'Immutable Clerk user ID from auth.jwt() subject; always stored as text.';
comment on column crm.profiles.role is
  'Application role. Authorization policies do not trust this client-writable value.';
comment on column crm.profiles.deleted_at is
  'Soft-deletion timestamp; null means the profile is active.';

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------

create table crm.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by_profile_id uuid not null,
  subject text not null default 'General Support',
  status text not null default 'open',
  last_message_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint conversations_created_by_profile_id_fkey
    foreign key (created_by_profile_id)
    references crm.profiles(id)
    on delete restrict,
  constraint conversations_subject_length
    check (char_length(trim(subject)) between 1 and 200),
  constraint conversations_status_check
    check (status in ('open', 'resolved', 'archived')),
  constraint conversations_resolved_at_check
    check (
      (status = 'resolved' and resolved_at is not null)
      or (status = 'open' and resolved_at is null)
      or status = 'archived'
    ),
  constraint conversations_last_message_at_check
    check (last_message_at is null or last_message_at >= created_at),
  constraint conversations_deleted_at_check
    check (deleted_at is null or deleted_at >= created_at)
);

comment on table crm.conversations is
  'A durable message thread between one or more CRM profiles.';
comment on column crm.conversations.last_message_at is
  'Denormalized activity timestamp maintained after message insertion for inbox ordering.';
comment on column crm.conversations.deleted_at is
  'Soft-deletion timestamp. Hard deletion is reserved for trusted administrative operations.';

-- ---------------------------------------------------------------------------
-- Conversation participants
-- ---------------------------------------------------------------------------

create table crm.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  profile_id uuid not null,
  participant_role text not null,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint conversation_participants_conversation_id_fkey
    foreign key (conversation_id)
    references crm.conversations(id)
    on delete cascade,
  constraint conversation_participants_profile_id_fkey
    foreign key (profile_id)
    references crm.profiles(id)
    on delete restrict,
  constraint conversation_participants_unique_profile
    unique (conversation_id, profile_id),
  constraint conversation_participants_role_check
    check (participant_role in ('student', 'advisor', 'admin')),
  constraint conversation_participants_last_read_at_check
    check (last_read_at is null or last_read_at >= joined_at),
  constraint conversation_participants_deleted_at_check
    check (deleted_at is null or deleted_at >= joined_at)
);

comment on table crm.conversation_participants is
  'Membership and per-user read/mute state for conversations.';
comment on column crm.conversation_participants.deleted_at is
  'Soft removal timestamp. Active membership requires this value to be null.';

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------

create table crm.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_profile_id uuid not null,
  reply_to_message_id uuid,
  body text,
  message_type text not null default 'text',
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint messages_conversation_id_fkey
    foreign key (conversation_id)
    references crm.conversations(id)
    on delete cascade,
  constraint messages_sender_profile_id_fkey
    foreign key (sender_profile_id)
    references crm.profiles(id)
    on delete restrict,
  constraint messages_reply_to_message_id_fkey
    foreign key (reply_to_message_id)
    references crm.messages(id)
    on delete set null,
  constraint messages_type_check
    check (message_type in ('text', 'file', 'system')),
  constraint messages_content_check
    check (
      (message_type in ('text', 'system')
        and body is not null
        and char_length(trim(body)) between 1 and 10000)
      or
      (message_type = 'file'
        and (body is null or char_length(trim(body)) between 1 and 10000))
    ),
  constraint messages_reply_not_self
    check (reply_to_message_id is null or reply_to_message_id <> id),
  constraint messages_edited_at_check
    check (edited_at is null or edited_at >= created_at),
  constraint messages_deleted_at_check
    check (deleted_at is null or deleted_at >= created_at)
);

comment on table crm.messages is
  'Conversation messages with reply, editing, and soft-deletion support.';
comment on column crm.messages.edited_at is
  'Set automatically when editable message content changes.';
comment on column crm.messages.deleted_at is
  'Soft-deletion timestamp; retained rows preserve conversation history and referential integrity.';

-- ---------------------------------------------------------------------------
-- Attachments
-- ---------------------------------------------------------------------------

create table crm.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  uploaded_by_profile_id uuid not null,
  storage_bucket text not null default 'message-attachments',
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  byte_size bigint not null,
  checksum_sha256 text,
  width integer,
  height integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint attachments_message_id_fkey
    foreign key (message_id)
    references crm.messages(id)
    on delete cascade,
  constraint attachments_uploaded_by_profile_id_fkey
    foreign key (uploaded_by_profile_id)
    references crm.profiles(id)
    on delete restrict,
  constraint attachments_storage_bucket_not_blank
    check (char_length(trim(storage_bucket)) between 1 and 100),
  constraint attachments_storage_path_not_blank
    check (char_length(trim(storage_path)) between 1 and 1024),
  constraint attachments_storage_object_key
    unique (storage_bucket, storage_path),
  constraint attachments_filename_length
    check (char_length(trim(filename)) between 1 and 255),
  constraint attachments_mime_type_length
    check (char_length(trim(mime_type)) between 1 and 255),
  constraint attachments_byte_size_check
    check (byte_size between 1 and 52428800),
  constraint attachments_checksum_sha256_check
    check (
      checksum_sha256 is null
      or checksum_sha256 ~ '^[0-9a-f]{64}$'
    ),
  constraint attachments_dimensions_check
    check (
      (width is null and height is null)
      or (width > 0 and height > 0)
    ),
  constraint attachments_metadata_object_check
    check (jsonb_typeof(metadata) = 'object'),
  constraint attachments_deleted_at_check
    check (deleted_at is null or deleted_at >= created_at)
);

comment on table crm.attachments is
  'Metadata for private Supabase Storage objects attached to messages.';
comment on column crm.attachments.storage_path is
  'Object path only; signed URLs are generated at read time and are never persisted.';
comment on column crm.attachments.byte_size is
  'Object size in bytes, capped at 50 MiB by this schema.';
comment on column crm.attachments.checksum_sha256 is
  'Optional lowercase hexadecimal SHA-256 checksum for integrity verification.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index profiles_active_role_idx
  on crm.profiles (role, created_at desc)
  where deleted_at is null;

create index profiles_active_email_lower_idx
  on crm.profiles (lower(email))
  where email is not null and deleted_at is null;

create index conversations_active_activity_idx
  on crm.conversations (
    coalesce(last_message_at, created_at) desc,
    id
  )
  where deleted_at is null;

create index conversations_creator_idx
  on crm.conversations (created_by_profile_id, created_at desc);

create index conversations_active_status_idx
  on crm.conversations (status, coalesce(last_message_at, created_at) desc)
  where deleted_at is null;

create index conversation_participants_profile_idx
  on crm.conversation_participants (profile_id, conversation_id);

create index messages_conversation_timeline_idx
  on crm.messages (conversation_id, created_at desc, id);

create index messages_sender_timeline_idx
  on crm.messages (sender_profile_id, created_at desc);

create index messages_reply_to_idx
  on crm.messages (reply_to_message_id)
  where reply_to_message_id is not null;

create index attachments_message_idx
  on crm.attachments (message_id, created_at, id);

create index attachments_uploader_idx
  on crm.attachments (uploaded_by_profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- SECURITY DEFINER helpers have an empty search path and fully qualify objects.
-- ---------------------------------------------------------------------------

create or replace function crm.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from crm.profiles as p
  where p.clerk_user_id = crm.current_clerk_user_id()
    and p.deleted_at is null
  limit 1;
$$;

create or replace function crm.current_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from crm.profiles as p
  where p.id = crm.current_profile_id()
  limit 1;
$$;

create or replace function crm.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(crm.current_profile_role() = 'admin', false);
$$;

create or replace function crm.is_conversation_participant(
  target_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from crm.conversation_participants as cp
    join crm.conversations as c
      on c.id = cp.conversation_id
     and c.deleted_at is null
    where cp.conversation_id = target_conversation_id
      and cp.profile_id = crm.current_profile_id()
      and cp.deleted_at is null
  );
$$;

create or replace function crm.is_conversation_creator(
  target_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from crm.conversations as c
    where c.id = target_conversation_id
      and c.created_by_profile_id = crm.current_profile_id()
      and c.deleted_at is null
  );
$$;

create or replace function crm.can_manage_conversation(
  target_conversation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from crm.conversations as c
    where c.id = target_conversation_id
      and c.deleted_at is null
      and (
        crm.is_current_admin()
        or
        (
          c.created_by_profile_id = crm.current_profile_id()
          or exists (
            select 1
            from crm.conversation_participants as cp
            join crm.profiles as p
              on p.id = cp.profile_id
             and p.deleted_at is null
            where cp.conversation_id = c.id
              and cp.profile_id = crm.current_profile_id()
              and cp.deleted_at is null
              and p.role in ('advisor', 'admin')
          )
        )
      )
  );
$$;

create or replace function crm.shares_conversation_with(
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from crm.conversation_participants as mine
    join crm.conversation_participants as theirs
      on theirs.conversation_id = mine.conversation_id
     and theirs.deleted_at is null
    join crm.conversations as c
      on c.id = mine.conversation_id
     and c.deleted_at is null
    where mine.profile_id = crm.current_profile_id()
      and mine.deleted_at is null
      and theirs.profile_id = target_profile_id
  );
$$;

comment on function crm.current_profile_id() is
  'Resolves the active CRM profile for the current Clerk JWT subject.';
comment on function crm.current_profile_role() is
  'Returns the trusted application role for the current active profile.';
comment on function crm.is_current_admin() is
  'Returns true when the current active profile has the admin application role.';
comment on function crm.is_conversation_participant(uuid) is
  'Checks active conversation membership without recursive RLS evaluation.';
comment on function crm.is_conversation_creator(uuid) is
  'Checks whether the current profile created an active conversation.';
comment on function crm.can_manage_conversation(uuid) is
  'Allows creators, assigned advisors, and admins to manage a conversation.';
comment on function crm.shares_conversation_with(uuid) is
  'Checks whether the current profile shares an active conversation with another profile.';

revoke all on function crm.current_profile_id() from public;
revoke all on function crm.current_profile_role() from public;
revoke all on function crm.is_current_admin() from public;
revoke all on function crm.is_conversation_participant(uuid) from public;
revoke all on function crm.is_conversation_creator(uuid) from public;
revoke all on function crm.can_manage_conversation(uuid) from public;
revoke all on function crm.shares_conversation_with(uuid) from public;

grant execute on function crm.current_profile_id() to authenticated;
grant execute on function crm.current_profile_role() to authenticated;
grant execute on function crm.is_current_admin() to authenticated;
grant execute on function crm.is_conversation_participant(uuid) to authenticated;
grant execute on function crm.is_conversation_creator(uuid) to authenticated;
grant execute on function crm.can_manage_conversation(uuid) to authenticated;
grant execute on function crm.shares_conversation_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Integrity and activity triggers
-- ---------------------------------------------------------------------------

create or replace function crm.protect_profile_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.clerk_user_id <> old.clerk_user_id
    or new.created_at <> old.created_at
  then
    raise exception 'Profile identity fields are immutable';
  end if;

  if new.role <> old.role
    and not crm.is_current_admin()
    and coalesce(auth.role(), '') <> 'service_role'
  then
    raise exception 'Only administrators may change profile roles';
  end if;

  return new;
end;
$$;

create or replace function crm.validate_participant_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from crm.profiles as p
    where p.id = new.profile_id
      and p.deleted_at is null
      and p.role = new.participant_role
  )
  then
    raise exception 'Participant role must match the active profile role';
  end if;

  return new;
end;
$$;

create or replace function crm.protect_participant_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.conversation_id <> old.conversation_id
    or new.profile_id <> old.profile_id
    or new.participant_role <> old.participant_role
    or new.joined_at <> old.joined_at
    or new.created_at <> old.created_at
  then
    raise exception 'Conversation participant identity fields are immutable';
  end if;

  return new;
end;
$$;

create or replace function crm.prepare_message_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.conversation_id <> old.conversation_id
    or new.sender_profile_id <> old.sender_profile_id
    or new.created_at <> old.created_at
  then
    raise exception 'Message identity fields are immutable';
  end if;

  if new.body is distinct from old.body
    or new.message_type is distinct from old.message_type
    or new.reply_to_message_id is distinct from old.reply_to_message_id
  then
    new.edited_at := statement_timestamp();
  end if;

  return new;
end;
$$;

create or replace function crm.validate_message_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reply_to_message_id is not null
    and not exists (
      select 1
      from crm.messages as parent
      where parent.id = new.reply_to_message_id
        and parent.conversation_id = new.conversation_id
        and parent.deleted_at is null
    )
  then
    raise exception 'Reply target must be an active message in the same conversation';
  end if;

  return new;
end;
$$;

create or replace function crm.protect_attachment_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.message_id <> old.message_id
    or new.uploaded_by_profile_id <> old.uploaded_by_profile_id
    or new.storage_bucket <> old.storage_bucket
    or new.storage_path <> old.storage_path
    or new.created_at <> old.created_at
  then
    raise exception 'Attachment identity fields are immutable';
  end if;

  return new;
end;
$$;

create or replace function crm.update_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update crm.conversations
  set last_message_at = greatest(
        coalesce(last_message_at, new.created_at),
        new.created_at
      ),
      updated_at = statement_timestamp()
  where id = new.conversation_id
    and deleted_at is null;

  return new;
end;
$$;

revoke all on function crm.protect_profile_identity() from public;
revoke all on function crm.validate_participant_role() from public;
revoke all on function crm.protect_participant_identity() from public;
revoke all on function crm.prepare_message_update() from public;
revoke all on function crm.validate_message_reply() from public;
revoke all on function crm.protect_attachment_identity() from public;
revoke all on function crm.update_conversation_after_message() from public;

create trigger profiles_protect_identity
before update on crm.profiles
for each row execute function crm.protect_profile_identity();

create trigger profiles_set_updated_at
before update on crm.profiles
for each row execute function crm.set_updated_at();

create trigger conversations_set_updated_at
before update on crm.conversations
for each row execute function crm.set_updated_at();

create trigger conversation_participants_protect_identity
before update on crm.conversation_participants
for each row execute function crm.protect_participant_identity();

create trigger conversation_participants_validate_role
before insert or update of profile_id, participant_role
on crm.conversation_participants
for each row execute function crm.validate_participant_role();

create trigger conversation_participants_set_updated_at
before update on crm.conversation_participants
for each row execute function crm.set_updated_at();

create trigger messages_prepare_update
before update on crm.messages
for each row execute function crm.prepare_message_update();

create trigger messages_validate_reply
before insert or update of reply_to_message_id, conversation_id
on crm.messages
for each row execute function crm.validate_message_reply();

create trigger messages_set_updated_at
before update on crm.messages
for each row execute function crm.set_updated_at();

create trigger messages_update_conversation_activity
after insert on crm.messages
for each row execute function crm.update_conversation_after_message();

create trigger attachments_protect_identity
before update on crm.attachments
for each row execute function crm.protect_attachment_identity();

create trigger attachments_set_updated_at
before update on crm.attachments
for each row execute function crm.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table crm.profiles enable row level security;
alter table crm.conversations enable row level security;
alter table crm.conversation_participants enable row level security;
alter table crm.messages enable row level security;
alter table crm.attachments enable row level security;

alter table crm.profiles force row level security;
alter table crm.conversations force row level security;
alter table crm.conversation_participants force row level security;
alter table crm.messages force row level security;
alter table crm.attachments force row level security;

grant select, insert, update on table crm.profiles to authenticated;
grant select, insert, update on table crm.conversations to authenticated;
grant select, insert, update on table crm.conversation_participants to authenticated;
grant select, insert, update on table crm.messages to authenticated;
grant select, insert, update on table crm.attachments to authenticated;

create policy "profiles_select_self_or_conversation_peer"
on crm.profiles
for select
to authenticated
using (
  deleted_at is null
  and (
    clerk_user_id = (select auth.jwt() ->> 'sub')
    or crm.shares_conversation_with(id)
    or crm.is_current_admin()
  )
);

create policy "profiles_insert_student_self"
on crm.profiles
for insert
to authenticated
with check (
  clerk_user_id = (select auth.jwt() ->> 'sub')
  and role = 'student'
  and deleted_at is null
);

create policy "profiles_insert_by_admin"
on crm.profiles
for insert
to authenticated
with check (
  crm.is_current_admin()
  and deleted_at is null
);

create policy "profiles_update_self_or_admin"
on crm.profiles
for update
to authenticated
using (
  deleted_at is null
  and (
    clerk_user_id = (select auth.jwt() ->> 'sub')
    or crm.is_current_admin()
  )
)
with check (
  clerk_user_id = (select auth.jwt() ->> 'sub')
  or crm.is_current_admin()
);

create policy "conversations_select_participant"
on crm.conversations
for select
to authenticated
using (
  deleted_at is null
  and (
    created_by_profile_id = crm.current_profile_id()
    or crm.is_conversation_participant(id)
    or crm.is_current_admin()
  )
);

create policy "conversations_insert_self_as_creator"
on crm.conversations
for insert
to authenticated
with check (
  created_by_profile_id = crm.current_profile_id()
  and deleted_at is null
);

create policy "conversations_update_manager"
on crm.conversations
for update
to authenticated
using (
  crm.can_manage_conversation(id)
)
with check (
  crm.can_manage_conversation(id)
);

create policy "participants_select_conversation_members"
on crm.conversation_participants
for select
to authenticated
using (
  deleted_at is null
  and (
    crm.is_conversation_participant(conversation_id)
    or crm.is_current_admin()
  )
);

create policy "participants_insert_by_conversation_manager"
on crm.conversation_participants
for insert
to authenticated
with check (
  crm.can_manage_conversation(conversation_id)
  and deleted_at is null
);

create policy "participants_update_self_or_manager"
on crm.conversation_participants
for update
to authenticated
using (
  deleted_at is null
  and (
    profile_id = crm.current_profile_id()
    or crm.can_manage_conversation(conversation_id)
  )
)
with check (
  profile_id = crm.current_profile_id()
  or crm.can_manage_conversation(conversation_id)
);

create policy "messages_select_participant"
on crm.messages
for select
to authenticated
using (
  crm.is_conversation_participant(conversation_id)
  or crm.is_current_admin()
);

create policy "messages_insert_participant_as_self"
on crm.messages
for insert
to authenticated
with check (
  sender_profile_id = crm.current_profile_id()
  and crm.is_conversation_participant(conversation_id)
  and message_type in ('text', 'file')
  and deleted_at is null
);

create policy "messages_update_sender_or_admin"
on crm.messages
for update
to authenticated
using (
  deleted_at is null
  and (
    (
      sender_profile_id = crm.current_profile_id()
      and crm.is_conversation_participant(conversation_id)
    )
    or crm.is_current_admin()
  )
)
with check (
  (
    sender_profile_id = crm.current_profile_id()
    and crm.is_conversation_participant(conversation_id)
  )
  or crm.is_current_admin()
);

create policy "attachments_select_participant"
on crm.attachments
for select
to authenticated
using (
  deleted_at is null
  and (
    exists (
      select 1
      from crm.messages as m
      where m.id = attachments.message_id
        and crm.is_conversation_participant(m.conversation_id)
    )
    or crm.is_current_admin()
  )
);

create policy "attachments_insert_participant_as_self"
on crm.attachments
for insert
to authenticated
with check (
  uploaded_by_profile_id = crm.current_profile_id()
  and deleted_at is null
  and exists (
    select 1
    from crm.messages as m
    where m.id = attachments.message_id
      and m.deleted_at is null
      and crm.is_conversation_participant(m.conversation_id)
  )
);

create policy "attachments_update_uploader_or_admin"
on crm.attachments
for update
to authenticated
using (
  deleted_at is null
  and (
    (
      uploaded_by_profile_id = crm.current_profile_id()
      and exists (
        select 1
        from crm.messages as m
        where m.id = attachments.message_id
          and crm.is_conversation_participant(m.conversation_id)
      )
    )
    or crm.is_current_admin()
  )
)
with check (
  uploaded_by_profile_id = crm.current_profile_id()
  or crm.is_current_admin()
);

-- No DELETE policies are intentionally defined. Application clients soft-delete
-- rows through UPDATE; hard deletion is limited to trusted administrative work.

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter table crm.conversations replica identity full;
alter table crm.messages replica identity full;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'conversations',
    'messages'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'crm'
        and tablename = target_table
    ) then
      execute format(
        'alter publication supabase_realtime add table crm.%I',
        target_table
      );
    end if;
  end loop;
end;
$$;

comment on schema crm is
  'Global Scholars CRM schema secured by Clerk JWT subjects and Supabase RLS.';

commit;
