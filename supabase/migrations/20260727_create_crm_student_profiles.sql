begin;

create table crm.student_profiles (
  profile_id uuid primary key,
  phone text,
  date_of_birth date,
  nationality text,
  current_country text,
  passport_number text,
  highest_qualification text,
  institution text,
  gpa numeric(5, 2),
  graduation_year smallint,
  english_test_type text,
  english_test_score numeric(6, 2),
  preferred_destination_country text,
  preferred_degree text,
  preferred_program text,
  intended_intake text,
  budget numeric(14, 2),
  budget_currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint student_profiles_profile_id_fkey
    foreign key (profile_id)
    references crm.profiles(id)
    on delete restrict,
  constraint student_profiles_phone_length
    check (phone is null or char_length(trim(phone)) between 5 and 30),
  constraint student_profiles_date_of_birth_check
    check (
      date_of_birth is null
      or (
        date_of_birth >= date '1900-01-01'
        and date_of_birth <= current_date
      )
    ),
  constraint student_profiles_nationality_length
    check (
      nationality is null
      or char_length(trim(nationality)) between 2 and 100
    ),
  constraint student_profiles_current_country_length
    check (
      current_country is null
      or char_length(trim(current_country)) between 2 and 100
    ),
  constraint student_profiles_passport_number_length
    check (
      passport_number is null
      or char_length(trim(passport_number)) between 3 and 50
    ),
  constraint student_profiles_highest_qualification_length
    check (
      highest_qualification is null
      or char_length(trim(highest_qualification)) between 2 and 150
    ),
  constraint student_profiles_institution_length
    check (
      institution is null
      or char_length(trim(institution)) between 2 and 200
    ),
  constraint student_profiles_gpa_check
    check (gpa is null or gpa between 0 and 100),
  constraint student_profiles_graduation_year_check
    check (graduation_year is null or graduation_year between 1950 and 2100),
  constraint student_profiles_english_test_type_check
    check (
      english_test_type is null
      or english_test_type in (
        'IELTS',
        'TOEFL',
        'PTE Academic',
        'Duolingo English Test',
        'Cambridge English',
        'Other',
        'Not taken'
      )
    ),
  constraint student_profiles_english_test_score_check
    check (
      english_test_score is null
      or english_test_score between 0 and 1000
    ),
  constraint student_profiles_preferred_destination_length
    check (
      preferred_destination_country is null
      or char_length(trim(preferred_destination_country)) between 2 and 100
    ),
  constraint student_profiles_preferred_degree_length
    check (
      preferred_degree is null
      or char_length(trim(preferred_degree)) between 2 and 100
    ),
  constraint student_profiles_preferred_program_length
    check (
      preferred_program is null
      or char_length(trim(preferred_program)) between 2 and 200
    ),
  constraint student_profiles_intended_intake_length
    check (
      intended_intake is null
      or char_length(trim(intended_intake)) between 2 and 100
    ),
  constraint student_profiles_budget_check
    check (budget is null or budget >= 0),
  constraint student_profiles_budget_currency_check
    check (
      (budget is null and budget_currency is null)
      or (
        budget is not null
        and budget_currency is not null
        and budget_currency ~ '^[A-Z]{3}$'
      )
    ),
  constraint student_profiles_deleted_at_check
    check (deleted_at is null or deleted_at >= created_at)
);

comment on table crm.student_profiles is
  'One-to-one student-specific extension of crm.profiles. Identity remains in crm.profiles.';
comment on column crm.student_profiles.profile_id is
  'Both the primary key and foreign key to the owning student crm.profiles row.';
comment on column crm.student_profiles.gpa is
  'Reported GPA or academic average on the student''s source scale, up to 100.';
comment on column crm.student_profiles.budget is
  'Student-reported study budget in budget_currency.';
comment on column crm.student_profiles.deleted_at is
  'Soft-deletion timestamp; null means the student extension is active.';

create index student_profiles_active_destination_intake_idx
  on crm.student_profiles (
    preferred_destination_country,
    intended_intake
  )
  where deleted_at is null;

create index student_profiles_active_graduation_year_idx
  on crm.student_profiles (graduation_year)
  where graduation_year is not null and deleted_at is null;

create or replace function crm.validate_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from crm.profiles as p
    where p.id = new.profile_id
      and p.role = 'student'
      and p.deleted_at is null
  )
  then
    raise exception
      'Student profiles require an active crm.profiles row with the student role.';
  end if;

  if tg_op = 'UPDATE'
    and (
      new.profile_id <> old.profile_id
      or new.created_at <> old.created_at
    )
  then
    raise exception 'Student profile identity fields are immutable.';
  end if;

  return new;
end;
$$;

revoke all on function crm.validate_student_profile() from public;

create trigger student_profiles_validate
before insert or update on crm.student_profiles
for each row execute function crm.validate_student_profile();

create trigger student_profiles_set_updated_at
before update on crm.student_profiles
for each row execute function crm.set_updated_at();

alter table crm.student_profiles enable row level security;
alter table crm.student_profiles force row level security;

grant select, insert, update on table crm.student_profiles to authenticated;

create policy "student_profiles_select_authorized"
on crm.student_profiles
for select
to authenticated
using (
  deleted_at is null
  and (
    profile_id = crm.current_profile_id()
    or crm.shares_conversation_with(profile_id)
    or crm.is_current_admin()
  )
);

create policy "student_profiles_insert_self_or_admin"
on crm.student_profiles
for insert
to authenticated
with check (
  deleted_at is null
  and (
    (
      profile_id = crm.current_profile_id()
      and crm.current_profile_role() = 'student'
    )
    or crm.is_current_admin()
  )
);

create policy "student_profiles_update_self_or_admin"
on crm.student_profiles
for update
to authenticated
using (
  deleted_at is null
  and (
    profile_id = crm.current_profile_id()
    or crm.is_current_admin()
  )
)
with check (
  profile_id = crm.current_profile_id()
  or crm.is_current_admin()
);

commit;
