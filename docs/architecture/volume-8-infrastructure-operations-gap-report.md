# Volume 8 — Infrastructure and Operations Gap Report

Audit date: 2026-07-27  
Scope: repository plus read-only Vercel and linked Supabase inspection  
Deployment action: none

## Executive result

**FAIL for staging readiness. PARTIAL for Preview operations.**

The application builds and the core CRM architecture is intact. The linked
Supabase project is `ACTIVE_HEALTHY`, all 30 migrations match locally and
remotely, and all 50 CRM tables have enabled and forced RLS. Vercel has working
Preview deployments and encrypted environment variables.

Staging promotion is blocked by legacy anonymous `SECURITY DEFINER` exposure,
unverified backup/PITR and provider alerting, absent application rate limiting,
incomplete environment isolation, no browser-level acceptance suite, and no
central monitoring/error-reporting service.

The audit preserves `crm.profiles` as canonical identity, CRM UUID authority,
RLS, and authorized RPC/service mutation paths.

## Evidence collected

- Vercel project `global-scholars`: Next.js, Node 24.x, standard build settings.
- Existing Vercel Preview and Production deployments were listed read-only.
- Vercel variables are encrypted; Clerk/Supabase variables currently span
  Development, Preview, and Production. `OPENAI_SAFETY_SALT` exists only in
  Preview.
- Preview and production deployment URLs returned HTTP 302 for `/api/health`,
  consistent with deployment protection; health payload was not externally
  verified.
- Supabase project `Global Scholars Portal`, `us-east-1`, PostgreSQL 17,
  `ACTIVE_HEALTHY`.
- Migration history: 20260721 through 20260819 synchronized.
- CRM tables: 50 total, 50 RLS-enabled, 50 forced-RLS.
- Storage buckets are private with size/MIME restrictions.
- Supabase security and performance advisors were executed.

## Findings

| Area | Status | Finding |
|---|---|---|
| Vercel project/build configuration | PASS | Linked project uses Next.js, Node 24.x, and the repository build command. |
| Vercel Preview configuration | PARTIAL | Preview deployments exist and deployment protection returns 302, but preview branch rules, domain, retention, function logs, and checks are not codified or fully verified. |
| Supabase project health | PASS | Linked project reports `ACTIVE_HEALTHY`; migrations are synchronized. |
| CRM schema and RLS | PASS | All 50 CRM tables have RLS enabled and forced. |
| RPC authorization | PARTIAL | CRM RPCs generally revoke `public` and perform authorization, but the security advisor reports broad authenticated SECURITY DEFINER exposure requiring a per-function allowlist review. |
| Legacy public RPC security | PARTIAL | Sprint 8.2 migration 20260820 revokes anonymous execution and assigns empty search paths without changing function bodies. Repository verification passes; provider advisor confirmation remains pending until Preview application. |
| Storage security | PARTIAL | Buckets are private, constrained, and use five- or ten-minute signed URLs. Validation procedures now cover cross-user denial, expiry, checksums, and isolated restore, but automated evidence and legacy-policy cleanup remain. |
| Clerk authentication | PARTIAL | Middleware protects dashboard routes and role redirects exist; Clerk origins, redirect allowlists, session policy, MFA, webhook verification, and role-sync operations were not verified in the Clerk control plane. |
| OpenAI safety | PARTIAL | Auth, RLS context, moderation, structured output, citation allowlisting, pseudonymous safety IDs, token capture, and output limits exist. No request rate limit, daily budget, per-user quota, timeout, or circuit breaker exists. |
| Environment validation | PARTIAL | Core presence checks exist, but URL/key pairing, environment identity, staging project separation, webhook variables, monitoring variables, and fail-fast startup validation are missing. |
| Environment separation | FAIL | Clerk and Supabase variables are assigned across Development, Preview, and Production; distinct values/projects were not proven. There is no dedicated staging environment. |
| GitHub Actions | PARTIAL | Static gates use `npm ci`, typecheck, lint, tests, build, and diff check. Actions are tag-pinned rather than SHA-pinned; no database, browser, dependency, secret, migration, or preview-health job exists. |
| Health/readiness | PARTIAL | Secret-safe `/api/health` now provides liveness and `/api/ready` provides correlation-aware, bounded database readiness with optional AI degradation. Preview access and failure-injection evidence remain. |
| Structured logging | PARTIAL | Sprint 8.3 adds shared request/correlation IDs and structured logging across all API routes. Server-action coverage and external collection remain pending. |
| PII redaction | PASS | Central recursive redaction covers identity, credentials, prompts/context, signed URLs, storage paths, and common string patterns before operations logs/error reports. |
| Error reporting/monitoring | PARTIAL | A provider-agnostic error reporter is integrated. External provider, release tagging, dashboards, SLOs, and synthetic monitoring remain pending. |
| Alerts/escalation | FAIL | No alert rules, ownership schedule, severity matrix, paging channel, or tested escalation path exists. |
| Database backup/PITR | NOT VERIFIED | Proposed RTO/RPO and an isolated restore procedure now exist. Plan entitlement, PITR state, retention, and an executed restore remain unavailable. |
| Storage backup | FAIL | Manifest, checksum, encrypted-copy, and sample-restore procedures now exist, but no backup or restore has been executed. |
| Signed-link security | PARTIAL | Private storage and expiring signed links are used; TTLs are finite. Expiry, revocation, cache leakage, and cross-user negative tests are not automated. |
| Dependency security | BLOCKED | Lockfile and `npm ci` exist. Registry-backed `npm audit` was blocked because exporting the dependency graph was not approved. No Dependabot/Renovate, SBOM, license gate, provenance, or install-script policy exists. |
| Supply-chain security | FAIL | GitHub Actions are not SHA-pinned; no dependency review, CodeQL, secret scanning evidence, artifact attestations, or SBOM generation exists. |
| Rate limiting/abuse protection | PARTIAL | PostgreSQL-backed distributed limits protect public chat and CRM AI with hashed keys. Wider mutation routes and edge/WAF controls remain pending. |
| AI usage/cost controls | PARTIAL | Sprint 8.3 adds timeouts, bounded retries, kill switch, per-user daily request/token quotas, usage metrics, and a shared failure circuit. Provider spend alerts and concurrency controls remain pending. |
| Vercel cost monitoring | NOT VERIFIED | Usage budgets, spend alerts, function duration/error thresholds, and log retention were not visible in repository or inspected CLI output. |
| Supabase cost monitoring | PARTIAL | Project/table size and bloat were inspected and are currently small. Quota alerts, egress/storage budgets, connection monitoring, and spend alerts were not verified. |
| Database performance | PARTIAL | Indexing is extensive, but advisors report legacy RLS init-plan warnings, multiple permissive policies, and a duplicate audit index. |
| Incident response | PARTIAL | The release runbook has service-specific outage and rollback guidance, but lacks named roles, contacts, severity targets, communications templates, evidence preservation, and exercise records. |
| Rollback | PARTIAL | Additive migrations and application-first rollback are documented. No automated rollback rehearsal or last-known-good release record exists. |
| Preview-to-staging promotion | FAIL | No separate staging project/environment, automated migration rehearsal, E2E journeys, acceptance approval, monitoring proof, or backup verification gate exists. |

## Gap remediation requirements

### P0 — Close anonymous database privilege exposure

- **Risk:** Anonymous callers may invoke privileged legacy functions; mutable
  search paths can enable object-resolution attacks.
- **Required implementation:** Inventory every `public` and `crm` SECURITY
  DEFINER function; revoke `anon`/`public` by default; grant only an explicit
  allowlist; set `search_path = ''`; schema-qualify references; add negative
  pgTAP tests.
- **Acceptance criteria:** Supabase security advisor has no unintended anon
  SECURITY DEFINER or mutable-search-path findings; anonymous RPC tests fail.
- **Validation evidence:** Migration diff, advisor output, grants matrix, pgTAP
  results, clean/staging migration rehearsal.
- **Order:** 1.

### P0 — Establish environment isolation

- **Risk:** Preview activity can affect production identities/data; shared
  credentials increase blast radius.
- **Required implementation:** Separate Clerk instances/keys, Supabase projects,
  OpenAI project keys/budgets, salts, URLs, webhook secrets, and callback
  allowlists for Development, Preview, Staging, and Production.
- **Acceptance criteria:** Environment fingerprints differ without exposing
  secrets; preview cannot access production CRM/storage.
- **Validation evidence:** Provider screenshots/exports containing names and
  scopes only, cross-environment negative tests, environment matrix approval.
- **Order:** 2.

### P0 — Add abuse and AI cost controls

- **Risk:** Unbounded requests can create denial-of-service and provider spend.
- **Required implementation:** Distributed per-user/IP limits, payload caps,
  provider timeouts, concurrency limits, daily token budgets, cost alerts,
  refusal telemetry, and a route-level AI kill switch.
- **Acceptance criteria:** Limits return 429 with safe headers; quotas persist
  across instances; timeouts fail closed; budget alerts are tested.
- **Validation evidence:** Load tests, quota tests, alert test, cost dashboard.
- **Order:** 3.

### P1 — Monitoring, redaction, and escalation

- **Risk:** Failures or data leakage may remain undetected.
- **Required implementation:** Central error reporting and structured logging
  with release/environment/correlation fields; shared PII redactor; SLOs,
  synthetic health checks, alerts, severity matrix, and ownership.
- **Acceptance criteria:** A synthetic failure creates a redacted event and
  reaches the assigned escalation channel within the target time.
- **Validation evidence:** Captured test incident, redaction tests, dashboard and
  alert configuration export.
- **Order:** 4.

### P1 — Backup and recovery proof

- **Risk:** Database or object loss may be unrecoverable within business targets.
- **Required implementation:** Confirm plan/PITR, define RPO/RTO, automate storage
  inventory/backup, document restore steps, and perform isolated restore drills.
- **Acceptance criteria:** Database and representative private objects restore
  within approved RTO with integrity checks.
- **Validation evidence:** Provider backup settings, timestamps, drill record,
  checksums/count reconciliation.
- **Order:** 5.

### P1 — Release and supply-chain gates

- **Risk:** Vulnerable dependencies or untested migrations can reach deployment.
- **Required implementation:** SHA-pin Actions; add dependency review, approved
  vulnerability scan, SBOM/license/secret scanning, clean Supabase migration and
  pgTAP job, Playwright student/advisor journeys, and protected-environment
  approvals.
- **Acceptance criteria:** Required checks block promotion on any critical issue.
- **Validation evidence:** Pull request with intentionally failing controls,
  signed/attested build artifact, passing release run.
- **Order:** 6.

### P2 — Performance and storage-policy cleanup

- **Risk:** Duplicate policies/indexes add complexity and query overhead.
- **Required implementation:** Consolidate equivalent legacy storage policies,
  optimize auth RLS calls, review multiple permissive policies, and remove the
  duplicate audit index after plan verification.
- **Acceptance criteria:** Advisor warnings are resolved or explicitly accepted
  with measured evidence; access truth tables remain unchanged.
- **Validation evidence:** Before/after advisor reports, EXPLAIN plans, RLS tests.
- **Order:** 7.

## Sprint 8.2 proposed implementation plan

1. Database privilege/search-path hardening and negative tests.
2. Environment fingerprinting and provider separation design.
3. Distributed rate limiting, AI quotas, timeout, and kill switch.
4. Shared correlation middleware, PII redactor, monitoring SDK, and alerts.
5. Backup/PITR and storage restore drill documentation/automation.
6. CI database/E2E/security/SBOM gates and SHA-pinned Actions.
7. Performance-advisor and duplicate-policy/index cleanup.
8. Preview acceptance run; produce evidence before proposing staging.
