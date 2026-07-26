begin;

create table crm.student_tasks (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null,
  title text not null,
  description text,
  status text not null default 'not_started',
  priority text not null default 'normal',
  visibility text not null default 'student',
  assigned_to_profile_id uuid not null,
  created_by_profile_id uuid not null,
  completed_by_profile_id uuid,
  document_id uuid,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint student_tasks_student_fkey
    foreign key (student_profile_id)
    references crm.profiles(id) on delete restrict,
  constraint student_tasks_assignee_fkey
    foreign key (assigned_to_profile_id)
    references crm.profiles(id) on delete restrict,
  constraint student_tasks_creator_fkey
    foreign key (created_by_profile_id)
    references crm.profiles(id) on delete restrict,
  constraint student_tasks_completer_fkey
    foreign key (completed_by_profile_id)
    references crm.profiles(id) on delete restrict,
  constraint student_tasks_document_fkey
    foreign key (document_id)
    references crm.student_documents(id) on delete set null,
  constraint student_tasks_title_length
    check (char_length(trim(title)) between 2 and 200),
  constraint student_tasks_description_length
    check (
      description is null
      or char_length(trim(description)) between 2 and 5000
    ),
  constraint student_tasks_status_check
    check (status in (
      'not_started', 'in_progress', 'blocked', 'completed', 'cancelled'
    )),
  constraint student_tasks_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent')),
  constraint student_tasks_visibility_check
    check (visibility in ('student', 'internal')),
  constraint student_tasks_completion_check
    check (
      (
        status = 'completed'
        and completed_by_profile_id is not null
        and completed_at is not null
        and cancelled_at is null
      )
      or
      (
        status <> 'completed'
        and completed_by_profile_id is null
        and completed_at is null
      )
    ),
  constraint student_tasks_cancellation_check
    check (
      (status = 'cancelled' and cancelled_at is not null)
      or (status <> 'cancelled' and cancelled_at is null)
    ),
  constraint student_tasks_started_at_check
    check (
      started_at is null
      or (completed_at is null or started_at <= completed_at)
    ),
  constraint student_tasks_deleted_at_check
    check (deleted_at is null or deleted_at >= created_at)
);

comment on table crm.student_tasks is
  'Auditable student admissions tasks with CRM UUID ownership, assignment, visibility, and optional document links.';
comment on column crm.student_tasks.visibility is
  'student rows are visible to the owning student; internal rows are advisor/admin only.';

create index student_tasks_active_student_created_idx
  on crm.student_tasks (student_profile_id, created_at desc)
  where deleted_at is null;
create index student_tasks_active_assignee_due_idx
  on crm.student_tasks (assigned_to_profile_id, due_at)
  where deleted_at is null
    and status in ('not_started', 'in_progress', 'blocked');
create index student_tasks_open_due_idx
  on crm.student_tasks (due_at, priority)
  where deleted_at is null
    and due_at is not null
    and status in ('not_started', 'in_progress', 'blocked');
create index student_tasks_open_priority_idx
  on crm.student_tasks (priority, created_at)
  where deleted_at is null
    and status in ('not_started', 'in_progress', 'blocked');
create index student_tasks_student_visible_idx
  on crm.student_tasks (student_profile_id, status, due_at)
  where deleted_at is null and visibility = 'student';
create index student_tasks_document_idx
  on crm.student_tasks (document_id)
  where document_id is not null and deleted_at is null;

create or replace function crm.validate_student_task()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignee crm.profiles;
begin
  if not exists (
    select 1 from crm.profiles as p
    where p.id = new.student_profile_id
      and p.role = 'student'
      and p.deleted_at is null
  ) then
    raise exception 'Task owner must be an active student CRM profile.';
  end if;

  select * into assignee
  from crm.profiles
  where id = new.assigned_to_profile_id
    and deleted_at is null;

  if assignee.id is null or assignee.role not in ('student', 'advisor', 'admin') then
    raise exception 'Task assignee must be an active permitted CRM profile.';
  end if;

  if assignee.role = 'student'
    and (
      new.assigned_to_profile_id <> new.student_profile_id
      or new.visibility <> 'student'
    )
  then
    raise exception 'Student assignees must own a student-visible task.';
  end if;

  if assignee.role = 'advisor'
    and not exists (
      select 1
      from crm.conversation_participants as advisor_membership
      join crm.conversation_participants as student_membership
        on student_membership.conversation_id =
          advisor_membership.conversation_id
       and student_membership.deleted_at is null
      join crm.conversations as c
        on c.id = advisor_membership.conversation_id
       and c.deleted_at is null
      where advisor_membership.profile_id = assignee.id
        and advisor_membership.deleted_at is null
        and student_membership.profile_id = new.student_profile_id
    )
  then
    raise exception 'Advisor assignee is not authorized for this student.';
  end if;

  if new.document_id is not null and not exists (
    select 1 from crm.student_documents as d
    where d.id = new.document_id
      and d.profile_id = new.student_profile_id
      and d.deleted_at is null
  ) then
    raise exception 'Linked document must be an active document owned by the same student.';
  end if;

  if tg_op = 'UPDATE'
    and coalesce(current_setting('crm.task_workflow', true), '') <> 'on'
    and (
    new.id <> old.id
    or new.student_profile_id <> old.student_profile_id
    or new.created_by_profile_id <> old.created_by_profile_id
    or new.completed_by_profile_id is distinct from old.completed_by_profile_id
    or new.completed_at is distinct from old.completed_at
    or new.cancelled_at is distinct from old.cancelled_at
    or new.created_at <> old.created_at
    or new.deleted_at is distinct from old.deleted_at
    ) then
    raise exception 'Task ownership, actor, terminal, and audit fields require a secure workflow.';
  end if;

  return new;
end;
$$;

revoke all on function crm.validate_student_task() from public;

create trigger student_tasks_validate
before insert or update on crm.student_tasks
for each row execute function crm.validate_student_task();
create trigger student_tasks_set_updated_at
before update on crm.student_tasks
for each row execute function crm.set_updated_at();

create or replace function crm.create_student_task(
  target_student_profile_id uuid,
  task_title text,
  task_description text,
  task_priority text,
  task_visibility text,
  target_assigned_to_profile_id uuid,
  task_due_at timestamptz default null,
  target_document_id uuid default null
)
returns crm.student_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator_id uuid := crm.current_profile_id();
  creator_role text := crm.current_profile_role();
  result crm.student_tasks;
begin
  if creator_role not in ('advisor', 'admin') then
    raise exception 'Only advisors or administrators may create student tasks.';
  end if;
  if not crm.can_manage_student(target_student_profile_id) then
    raise exception 'You are not authorized to create tasks for this student.';
  end if;

  insert into crm.student_tasks (
    student_profile_id, title, description, priority, visibility,
    assigned_to_profile_id, created_by_profile_id, due_at, document_id
  ) values (
    target_student_profile_id,
    trim(task_title),
    nullif(trim(task_description), ''),
    task_priority,
    task_visibility,
    target_assigned_to_profile_id,
    creator_id,
    task_due_at,
    target_document_id
  )
  returning * into result;
  return result;
end;
$$;

create or replace function crm.update_student_task_status(
  target_task_id uuid,
  new_status text
)
returns crm.student_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := crm.current_profile_id();
  actor_role text := crm.current_profile_role();
  task crm.student_tasks;
  result crm.student_tasks;
begin
  select * into task from crm.student_tasks
  where id = target_task_id and deleted_at is null
  for update;
  if task.id is null then raise exception 'Active task not found.'; end if;

  if actor_role = 'student' and not (
    task.student_profile_id = actor_id
    and task.assigned_to_profile_id = actor_id
    and task.visibility = 'student'
  ) then
    raise exception 'You cannot update this task.';
  elsif actor_role in ('advisor', 'admin')
    and not crm.can_manage_student(task.student_profile_id) then
    raise exception 'You are not authorized to update this student''s tasks.';
  elsif actor_role not in ('student', 'advisor', 'admin') then
    raise exception 'Task status access denied.';
  end if;

  if not (
    (task.status = 'not_started'
      and new_status in ('in_progress', 'blocked', 'completed', 'cancelled'))
    or (task.status = 'in_progress'
      and new_status in ('blocked', 'completed', 'cancelled'))
    or (task.status = 'blocked'
      and new_status in ('in_progress', 'completed', 'cancelled'))
  ) then
    raise exception 'Invalid task transition from % to %.',
      task.status, new_status;
  end if;

  perform set_config('crm.task_workflow', 'on', true);
  update crm.student_tasks set
    status = new_status,
    started_at = case
      when new_status = 'in_progress' then coalesce(started_at, statement_timestamp())
      else started_at
    end,
    completed_by_profile_id = case when new_status = 'completed' then actor_id else null end,
    completed_at = case when new_status = 'completed' then statement_timestamp() else null end,
    cancelled_at = case when new_status = 'cancelled' then statement_timestamp() else null end
  where id = target_task_id
  returning * into result;
  return result;
end;
$$;

create or replace function crm.update_student_task(
  target_task_id uuid,
  task_title text,
  task_description text,
  task_priority text,
  task_visibility text,
  target_assigned_to_profile_id uuid,
  task_due_at timestamptz default null,
  target_document_id uuid default null
)
returns crm.student_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text := crm.current_profile_role();
  task crm.student_tasks;
  result crm.student_tasks;
begin
  select * into task from crm.student_tasks
  where id = target_task_id and deleted_at is null
  for update;
  if task.id is null then raise exception 'Active task not found.'; end if;
  if not crm.can_manage_student(task.student_profile_id) then
    raise exception 'You are not authorized to edit this student''s tasks.';
  end if;
  if task.status in ('completed', 'cancelled') then
    raise exception 'Terminal tasks cannot be edited.';
  end if;

  update crm.student_tasks set
    title = trim(task_title),
    description = nullif(trim(task_description), ''),
    priority = task_priority,
    visibility = task_visibility,
    assigned_to_profile_id = target_assigned_to_profile_id,
    due_at = task_due_at,
    document_id = target_document_id
  where id = target_task_id
  returning * into result;
  return result;
end;
$$;

create or replace function crm.soft_delete_student_task(
  target_task_id uuid
)
returns crm.student_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text := crm.current_profile_role();
  task crm.student_tasks;
  result crm.student_tasks;
begin
  select * into task from crm.student_tasks
  where id = target_task_id and deleted_at is null
  for update;
  if task.id is null then raise exception 'Active task not found.'; end if;
  if not crm.can_manage_student(task.student_profile_id) then
    raise exception 'You are not authorized to delete this student''s tasks.';
  end if;

  perform set_config('crm.task_workflow', 'on', true);
  update crm.student_tasks
  set deleted_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where id = target_task_id
  returning * into result;
  return result;
end;
$$;

revoke all on function crm.create_student_task(uuid,text,text,text,text,uuid,timestamptz,uuid) from public;
revoke all on function crm.update_student_task_status(uuid,text) from public;
revoke all on function crm.update_student_task(uuid,text,text,text,text,uuid,timestamptz,uuid) from public;
revoke all on function crm.soft_delete_student_task(uuid) from public;
grant execute on function crm.create_student_task(uuid,text,text,text,text,uuid,timestamptz,uuid) to authenticated;
grant execute on function crm.update_student_task_status(uuid,text) to authenticated;
grant execute on function crm.update_student_task(uuid,text,text,text,text,uuid,timestamptz,uuid) to authenticated;
grant execute on function crm.soft_delete_student_task(uuid) to authenticated;

alter table crm.student_tasks enable row level security;
alter table crm.student_tasks force row level security;
grant select on crm.student_tasks to authenticated;

create policy "student_tasks_select_authorized"
on crm.student_tasks for select to authenticated
using (
  deleted_at is null
  and (
    (
      student_profile_id = crm.current_profile_id()
      and visibility = 'student'
    )
    or (
      crm.current_profile_role() = 'advisor'
      and crm.shares_conversation_with(student_profile_id)
    )
    or crm.is_current_admin()
  )
);

commit;
