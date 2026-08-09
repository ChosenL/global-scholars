begin;
select plan(4);
select col_not_null('crm','universities','international_student_status','International designation state is explicit');
select col_is_nullable('crm','universities','dli_number','Non-Canadian institutions do not require DLI numbers');
select throws_ok($$insert into crm.universities(country_id,name,slug,international_student_status) values(gen_random_uuid(),'Invalid DLI','invalid-dli','designated')$$,'23514',null,'Designated institutions require a DLI number');
select throws_ok($$insert into crm.universities(country_id,name,slug,dli_number) values(gen_random_uuid(),'Invalid DLI','invalid-dli-number','bad')$$,'23514',null,'DLI format is constrained');
select * from finish();
rollback;
