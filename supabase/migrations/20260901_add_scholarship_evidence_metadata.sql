begin;
alter table crm.scholarships
  add column international_eligibility text not null default 'unspecified',
  add column verification_status text not null default 'unknown',
  add column last_verified_at timestamptz,
  add column source_url text;
alter table crm.scholarships add constraint scholarships_international_eligibility_check check (international_eligibility in ('confirmed_eligible','confirmed_ineligible','unspecified')), add constraint scholarships_verification_status_check check (verification_status in ('current','expired','future','unknown')), add constraint scholarships_source_url_check check (source_url is null or source_url ~ '^https://');
commit;
