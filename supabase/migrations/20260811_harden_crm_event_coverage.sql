begin;

create or replace function crm.capture_profile_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  entity_id uuid;
  student_id uuid;
  event_name text;
  prior jsonb;
  current_values jsonb;
begin
  if tg_table_name = 'profiles' then
    entity_id := new.id;
    student_id := case when new.role = 'student' then new.id else null end;
    event_name := case
      when tg_op = 'INSERT' then 'profile.identity_created'
      when new.deleted_at is not null and old.deleted_at is null
        then 'profile.identity_deleted'
      else 'profile.identity_updated'
    end;
    prior := case when tg_op = 'UPDATE' then
      to_jsonb(old) - 'clerk_user_id' - 'email'
    else null end;
    current_values := to_jsonb(new) - 'clerk_user_id' - 'email';
  else
    entity_id := new.profile_id;
    student_id := new.profile_id;
    event_name := case
      when tg_op = 'INSERT' then 'student_profile.created'
      when new.deleted_at is not null and old.deleted_at is null
        then 'student_profile.deleted'
      else 'student_profile.updated'
    end;
    prior := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
    current_values := to_jsonb(new);
  end if;

  perform crm.emit_domain_event(
    event_name, 'student_profile', entity_id, student_id,
    jsonb_strip_nulls(jsonb_build_object(
      'previous', prior,
      'new', current_values
    ))
  );
  return new;
end;
$$;
revoke all on function crm.capture_profile_domain_event() from public;

create trigger profiles_emit_domain_event
after insert or update on crm.profiles
for each row execute function crm.capture_profile_domain_event();
create trigger student_profiles_emit_domain_event
after insert or update on crm.student_profiles
for each row execute function crm.capture_profile_domain_event();

comment on function crm.capture_profile_domain_event() is
  'Completes business-mutation event coverage while excluding Clerk and email identity fields from event payloads.';

commit;
