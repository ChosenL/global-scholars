# Production Release Checklist

Release ID: __________  
Candidate commit: __________  
Change window (UTC): __________  
Deployment owner: __________  
Rollback owner: __________  
Decision: **NO-GO until every required gate is evidenced**

This checklist certifies operations only. It does not authorize a deployment.
Attach evidence by durable reference; never paste secrets, tokens, signed URLs,
or personal data.

## 1. Scope and integrity

- [ ] Release commit is immutable, reviewed, and matches the tested artifact.
- [ ] Release notes identify every application, migration, configuration, and
  operational change.
- [ ] No unapproved business feature or unrelated work is included.
- [ ] `crm.profiles` remains canonical identity and domain records use CRM UUIDs.
- [ ] Forced RLS and authorized RPC/service mutation paths remain mandatory.
- [ ] Dependency lockfile, SBOM, vulnerability, license, and secret-scan evidence
  is approved.
- [ ] GitHub required checks and protected-environment approval are enforced.

## 2. Repository gates

- [ ] Clean `npm ci` completed using the approved Node version.
- [ ] `npx tsc --noEmit` passed.
- [ ] `npm run lint` passed.
- [ ] `npm test` passed with zero skipped required tests.
- [ ] `npm run build` passed.
- [ ] `git diff --check` passed.
- [ ] Clean database migration rehearsal passed in filename order.
- [ ] Database tests and anonymous/student/advisor/admin authorization truth table
  passed.

## 3. Environment and provider certification

- [ ] Production fingerprint differs from Development, Preview, and staging.
- [ ] Vercel, Supabase, Clerk, OpenAI, Storage, DNS, and monitoring owners verify
  the non-secret resource inventory.
- [ ] Production secrets are server-only, correctly scoped, rotated where
  required, and absent from build output, logs, health, and readiness responses.
- [ ] Clerk origins, redirects, sessions, MFA, webhooks, and break-glass access
  are approved.
- [ ] Supabase connection, RLS, RPC grants, Storage policies, and advisor reports
  are approved.
- [ ] OpenAI project, model allowlist, quotas, budget, circuit breaker, timeout,
  and kill switch are verified.
- [ ] Provider usage, cost, availability, latency, error, and capacity alerts have
  acknowledged test incidents.

## 4. Reliability and recovery

- [ ] Database backup and PITR retention meet approved RPO.
- [ ] Isolated database restore met approved RTO/RPO and authorization checks.
- [ ] Private Storage inventory, encrypted backup, checksum, and sample restore
  passed.
- [ ] Signed-link authorization, cross-user denial, and post-expiry failure passed.
- [ ] Last-known-good application rollback was rehearsed.
- [ ] Every included migration has a reviewed rollback/forward-fix record.
- [ ] Recovery owner, incident commander, and provider escalation contacts are
  available for the full change and observation windows.

## 5. Staging acceptance

- [ ] The exact artifact and migrations ran in isolated staging.
- [ ] Anonymous, student, advisor, administrator, and AI journeys passed.
- [ ] Health, readiness, logging, correlation, redaction, rate limits, quota,
  circuit, and kill-switch tests passed.
- [ ] Domain events, timeline, notifications, activity, analytics, audit, and
  workflows were validated without duplicate effects.
- [ ] Performance/capacity and failure-injection results meet approved thresholds.
- [ ] Product, engineering, operations, and security accepted staging evidence.

## 6. Change-window controls

- [ ] Maintenance and stakeholder communications are approved and scheduled.
- [ ] Database lock/runtime estimate and migration compatibility are approved.
- [ ] Deployment order, responsible operator, commands, and stop conditions are
  recorded without credentials.
- [ ] Rollback thresholds and decision authority are understood.
- [ ] No unrelated infrastructure or data change shares the window.

## 7. Deployment and observation

- [ ] Pre-change recovery point and provider health timestamp recorded.
- [ ] Application artifact deployed by the named owner.
- [ ] Migrations applied once, in order, with migration head recorded.
- [ ] [Post-deployment verification](./post-deployment-verification.md) passed.
- [ ] Error, latency, denial, saturation, event backlog, AI usage, and spend
  observed for the approved window.
- [ ] No secret, PII, or signed URL appeared in telemetry.
- [ ] Completion or rollback communication sent.

## 8. Closure

- [ ] Final migration head, application version, environment fingerprint, evidence
  links, incidents, deviations, and risk acceptances recorded.
- [ ] Product, engineering, operations, security, and accountable business owner
  signed [production-sign-off.md](./production-sign-off.md).
- [ ] Follow-up work has owners and due dates.

Any unchecked required item is NO-GO unless the production sign-off records a
time-bounded exception approved by security, operations, and the accountable
business owner. Security or recovery controls cannot be waived by engineering
alone.
