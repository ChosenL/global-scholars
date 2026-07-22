-- ============================================================================
-- Global Scholars Pathway Advisors
-- Secure private storage for messaging attachments
-- ============================================================================

begin;

-- Create or update the private bucket used by student-facing file features.
--
-- Messaging object paths must follow:
--   messages/{conversation_id}/{user_id}/{uuid}-{sanitized_file_name}
--
-- The 10 MB bucket limit is also enforced in the application UI.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'student-files',
  'student-files',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Remove earlier versions safely if this migration is rerun manually.
drop policy if exists
  "Messaging participants can read attachments"
  on storage.objects;

drop policy if exists
  "Messaging participants can upload attachments"
  on storage.objects;

drop policy if exists
  "Message senders can delete attachments"
  on storage.objects;

-- Participants may read attachments only when:
-- 1. the object belongs to the private student-files bucket,
-- 2. the first folder is messages,
-- 3. the second folder is a conversation in which the current user is active.
create policy
  "Messaging participants can read attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-files'
  and (storage.foldername(name))[1] = 'messages'
  and exists (
    select 1
    from public.conversation_participants as participant
    where participant.conversation_id::text =
      (storage.foldername(name))[2]
      and participant.user_id =
        (select auth.jwt() ->> 'sub')
      and participant.removed_at is null
  )
);

-- Active participants may upload only into their own user folder inside a
-- conversation they belong to. This prevents one user from writing files under
-- another user's identity.
create policy
  "Messaging participants can upload attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-files'
  and (storage.foldername(name))[1] = 'messages'
  and (storage.foldername(name))[3] =
    (select auth.jwt() ->> 'sub')
  and exists (
    select 1
    from public.conversation_participants as participant
    where participant.conversation_id::text =
      (storage.foldername(name))[2]
      and participant.user_id =
        (select auth.jwt() ->> 'sub')
      and participant.removed_at is null
  )
);

-- Users may delete only attachments stored in their own user folder, and only
-- while they remain an active participant in that conversation.
create policy
  "Message senders can delete attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-files'
  and (storage.foldername(name))[1] = 'messages'
  and (storage.foldername(name))[3] =
    (select auth.jwt() ->> 'sub')
  and exists (
    select 1
    from public.conversation_participants as participant
    where participant.conversation_id::text =
      (storage.foldername(name))[2]
      and participant.user_id =
        (select auth.jwt() ->> 'sub')
      and participant.removed_at is null
  )
);

commit;