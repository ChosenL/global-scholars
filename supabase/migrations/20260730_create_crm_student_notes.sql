begin;

create table crm.student_notes (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null,
  created_by_profile_id uuid not null,
  title text not null,
  body text not null,
  note_type text not null default 'general',
  is_pinned boolean not null default false,
  pinned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint student_notes_student_fkey
    foreign key (student_profile_id) references crm.profiles(id) on delete restrict,
  constraint student_notes_creator_fkey
    foreign key (created_by_profile_id) references crm.profiles(id) on delete restrict,
  constraint student_notes_title_length
    check (char_length(trim(title)) between 2 and 200),
  constraint student_notes_body_length
    check (char_length(trim(body)) between 2 and 10000),
  constraint student_notes_type_check
    check (note_type in (
      'general', 'academic', 'financial', 'visa', 'behavior',
      'communication', 'warning', 'follow_up'
    )),
  constraint student_notes_pinned_at_check
    check (
      (is_pinned and pinned_at is not null)
      or (not is_pinned and pinned_at is null)
    ),
  constraint student_notes_deleted_at_check
    check (deleted_at is null or deleted_at >= created_at)
);

comment on table crm.student_notes is
  'Internal advisor and administrator observations. Never student-visible.';

create index student_notes_active_student_order_idx
  on crm.student_notes (student_profile_id, is_pinned desc, created_at desc)
  where deleted_at is null;
create index student_notes_active_student_type_idx
  on crm.student_notes (student_profile_id, note_type, created_at desc)
  where deleted_at is null;
create index student_notes_creator_idx
  on crm.student_notes (created_by_profile_id, created_at desc);
create index student_notes_active_search_idx
  on crm.student_notes using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
  )
  where deleted_at is null;

create or replace function crm.validate_student_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from crm.profiles as p
    where p.id = new.student_profile_id
      and p.role = 'student'
      and p.deleted_at is null
  ) then
    raise exception 'Note owner must be an active student CRM profile.';
  end if;

  if not exists (
    select 1 from crm.profiles as p
    where p.id = new.created_by_profile_id
      and p.role in ('advisor', 'admin')
      and p.deleted_at is null
  ) then
    raise exception 'Note creator must be an active advisor or administrator CRM profile.';
  end if;

  if tg_op = 'UPDATE' and (
    new.id <> old.id
    or new.student_profile_id <> old.student_profile_id
    or new.created_by_profile_id <> old.created_by_profile_id
    or new.created_at <> old.created_at
  ) then
    raise exception 'Note ownership, creator, and creation audit fields are immutable.';
  end if;

  if tg_op = 'UPDATE'
    and old.deleted_at is not null
  then
    raise exception 'Deleted notes cannot be changed.';
  end if;

  if tg_op = 'UPDATE'
    and new.deleted_at is distinct from old.deleted_at
    and coalesce(current_setting('crm.note_workflow', true), '') <> 'on'
  then
    raise exception 'Note deletion requires the secure workflow.';
  end if;

  return new;
end;
$$;

revoke all on function crm.validate_student_note() from public;

create trigger student_notes_validate
before insert or update on crm.student_notes
for each row execute function crm.validate_student_note();
create trigger student_notes_set_updated_at
before update on crm.student_notes
for each row execute function crm.set_updated_at();

create or replace function crm.create_student_note(
  target_student_profile_id uuid,
  note_title text,
  note_body text,
  new_note_type text default 'general'
)
returns crm.student_notes
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator_id uuid := crm.current_profile_id();
  creator_role text := crm.current_profile_role();
  result crm.student_notes;
begin
  if creator_role not in ('advisor', 'admin') then
    raise exception 'Only advisors or administrators may create notes.';
  end if;
  if not crm.can_manage_student(target_student_profile_id) then
    raise exception 'You are not authorized to create notes for this student.';
  end if;

  insert into crm.student_notes (
    student_profile_id, created_by_profile_id, title, body, note_type
  ) values (
    target_student_profile_id, creator_id, trim(note_title), trim(note_body),
    new_note_type
  ) returning * into result;
  return result;
end;
$$;

create or replace function crm.update_student_note(
  target_note_id uuid,
  note_title text,
  note_body text,
  new_note_type text
)
returns crm.student_notes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text := crm.current_profile_role();
  note crm.student_notes;
  result crm.student_notes;
begin
  select * into note from crm.student_notes
  where id = target_note_id and deleted_at is null for update;
  if note.id is null then raise exception 'Active note not found.'; end if;
  if not crm.can_manage_student(note.student_profile_id) then
    raise exception 'You are not authorized to update this student''s notes.';
  end if;

  update crm.student_notes
  set title = trim(note_title), body = trim(note_body), note_type = new_note_type
  where id = target_note_id returning * into result;
  return result;
end;
$$;

create or replace function crm.pin_student_note(
  target_note_id uuid,
  new_is_pinned boolean
)
returns crm.student_notes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text := crm.current_profile_role();
  note crm.student_notes;
  result crm.student_notes;
begin
  select * into note from crm.student_notes
  where id = target_note_id and deleted_at is null for update;
  if note.id is null then raise exception 'Active note not found.'; end if;
  if not crm.can_manage_student(note.student_profile_id) then
    raise exception 'You are not authorized to pin this student''s notes.';
  end if;

  update crm.student_notes
  set is_pinned = new_is_pinned,
      pinned_at = case when new_is_pinned then statement_timestamp() else null end
  where id = target_note_id returning * into result;
  return result;
end;
$$;

create or replace function crm.soft_delete_student_note(target_note_id uuid)
returns crm.student_notes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text := crm.current_profile_role();
  note crm.student_notes;
  result crm.student_notes;
begin
  select * into note from crm.student_notes
  where id = target_note_id and deleted_at is null for update;
  if note.id is null then raise exception 'Active note not found.'; end if;
  if not crm.can_manage_student(note.student_profile_id) then
    raise exception 'You are not authorized to delete this student''s notes.';
  end if;

  perform set_config('crm.note_workflow', 'on', true);
  update crm.student_notes
  set deleted_at = statement_timestamp()
  where id = target_note_id returning * into result;
  return result;
end;
$$;

revoke all on function crm.create_student_note(uuid,text,text,text) from public;
revoke all on function crm.update_student_note(uuid,text,text,text) from public;
revoke all on function crm.pin_student_note(uuid,boolean) from public;
revoke all on function crm.soft_delete_student_note(uuid) from public;
grant execute on function crm.create_student_note(uuid,text,text,text) to authenticated;
grant execute on function crm.update_student_note(uuid,text,text,text) to authenticated;
grant execute on function crm.pin_student_note(uuid,boolean) to authenticated;
grant execute on function crm.soft_delete_student_note(uuid) to authenticated;

alter table crm.student_notes enable row level security;
alter table crm.student_notes force row level security;
grant select on crm.student_notes to authenticated;

create policy "student_notes_select_authorized_staff"
on crm.student_notes for select to authenticated
using (
  deleted_at is null
  and (
    (
      crm.current_profile_role() = 'advisor'
      and crm.shares_conversation_with(student_profile_id)
    )
    or crm.is_current_admin()
  )
);

commit;
