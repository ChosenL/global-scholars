# Production Readiness Checklist

Use the detailed [production release checklist](./production-release-checklist.md),
[go/no-go record](./go-no-go-approval-checklist.md), and
[production sign-off](./production-sign-off.md) for certification evidence.

Current decision: **FAIL — production is not a candidate.**

All staging requirements must pass first.

## Security and governance

- [ ] **PARTIAL** — Zero unintended anonymous privileged RPCs is enforced by
  migration and tests but not yet verified after application in Preview.
- [ ] **PARTIAL** — Full CRM UUID/RLS/RPC authorization matrix approved.
- [ ] **NOT VERIFIED** — Clerk production origins, redirects, MFA/session policy,
  webhook verification, and break-glass ownership reviewed.
- [ ] **FAIL** — Rate limiting, abuse response, AI quotas, and kill switches tested.
- [ ] **BLOCKED** — Dependency vulnerability report approved.
- [ ] **FAIL** — Supply-chain controls and artifact provenance enabled.

## Reliability and recovery

- [ ] **NOT VERIFIED** — Proposed RTO/RPO and validation exist; production
  PITR/retention evidence and approval remain.
- [ ] **FAIL** — Isolated database restore procedure exists but is unexecuted.
- [ ] **FAIL** — Storage manifest/checksum/restore procedure exists but is
  unexecuted.
- [ ] **PARTIAL** — Application-first rollback and recovery procedures cover all
  Phase 2 migrations; staging rehearsal remains.
- [ ] **FAIL** — Last-known-good redeploy and event-consumer recovery rehearsed.
- [ ] **PARTIAL** — SEV-1 through SEV-4, RACI, escalation requirements, and
  communication templates exist; named contacts, approval, and exercise remain.

## Observability and cost

- [ ] **PARTIAL** — Application logs/errors are correlated and PII-redacted;
  central provider ingestion and tracing remain.
- [ ] **FAIL** — Authentication, RPC, event, storage, and AI failure alerts tested.
- [ ] **FAIL** — Availability/error/latency SLOs and dashboards approved.
- [ ] **NOT VERIFIED** — Vercel budget and usage alerts configured.
- [ ] **NOT VERIFIED** — Supabase database/storage/egress/connection alerts configured.
- [ ] **FAIL** — OpenAI daily/monthly budget, per-user quota, and anomaly alert configured.

## Release approval

- [ ] **FAIL** — Dedicated staging acceptance completed.
- [ ] **FAIL** — Production environment fingerprint differs from all non-production resources.
- [ ] **FAIL** — Required GitHub checks and protected production approval are enforced.
- [ ] **PARTIAL** — Phase 2 migration compatibility and recovery procedures are
  documented; lock/runtime review and staging rehearsal remain.
- [ ] **FAIL** — Stakeholder acceptance, security approval, operations approval,
  and named deployment owner recorded.
- [ ] **PARTIAL** — Post-deployment smoke, observation, and rollback categories
  are defined; numerical thresholds and rehearsal remain.

Production may be proposed only when every FAIL/BLOCKED/NOT VERIFIED item is
resolved or formally risk-accepted by an accountable owner.
