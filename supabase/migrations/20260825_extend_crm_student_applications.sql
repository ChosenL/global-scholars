begin;

alter table crm.student_applications
  add column organization_id uuid,
  add column tuition_amount numeric(14,2),
  add column tuition_currency text,
  add column tuition_source text,
  add constraint student_applications_organization_fkey
    foreign key (organization_id)
    references crm.organizations(id) on delete restrict,
  add constraint student_applications_tuition_check
    check (
      (
        tuition_amount is null
        and tuition_currency is null
        and tuition_source is null
      )
      or (
        tuition_amount >= 0
        and tuition_currency ~ '^[A-Z]{3}$'
        and tuition_source is not null
        and char_length(trim(tuition_source)) between 2 and 200
      )
    );

comment on column crm.student_applications.organization_id is
  'Optional point-in-time customer organization attribution; it does not grant application access or identify a catalog university.';
comment on column crm.student_applications.tuition_amount is
  'Optional tuition snapshot captured for this application.';
comment on column crm.student_applications.tuition_currency is
  'ISO 4217 currency code for the application tuition snapshot.';
comment on column crm.student_applications.tuition_source is
  'Bounded provenance for the application tuition snapshot.';

create index student_applications_organization_idx
  on crm.student_applications (organization_id, status, updated_at desc)
  where organization_id is not null and deleted_at is null;

alter table crm.student_tasks
  add column application_id uuid,
  add constraint student_tasks_application_fkey
    foreign key (application_id)
    references crm.student_applications(id) on delete restrict;

comment on column crm.student_tasks.application_id is
  'Optional application association; task ownership and authorization remain student-scoped.';

create index student_tasks_application_idx
  on crm.student_tasks (application_id, status, due_at)
  where application_id is not null and deleted_at is null;

commit;
