# Preview E2E Fixtures

These scripts are **Preview-only** operator tools. They are outside the migration
chain, are never run during deployment, and must never target Staging or
Production.

## Manual Clerk prerequisite

Create one dedicated administrator in the isolated Preview Clerk instance:

1. Use a non-production address, preferably under `example.invalid` when the
   Clerk configuration permits it.
2. Store its known E2E password only in Vercel or GitHub encrypted secrets.
3. Set administrator role metadata using the same claim shape expected by the
   application.
4. Create a matching active `crm.profiles` row whose `clerk_user_id` is the
   Preview Clerk user ID and whose role is `admin`.
5. Verify the Clerk user and CRM row refer to each other before running E2E.

The fixture SQL deliberately does not create the Clerk user or administrator
profile. Never substitute a production administrator or customer account.

## Provision

Use a database connection secret for the linked Preview project. Do not place
the connection string or password in shell history, logs, or tracked files.

```sh
psql "$SUPABASE_DB_URL" -v run_id=20260801-ci123-1 \
  -f supabase/fixtures/preview_e2e.sql
```

The run ID must match `^[a-z0-9][a-z0-9-]{0,39}$` and must be unique per
isolated run. The script derives stable UUIDs from `e2e-preview-<run-id>`, so a
retry with the same ID is idempotent. It creates four synthetic CRM identities,
two student extensions, and a synthetic admissions chain with an open intake.
It also creates one run-scoped conversation with both fixture advisors and the
application student as active participants. This supplies the real shared-
conversation authorization required by application advisor assignment without
adding organization membership or touching customer conversations. All email
values use `example.invalid`.

The script prints only the non-secret UUIDs required by the runner. Map them to:

- `E2E_ADVISOR_PROFILE_ID`
- `E2E_SECOND_ADVISOR_PROFILE_ID`
- `E2E_STUDENT_PROFILE_ID`
- `E2E_APPLICATION_STUDENT_PROFILE_ID`
- `E2E_APPLICATION_INTAKE_ID`

## Runner checklist

Configure these outside the repository:

```text
PLAYWRIGHT_BASE_URL
VERCEL_AUTOMATION_BYPASS_SECRET
E2E_ADMIN_EMAIL
E2E_ADMIN_PASSWORD
E2E_ADVISOR_PROFILE_ID
E2E_SECOND_ADVISOR_PROFILE_ID
E2E_STUDENT_PROFILE_ID
E2E_APPLICATION_STUDENT_PROFILE_ID
E2E_APPLICATION_INTAKE_ID
E2E_RUN_ID
SUPABASE_DB_URL
OPERATIONS_HASH_SALT
```

For Playwright, `SUPABASE_DB_URL` enables automatic fixture lifecycle handling.
Each invocation generates a fresh internal `E2E_RUN_ID`, derives all fixture
UUIDs, provisions before any project starts, and cleans after all projects even
when a test fails. Manually exported fixture IDs and run IDs are replaced for
that invocation. The Clerk setup remains project-based and its storage state is
reused only within the current Playwright invocation.

`PLAYWRIGHT_BASE_URL` must be the certified Preview URL. The Vercel bypass
secret bypasses platform Preview Protection only; Clerk and application
authorization remain active.

## Cleanup

Use the identical run ID:

```sh
psql "$SUPABASE_DB_URL" -v run_id=20260801-ci123-1 \
  -f supabase/fixtures/cleanup_preview_e2e.sql
```

Cleanup selects data only through deterministic fixture UUIDs or the exact
`e2e-preview-<run-id>` organization prefix. Application children and
organization assignments are removed before their parents. Catalog rows are
then removed in reverse foreign-key order. Synthetic CRM identities are
soft-deactivated so immutable audit references are preserved. The shared
synthetic `XZ` country is deleted only when no fixture universities still use
it. Cleanup also recognizes the legacy raw-MD5 IDs for the same validated run
ID and entity namespaces, allowing runs created before RFC UUID correction to
be removed safely. Every cleanup predicate explicitly distinguishes target
table columns from fixture-context values.

The organization browser workflow uses the same `e2e-preview-<run-id>` cleanup
namespace. Cleanup also recognizes the historical, run-scoped
`e2e-partner-<run-id>-<retry>` slug so incomplete certification runs created
before namespace alignment can be removed without matching customer rows.

Conversation attachments and messages are removed first, followed by the three
fixture participants and then the deterministic conversation. Legacy fixture
runs created before conversation provisioning have no such record, so the same
cleanup remains safe for them.

The rollback-only database regression is
`supabase/tests/preview_e2e_cleanup.sql`. It verifies fixture deletion,
soft-deactivation, shared-country behavior, and unrelated-row isolation, then
ends with `ROLLBACK`.

Review the target project reference and run ID before provisioning or cleanup.
