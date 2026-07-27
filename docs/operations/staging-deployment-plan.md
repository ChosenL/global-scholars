# Staging Deployment Plan

Version: 1.0  
Scope: Phase 3, Sprint 9.1 certification  
Deployment authorization: **Not granted by this document**

The first staging deployment uses an isolated environment and the exact artifact
accepted in Preview. It introduces no business feature. Secrets, tokens, signed
URLs, connection strings, and personal data must not appear in the plan or
evidence.

## Entry criteria

- Candidate commit and lockfile are immutable and all repository gates pass.
- Preview, Staging, and Production have distinct, recorded non-secret
  fingerprints for Vercel, Supabase, Clerk, OpenAI, Storage, salts, monitoring,
  and rate-limit state.
- Staging contains synthetic data only and cannot deliver production
  notifications, webhooks, workflows, or AI traffic until explicitly enabled.
- The latest database backup/recovery point and rollback owner are recorded.
- Migration `20260820` through `20260822` passed clean/Preview rehearsal.
- Deployment, rollback, database, security, operations, and evidence owners are
  present for the change and observation windows.
- Monitoring access to `/api/health` and `/api/ready` is approved without making
  dashboards or business APIs public.

If an entry criterion is missing, the staging deployment decision is NO-GO.

## Artifact flow

```text
reviewed commit
  -> clean repository/database validation
  -> protected Preview deployment
  -> Preview migrations 20260820..20260822
  -> Preview smoke and rollback rehearsal
  -> immutable staging candidate
  -> isolated Staging migrations 20260820..20260822
  -> Staging application deployment
  -> smoke, failure injection, observation
  -> staging certification record
```

Production credentials or data must never enter this flow.

## Deployment order and rollback checkpoints

| Step | Action | Required evidence | Checkpoint and stop condition |
|---:|---|---|---|
| 0 | Freeze candidate and record current application/migration heads | Commit, artifact, environment fingerprint | **CP0:** mismatch or dirty artifact = stop |
| 1 | Confirm provider health, backup/PITR, synthetic identities, monitoring, owners | Provider timestamps and recovery point | **CP1:** missing recovery/owner = stop |
| 2 | Apply `20260820_harden_security_definer_privileges.sql` | Migration output; function ACL/search-path inventory | **CP2:** any anonymous SECURITY DEFINER or authenticated journey regression = stop and application-first rollback |
| 3 | Apply `20260821_add_operational_controls.sql` | Table/RLS/policy/RPC/trigger inventory | **CP3:** missing forced RLS, quota/rate error, or unsafe grant = stop; disable AI if affected |
| 4 | Apply `20260822_add_infrastructure_readiness.sql` | Exact RPC ACL/body and migration head | **CP4:** RPC leaks data or fails bounded invocation = stop |
| 5 | Deploy the exact Preview-accepted application artifact | Vercel version and commit | **CP5:** artifact mismatch or build/start failure = redeploy last known good |
| 6 | Validate health/readiness, auth, authorization, dashboards, business platform, AI, events | Completed smoke checklist | **CP6:** any security, identity, integrity, or core readiness failure = rollback/incident |
| 7 | Test kill switch, dependency degradation, rate/quota controls, alerts, and last-known-good redeploy | Failure-injection and alert evidence | **CP7:** unsafe degradation or unobserved failure = no certification |
| 8 | Observe approved metrics for at least 60 minutes | Baseline comparison and incident record | **CP8:** threshold breach = rollback or extend observation |
| 9 | Record staging sign-off and destroy temporary sensitive evidence | Evidence manifest and approvals | Missing signature/evidence = staging remains uncertified |

Migrations are applied before the application because the new application calls
the operational RPCs. All three migrations are additive or hardening-oriented;
the previous application is expected to remain compatible. That compatibility
must be demonstrated in Preview, not assumed.

## Rollback sequence

1. Stop further migration/application promotion and announce the checkpoint.
2. If confidentiality, authorization, or integrity may be affected, disable
   access or writes and open the appropriate incident severity.
3. Redeploy the recorded last-known-good application artifact.
4. Retain applied additive schema objects unless a reviewed forward corrective
   migration is required. Never edit migration history, use `CASCADE`, disable
   forced RLS, or restore anonymous privileged execution.
5. Use `AI_OPERATIONS_ENABLED=false` for an isolated AI operational failure.
6. Apply the migration-specific procedures in
   [phase-2-migration-rollback.md](./phase-2-migration-rollback.md).
7. Restore from the approved recovery point only for corruption or unrecoverable
   destructive effects.
8. Re-run health/readiness, authorization, data-integrity, event, and redaction
   checks; record active commit/migration head and actual recovery time.

## Exit criteria

Staging is certified only when every smoke test and production-promotion criterion
marked mandatory is PASS, the observation window is clean, evidence is complete,
and engineering, operations, security, product, and the staging owner sign.
