# Rollback Plan

Candidate: `b249e635dc0c86b3736aa93361fb11468f1f269a`
Status: **NOT REHEARSED FOR PRODUCTION**

## Application Rollback

1. Stop the deployment or promotion.
2. Restore the last-known-good application deployment.
3. Verify `/api/health`, `/api/ready`, authentication, authorization, matching,
   student workspace, advisor workspace, and application creation.
4. Monitor logs, alerts, latency, AI usage, and error rates for the approved
   observation window.

## Configuration Rollback

1. Restore only previously approved environment configuration.
2. Do not copy Preview credentials into Production.
3. Do not print secret values in evidence.
4. Re-run readiness, rate-limit, AI degraded/available checks, and authorization
   smoke tests.

## Database And Catalog Boundary

- Do not run production migrations in this phase.
- If a future migration is applied, use a reviewed forward corrective migration
  for remediation. Do not edit applied migration history.
- Catalog rollback must preserve the distinction between stored, discovered,
  search-eligible, program-verified, application-ready, intake-verified, and
  scholarship-verified records.
- Broad catalog publication remains out of scope.

Named rollback owner, tested timing, database restore rehearsal, and catalog
rollback rehearsal are **NOT VERIFIED**.
