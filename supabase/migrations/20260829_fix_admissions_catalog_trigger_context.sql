begin;

create or replace function crm.validate_admissions_catalog_relationships()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_row jsonb;
begin
  new_row := pg_catalog.to_jsonb(new);

  case tg_table_schema || '.' || tg_table_name
    when 'crm.programs' then
      if (new_row ->> 'faculty_id') is not null
        and not exists (
          select 1
          from crm.faculties as faculty
          where faculty.id = (new_row ->> 'faculty_id')::uuid
            and faculty.university_id = (new_row ->> 'university_id')::uuid
        )
      then
        raise exception 'Program faculty must belong to the same university.';
      end if;

    when 'crm.program_campuses' then
      if not exists (
        select 1
        from crm.programs as program
        join crm.campuses as campus
          on campus.id = (new_row ->> 'campus_id')::uuid
         and campus.university_id = program.university_id
        where program.id = (new_row ->> 'program_id')::uuid
      )
      then
        raise exception 'Program campus must belong to the same university.';
      end if;

    when 'crm.scholarships' then
      if (
        (new_row ->> 'program_id') is not null
        and not exists (
          select 1
          from crm.programs as program
          where program.id = (new_row ->> 'program_id')::uuid
            and program.university_id = (new_row ->> 'university_id')::uuid
        )
      ) or (
        (new_row ->> 'intake_id') is not null
        and not exists (
          select 1
          from crm.intakes as intake
          join crm.programs as program on program.id = intake.program_id
          where intake.id = (new_row ->> 'intake_id')::uuid
            and program.university_id = (new_row ->> 'university_id')::uuid
            and (
              (new_row ->> 'program_id') is null
              or program.id = (new_row ->> 'program_id')::uuid
            )
        )
      )
      then
        raise exception 'Scholarship scope must belong to the same university and program.';
      end if;

    else
      return new;
  end case;

  return new;
end;
$$;

revoke all on function crm.validate_admissions_catalog_relationships() from public;

commit;
