# Staging Readiness Checklist

Phase 2 certification remains **NO-GO**. Use
[go-no-go-approval-checklist.md](./go-no-go-approval-checklist.md) for required
promotion evidence.

Sprint 9.1 deployment and evidence procedures:

- [Staging deployment plan](./staging-deployment-plan.md)
- [Staging smoke tests](./staging-smoke-test-checklist.md)
- [Staging evidence record](./staging-certification-evidence-template.md)
- [Production-promotion criteria](./production-promotion-criteria.md)

Current decision: **FAIL — do not promote to staging.**

## Required gates

- [x] **PASS** — TypeScript, lint, application tests, production build, and
  whitespace validation pass.
- [x] **PASS** — Linked Supabase project is healthy and migration history matches.
- [x] **PASS** — All CRM tables have enabled and forced RLS.
- [x] **PASS** — Phase 2 migrations `20260820`–`20260822` parse successfully
  against linked PostgreSQL in independent rollback-only transactions.
- [x] **PARTIAL** — Migration and tests remove unintended anonymous SECURITY
  DEFINER execution; Preview application/advisor verification remains pending.
- [x] **PARTIAL** — Migration assigns empty search paths to all SECURITY DEFINER
  functions and flagged helpers; Preview advisor verification remains pending.
- [ ] **PARTIAL** — Review authenticated SECURITY DEFINER allowlist and prove
  authorization for each callable RPC.
- [ ] **FAIL** — Provision an isolated staging Clerk/Supabase/OpenAI environment.
- [x] **PARTIAL** — Distributed public-chat/AI limits and per-user AI quotas are
  implemented; Preview load validation and wider mutation coverage remain.
- [x] **PARTIAL** — Provider-agnostic structured logging, correlation, PII
  redaction, and error reporting are implemented; provider/synthetic alerts remain.
- [ ] **NOT VERIFIED** — Backup/PITR and isolated restore procedures exist;
  provider evidence and a timed restore remain.
- [ ] **FAIL** — Storage inventory/checksum/restore procedures exist; an
  encrypted backup and sample restore remain.
- [ ] **PARTIAL** — Signed-link TTLs and expiry/cross-user procedures exist;
  automated execution remains.
- [ ] **FAIL** — Add clean-database migration and pgTAP CI.
- [ ] **FAIL** — Add browser-level student and advisor journeys.
- [ ] **BLOCKED** — Run approved dependency vulnerability scan.
- [ ] **FAIL** — Add dependency review, SBOM, secret scanning, and SHA-pinned Actions.
- [ ] **PARTIAL** — `/api/health` supplies liveness and `/api/ready` supplies a
  bounded database check; Preview access and failure tests remain.
- [ ] **PARTIAL** — Proposed RTO/RPO, operational RACI, SEV classification, and
  recovery roles exist; named owners, approval, and an exercise remain.
- [ ] **FAIL** — Test application rollback and AI kill switch.
- [ ] **NOT VERIFIED** — Configure Vercel/Supabase/OpenAI usage and spend alerts.

## Promotion evidence package

Attach:

1. Provider resource matrix showing separation without secret values.
2. Supabase security/performance advisor exports.
3. Clean/staging migration and pgTAP results.
4. RLS truth table for anonymous, student, advisor, and admin.
5. Student/advisor Playwright run with screenshots or traces.
6. Rate-limit and AI-budget tests.
7. Redacted monitoring and alert test incident.
8. Database and Storage restore drill report.
9. Signed-link expiry/cross-user denial test.
10. Approved dependency/SBOM/license/secret-scan reports.
11. Rollback rehearsal record and release owner approval.
