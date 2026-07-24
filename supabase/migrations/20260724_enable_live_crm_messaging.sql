begin;

-- Allow authenticated Clerk users to provision exactly one profile whose role
-- matches trusted Clerk session metadata. Missing metadata defaults to student.
drop policy if exists "profiles_insert_student_self" on crm.profiles;

create policy "profiles_insert_self_from_clerk"
on crm.profiles
for insert
to authenticated
with check (
  clerk_user_id = (select auth.jwt() ->> 'sub')
  and role = coalesce(
    (select auth.jwt() -> 'metadata' ->> 'role'),
    'student'
  )
  and role in ('student', 'advisor', 'admin')
  and deleted_at is null
);

comment on policy "profiles_insert_self_from_clerk" on crm.profiles is
  'Creates one Clerk-backed CRM profile using the signed application role claim.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'message-attachments',
  'message-attachments',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "CRM participants can read message attachments"
  on storage.objects;
drop policy if exists "CRM participants can upload message attachments"
  on storage.objects;
drop policy if exists "CRM uploaders can delete message attachments"
  on storage.objects;

create policy "CRM participants can read message attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = 'messages'
  and (
    crm.is_conversation_participant(
      ((storage.foldername(name))[2])::uuid
    )
    or crm.is_current_admin()
  )
);

create policy "CRM participants can upload message attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = 'messages'
  and (storage.foldername(name))[3] =
    crm.current_profile_id()::text
  and crm.is_conversation_participant(
    ((storage.foldername(name))[2])::uuid
  )
);

create policy "CRM uploaders can delete message attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-attachments'
  and (storage.foldername(name))[1] = 'messages'
  and (
    (
      (storage.foldername(name))[3] =
        crm.current_profile_id()::text
      and crm.is_conversation_participant(
        ((storage.foldername(name))[2])::uuid
      )
    )
    or crm.is_current_admin()
  )
);

commit;
