begin;

create table crm.countries (
  id uuid primary key default gen_random_uuid(),
  iso_code text not null unique,
  name text not null unique,
  default_currency text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint countries_iso_check check (iso_code ~ '^[A-Z]{2}$'),
  constraint countries_name_length check (char_length(trim(name)) between 2 and 100),
  constraint countries_currency_check
    check (default_currency is null or default_currency ~ '^[A-Z]{3}$')
);

create table crm.universities (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null,
  name text not null,
  slug text not null,
  institution_type text,
  website_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint universities_country_fkey
    foreign key (country_id) references crm.countries(id) on delete restrict,
  constraint universities_country_slug_unique unique (country_id, slug),
  constraint universities_name_length check (char_length(trim(name)) between 2 and 200),
  constraint universities_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint universities_type_length
    check (institution_type is null or char_length(trim(institution_type)) between 2 and 100)
);

create table crm.campuses (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null,
  name text not null,
  city text not null,
  region text,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campuses_university_fkey
    foreign key (university_id) references crm.universities(id) on delete restrict,
  constraint campuses_university_name_unique unique (university_id, name),
  constraint campuses_name_length check (char_length(trim(name)) between 2 and 150),
  constraint campuses_city_length check (char_length(trim(city)) between 2 and 150),
  constraint campuses_region_length
    check (region is null or char_length(trim(region)) between 2 and 150)
);

create table crm.faculties (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faculties_university_fkey
    foreign key (university_id) references crm.universities(id) on delete restrict,
  constraint faculties_university_name_unique unique (university_id, name),
  constraint faculties_name_length check (char_length(trim(name)) between 2 and 200)
);

create table crm.programs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null,
  faculty_id uuid,
  name text not null,
  program_code text,
  credential_level text not null,
  duration_months integer,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_university_fkey
    foreign key (university_id) references crm.universities(id) on delete restrict,
  constraint programs_faculty_fkey
    foreign key (faculty_id) references crm.faculties(id) on delete restrict,
  constraint programs_university_name_unique unique (university_id, name),
  constraint programs_name_length check (char_length(trim(name)) between 2 and 250),
  constraint programs_code_length
    check (program_code is null or char_length(trim(program_code)) between 1 and 50),
  constraint programs_credential_check
    check (credential_level in (
      'certificate', 'diploma', 'associate', 'bachelor',
      'postgraduate_certificate', 'master', 'doctorate', 'other'
    )),
  constraint programs_duration_check
    check (duration_months is null or duration_months between 1 and 120),
  constraint programs_description_length
    check (description is null or char_length(trim(description)) between 2 and 5000)
);

create table crm.program_campuses (
  program_id uuid not null,
  campus_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (program_id, campus_id),
  constraint program_campuses_program_fkey
    foreign key (program_id) references crm.programs(id) on delete restrict,
  constraint program_campuses_campus_fkey
    foreign key (campus_id) references crm.campuses(id) on delete restrict
);

create table crm.intakes (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  campus_id uuid not null,
  name text not null,
  start_date date not null,
  application_deadline date,
  international_deadline date,
  capacity integer,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intakes_program_fkey
    foreign key (program_id) references crm.programs(id) on delete restrict,
  constraint intakes_campus_fkey
    foreign key (campus_id) references crm.campuses(id) on delete restrict,
  constraint intakes_program_campus_fkey
    foreign key (program_id, campus_id)
    references crm.program_campuses(program_id, campus_id) on delete restrict,
  constraint intakes_unique unique (program_id, campus_id, start_date),
  constraint intakes_name_length check (char_length(trim(name)) between 2 and 100),
  constraint intakes_deadline_check
    check (
      (application_deadline is null or application_deadline <= start_date)
      and (international_deadline is null or international_deadline <= start_date)
    ),
  constraint intakes_capacity_check check (capacity is null or capacity > 0),
  constraint intakes_status_check
    check (status in ('planned', 'open', 'closed', 'cancelled'))
);

create table crm.scholarships (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null,
  program_id uuid,
  intake_id uuid,
  name text not null,
  award_type text not null,
  amount numeric(14,2),
  currency text,
  percentage numeric(5,2),
  eligibility jsonb not null default '{}'::jsonb,
  application_deadline date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scholarships_university_fkey
    foreign key (university_id) references crm.universities(id) on delete restrict,
  constraint scholarships_program_fkey
    foreign key (program_id) references crm.programs(id) on delete restrict,
  constraint scholarships_intake_fkey
    foreign key (intake_id) references crm.intakes(id) on delete restrict,
  constraint scholarships_name_length check (char_length(trim(name)) between 2 and 200),
  constraint scholarships_award_type_check
    check (award_type in ('fixed', 'percentage', 'full', 'other')),
  constraint scholarships_value_check
    check (
      (award_type = 'fixed' and amount > 0 and currency ~ '^[A-Z]{3}$' and percentage is null)
      or (award_type = 'percentage' and percentage between 0.01 and 100 and amount is null and currency is null)
      or (award_type in ('full', 'other') and amount is null and percentage is null)
    ),
  constraint scholarships_eligibility_check
    check (jsonb_typeof(eligibility) = 'object')
);

create index universities_country_idx on crm.universities (country_id, name);
create index campuses_university_idx on crm.campuses (university_id, name);
create index programs_university_idx on crm.programs (university_id, name);
create index intakes_open_start_idx on crm.intakes (start_date, program_id)
  where status = 'open';
create index scholarships_active_program_idx on crm.scholarships (program_id, intake_id)
  where is_active;

create or replace function crm.validate_admissions_catalog_relationships()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'programs' and new.faculty_id is not null
    and not exists (
      select 1 from crm.faculties as faculty
      where faculty.id = new.faculty_id
        and faculty.university_id = new.university_id
    )
  then raise exception 'Program faculty must belong to the same university.';
  elsif tg_table_name = 'program_campuses'
    and not exists (
      select 1 from crm.programs as program
      join crm.campuses as campus
        on campus.id = new.campus_id
       and campus.university_id = program.university_id
      where program.id = new.program_id
    )
  then raise exception 'Program campus must belong to the same university.';
  elsif tg_table_name = 'scholarships' and (
    (new.program_id is not null and not exists (
      select 1 from crm.programs as program
      where program.id = new.program_id
        and program.university_id = new.university_id
    ))
    or (new.intake_id is not null and not exists (
      select 1 from crm.intakes as intake
      join crm.programs as program on program.id = intake.program_id
      where intake.id = new.intake_id
        and program.university_id = new.university_id
        and (new.program_id is null or program.id = new.program_id)
    ))
  ) then raise exception 'Scholarship scope must belong to the same university and program.';
  end if;
  return new;
end;
$$;
revoke all on function crm.validate_admissions_catalog_relationships() from public;
create trigger programs_validate_relationships before insert or update on crm.programs
for each row execute function crm.validate_admissions_catalog_relationships();
create trigger program_campuses_validate_relationships before insert or update on crm.program_campuses
for each row execute function crm.validate_admissions_catalog_relationships();
create trigger scholarships_validate_relationships before insert or update on crm.scholarships
for each row execute function crm.validate_admissions_catalog_relationships();

create trigger countries_set_updated_at before update on crm.countries
for each row execute function crm.set_updated_at();
create trigger universities_set_updated_at before update on crm.universities
for each row execute function crm.set_updated_at();
create trigger campuses_set_updated_at before update on crm.campuses
for each row execute function crm.set_updated_at();
create trigger faculties_set_updated_at before update on crm.faculties
for each row execute function crm.set_updated_at();
create trigger programs_set_updated_at before update on crm.programs
for each row execute function crm.set_updated_at();
create trigger intakes_set_updated_at before update on crm.intakes
for each row execute function crm.set_updated_at();
create trigger scholarships_set_updated_at before update on crm.scholarships
for each row execute function crm.set_updated_at();

alter table crm.countries enable row level security;
alter table crm.countries force row level security;
alter table crm.universities enable row level security;
alter table crm.universities force row level security;
alter table crm.campuses enable row level security;
alter table crm.campuses force row level security;
alter table crm.faculties enable row level security;
alter table crm.faculties force row level security;
alter table crm.programs enable row level security;
alter table crm.programs force row level security;
alter table crm.program_campuses enable row level security;
alter table crm.program_campuses force row level security;
alter table crm.intakes enable row level security;
alter table crm.intakes force row level security;
alter table crm.scholarships enable row level security;
alter table crm.scholarships force row level security;

grant select on crm.countries, crm.universities, crm.campuses,
  crm.faculties, crm.programs, crm.program_campuses, crm.intakes,
  crm.scholarships to authenticated;
create policy "countries_select_authenticated" on crm.countries
for select to authenticated using (is_active or crm.is_current_admin());
create policy "universities_select_authenticated" on crm.universities
for select to authenticated using (is_active or crm.is_current_admin());
create policy "campuses_select_authenticated" on crm.campuses
for select to authenticated using (is_active or crm.is_current_admin());
create policy "faculties_select_authenticated" on crm.faculties
for select to authenticated using (is_active or crm.is_current_admin());
create policy "programs_select_authenticated" on crm.programs
for select to authenticated using (is_active or crm.is_current_admin());
create policy "program_campuses_select_authenticated" on crm.program_campuses
for select to authenticated using (true);
create policy "intakes_select_authenticated" on crm.intakes
for select to authenticated using (status <> 'cancelled' or crm.is_current_admin());
create policy "scholarships_select_authenticated" on crm.scholarships
for select to authenticated using (is_active or crm.is_current_admin());

commit;
