# Production Sign-Off

Release ID: __________  
Commit/artifact: __________  
Migration range/head: __________  
Window (UTC): __________  
Overall decision: **NO-GO**

This record is incomplete until every evidence reference and required signature
is present. A template is not approval.

## Certification statements

- [ ] Scope contains no unapproved business functionality.
- [ ] Repository, database, security, provider, recovery, staging, monitoring,
  cost, and communications evidence is complete.
- [ ] Architecture invariants are preserved: `crm.profiles` canonical identity,
  CRM UUID authority, no duplicated identity, forced RLS, authorized mutation
  paths, domain events, and no client/log/health secret exposure.
- [ ] Every Phase 2 migration has compatibility and recovery approval.
- [ ] RTO/RPO, backups, isolated restore, Storage recovery, and signed-link tests
  meet approved targets.
- [ ] No automatic NO-GO condition is present.
- [ ] Deployment, rollback, incident, security, and communications owners are
  available through the observation window.

## Evidence references

| Evidence | Reference | Status |
|---|---|---|
| Production release checklist | | |
| Go/no-go record | | |
| CI/build and artifact provenance | | |
| Migration rehearsal/database tests | | |
| Security/RLS/RPC review | | |
| Environment/provider fingerprint | | |
| Backup/PITR and restore drill | | |
| Storage restore/signed-link tests | | |
| Monitoring/alert/cost tests | | |
| Staging acceptance | | |
| Rollback rehearsal | | |
| Post-deployment plan | | |

## Exceptions

Exception ID: __________  
Risk and affected control: __________  
Compensating control: __________  
Owner and expiration: __________  
Security approval: __________  
Operations approval: __________  
Business-owner approval: __________

Exceptions cannot waive known authorization bypass, secret exposure, data
integrity, missing recovery capability, or an automatic NO-GO condition.

## Signatures

| Required role | Name | GO/NO-GO | Time (UTC) | Signature/reference |
|---|---|---|---|---|
| Product owner | | | | |
| Engineering owner | | | | |
| Operations owner | | | | |
| Security owner | | | | |
| Accountable business owner | | | | |
| Deployment owner | | | | |
| Rollback owner | | | | |

Final authorization: __________  
Observation window ends: __________  
Post-deployment verifier: __________
