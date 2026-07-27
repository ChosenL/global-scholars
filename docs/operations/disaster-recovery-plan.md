# Disaster Recovery Plan

Last reviewed: 2026-07-26

Status: **PARTIAL**. Procedures and proposed objectives are defined; provider
backup configuration and an isolated restore drill remain unverified.

## Recovery objectives

These are proposed requirements and need business, security, and platform-owner
approval before production.

| Capability | Priority | Target RTO | Target RPO | Degraded operation |
|---|---:|---:|---:|---|
| Core CRM web, authentication, authorization | P0 | 1 hour | Configuration in source; no business-data loss | Static incident guidance if identity is unavailable |
| CRM PostgreSQL data and domain events | P0 | 2 hours | 15 minutes | Writes stop; never bypass RLS or RPC paths |
| Private document and message storage | P1 | 4 hours | 24 hours | Metadata remains; file operations report unavailability |
| Timeline, notifications, activity, audit, workflows | P1 | 2 hours | 15 minutes | Replay events with correlation/idempotency controls |
| AI assistant | P2 | 4 hours | 24 hours for usage records | Core CRM remains ready; AI safely reports unavailable |
| Central monitoring provider | P1 | 4 hours | 24 hours | Redacted platform logs remain subject to retention |

RTO begins when an incident is declared. RPO is measured at the last verified
recoverable point, not merely the configured schedule.

## Recovery sequence

1. Declare severity and assign incident commander, operations lead, security lead,
   communications owner, and recorder. Preserve correlation IDs and timestamps.
2. Stop harmful writes using application or access controls; use the AI kill
   switch independently when only AI is impaired.
3. Record the last healthy build, migration head, recovery point, storage
   manifest, and provider incident state.
4. Prefer application rollback when the database is backward-compatible. Never
   reverse a destructive migration against production during triage.
5. For data recovery, create a new isolated Supabase project. Disable delivery,
   AI, webhooks, workflow scheduling, and user access.
6. Follow [backup-restore-validation.md](./backup-restore-validation.md).
7. Validate CRM UUID integrity, forced RLS, RPC grants, immutable audit/timeline
   history, event consistency, object checksums, and signed-link denial.
8. Obtain security and incident-commander approval before routing traffic.
9. Observe health, readiness, authorization denials, latency, and errors.
10. Retain evidence and assign corrective-action owners before closure.

## Dependency degradation

- `/api/health` is liveness and stays HTTP 200 while the process can answer.
- `/api/ready` checks core configuration and a bounded database probe, returning
  HTTP 503 if either required dependency is unavailable.
- AI is optional in readiness. Timeouts, retry, circuit breaking, quotas, and the
  kill switch allow the core CRM to continue without it.
- Storage, Clerk, and OpenAI synthetics use non-person test identities and objects.
  They are not called from every readiness request, avoiding cost and cascading
  third-party failures.
- Failure responses and logs expose no secrets or PII. No fallback bypasses shared
  authorization, forced RLS, or secure mutation services.

## Backup requirements and cadence

- Database: managed backups plus PITR meeting the approved 15-minute RPO.
- Storage: encrypted, versioned backup outside the active project, using a manifest
  of bucket, path hash, size, checksum, and timestamp.
- Configuration: migrations, code, workflows, and non-secret infrastructure
  definitions in protected source control.
- Secrets: recover only through the approved secret manager.

Recovery-point verification is monthly. An isolated database restore is quarterly
and before launch. Storage reconciliation is daily; sample restore and signed-link
tests are quarterly. Full application recovery is semiannual and after material
platform changes.

Evidence records provider timestamps, recovery point, start/end, actual RTO/RPO,
migration head, validation output, deviations, approvals, and destruction of the
recovery environment.
