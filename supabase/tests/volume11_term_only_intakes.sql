begin;
select plan(4);
select col_is_nullable('crm','intakes','start_date','Term-only intakes may omit an exact date');
select col_not_null('crm','intakes','start_date_precision','Date precision is explicit');
select throws_ok($$insert into crm.intakes(program_id,campus_id,name,start_date,start_date_precision,status) values(gen_random_uuid(),gen_random_uuid(),'Invalid exact',null,'exact','open')$$,'23514',null,'Exact precision requires a date');
select throws_ok($$insert into crm.intakes(program_id,campus_id,name,start_date,start_date_precision,status) values(gen_random_uuid(),gen_random_uuid(),'Invalid term',current_date,'term','open')$$,'23514',null,'Term precision forbids a fabricated date');
select * from finish();
rollback;
