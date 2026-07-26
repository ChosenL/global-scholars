begin;

create or replace function crm.create_visa_notification()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  notification_title text;
  notification_body text;
  severity_name text := 'info';
  created_notification crm.notifications;
begin
  if new.aggregate_type <> 'visa_case' or new.student_profile_id is null then
    return new;
  end if;
  if new.event_type = 'visa.document_uploaded' then
    notification_title := 'Visa document received';
    notification_body := 'A document has been linked to your visa case.';
  elsif new.event_type = 'visa.stage_changed' then
    notification_title := 'Visa stage updated';
    notification_body := 'Your visa case is now at '
      || replace(coalesce(new.payload->>'to', 'an updated stage'), '_', ' ') || '.';
    severity_name := case
      when new.payload->>'to' = 'refused' then 'warning'
      when new.payload->>'to' in ('approved', 'visa_issued', 'travel_ready')
        then 'success' else 'info' end;
  elsif new.event_type = 'visa.interview_scheduled' then
    notification_title := 'Visa appointment scheduled';
    notification_body := 'A visa appointment has been scheduled.';
  elsif new.event_type = 'visa.decision_recorded' then
    notification_title := 'Visa decision recorded';
    notification_body := 'A decision has been recorded for your visa case.';
    severity_name := case when new.payload->>'decision' = 'refused'
      then 'warning' else 'success' end;
  elsif new.event_type = 'visa.checklist_due' then
    notification_title := 'Visa checklist deadline';
    notification_body := coalesce(new.payload->>'title', 'A visa checklist item')
      || ' is due soon.';
    severity_name := 'warning';
  elsif new.event_type = 'visa.case_created' then
    notification_title := 'Visa case created';
    notification_body := 'Your visa and immigration workspace is ready.';
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
    jsonb_build_object('visa_case_id', new.aggregate_id)
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
revoke all on function crm.create_visa_notification() from public;
create trigger domain_events_create_visa_notification
after insert on crm.domain_events for each row
execute function crm.create_visa_notification();

create or replace function crm.link_visa_note(
  target_visa_case_id uuid,
  target_note_id uuid
)
returns crm.visa_notes
language plpgsql security definer set search_path = ''
as $$
declare result crm.visa_notes; student_id uuid;
begin
  select student_profile_id into student_id
  from crm.visa_cases where id = target_visa_case_id and deleted_at is null;
  if not crm.can_manage_visa_case(target_visa_case_id)
    or not crm.can_access_note(target_note_id)
    or not exists (
      select 1 from crm.student_notes
      where id = target_note_id and student_profile_id = student_id
        and deleted_at is null
    )
  then raise exception 'Visa note link access denied.'; end if;
  insert into crm.visa_notes (
    visa_case_id, note_id, linked_by_profile_id
  ) values (
    target_visa_case_id, target_note_id, crm.current_profile_id()
  ) returning * into result;
  perform crm.emit_domain_event(
    'visa.note_linked', 'visa_case', target_visa_case_id, student_id,
    jsonb_build_object('note_id', target_note_id)
  );
  return result;
end;
$$;
revoke all on function crm.link_visa_note(uuid,uuid) from public;
grant execute on function crm.link_visa_note(uuid,uuid) to authenticated;

alter function crm.global_search(text,integer,integer)
  rename to global_search_without_visas;
revoke all on function crm.global_search_without_visas(text,integer,integer)
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
    select * from crm.global_search_without_visas(search_query, 100, 0)
    union all
    select
      'visa_case'::text, visa_case.id, visa_case.student_profile_id,
      country.name || ' — ' || visa_case.visa_type,
      replace(visa_case.stage, '_', ' '),
      ts_rank(
        to_tsvector('simple',
          country.name || ' ' || visa_case.visa_type || ' '
          || visa_case.stage || ' '
          || coalesce(visa_case.external_reference, '')
        ), query
      ),
      jsonb_build_object(
        'stage', visa_case.stage,
        'country_id', visa_case.destination_country_id,
        'application_id', visa_case.application_id
      )
    from crm.visa_cases as visa_case
    join crm.countries as country on country.id = visa_case.destination_country_id
    where crm.can_access_visa_case(visa_case.id)
      and to_tsvector('simple',
        country.name || ' ' || visa_case.visa_type || ' '
        || visa_case.stage || ' '
        || coalesce(visa_case.external_reference, '')
      ) @@ query
  )
  select * from combined
  order by rank desc, result_type, title
  limit result_limit offset result_offset;
end;
$$;
revoke all on function crm.global_search(text,integer,integer) from public;
grant execute on function crm.global_search(text,integer,integer) to authenticated;

create index visa_cases_global_search_idx on crm.visa_cases using gin (
  to_tsvector('simple',
    visa_type || ' ' || stage || ' ' || coalesce(external_reference, '')
  )
) where deleted_at is null;

create or replace function crm.calculate_visa_analytics(
  target_period_start timestamptz,
  target_period_end timestamptz
)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select case when crm.is_current_admin() then jsonb_build_object(
    'cases_created', count(*) filter (where event_type = 'visa.case_created'),
    'documents_uploaded', count(*) filter (where event_type = 'visa.document_uploaded'),
    'interviews_scheduled', count(*) filter (where event_type = 'visa.interview_scheduled'),
    'decisions', count(*) filter (where event_type = 'visa.decision_recorded'),
    'approvals', count(*) filter (
      where event_type = 'visa.decision_recorded' and payload->>'decision' = 'approved'),
    'refusals', count(*) filter (
      where event_type = 'visa.decision_recorded' and payload->>'decision' = 'refused'),
    'deadline_reminders', count(*) filter (where event_type = 'visa.checklist_due')
  ) else null end
  from crm.domain_events
  where occurred_at >= target_period_start and occurred_at < target_period_end
    and aggregate_type = 'visa_case';
$$;
revoke all on function crm.calculate_visa_analytics(timestamptz,timestamptz) from public;
grant execute on function crm.calculate_visa_analytics(timestamptz,timestamptz) to authenticated;

commit;
