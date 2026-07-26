begin;

create table crm.student_readiness (
  student_profile_id uuid primary key,
  total_score numeric(5,2) not null,
  profile_score numeric(5,2) not null,
  document_score numeric(5,2) not null,
  task_score numeric(5,2) not null,
  application_score numeric(5,2) not null default 0,
  components jsonb not null,
  calculated_at timestamptz not null,
  updated_at timestamptz not null default now(),

  constraint student_readiness_student_fkey
    foreign key (student_profile_id) references crm.profiles(id) on delete restrict,
  constraint student_readiness_scores_check
    check (
      total_score between 0 and 100
      and profile_score between 0 and 100
      and document_score between 0 and 100
      and task_score between 0 and 100
      and application_score between 0 and 100
    ),
  constraint student_readiness_components_check
    check (jsonb_typeof(components) = 'object')
);

comment on table crm.student_readiness is
  'Latest centralized readiness calculation. The SQL engine is the sole scoring authority.';

create index student_readiness_score_idx
  on crm.student_readiness (total_score, calculated_at desc);

create or replace function crm.calculate_student_readiness(
  target_student_profile_id uuid
)
returns crm.student_readiness
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile crm.student_profiles;
  completed_profile_fields integer := 0;
  profile_field_count constant integer := 16;
  required_document_count integer := 0;
  missing_document_count integer := 0;
  active_task_count integer := 0;
  completed_task_count integer := 0;
  profile_percent numeric(5,2);
  document_percent numeric(5,2);
  task_percent numeric(5,2);
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
    and visibility = 'student'
    and status <> 'cancelled'
    and deleted_at is null;

  profile_percent := round(completed_profile_fields * 100.0 / profile_field_count, 2);
  document_percent := case
    when required_document_count = 0 then 100
    else round(
      (required_document_count - missing_document_count) * 100.0
      / required_document_count, 2
    )
  end;
  task_percent := case
    when active_task_count = 0 then 100
    else round(completed_task_count * 100.0 / active_task_count, 2)
  end;

  -- Application milestones are reserved at zero weight until that module exists.
  total_percent := round(
    profile_percent * 0.40
    + document_percent * 0.35
    + task_percent * 0.25,
    2
  );

  insert into crm.student_readiness (
    student_profile_id, total_score, profile_score, document_score,
    task_score, application_score, components, calculated_at
  ) values (
    target_student_profile_id, total_percent, profile_percent,
    document_percent, task_percent, 0,
    jsonb_build_object(
      'profile', jsonb_build_object(
        'completed_fields', completed_profile_fields,
        'total_fields', profile_field_count,
        'weight', 0.40
      ),
      'documents', jsonb_build_object(
        'required', required_document_count,
        'missing', missing_document_count,
        'weight', 0.35
      ),
      'tasks', jsonb_build_object(
        'total', active_task_count,
        'completed', completed_task_count,
        'weight', 0.25
      ),
      'applications', jsonb_build_object(
        'enabled', false,
        'weight', 0
      )
    ),
    statement_timestamp()
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
      'task_score', result.task_score
    )
  );
  return result;
end;
$$;

revoke all on function crm.calculate_student_readiness(uuid) from public;
grant execute on function crm.calculate_student_readiness(uuid) to authenticated;

alter table crm.student_readiness enable row level security;
alter table crm.student_readiness force row level security;
grant select on crm.student_readiness to authenticated;
create policy "student_readiness_select_authorized"
on crm.student_readiness for select to authenticated
using (crm.can_access_student(student_profile_id));

commit;
