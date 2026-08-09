begin;

alter table crm.universities
  add column classification_rule text,
  add column classification_evidence jsonb not null default '{}'::jsonb,
  add column search_eligibility_evidence text not null default 'unknown';

alter table crm.universities
  add constraint universities_classification_rule_length
    check (classification_rule is null or char_length(trim(classification_rule)) between 3 and 200),
  add constraint universities_classification_evidence_object
    check (jsonb_typeof(classification_evidence) = 'object'),
  add constraint universities_search_eligibility_evidence_check
    check (search_eligibility_evidence in ('confirmed','inferred_from_authoritative_structure','confirmed_ineligible','unknown'));

commit;
