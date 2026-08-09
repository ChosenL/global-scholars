begin;
alter table crm.universities
  add column catalog_classification text not null default 'classification_unknown',
  add column degree_granting boolean,
  add column accepts_direct_applications boolean,
  add column search_eligible boolean not null default false;
alter table crm.universities
  add constraint universities_catalog_classification_check check (catalog_classification in ('degree_granting_institution','system_or_administrative_office','branch_or_campus','non_degree_or_specialized_entity','classification_unknown')),
  add constraint universities_search_eligibility_check check (not search_eligible or (accepts_direct_applications is true and catalog_classification <> 'system_or_administrative_office'));
create index universities_search_eligible_name_idx on crm.universities(name) where is_active and search_eligible;
alter table crm.intakes
  add column open_status_evidence_url text,
  add column term_evidence_url text,
  add column deadline_evidence_url text,
  add column last_verified_at timestamptz;
alter table crm.intakes
  add constraint intakes_evidence_url_check check (
    (open_status_evidence_url is null or open_status_evidence_url ~ '^https://') and
    (term_evidence_url is null or term_evidence_url ~ '^https://') and
    (deadline_evidence_url is null or deadline_evidence_url ~ '^https://')
  );
commit;
