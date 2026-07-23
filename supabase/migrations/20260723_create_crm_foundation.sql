-- The application already has a legacy public messaging schema in active use.
-- The CRM foundation is isolated so the current UI can continue operating
-- unchanged until the dedicated integration and RLS migration.

create extension if not exists pgcrypto;

create schema if not exists crm;

create table crm.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text,
  display_name text,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_clerk_user_id_not_blank
    check (char_length(trim(clerk_user_id)) > 0),
  constraint profiles_role_check
    check (role in ('student', 'advisor', 'admin'))
);

create table crm.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm.conversation_participants (
  conversation_id uuid not null
    references crm.conversations(id)
    on delete cascade,
  profile_id uuid not null
    references crm.profiles(id)
    on delete cascade,
  joined_at timestamptz not null default now(),

  primary key (conversation_id, profile_id)
);

create table crm.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references crm.conversations(id)
    on delete cascade,
  sender_profile_id uuid not null
    references crm.profiles(id)
    on delete restrict,
  body text,
  message_type text not null default 'text',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint messages_type_check
    check (message_type in ('text', 'file', 'system')),
  constraint messages_body_length_check
    check (body is null or char_length(body) <= 10000)
);

create table crm.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null
    references crm.messages(id)
    on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text,
  size bigint,
  uploaded_by uuid not null
    references crm.profiles(id)
    on delete restrict,
  created_at timestamptz not null default now(),

  constraint attachments_storage_path_not_blank
    check (char_length(trim(storage_path)) > 0),
  constraint attachments_filename_not_blank
    check (char_length(trim(filename)) > 0),
  constraint attachments_size_check
    check (size is null or size >= 0)
);

create index profiles_role_idx
  on crm.profiles(role);

create index profiles_email_idx
  on crm.profiles(email)
  where email is not null;

create index conversation_participants_profile_id_idx
  on crm.conversation_participants(profile_id, conversation_id);

create index conversations_updated_at_idx
  on crm.conversations(updated_at desc);

create index messages_conversation_created_at_idx
  on crm.messages(conversation_id, created_at desc);

create index messages_sender_profile_id_idx
  on crm.messages(sender_profile_id);

create index attachments_message_id_idx
  on crm.attachments(message_id);

create index attachments_uploaded_by_idx
  on crm.attachments(uploaded_by);

create or replace function crm.set_updated_at()
returns trigger
language plpgsql
set search_path = crm
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on crm.profiles
for each row execute function crm.set_updated_at();

create trigger conversations_set_updated_at
before update on crm.conversations
for each row execute function crm.set_updated_at();

create trigger messages_set_updated_at
before update on crm.messages
for each row execute function crm.set_updated_at();

comment on schema crm is
  'CRM foundation. RLS and application integration are intentionally deferred.';
