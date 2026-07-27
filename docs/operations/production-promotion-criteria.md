# Objective Production-Promotion Criteria

Promotion from certified Staging to Production is **PASS only when every mandatory
criterion below is PASS**. PARTIAL, BLOCKED, NOT VERIFIED, skipped, expired, or
missing evidence is FAIL for promotion.

## PASS criteria

| Gate | Objective PASS condition |
|---|---|
| Artifact identity | Production candidate commit, lockfile, build digest, and migrations exactly equal the certified Staging candidate |
| Repository | TypeScript, lint, all required tests, build, diff, clean install, and CI required checks pass |
| Supply chain | Approved vulnerability, SBOM, license, secret, dependency-review, SHA-pinning, and provenance evidence has no disallowed finding |
| Environment isolation | Staging and Production fingerprints differ for every provider, secret, data, Storage, monitoring, salt, and rate-limit scope |
| Migrations | Clean and Staging apply/rehearsal passes in order with acceptable lock/runtime and last-known-good compatibility |
| Authorization | Anonymous/student/advisor/admin truth table, forced RLS, RPC ACL, and SECURITY DEFINER checks all pass |
| Business platform | Dashboard, applications, visa, timeline, notifications, events, audit, activity, analytics, and workflows pass without duplicate effects |
| AI operations | Authorized context, validation, quota, rate, timeout, retry, circuit, kill switch, audit, and cost limits all pass |
| Health/readiness | Liveness, bounded required-dependency readiness, optional-AI degradation, and failure injection all pass |
| Observability | Central redacted logs/errors/traces, correlation, synthetics, SLO dashboards, and alert acknowledgement pass |
| Recovery | Backup/PITR meets approved RPO; isolated database and Storage restore meets RTO; signed-link denial/expiry passes |
| Rollback | Exact last-known-good application and Phase 2 migration recovery rehearsal passes |
| Capacity/cost | Load, connections, rate limits, provider capacity, and Vercel/Supabase/OpenAI budgets/alerts pass |
| Ownership | Named primary/backup owners, incident command, provider escalation, deployment, rollback, and communications coverage confirmed |
| Staging observation | No unresolved threshold breach during at least the approved 60-minute window |
| Approval | Product, engineering, operations, security, and accountable business owner sign the evidence record |

## Automatic FAIL criteria

- Any unauthorized access, RLS/RPC bypass, identity mismatch, secret/PII exposure,
  signed-link leakage, or unapproved public resource.
- Any unexplained data loss/corruption, duplicate/lost domain event, mutable
  audit/timeline history, or unknown migration state.
- Required dependency readiness failure, unresolved SEV-1/SEV-2, or missing
  monitoring/rollback owner.
- Production resource reused by a lower environment.
- Backup/restore cannot meet approved RTO/RPO.
- Candidate differs from Staging or any required evidence is missing/expired.

## Decision

Calculate no score and average no results. Promotion is binary:

- **GO:** every mandatory gate PASS, no automatic FAIL, all signatures present.
- **NO-GO:** every other state.

Risk acceptance cannot override authorization, confidentiality, integrity,
identity, secret management, recovery, or automatic FAIL conditions.
