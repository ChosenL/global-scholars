# Staging Certification Evidence Record

This template records proof; it is not proof by itself. Missing evidence is
NOT VERIFIED and prevents certification. Store artifacts in the approved
restricted evidence system and link them here without secrets or PII.

## Release identity

| Field | Value |
|---|---|
| Release ID | |
| Commit and immutable artifact ID | |
| Previous/last-known-good artifact | |
| Migration range and final head | |
| Preview URL/fingerprint | |
| Staging URL/fingerprint | |
| Window and observation end (UTC) | |
| Deployment/rollback owners | |

## Environment separation

| Provider/control | Development fingerprint | Preview | Staging | Production | Separation result |
|---|---|---|---|---|---|
| Vercel | | | | | |
| Supabase database/region | | | | | |
| Clerk instance | | | | | |
| OpenAI project/key fingerprint | | | | | |
| Storage namespace | | | | | |
| Monitoring environment | | | | | |
| Salts/rate-limit namespace | | | | | |

Only non-secret identifiers or one-way fingerprints are allowed.

## Evidence manifest

| Evidence | Required result | Actual | Time/owner | Restricted reference |
|---|---|---|---|---|
| Repository gates | PASS | | | |
| Clean database migration rehearsal | PASS | | | |
| `20260820` ACL/search-path verification | PASS | | | |
| `20260821` tables/RLS/RPC/trigger verification | PASS | | | |
| `20260822` readiness RPC verification | PASS | | | |
| Supabase advisors and forced-RLS inventory | PASS | | | |
| Authorization role truth table | PASS | | | |
| Staging smoke checklist | PASS | | | |
| Browser journey traces/screenshots | PASS | | | |
| Health/readiness failure injection | PASS | | | |
| AI quota/rate/circuit/kill-switch tests | PASS | | | |
| Redaction/correlation and alert test | PASS | | | |
| Backup/PITR recovery point | PASS | | | |
| Database/Storage restore drill | PASS | | | |
| Signed-link cross-user/expiry test | PASS | | | |
| Dependency/SBOM/license/secret scans | PASS | | | |
| Last-known-good rollback rehearsal | PASS | | | |
| Observation-window metrics | PASS | | | |

## Migration execution record

| Migration | Started/ended UTC | Result | Lock/runtime | Post-check | Rollback checkpoint |
|---|---|---|---|---|---|
| `20260820_harden_security_definer_privileges.sql` | | | | | CP2 |
| `20260821_add_operational_controls.sql` | | | | | CP3 |
| `20260822_add_infrastructure_readiness.sql` | | | | | CP4 |

## Findings and incidents

| ID | Severity | Finding/impact | Resolution | Owner/due date | Promotion effect |
|---|---|---|---|---|---|
| | | | | | |

## Certification

- [ ] Every required item is PASS.
- [ ] No automatic NO-GO condition or open SEV-1/SEV-2 exists.
- [ ] Exceptions, if allowed, are non-security/non-integrity/non-recovery,
  time-bounded, and cross-functionally approved.
- [ ] Evidence contains no credentials, personal records, or signed URLs.

| Role | Name | PASS/FAIL | Time (UTC) | Signature/reference |
|---|---|---|---|---|
| Engineering | | | | |
| Operations | | | | |
| Security | | | | |
| Product | | | | |
| Staging accountable owner | | | | |

Final staging result: CERTIFIED / NOT CERTIFIED  
Production-promotion recommendation: GO / NO-GO
