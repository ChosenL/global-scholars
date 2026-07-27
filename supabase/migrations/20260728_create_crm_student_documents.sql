begin;

create table crm.student_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  document_type text not null,
  custom_document_name text,
  original_filename text not null,
  storage_bucket text not null default 'student-documents',
  storage_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  status text not null default 'uploaded',
  review_notes text,
  uploaded_by_profile_id uuid not null,
  reviewed_by_profile_id uuid,
  reviewed_at timestamptz,
  expires_at date,
  replaces_document_id uuid,
  revision_number integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint student_documents_profile_id_fkey
    foreign key (profile_id) references crm.profiles(id) on delete restrict,
  constraint student_documents_uploader_fkey
    foreign key (uploaded_by_profile_id)
    references crm.profiles(id) on delete restrict,
  constraint student_documents_reviewer_fkey
    foreign key (reviewed_by_profile_id)
    references crm.profiles(id) on delete restrict,
  constraint student_documents_replaces_fkey
    foreign key (replaces_document_id)
    references crm.student_documents(id) on delete restrict,
  constraint student_documents_type_check
    check (document_type in (
      'passport', 'transcript', 'degree_certificate',
      'english_test_result', 'cv_resume', 'statement_of_purpose',
      'recommendation_letter', 'financial_document', 'visa_document',
      'birth_certificate', 'national_id', 'application_form',
      'offer_letter', 'other'
    )),
  constraint student_documents_custom_name_check
    check (
      (document_type = 'other'
        and custom_document_name is not null
        and char_length(trim(custom_document_name)) between 2 and 150)
      or
      (document_type <> 'other' and custom_document_name is null)
    ),
  constraint student_documents_filename_length
    check (char_length(trim(original_filename)) between 1 and 255),
  constraint student_documents_bucket_check
    check (storage_bucket = 'student-documents'),
  constraint student_documents_path_length
    check (char_length(trim(storage_path)) between 1 and 1024),
  constraint student_documents_storage_object_key
    unique (storage_bucket, storage_path),
  constraint student_documents_mime_check
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  constraint student_documents_size_check
    check (file_size_bytes between 1 and 10485760),
  constraint student_documents_status_check
    check (status in (
      'uploaded', 'under_review', 'approved',
      'rejected', 'needs_revision', 'expired'
    )),
  constraint student_documents_review_notes_length
    check (
      review_notes is null
      or char_length(trim(review_notes)) between 2 and 5000
    ),
  constraint student_documents_review_metadata_check
    check (
      (
        status = 'uploaded'
        and reviewed_by_profile_id is null
        and reviewed_at is null
        and review_notes is null
      )
      or
      (
        status in (
          'under_review', 'approved', 'rejected',
          'needs_revision', 'expired'
        )
        and reviewed_by_profile_id is not null
        and reviewed_at is not null
      )
    ),
  constraint student_documents_notes_required_check
    check (
      status not in ('rejected', 'needs_revision')
      or (
        review_notes is not null
        and char_length(trim(review_notes)) >= 2
      )
    ),
  constraint student_documents_expiry_check
    check (expires_at is null or expires_at >= created_at::date),
  constraint student_documents_revision_check
    check (revision_number >= 1),
  constraint student_documents_not_self_replacing
    check (replaces_document_id is null or replaces_document_id <> id),
  constraint student_documents_deleted_at_check
    check (deleted_at is null or deleted_at >= created_at)
);

comment on table crm.student_documents is
  'Versioned student-document metadata. File contents remain in private Supabase Storage.';
comment on column crm.student_documents.profile_id is
  'Canonical owning student CRM profile UUID; never a Clerk user ID.';
comment on column crm.student_documents.replaces_document_id is
  'Previous immutable document revision superseded by this row.';

create index student_documents_active_profile_created_idx
  on crm.student_documents (profile_id, created_at desc)
  where deleted_at is null;
create index student_documents_active_profile_type_idx
  on crm.student_documents (profile_id, document_type, revision_number desc)
  where deleted_at is null;
create index student_documents_review_queue_idx
  on crm.student_documents (status, created_at)
  where deleted_at is null
    and status in ('uploaded', 'under_review', 'needs_revision');
create index student_documents_replaces_idx
  on crm.student_documents (replaces_document_id)
  where replaces_document_id is not null;
create index student_documents_expiry_idx
  on crm.student_documents (expires_at)
  where expires_at is not null and deleted_at is null;

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

revoke all on function crm.validate_student_document() from public;

create trigger student_documents_validate
before insert or update on crm.student_documents
for each row execute function crm.validate_student_document();
create trigger student_documents_set_updated_at
before update on crm.student_documents
for each row execute function crm.set_updated_at();

create or replace function crm.review_student_document(
  target_document_id uuid,
  new_status text,
  new_review_notes text default null
)
returns crm.student_documents
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer_id uuid;
  reviewer_role text;
  target_document crm.student_documents;
  result crm.student_documents;
  normalized_notes text;
begin
  reviewer_id := crm.current_profile_id();
  reviewer_role := crm.current_profile_role();
  normalized_notes := nullif(trim(new_review_notes), '');

  if reviewer_id is null or reviewer_role not in ('advisor', 'admin') then
    raise exception 'Only authenticated advisors or administrators may review documents.';
  end if;

  if new_status not in (
    'under_review', 'approved', 'rejected', 'needs_revision', 'expired'
  ) then
    raise exception 'Invalid document review status.';
  end if;

  if new_status in ('rejected', 'needs_revision')
    and (normalized_notes is null or char_length(normalized_notes) < 2)
  then
    raise exception 'Review notes are required for rejected documents and revision requests.';
  end if;

  select * into target_document
  from crm.student_documents
  where id = target_document_id
    and deleted_at is null
  for update;

  if target_document.id is null then
    raise exception 'Active student document not found.';
  end if;

  if not (
    (target_document.status = 'uploaded')
    or (
      target_document.status = 'under_review'
      and new_status in (
        'approved', 'rejected', 'needs_revision', 'expired'
      )
    )
    or (
      target_document.status in (
        'approved', 'rejected', 'needs_revision', 'expired'
      )
      and new_status = 'under_review'
    )
  ) then
    raise exception 'Invalid document review transition from % to %.',
      target_document.status, new_status;
  end if;

  if not crm.can_manage_student(target_document.profile_id) then
    raise exception 'You are not authorized to review this student''s documents.';
  end if;

  update crm.student_documents
  set status = new_status,
      review_notes = normalized_notes,
      reviewed_by_profile_id = reviewer_id,
      reviewed_at = statement_timestamp()
  where id = target_document_id
  returning * into result;

  return result;
end;
$$;

revoke all on function crm.review_student_document(uuid, text, text) from public;
grant execute on function crm.review_student_document(uuid, text, text)
  to authenticated;

alter table crm.student_documents enable row level security;
alter table crm.student_documents force row level security;
grant select, insert, update on crm.student_documents to authenticated;

create policy "student_documents_select_authorized"
on crm.student_documents for select to authenticated
using (
  deleted_at is null
  and (
    profile_id = crm.current_profile_id()
    or crm.shares_conversation_with(profile_id)
    or crm.is_current_admin()
  )
);

create policy "student_documents_insert_owner"
on crm.student_documents for insert to authenticated
with check (
  profile_id = crm.current_profile_id()
  and uploaded_by_profile_id = crm.current_profile_id()
  and crm.current_profile_role() = 'student'
  and status = 'uploaded'
  and reviewed_by_profile_id is null
  and reviewed_at is null
  and review_notes is null
  and deleted_at is null
);

create policy "student_documents_update_owner_or_admin"
on crm.student_documents for update to authenticated
using (
  deleted_at is null
  and (
    profile_id = crm.current_profile_id()
    or crm.is_current_admin()
  )
)
with check (
  profile_id = crm.current_profile_id()
  or crm.is_current_admin()
);

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'student-documents',
  'student-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "CRM authorized users read student documents"
  on storage.objects;
drop policy if exists "CRM students upload own documents"
  on storage.objects;
drop policy if exists "CRM students clean orphan document uploads"
  on storage.objects;

create policy "CRM authorized users read student documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1] = 'students'
  and exists (
    select 1 from crm.student_documents as d
    where d.storage_bucket = bucket_id
      and d.storage_path = name
      and d.deleted_at is null
      and (
        d.profile_id = crm.current_profile_id()
        or crm.shares_conversation_with(d.profile_id)
        or crm.is_current_admin()
      )
  )
);

create policy "CRM students upload own documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1] = 'students'
  and (storage.foldername(name))[2] = crm.current_profile_id()::text
  and crm.current_profile_role() = 'student'
);

create policy "CRM students clean orphan document uploads"
on storage.objects for delete to authenticated
using (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1] = 'students'
  and (storage.foldername(name))[2] = crm.current_profile_id()::text
  and not exists (
    select 1 from crm.student_documents as d
    where d.storage_bucket = bucket_id
      and d.storage_path = name
  )
);

commit;
