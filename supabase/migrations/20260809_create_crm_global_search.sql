begin;

create index if not exists profiles_global_search_idx
  on crm.profiles using gin (
    to_tsvector('simple',
      coalesce(display_name, '') || ' ' || coalesce(email, '')
    )
  ) where deleted_at is null;
create index if not exists student_profiles_global_search_idx
  on crm.student_profiles using gin (
    to_tsvector('simple',
      coalesce(nationality, '') || ' '
      || coalesce(current_country, '') || ' '
      || coalesce(institution, '') || ' '
      || coalesce(preferred_destination_country, '') || ' '
      || coalesce(preferred_degree, '') || ' '
      || coalesce(preferred_program, '') || ' '
      || coalesce(intended_intake, '')
    )
  ) where deleted_at is null;
create index if not exists student_documents_global_search_idx
  on crm.student_documents using gin (
    to_tsvector('simple',
      coalesce(original_filename, '') || ' '
      || coalesce(custom_document_name, '') || ' '
      || coalesce(document_type, '')
    )
  ) where deleted_at is null;
create index if not exists student_tasks_global_search_idx
  on crm.student_tasks using gin (
    to_tsvector('simple',
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  ) where deleted_at is null;

create or replace function crm.global_search(
  search_query text,
  result_limit integer default 50,
  result_offset integer default 0
)
returns table (
  result_type text,
  result_id uuid,
  student_profile_id uuid,
  title text,
  summary text,
  rank real,
  metadata jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  query tsquery;
begin
  if char_length(trim(search_query)) < 2 then
    raise exception 'Search query must contain at least two characters.';
  end if;
  if result_limit not between 1 and 100 or result_offset < 0 then
    raise exception 'Search pagination is invalid.';
  end if;
  query := websearch_to_tsquery('simple', trim(search_query));

  return query
  with results as (
    select
      'profile'::text as result_type,
      profile.id as result_id,
      case when profile.role = 'student' then profile.id else null end
        as student_profile_id,
      profile.display_name as title,
      profile.role as summary,
      ts_rank(
        to_tsvector('simple',
          coalesce(profile.display_name, '') || ' ' || coalesce(profile.email, '')
        ), query
      ) as rank,
      jsonb_build_object('role', profile.role) as metadata
    from crm.profiles as profile
    where profile.deleted_at is null
      and to_tsvector('simple',
        coalesce(profile.display_name, '') || ' ' || coalesce(profile.email, '')
      ) @@ query
      and (
        profile.id = crm.current_profile_id()
        or crm.is_current_admin()
        or (
          profile.role = 'student'
          and crm.can_access_student(profile.id)
        )
      )

    union all

    select
      'student'::text, student.profile_id, student.profile_id,
      identity.display_name,
      concat_ws(' · ', student.preferred_program,
        student.preferred_destination_country),
      ts_rank(
        to_tsvector('simple',
          coalesce(student.nationality, '') || ' '
          || coalesce(student.current_country, '') || ' '
          || coalesce(student.institution, '') || ' '
          || coalesce(student.preferred_destination_country, '') || ' '
          || coalesce(student.preferred_degree, '') || ' '
          || coalesce(student.preferred_program, '') || ' '
          || coalesce(student.intended_intake, '')
        ), query
      ),
      jsonb_build_object(
        'destination', student.preferred_destination_country,
        'program', student.preferred_program
      )
    from crm.student_profiles as student
    join crm.profiles as identity on identity.id = student.profile_id
    where student.deleted_at is null
      and identity.deleted_at is null
      and crm.can_access_student(student.profile_id)
      and to_tsvector('simple',
        coalesce(student.nationality, '') || ' '
        || coalesce(student.current_country, '') || ' '
        || coalesce(student.institution, '') || ' '
        || coalesce(student.preferred_destination_country, '') || ' '
        || coalesce(student.preferred_degree, '') || ' '
        || coalesce(student.preferred_program, '') || ' '
        || coalesce(student.intended_intake, '')
      ) @@ query

    union all

    select
      'document'::text, document.id, document.profile_id,
      coalesce(document.custom_document_name, document.original_filename),
      document.document_type,
      ts_rank(
        to_tsvector('simple',
          coalesce(document.original_filename, '') || ' '
          || coalesce(document.custom_document_name, '') || ' '
          || coalesce(document.document_type, '')
        ), query
      ),
      jsonb_build_object('status', document.status)
    from crm.student_documents as document
    where crm.can_access_document(document.id)
      and to_tsvector('simple',
        coalesce(document.original_filename, '') || ' '
        || coalesce(document.custom_document_name, '') || ' '
        || coalesce(document.document_type, '')
      ) @@ query

    union all

    select
      'task'::text, task.id, task.student_profile_id,
      task.title, left(coalesce(task.description, ''), 300),
      ts_rank(
        to_tsvector('simple',
          coalesce(task.title, '') || ' ' || coalesce(task.description, '')
        ), query
      ),
      jsonb_build_object(
        'status', task.status, 'priority', task.priority
      )
    from crm.student_tasks as task
    where crm.can_access_task(task.id)
      and to_tsvector('simple',
        coalesce(task.title, '') || ' ' || coalesce(task.description, '')
      ) @@ query

    union all

    select
      'note'::text, note.id, note.student_profile_id,
      note.title, left(note.body, 300),
      ts_rank(
        to_tsvector('simple', note.title || ' ' || note.body), query
      ),
      jsonb_build_object(
        'note_type', note.note_type, 'is_pinned', note.is_pinned
      )
    from crm.student_notes as note
    where crm.can_access_note(note.id)
      and to_tsvector('simple', note.title || ' ' || note.body) @@ query
  )
  select *
  from results
  order by rank desc, result_type, title
  limit result_limit offset result_offset;
end;
$$;

comment on function crm.global_search(text,integer,integer) is
  'Authorization-aware full-text search. Future modules extend the results CTE without changing its contract.';
revoke all on function crm.global_search(text,integer,integer) from public;
grant execute on function crm.global_search(text,integer,integer) to authenticated;

commit;
