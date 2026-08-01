# Preview Certification Runbook

This runbook certifies one Global Scholars OS Preview deployment. It does not
authorize Staging or Production changes. Run every command from the repository
root and store secrets only in approved Vercel, GitHub, Clerk, or operator
secret stores.

Use one unique run ID throughout the procedure. It must match
`^[a-z0-9][a-z0-9-]{0,39}$`.

```powershell
$env:E2E_RUN_ID = "<unique-run-id>"
```

Never include passwords, tokens, connection strings, private keys, or complete
secret values in the certification evidence.

## Phase 1 — Repository validation

- [ ] Confirm the intended release commit is checked out.
- [ ] Confirm all intended changes, including this runbook, are committed.
- [ ] Confirm `git status --porcelain` produces no output.
- [ ] Record the exact Git SHA.

```powershell
git status --porcelain
git rev-parse HEAD
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
```

Expected results:

- Typecheck exits `0`.
- Lint exits `0`.
- All unit and contract tests pass.
- The production build exits `0`.
- `git diff --check` exits `0`. Line-ending conversion warnings may be recorded,
  but whitespace errors are failures.

**Stop condition:** If any command fails or the worktree is not clean, record
the failure and do not apply migrations, provision fixtures, or deploy.

## Phase 2 — Apply migration 20260827

- [ ] Confirm the linked Supabase project reference is the approved Preview
      project.
- [ ] Confirm local head is `20260827` and remote head is `20260826`.
- [ ] Confirm the dry-run lists exactly one migration:
      `20260827_grant_anon_crm_schema_usage.sql`.
- [ ] Apply the migration to Preview only.
- [ ] Confirm local and remote heads are both `20260827`.

```powershell
npx supabase projects list
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

The migration must contain only:

```sql
grant usage on schema crm to anon;
```

Schema `USAGE` permits PostgREST to resolve the approved readiness function. It
does not grant anonymous access to CRM tables, rows, mutation RPCs, or protected
application routes. RLS and existing object privileges remain authoritative.

**Stop condition:** If the dry-run lists another migration, the linked project
is not Preview, the push fails, or the heads do not converge at `20260827`, stop
before fixture provisioning.

## Phase 3 — Provision Preview fixtures

Follow [Preview E2E Fixtures](./preview-e2e-fixtures.md). Confirm the target is
the isolated Preview Supabase project before executing SQL.

- [ ] Confirm a dedicated non-production Preview Clerk administrator exists.
- [ ] Confirm its password is stored only in an approved secret store.
- [ ] Confirm its role metadata is `admin` in the shape expected by the app.
- [ ] Confirm an active matching `crm.profiles` administrator row uses the same
      Clerk user ID.
- [ ] Confirm the selected run ID is unique.
- [ ] Provision the deterministic synthetic fixtures.
- [ ] Record only the five returned non-secret UUIDs.

```powershell
psql $env:SUPABASE_DB_URL -v run_id=$env:E2E_RUN_ID `
  -f supabase/fixtures/preview_e2e.sql
```

Map the returned values as follows:

| Fixture output                       | Runner variable                      |
| ------------------------------------ | ------------------------------------ |
| `e2e_advisor_profile_id`             | `E2E_ADVISOR_PROFILE_ID`             |
| `e2e_second_advisor_profile_id`      | `E2E_SECOND_ADVISOR_PROFILE_ID`      |
| `e2e_student_profile_id`             | `E2E_STUDENT_PROFILE_ID`             |
| `e2e_application_student_profile_id` | `E2E_APPLICATION_STUDENT_PROFILE_ID` |
| `e2e_application_intake_id`          | `E2E_APPLICATION_INTAKE_ID`          |

**Stop condition:** If the Clerk administrator cannot be verified, the script
rejects the run ID, an application already exists for the synthetic pair, or
provisioning fails, run the scoped cleanup if necessary and do not deploy.

## Phase 4 — Configure Vercel Preview secrets

Assign every variable to **Preview only**. Mark credentials, bypass tokens, and
salts as sensitive. Do not add values to tracked `.env` files.

- [ ] `PLAYWRIGHT_BASE_URL`
- [ ] `VERCEL_AUTOMATION_BYPASS_SECRET`
- [ ] `E2E_ADMIN_EMAIL`
- [ ] `E2E_ADMIN_PASSWORD`
- [ ] `E2E_ADVISOR_PROFILE_ID`
- [ ] `E2E_SECOND_ADVISOR_PROFILE_ID`
- [ ] `E2E_STUDENT_PROFILE_ID`
- [ ] `E2E_APPLICATION_STUDENT_PROFILE_ID`
- [ ] `E2E_APPLICATION_INTAKE_ID`
- [ ] `E2E_RUN_ID`
- [ ] `OPERATIONS_HASH_SALT`

Use Vercel's interactive secret input or an approved CI secret integration:

```powershell
npx vercel env add <VARIABLE_NAME> preview
```

After configuration, pull Preview variables into a temporary ignored file,
verify presence and safe fingerprints locally, and delete the file immediately.
Never attach it to evidence or commit it.

```powershell
npx vercel env pull .preview-env-audit.tmp --environment=preview --yes
# Verify names, non-empty presence, scope, and redacted fingerprints only.
Remove-Item -LiteralPath .preview-env-audit.tmp -Force
```

**Stop condition:** If any required value is missing, empty, assigned outside
Preview, or points to a non-Preview Clerk/Supabase resource, clean up fixtures
and do not deploy.

## Phase 5 — Redeploy Preview

- [ ] Reconfirm the worktree is clean.
- [ ] Reconfirm the Git SHA matches Phase 1.
- [ ] Deploy without `--prod`.
- [ ] Record the Preview URL and deployment ID from the CLI output.
- [ ] Inspect the deployment and confirm its target is `preview` and status is
      `Ready`.

```powershell
git status --porcelain
git rev-parse HEAD
npx vercel deploy --yes
npx vercel inspect <PREVIEW_URL>
```

Do not use `--prod`, promote an existing deployment, or alias the deployment to
a Production or Staging domain.

**Stop condition:** If the deployed artifact, Git SHA, target, environment, or
build is incorrect, record the failure and proceed to fixture cleanup only.

## Phase 6 — Verify health and readiness

Use Vercel's authenticated curl command so Preview Protection stays enabled and
the automation bypass is supplied without weakening Clerk or application
authorization.

```powershell
npx vercel curl /api/health --deployment $env:PLAYWRIGHT_BASE_URL
npx vercel curl /api/ready --deployment $env:PLAYWRIGHT_BASE_URL
```

- [ ] `/api/health` returns HTTP `200` promptly.
- [ ] The health payload contains `"status":"ok"`.
- [ ] `/api/ready` returns HTTP `200` promptly.
- [ ] The readiness payload contains `"status":"ready"`.
- [ ] Database dependency status is `ready`.
- [ ] Responses and logs contain no credentials, tokens, private data, or secret
      values.
- [ ] Record status codes, response times, redacted payloads, request IDs, and
      timestamps.

**Stop condition:** A non-200 response, database unavailability, unexpected
redirect, secret exposure, or timeout makes the result `NOT READY`. Continue to
Phase 8 cleanup; do not run business workflows against an unhealthy Preview.

## Phase 7 — Run authenticated Playwright

Load the variables from the approved runner secret store. Confirm
`PLAYWRIGHT_BASE_URL` is the deployment recorded in Phase 5.

```powershell
npm run test:e2e
```

Required result:

```text
3 passed
0 failed
0 skipped
```

- [ ] Framework smoke test passed.
- [ ] Organization authenticated workflow passed.
- [ ] Student Application authenticated workflow passed.
- [ ] Playwright exited normally.
- [ ] Screenshots, traces, retries, and reports were retained according to the
      Playwright configuration.

Any skipped authenticated workflow is a certification failure. Do not interpret
a framework-only pass as Preview certification.

## Phase 8 — Clean up Preview fixtures

Run cleanup whether Playwright passes or fails. Use exactly the same run ID from
Phase 3.

```powershell
psql $env:SUPABASE_DB_URL -v run_id=$env:E2E_RUN_ID `
  -f supabase/fixtures/cleanup_preview_e2e.sql
```

- [ ] Application child records were removed before applications.
- [ ] Organization assignments were removed before organizations.
- [ ] Catalog records were removed in reverse foreign-key order.
- [ ] Synthetic identities were soft-deactivated to preserve audit integrity.
- [ ] No record outside the deterministic fixture UUIDs or exact run prefix was
      modified.
- [ ] Cleanup completed without disabling triggers, RLS, or audit controls.

**Stop condition:** A cleanup failure requires an operational incident/task with
the run ID and affected synthetic identifiers. Do not manually broaden deletion
criteria.

## Phase 9 — Collect evidence

Store redacted evidence in the approved release evidence location.

| Evidence                                  | Recorded value      |
| ----------------------------------------- | ------------------- |
| Certification timestamp and operator      |                     |
| Preview Supabase project reference        |                     |
| Local migration head                      | `20260827`          |
| Remote migration head                     | `20260827`          |
| Git SHA                                   |                     |
| Vercel deployment ID                      |                     |
| Preview deployment URL                    |                     |
| Deployment target/status                  | `preview` / `Ready` |
| `/api/health` status, latency, request ID |                     |
| `/api/ready` status, latency, request ID  |                     |
| Database readiness status                 |                     |
| Playwright passed                         | `3` expected        |
| Playwright failed                         | `0` expected        |
| Playwright skipped                        | `0` expected        |
| Fixture run ID                            |                     |
| Cleanup result                            |                     |
| Secret values included                    | `No`                |

Evidence must show that the deployed SHA is the repository artifact validated
in Phase 1. Record safe variable fingerprints only when environment identity
needs to be demonstrated.

## Phase 10 — Decision

Select exactly one outcome.

### READY FOR STAGING

Choose only when all phases passed, migration heads match, health and readiness
are HTTP 200, all three Playwright tests passed with zero skips, cleanup
completed, and the evidence package is complete.

### NOT READY

Choose when any required gate failed, was skipped, is ambiguous, or lacks
evidence. Record the failed phase, exact blocker, owner, and remediation. Do not
deploy to Staging or Production.
