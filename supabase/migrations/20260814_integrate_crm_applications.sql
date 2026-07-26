begin;

create or replace function crm.calculate_student_readiness(
  target_student_profile_id uuid
)
returns crm.student_readiness
language plpgsql security definer set search_path = ''
as $$
declare
  profile crm.student_profiles;
  completed_profile_fields integer := 0;
  profile_field_count constant integer := 16;
  required_document_count integer := 0;
  missing_document_count integer := 0;
  active_task_count integer := 0;
  completed_task_count integer := 0;
  application_count integer := 0;
  profile_percent numeric(5,2);
  document_percent numeric(5,2);
  task_percent numeric(5,2);
  application_percent numeric(5,2);
  total_percent numeric(5,2);
  result crm.student_readiness;
begin
  if not crm.can_access_student(target_student_profile_id) then
    raise exception 'Student readiness access denied.';
  end if;
  select * into profile from crm.student_profiles
  where profile_id = target_student_profile_id and deleted_at is null;
  if profile.profile_id is null then raise exception 'Active student profile not found.'; end if;

  completed_profile_fields :=
    (profile.phone is not null)::integer
    + (profile.date_of_birth is not null)::integer
    + (profile.nationality is not null)::integer
    + (profile.current_country is not null)::integer
    + (profile.passport_number is not null)::integer
    + (profile.highest_qualification is not null)::integer
    + (profile.institution is not null)::integer
    + (profile.gpa is not null)::integer
    + (profile.graduation_year is not null)::integer
    + (profile.english_test_type is not null)::integer
    + (profile.preferred_destination_country is not null)::integer
    + (profile.preferred_degree is not null)::integer
    + (profile.preferred_program is not null)::integer
    + (profile.intended_intake is not null)::integer
    + (profile.budget is not null)::integer
    + (profile.budget_currency is not null)::integer;

  select count(*) into required_document_count
  from crm.get_effective_document_requirements(
    target_student_profile_id, null, null, null
  ) as requirement
  where requirement.requirement_level = 'required'
    or (
      requirement.requirement_level = 'conditional'
      and crm.document_requirement_applies(
        requirement.id, target_student_profile_id
      )
    );
  select count(*) into missing_document_count
  from crm.get_missing_document_requirements(
    target_student_profile_id, null, null, null
  );
  select count(*), count(*) filter (where status = 'completed')
  into active_task_count, completed_task_count
  from crm.student_tasks
  where student_profile_id = target_student_profile_id
    and visibility = 'student' and status <> 'cancelled' and deleted_at is null;

  select count(*), coalesce(max(case application.status
    when 'draft' then 10 when 'ready_for_review' then 20
    when 'submitted' then 35 when 'under_review' then 45
    when 'additional_documents_requested' then 40
    when 'interview' then 55 when 'waitlisted' then 50
    when 'conditional_offer' then 70 when 'unconditional_offer' then 80
    when 'deposit_paid' then 85 when 'visa_stage' then 90
    when 'enrolled' then 100 when 'closed' then 100
    when 'deferred' then 25 else 0 end), 0)
  into application_count, application_percent
  from crm.student_applications as application
  where application.student_profile_id = target_student_profile_id
    and application.deleted_at is null and application.archived_at is null;

  profile_percent := round(completed_profile_fields * 100.0 / profile_field_count, 2);
  document_percent := case when required_document_count = 0 then 100 else
    round((required_document_count - missing_document_count) * 100.0
      / required_document_count, 2) end;
  task_percent := case when active_task_count = 0 then 100 else
    round(completed_task_count * 100.0 / active_task_count, 2) end;
  total_percent := round(
    profile_percent * 0.30 + document_percent * 0.25
    + task_percent * 0.20 + application_percent * 0.25, 2
  );

  insert into crm.student_readiness (
    student_profile_id, total_score, profile_score, document_score,
    task_score, application_score, components, calculated_at
  ) values (
    target_student_profile_id, total_percent, profile_percent,
    document_percent, task_percent, application_percent,
    jsonb_build_object(
      'profile', jsonb_build_object(
        'completed_fields', completed_profile_fields,
        'total_fields', profile_field_count, 'weight', 0.30),
      'documents', jsonb_build_object(
        'required', required_document_count,
        'missing', missing_document_count, 'weight', 0.25),
      'tasks', jsonb_build_object(
        'total', active_task_count, 'completed', completed_task_count,
        'weight', 0.20),
      'applications', jsonb_build_object(
        'enabled', true, 'count', application_count,
        'highest_milestone_score', application_percent, 'weight', 0.25)
    ), statement_timestamp()
  )
  on conflict (student_profile_id) do update
  set total_score = excluded.total_score,
      profile_score = excluded.profile_score,
      document_score = excluded.document_score,
      task_score = excluded.task_score,
      application_score = excluded.application_score,
      components = excluded.components,
      calculated_at = excluded.calculated_at,
      updated_at = statement_timestamp()
  returning * into result;
  perform crm.emit_domain_event(
    'readiness.calculated', 'readiness', target_student_profile_id,
    target_student_profile_id,
    jsonb_build_object(
      'total_score', result.total_score,
      'profile_score', result.profile_score,
      'document_score', result.document_score,
      'task_score', result.task_score,
      'application_score', result.application_score)
  );
  return result;
end;
$$;

create or replace function crm.link_application_note(
  target_application_id uuid,
  target_note_id uuid
)
returns crm.application_notes
language plpgsql security definer set search_path = ''
as $$
declare result crm.application_notes;
begin
  if not crm.can_manage_application(target_application_id)
    or not crm.can_access_note(target_note_id)
    or not exists (
      select 1 from crm.student_applications as application
      join crm.student_notes as note
        on note.student_profile_id = application.student_profile_id
      where application.id = target_application_id
        and note.id = target_note_id and note.deleted_at is null
    )
  then raise exception 'Application note link access denied.'; end if;
  insert into crm.application_notes (
    application_id, note_id, linked_by_profile_id
  ) values (
    target_application_id, target_note_id, crm.current_profile_id()
  ) returning * into result;
  perform crm.emit_domain_event(
    'application.note_linked', 'application', target_application_id,
    (select student_profile_id from crm.student_applications
      where id = target_application_id),
    jsonb_build_object('note_id', target_note_id)
  );
  return result;
end;
$$;
revoke all on function crm.link_application_note(uuid,uuid) from public;
grant execute on function crm.link_application_note(uuid,uuid) to authenticated;

create or replace function crm.create_application_notification()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  notification_title text;
  notification_body text;
  severity_name text := 'info';
  created_notification crm.notifications;
begin
  if new.aggregate_type <> 'application' or new.student_profile_id is null then
    return new;
  end if;
  if new.event_type = 'application.created' then
    notification_title := 'Application created';
    notification_body := 'A university application has been added to your workspace.';
  elsif new.event_type = 'application.status_changed' then
    notification_title := 'Application status updated';
    notification_body := 'Your application status is now '
      || replace(coalesce(new.payload->>'to', 'updated'), '_', ' ') || '.';
    severity_name := case
      when new.payload->>'to' in ('rejected', 'withdrawn') then 'warning'
      when new.payload->>'to' in ('conditional_offer', 'unconditional_offer', 'enrolled')
        then 'success' else 'info' end;
  elsif new.event_type = 'application.decision_recorded' then
    notification_title := 'Admission decision recorded';
    notification_body := 'A decision has been recorded for your application.';
  elsif new.event_type = 'application.deposit_recorded' then
    notification_title := 'Deposit updated';
    notification_body := 'A deposit record has been added to your application.';
  else return new;
  end if;
  if not coalesce((
    select preference.in_app_enabled
      and coalesce((preference.event_preferences->>new.event_type)::boolean, true)
    from crm.notification_preferences as preference
    where preference.profile_id = new.student_profile_id
  ), true) then return new; end if;

  insert into crm.notifications (
    recipient_profile_id, actor_profile_id, domain_event_id,
    notification_type, title, body, severity, data
  ) values (
    new.student_profile_id, new.actor_profile_id, new.id,
    new.event_type, notification_title, notification_body, severity_name,
    jsonb_build_object('application_id', new.aggregate_id)
  )
  on conflict (domain_event_id, recipient_profile_id) do nothing
  returning * into created_notification;
  if created_notification.id is not null then
    perform crm.emit_domain_event(
      'notification.created', 'notification', created_notification.id,
      new.student_profile_id,
      jsonb_build_object('notification_type', new.event_type),
      new.correlation_id, new.id
    );
  end if;
  return new;
end;
$$;
revoke all on function crm.create_application_notification() from public;
create trigger domain_events_create_application_notification
after insert on crm.domain_events for each row
execute function crm.create_application_notification();

alter function crm.global_search(text,integer,integer)
  rename to global_search_without_applications;
revoke all on function crm.global_search_without_applications(text,integer,integer)
  from authenticated;

create or replace function crm.global_search(
  search_query text,
  result_limit integer default 50,
  result_offset integer default 0
)
returns table (
  result_type text, result_id uuid, student_profile_id uuid,
  title text, summary text, rank real, metadata jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
declare query tsquery;
begin
  if char_length(trim(search_query)) < 2 then
    raise exception 'Search query must contain at least two characters.';
  end if;
  if result_limit not between 1 and 100 or result_offset < 0 then
    raise exception 'Search pagination is invalid.';
  end if;
  query := websearch_to_tsquery('simple', trim(search_query));
  return query
  with combined as (
    select * from crm.global_search_without_applications(
      search_query, 100, 0
    )
    union all
    select
      'application'::text, application.id, application.student_profile_id,
      university.name || ' — ' || program.name,
      replace(application.status, '_', ' '),
      ts_rank(
        to_tsvector('simple',
          university.name || ' ' || program.name || ' '
          || intake.name || ' ' || application.status
        ), query
      ),
      jsonb_build_object(
        'status', application.status,
        'university_id', university.id,
        'program_id', program.id,
        'intake_id', intake.id
      )
    from crm.student_applications as application
    join crm.intakes as intake on intake.id = application.intake_id
    join crm.programs as program on program.id = intake.program_id
    join crm.universities as university on university.id = program.university_id
    where crm.can_access_application(application.id)
      and to_tsvector('simple',
        university.name || ' ' || program.name || ' '
        || intake.name || ' ' || application.status
      ) @@ query
  )
  select * from combined
  order by rank desc, result_type, title
  limit result_limit offset result_offset;
end;
$$;
revoke all on function crm.global_search(text,integer,integer) from public;
grant execute on function crm.global_search(text,integer,integer) to authenticated;

create index student_applications_global_search_idx
  on crm.student_applications using gin (
    to_tsvector('simple',
      coalesce(external_reference, '') || ' ' || status
    )
  ) where deleted_at is null;

commit;
