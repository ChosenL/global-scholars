begin;
alter table crm.universities
  add column international_student_status text not null default 'unknown',
  add column dli_number text;
alter table crm.universities
  add constraint universities_international_student_status_check check (international_student_status in ('designated','not_designated','unknown')),
  add constraint universities_dli_number_check check (dli_number is null or dli_number ~ '^O[0-9]+$'),
  add constraint universities_designated_dli_check check (international_student_status <> 'designated' or dli_number is not null),
  add constraint universities_dli_number_unique unique (dli_number);
commit;
