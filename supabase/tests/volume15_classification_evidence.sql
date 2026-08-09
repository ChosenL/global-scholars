begin;
select plan(5);
select col_is_nullable('crm','universities','classification_rule','Legacy rows may be backfilled transactionally');
select col_not_null('crm','universities','classification_evidence','Classification evidence is always an object');
select col_not_null('crm','universities','search_eligibility_evidence','Visibility evidence state is explicit');
select throws_ok($$insert into crm.universities(country_id,name,slug,classification_evidence) values(gen_random_uuid(),'Invalid evidence','invalid-evidence','[]'::jsonb)$$,'23514',null,'Classification evidence must be an object');
select throws_ok($$insert into crm.universities(country_id,name,slug,search_eligibility_evidence) values(gen_random_uuid(),'Invalid state','invalid-state','guessed')$$,'23514',null,'Search eligibility evidence is constrained');
select * from finish();
rollback;
