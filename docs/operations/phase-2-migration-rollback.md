# Phase 2 Migration Rollback Procedures

Scope: operational migrations introduced during Phase 2, Sprints 8.2–8.4:

1. `20260820_harden_security_definer_privileges.sql`
2. `20260821_add_operational_controls.sql`
3. `20260822_add_infrastructure_readiness.sql`

Applied migrations are immutable. Rollback means application rollback plus a new,
reviewed forward corrective migration. Never edit migration history or weaken RLS
or authorization during an incident. Capture the pre-change recovery point,
function definitions/grants, migration head, row counts, and application version.

## Universal decision sequence

1. Stop promotion and assign deployment and rollback owners.
2. Determine whether application-only rollback restores compatibility.
3. Stop affected writes if integrity is uncertain; retain read-only diagnostics.
4. Preserve logs, correlation IDs, domain events, audit records, and operational
   usage data.
5. Use PITR/restore only for corruption or unrecoverable destructive effects, not
   as the routine response to application failure.
6. Rehearse corrective SQL in an isolated clone, including authorization tests.
7. Apply the corrective migration once through the normal migration path.
8. Run post-rollback verification and record actual RTO/RPO.

## 20260820: SECURITY DEFINER privilege hardening

**Change:** fixes mutable `search_path`, revokes anonymous execution from legacy
privileged functions, blocks direct trigger-function execution, and preserves the
authenticated legacy allowlist.

**Preferred rollback:** keep the migration and rollback the application. The
hardening is compatible with intended authenticated behavior.

**If a legitimate authenticated path breaks:**

1. Identify the exact function signature and caller role from redacted evidence.
2. Verify the function body still enforces shared CRM authorization.
3. Create a forward corrective migration granting only the minimum required role
   on that exact signature. Keep `search_path = ''`.
4. Never restore `PUBLIC` or `anon` execution to a `SECURITY DEFINER` function.
5. Run the anonymous-execution and search-path verification tests.

**Recovery evidence:** pre/post `pg_proc.proconfig`, exact ACL diff, anonymous
denial, authenticated positive/negative paths, and forced-RLS inventory.

## 20260821: operational rate limits and AI usage controls

**Change:** adds `crm.operational_rate_limits`, `crm.ai_daily_usage`, supporting
indexes, forced RLS/policy, rate-limit/quota RPCs, the usage-capture trigger and
trigger function.

**Preferred rollback:**

1. Use `AI_OPERATIONS_ENABLED=false` if AI is the affected dependency.
2. Roll back application code to a version that does not call the new RPCs.
3. Retain both tables and all usage/rate evidence; unused additive objects do not
   affect business workflows.

**Schema retirement, only after compatibility and retention approval:**

1. Export aggregate operational evidence without identifiers or secrets.
2. Confirm no deployed application calls either RPC.
3. In a forward migration, drop the `ai_invocations_capture_daily_usage` trigger,
   then its trigger function, quota/rate RPCs, policy/indexes, and finally tables.
4. Do not cascade. A dependency error must stop the corrective migration.
5. Re-run AI invocation, event, audit, RLS, quota, and rate-limit tests.

**Data warning:** dropping `crm.ai_daily_usage` loses quota/usage history; dropping
rate windows can temporarily reset abuse counters. Security and operations must
approve both effects.

## 20260822: infrastructure readiness

**Change:** adds the non-privileged `crm.operational_readiness()` RPC used by
`/api/ready`, callable by `anon` and `authenticated`, returning no business data.

**Preferred rollback:** roll back application code so monitoring no longer calls
the RPC; retaining it is harmless and backward-compatible.

**Schema retirement:** after all callers and monitors use the last-known-good
health contract, add a forward migration that revokes execution from `anon` and
`authenticated`, then drops the exact zero-argument function without `CASCADE`.
Verify `/api/health`, the previous readiness target, and deployment protection.

## Mixed-version compatibility

| Database state | New application | Previous application | Decision |
|---|---|---|---|
| Before `20260820` | Unsafe/unverified | Runs but retains security gaps | NO-GO |
| Through `20260820` | AI operations unavailable | Expected compatible | Application rollback safe |
| Through `20260821` | Readiness RPC absent | Expected compatible; extra tables retained | Application rollback safe |
| Through `20260822` | Expected target | Expected compatible; extra objects retained | Preferred rollback state |

Before release, prove these assumptions in staging with the exact last-known-good
artifact. Any failed assumption changes the release to NO-GO.
