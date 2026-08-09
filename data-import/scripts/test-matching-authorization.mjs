#!/usr/bin/env node
import assert from "node:assert/strict";
import { config as loadEnvironment } from "dotenv";
import postgres from "postgres";

loadEnvironment({ path: [".env.local", ".env"], quiet: true });
const connectionString = process.env.SUPABASE_DB_URL?.trim();
if (!connectionString)
  throw new Error(
    "SUPABASE_DB_URL is required for database authorization tests.",
  );

const sql = postgres(connectionString, { max: 1, prepare: false });
const ids = {
  advisor: "b1000000-0000-4000-8000-000000000001",
  isolatedAdvisor: "b1000000-0000-4000-8000-000000000002",
  admin: "b1000000-0000-4000-8000-000000000003",
  student: "b1000000-0000-4000-8000-000000000004",
  isolatedStudent: "b1000000-0000-4000-8000-000000000005",
  conversation: "b2000000-0000-4000-8000-000000000001",
};

const claim = async (tx, subject) => {
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: subject })}, true)`;
};
const visible = async (tx, profileId) =>
  Number(
    (
      await tx`select count(*)::int as count from crm.student_profiles where profile_id = ${profileId}::uuid`
    )[0].count,
  );
const canAccess = async (tx, profileId) =>
  (await tx`select crm.can_access_student(${profileId}::uuid) as allowed`)[0]
    .allowed;

try {
  await sql.begin(async (tx) => {
    await tx`insert into crm.profiles (id, clerk_user_id, display_name, role) values
      (${ids.advisor}::uuid, 'h2-db-advisor', 'H2 DB Advisor', 'advisor'),
      (${ids.isolatedAdvisor}::uuid, 'h2-db-isolated-advisor', 'H2 DB Isolated Advisor', 'advisor'),
      (${ids.admin}::uuid, 'h2-db-admin', 'H2 DB Administrator', 'admin'),
      (${ids.student}::uuid, 'h2-db-student', 'H2 DB Student', 'student'),
      (${ids.isolatedStudent}::uuid, 'h2-db-isolated-student', 'H2 DB Isolated Student', 'student')`;
    await tx`insert into crm.student_profiles (profile_id, preferred_destination_country, preferred_degree, preferred_program) values
      (${ids.student}::uuid, 'US', 'bachelor', 'Computer Science'),
      (${ids.isolatedStudent}::uuid, 'US', 'bachelor', 'Business Administration')`;
    await tx`insert into crm.conversations (id, created_by_profile_id, subject) values
      (${ids.conversation}::uuid, ${ids.advisor}::uuid, 'H2 database authorization')`;
    await tx`insert into crm.conversation_participants (conversation_id, profile_id, participant_role) values
      (${ids.conversation}::uuid, ${ids.advisor}::uuid, 'advisor'),
      (${ids.conversation}::uuid, ${ids.student}::uuid, 'student')`;

    await tx.unsafe("set local role authenticated");
    await claim(tx, "h2-db-advisor");
    assert.equal(await canAccess(tx, ids.student), true, "authorized advisor");
    assert.equal(
      await visible(tx, ids.student),
      1,
      "authorized student visible",
    );
    assert.equal(
      await canAccess(tx, ids.isolatedStudent),
      false,
      "organization isolation",
    );
    assert.equal(
      await visible(tx, ids.isolatedStudent),
      0,
      "isolated student hidden",
    );

    await claim(tx, "h2-db-isolated-advisor");
    assert.equal(
      await visible(tx, ids.student),
      0,
      "inaccessible student nondisclosure",
    );
    assert.equal(
      await canAccess(tx, "b1000000-0000-4000-8000-999999999999"),
      false,
      "missing student nondisclosure",
    );

    await claim(tx, "h2-db-admin");
    assert.equal(
      await canAccess(tx, ids.isolatedStudent),
      true,
      "administrator access",
    );
    assert.equal(
      await visible(tx, ids.isolatedStudent),
      1,
      "administrator row visibility",
    );

    await claim(tx, "h2-db-advisor");
    const rows =
      await tx`select profile_id from crm.student_profiles order by profile_id`;
    assert.deepEqual(
      rows.map(({ profile_id }) => profile_id),
      [ids.student],
    );

    const rollback = new Error("rollback test fixtures");
    rollback.code = "H2_ROLLBACK";
    throw rollback;
  });
} catch (error) {
  if (error?.code !== "H2_ROLLBACK") throw error;
} finally {
  await sql.end();
}

console.log("MATCHING_AUTHORIZATION_DB: 9/9 passed; fixtures rolled back");
