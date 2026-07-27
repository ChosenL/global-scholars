begin;

-- Transactional parser check for the trigger body. This creates only the
-- minimum relation needed to resolve the composite variable when the migration
-- has not yet been applied. Everything is rolled back.
create table if not exists crm.student_documents (
  id uuid,
  profile_id uuid,
  document_type text,
  custom_document_name text,
  original_filename text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint,
  status text,
  review_notes text,
  uploaded_by_profile_id uuid,
  reviewed_by_profile_id uuid,
  reviewed_at timestamptz,
  expires_at date,
  replaces_document_id uuid,
  revision_number integer,
  created_at timestamptz,
  deleted_at timestamptz
);

create or replace function crm.validate_student_document()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_document crm.student_documents;
  actor_role text;
begin
  if not exists (
    select 1 from crm.profiles as p
    where p.id = new.profile_id
      and p.role = 'student'
      and p.deleted_at is null
  ) then
    raise exception 'Document owner must be an active student CRM profile.';
  end if;

  if not exists (
    select 1 from crm.profiles as p
    where p.id = new.uploaded_by_profile_id
      and p.deleted_at is null
  ) then
    raise exception 'Document uploader must be an active CRM profile.';
  end if;

  if new.reviewed_by_profile_id is not null and not exists (
    select 1 from crm.profiles as p
    where p.id = new.reviewed_by_profile_id
      and p.role in ('advisor', 'admin')
      and p.deleted_at is null
  ) then
    raise exception 'Document reviewer must be an active advisor or administrator.';
  end if;

  if new.storage_path not like (
    'students/' || new.profile_id::text || '/' || new.id::text || '/%'
  )
    or (storage.foldername(new.storage_path))[4] is null
    or (storage.foldername(new.storage_path))[4]
      !~ '^[a-z0-9][a-z0-9._-]{0,254}$'
  then
    raise exception 'Document storage path does not match its CRM ownership metadata.';
  end if;

  if new.replaces_document_id is not null then
    select * into previous_document
    from crm.student_documents
    where id = new.replaces_document_id;

    if previous_document.id is null
      or previous_document.profile_id <> new.profile_id
      or previous_document.document_type <> new.document_type
      or previous_document.custom_document_name is distinct from new.custom_document_name
      or new.revision_number <> previous_document.revision_number + 1
    then
      raise exception 'Document revision must follow the previous revision for the same student and type.';
    end if;
  elsif new.revision_number <> 1 then
    raise exception 'An initial document must use revision number 1.';
  end if;

  if tg_op = 'UPDATE' then
    if new.id <> old.id
      or new.profile_id <> old.profile_id
      or new.document_type <> old.document_type
      or new.custom_document_name is distinct from old.custom_document_name
      or new.original_filename <> old.original_filename
      or new.storage_bucket <> old.storage_bucket
      or new.storage_path <> old.storage_path
      or new.mime_type <> old.mime_type
      or new.file_size_bytes <> old.file_size_bytes
      or new.uploaded_by_profile_id <> old.uploaded_by_profile_id
      or new.replaces_document_id is distinct from old.replaces_document_id
      or new.revision_number <> old.revision_number
      or new.created_at <> old.created_at
    then
      raise exception 'Document upload and revision identity fields are immutable.';
    end if;

    actor_role := crm.current_profile_role();
    if actor_role = 'student' and (
      new.status <> old.status
      or new.review_notes is distinct from old.review_notes
      or new.reviewed_by_profile_id is distinct from old.reviewed_by_profile_id
      or new.reviewed_at is distinct from old.reviewed_at
      or new.expires_at is distinct from old.expires_at
    ) then
      raise exception 'Students cannot modify document review fields.';
    end if;
  end if;

  return new;
end;
$$;

rollback;
