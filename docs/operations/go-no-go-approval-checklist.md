# Go/No-Go Approval Checklist

Release ID: __________  
Decision meeting (UTC): __________  
Facilitator: __________

## Required evidence

| Evidence package | Required approver | Status | Reference |
|---|---|---|---|
| Immutable commit, artifact provenance, release gates | Engineering | NOT VERIFIED | |
| Clean/staging migration and database-test results | Engineering + Operations | NOT VERIFIED | |
| RLS/RPC authorization truth table and security advisor | Security | NOT VERIFIED | |
| Environment fingerprint and secret-scope review | Operations + Security | NOT VERIFIED | |
| Clerk production configuration | Security | NOT VERIFIED | |
| Backup/PITR and timed isolated restore | Operations | NOT VERIFIED | |
| Storage backup/checksum/restore and signed-link tests | Operations + Security | NOT VERIFIED | |
| Monitoring, alerts, escalation, and cost controls | Operations | NOT VERIFIED | |
| AI safety, quota, circuit, kill-switch, and budget tests | Security + Operations | NOT VERIFIED | |
| Staging business and failure-injection acceptance | Product + Engineering | NOT VERIFIED | |
| Rollback rehearsal and migration recovery review | Engineering + Operations | NOT VERIFIED | |
| Communications and post-deployment plan | Operations + Product | NOT VERIFIED | |

## Automatic NO-GO conditions

- Required repository gate, migration rehearsal, RLS test, or staging journey
  failed or lacks evidence.
- Production and a lower environment share a provider resource or secret.
- Backup/PITR cannot meet approved RPO, or restore has not met approved RTO.
- A critical/high vulnerability or secret exposure is unresolved.
- Monitoring, incident ownership, rollback owner, or provider escalation is absent.
- Migration state is unknown, rollback compatibility is unreviewed, or a
  destructive change lacks a recovery point.
- Authentication, authorization, signed-link isolation, PII redaction, AI kill
  switch, or rate-limit testing failed.
- Active SEV-1/SEV-2 incident or material provider degradation affects the path.

## Decision rules

**GO** requires all required evidence to be PASS, named owners present, no
automatic NO-GO condition, and signatures from product, engineering, operations,
security, and the accountable business owner.

**CONDITIONAL GO** is allowed only for a non-security, non-data-integrity,
non-recovery gap with documented impact, compensating control, expiry, owner, and
all required approvers. It becomes NO-GO at expiry.

**NO-GO** pauses the release. Record the failing gate, remediation owner,
revalidation evidence, and next decision time. Never reinterpret missing evidence
as PASS.

## Approval record

| Role | Name | Decision | Time (UTC) | Evidence/exception |
|---|---|---|---|---|
| Product owner | | | | |
| Engineering owner | | | | |
| Operations owner | | | | |
| Security owner | | | | |
| Accountable business owner | | | | |
| Deployment owner | | | | |
| Rollback owner | | | | |

Final decision: __________  
Decision rationale: __________
