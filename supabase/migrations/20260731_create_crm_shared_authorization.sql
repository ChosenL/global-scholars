begin;

create or replace function crm.can_access_student(target_student_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from crm.profiles as student
    where student.id = target_student_profile_id
      and student.role = 'student'
      and student.deleted_at is null
      and (
        student.id = crm.current_profile_id()
        or crm.is_current_admin()
        or (
          crm.current_profile_role() = 'advisor'
          and crm.shares_conversation_with(student.id)
        )
      )
  );
$$;

create or replace function crm.can_manage_student(target_student_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from crm.profiles as student
    where student.id = target_student_profile_id
      and student.role = 'student'
      and student.deleted_at is null
      and (
        crm.is_current_admin()
        or (
          crm.current_profile_role() = 'advisor'
          and crm.shares_conversation_with(student.id)
        )
      )
  );
$$;

create or replace function crm.can_access_document(target_document_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from crm.student_documents as document
    where document.id = target_document_id
      and document.deleted_at is null
      and crm.can_access_student(document.profile_id)
  );
$$;

create or replace function crm.can_access_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from crm.student_tasks as task
    where task.id = target_task_id
      and task.deleted_at is null
      and (
        crm.can_manage_student(task.student_profile_id)
        or (
          task.student_profile_id = crm.current_profile_id()
          and task.visibility = 'student'
        )
      )
  );
$$;

create or replace function crm.can_access_note(target_note_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from crm.student_notes as note
    where note.id = target_note_id
      and note.deleted_at is null
      and crm.can_manage_student(note.student_profile_id)
  );
$$;

comment on function crm.can_access_student(uuid) is
  'Central read authorization for an active student CRM profile.';
comment on function crm.can_manage_student(uuid) is
  'Central advisor/admin operational authorization for an active student CRM profile.';
comment on function crm.can_access_document(uuid) is
  'Central active-document authorization derived from CRM student access.';
comment on function crm.can_access_task(uuid) is
  'Central active-task authorization including student visibility.';
comment on function crm.can_access_note(uuid) is
  'Central internal-note authorization. Students always receive false.';

revoke all on function crm.can_access_student(uuid) from public;
revoke all on function crm.can_manage_student(uuid) from public;
revoke all on function crm.can_access_document(uuid) from public;
revoke all on function crm.can_access_task(uuid) from public;
revoke all on function crm.can_access_note(uuid) from public;
grant execute on function crm.can_access_student(uuid) to authenticated;
grant execute on function crm.can_manage_student(uuid) to authenticated;
grant execute on function crm.can_access_document(uuid) to authenticated;
grant execute on function crm.can_access_task(uuid) to authenticated;
grant execute on function crm.can_access_note(uuid) to authenticated;

create or replace function crm.authorize_student_resource_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resource_type text := tg_argv[0];
  student_id uuid;
  student_owns_resource boolean := false;
begin
  if session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if resource_type = 'document' then
    student_id := new.profile_id;
    student_owns_resource :=
      new.profile_id = crm.current_profile_id()
      and new.uploaded_by_profile_id = crm.current_profile_id();
  elsif resource_type = 'task' then
    student_id := new.student_profile_id;
    student_owns_resource :=
      tg_op = 'UPDATE'
      and new.student_profile_id = crm.current_profile_id()
      and new.assigned_to_profile_id = crm.current_profile_id()
      and new.visibility = 'student';
  elsif resource_type = 'note' then
    student_id := new.student_profile_id;
  else
    raise exception 'Unsupported student resource type.';
  end if;

  if not student_owns_resource and not crm.can_manage_student(student_id) then
    raise exception 'Student resource access denied.';
  end if;
  return new;
end;
$$;
revoke all on function crm.authorize_student_resource_mutation() from public;

create trigger student_documents_authorize_mutation
before insert or update on crm.student_documents
for each row execute function crm.authorize_student_resource_mutation('document');
create trigger student_tasks_authorize_mutation
before insert or update on crm.student_tasks
for each row execute function crm.authorize_student_resource_mutation('task');
create trigger student_notes_authorize_mutation
before insert or update on crm.student_notes
for each row execute function crm.authorize_student_resource_mutation('note');

drop policy if exists "student_profiles_select_authorized" on crm.student_profiles;
create policy "student_profiles_select_authorized"
on crm.student_profiles for select to authenticated
using (deleted_at is null and crm.can_access_student(profile_id));

drop policy if exists "student_documents_select_authorized" on crm.student_documents;
create policy "student_documents_select_authorized"
on crm.student_documents for select to authenticated
using (crm.can_access_document(id));

drop policy if exists "CRM authorized users read student documents"
  on storage.objects;
create policy "CRM authorized users read student documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1] = 'students'
  and exists (
    select 1 from crm.student_documents as document
    where document.storage_bucket = bucket_id
      and document.storage_path = name
      and crm.can_access_document(document.id)
  )
);

drop policy if exists "student_tasks_select_authorized" on crm.student_tasks;
create policy "student_tasks_select_authorized"
on crm.student_tasks for select to authenticated
using (crm.can_access_task(id));

drop policy if exists "student_notes_select_authorized_staff" on crm.student_notes;
create policy "student_notes_select_authorized_staff"
on crm.student_notes for select to authenticated
using (crm.can_access_note(id));

commit;
