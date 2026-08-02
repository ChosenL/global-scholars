begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into crm.countries (id, iso_code, name, default_currency)
values
  (md5('volume10:country-a')::uuid, 'QA', 'Volume Ten Country A', 'USD'),
  (md5('volume10:country-b')::uuid, 'QB', 'Volume Ten Country B', 'USD');

insert into crm.universities (id, country_id, name, slug)
values
  (md5('volume10:university-a')::uuid, md5('volume10:country-a')::uuid,
   'Volume Ten University A', 'volume-ten-university-a'),
  (md5('volume10:university-b')::uuid, md5('volume10:country-b')::uuid,
   'Volume Ten University B', 'volume-ten-university-b');

insert into crm.campuses (id, university_id, name, city)
values
  (md5('volume10:campus-a')::uuid, md5('volume10:university-a')::uuid,
   'Volume Ten Campus A', 'Test City A'),
  (md5('volume10:campus-b')::uuid, md5('volume10:university-b')::uuid,
   'Volume Ten Campus B', 'Test City B');

insert into crm.faculties (id, university_id, name)
values
  (md5('volume10:faculty-a')::uuid, md5('volume10:university-a')::uuid,
   'Volume Ten Faculty A'),
  (md5('volume10:faculty-b')::uuid, md5('volume10:university-b')::uuid,
   'Volume Ten Faculty B');

select lives_ok(
  $$insert into crm.programs (
      id, university_id, faculty_id, name, credential_level
    ) values (
      md5('volume10:program-a')::uuid,
      md5('volume10:university-a')::uuid,
      md5('volume10:faculty-a')::uuid,
      'Volume Ten Program A',
      'bachelor'
    )$$,
  'Valid program insert does not dereference campus_id'
);

select lives_ok(
  $$update crm.programs
    set name = 'Volume Ten Program A Updated'
    where id = md5('volume10:program-a')::uuid$$,
  'Valid program update does not dereference campus_id'
);

select lives_ok(
  $$insert into crm.programs (
      id, university_id, faculty_id, name, credential_level
    ) values (
      md5('volume10:program-b')::uuid,
      md5('volume10:university-b')::uuid,
      md5('volume10:faculty-b')::uuid,
      'Volume Ten Program B',
      'bachelor'
    )$$,
  'Second valid program relationship succeeds'
);

select throws_ok(
  $$insert into crm.programs (
      id, university_id, faculty_id, name, credential_level
    ) values (
      md5('volume10:program-invalid')::uuid,
      md5('volume10:university-a')::uuid,
      md5('volume10:faculty-b')::uuid,
      'Volume Ten Invalid Program',
      'bachelor'
    )$$,
  'P0001',
  'Program faculty must belong to the same university.',
  'Program insert rejects a faculty from another university'
);

select throws_ok(
  $$update crm.programs
    set faculty_id = md5('volume10:faculty-b')::uuid
    where id = md5('volume10:program-a')::uuid$$,
  'P0001',
  'Program faculty must belong to the same university.',
  'Program update rejects a faculty from another university'
);

select lives_ok(
  $$insert into crm.program_campuses (program_id, campus_id)
    values (
      md5('volume10:program-a')::uuid,
      md5('volume10:campus-a')::uuid
    )$$,
  'Valid program-campus insert succeeds'
);

select lives_ok(
  $$update crm.program_campuses
    set campus_id = md5('volume10:campus-a')::uuid
    where program_id = md5('volume10:program-a')::uuid
      and campus_id = md5('volume10:campus-a')::uuid$$,
  'Valid program-campus update succeeds'
);

select lives_ok(
  $$insert into crm.program_campuses (program_id, campus_id)
    values (
      md5('volume10:program-b')::uuid,
      md5('volume10:campus-b')::uuid
    )$$,
  'Second valid program-campus relationship succeeds'
);

select throws_ok(
  $$insert into crm.program_campuses (program_id, campus_id)
    values (
      md5('volume10:program-a')::uuid,
      md5('volume10:campus-b')::uuid
    )$$,
  'P0001',
  'Program campus must belong to the same university.',
  'Program-campus insert rejects a campus from another university'
);

select throws_ok(
  $$update crm.program_campuses
    set campus_id = md5('volume10:campus-b')::uuid
    where program_id = md5('volume10:program-a')::uuid
      and campus_id = md5('volume10:campus-a')::uuid$$,
  'P0001',
  'Program campus must belong to the same university.',
  'Program-campus update rejects a campus from another university'
);

select lives_ok(
  $$insert into crm.intakes (
      id, program_id, campus_id, name, start_date, status
    ) values (
      md5('volume10:intake-a')::uuid,
      md5('volume10:program-a')::uuid,
      md5('volume10:campus-a')::uuid,
      'Volume Ten Intake A',
      current_date + 365,
      'open'
    )$$,
  'Valid intake program-campus relationship succeeds'
);

select lives_ok(
  $$update crm.intakes
    set name = 'Volume Ten Intake A Updated'
    where id = md5('volume10:intake-a')::uuid$$,
  'Valid intake update succeeds'
);

select throws_ok(
  $$insert into crm.intakes (
      id, program_id, campus_id, name, start_date, status
    ) values (
      md5('volume10:intake-invalid')::uuid,
      md5('volume10:program-a')::uuid,
      md5('volume10:campus-b')::uuid,
      'Volume Ten Invalid Intake',
      current_date + 365,
      'open'
    )$$,
  '23503',
  'insert or update on table "intakes" violates foreign key constraint "intakes_program_campus_fkey"',
  'Intake insert rejects an incompatible program-campus pair'
);

select throws_ok(
  $$update crm.intakes
    set campus_id = md5('volume10:campus-b')::uuid
    where id = md5('volume10:intake-a')::uuid$$,
  '23503',
  'insert or update on table "intakes" violates foreign key constraint "intakes_program_campus_fkey"',
  'Intake update rejects an incompatible program-campus pair'
);

select lives_ok(
  $$insert into crm.scholarships (
      id, university_id, program_id, intake_id, name, award_type
    ) values (
      md5('volume10:scholarship-a')::uuid,
      md5('volume10:university-a')::uuid,
      md5('volume10:program-a')::uuid,
      md5('volume10:intake-a')::uuid,
      'Volume Ten Scholarship A',
      'full'
    )$$,
  'Valid scholarship scope succeeds'
);

select throws_ok(
  $$insert into crm.scholarships (
      id, university_id, program_id, intake_id, name, award_type
    ) values (
      md5('volume10:scholarship-invalid')::uuid,
      md5('volume10:university-b')::uuid,
      md5('volume10:program-a')::uuid,
      md5('volume10:intake-a')::uuid,
      'Volume Ten Invalid Scholarship',
      'full'
    )$$,
  'P0001',
  'Scholarship scope must belong to the same university and program.',
  'Scholarship insert rejects an inconsistent catalog scope'
);

select throws_ok(
  $$update crm.scholarships
    set university_id = md5('volume10:university-b')::uuid
    where id = md5('volume10:scholarship-a')::uuid$$,
  'P0001',
  'Scholarship scope must belong to the same university and program.',
  'Scholarship update rejects an inconsistent catalog scope'
);

select * from finish();
rollback;

do $rollback_verification$
begin
  if exists (
    select 1 from crm.countries
    where id in (md5('volume10:country-a')::uuid, md5('volume10:country-b')::uuid)
  ) then
    raise exception 'Catalog rollback left country rows behind.';
  end if;

  if exists (
    select 1 from crm.universities
    where id in (md5('volume10:university-a')::uuid, md5('volume10:university-b')::uuid)
  ) then
    raise exception 'Catalog rollback left university rows behind.';
  end if;

  if exists (
    select 1 from crm.campuses
    where id in (md5('volume10:campus-a')::uuid, md5('volume10:campus-b')::uuid)
  ) then
    raise exception 'Catalog rollback left campus rows behind.';
  end if;

  if exists (
    select 1 from crm.faculties
    where id in (md5('volume10:faculty-a')::uuid, md5('volume10:faculty-b')::uuid)
  ) then
    raise exception 'Catalog rollback left faculty rows behind.';
  end if;

  if exists (
    select 1 from crm.programs
    where id in (
      md5('volume10:program-a')::uuid,
      md5('volume10:program-b')::uuid,
      md5('volume10:program-invalid')::uuid
    )
  ) then
    raise exception 'Catalog rollback left program rows behind.';
  end if;

  if exists (
    select 1 from crm.program_campuses
    where program_id in (
      md5('volume10:program-a')::uuid,
      md5('volume10:program-b')::uuid
    )
  ) then
    raise exception 'Catalog rollback left program-campus rows behind.';
  end if;

  if exists (
    select 1 from crm.intakes
    where id in (md5('volume10:intake-a')::uuid, md5('volume10:intake-invalid')::uuid)
  ) then
    raise exception 'Catalog rollback left intake rows behind.';
  end if;

  if exists (
    select 1 from crm.scholarships
    where id in (
      md5('volume10:scholarship-a')::uuid,
      md5('volume10:scholarship-invalid')::uuid
    )
  ) then
    raise exception 'Catalog rollback left scholarship rows behind.';
  end if;
end
$rollback_verification$;
