# Release Communication Templates

Replace brackets, remove unused fields, and use approved channels. Never include
credentials, signed URLs, raw logs, personal data, or exploitable details.

## Planned release announcement

**Subject:** Global Scholars OS planned production release `[release ID]`

Window: `[UTC start–end]`  
Scope: `[operational summary; no sensitive implementation details]`  
Expected impact: `[none/degraded capability/maintenance]`  
Owners: deployment `[role/contact reference]`; rollback `[role/contact reference]`  
Status location: `[approved status reference]`  
Next update: `[UTC time]`

## Go decision

**Subject:** GO — Global Scholars OS `[release ID]`

All required evidence and approvals were recorded at `[UTC]`. Deployment owner
`[name/role]` is proceeding with commit `[short commit]`. Observation continues
through `[UTC]`. Rollback thresholds and owner are active.

## No-go/postponement

**Subject:** NO-GO — Global Scholars OS `[release ID]`

Release paused at `[UTC]` because `[non-sensitive gate summary]`. No production
change was made / production remains on `[version]`. Remediation owner:
`[role]`. Next decision time: `[UTC]`.

## Deployment started

Release `[ID]` began at `[UTC]`. Current phase: `[application/migration/verify]`.
Expected customer impact: `[summary]`. Next update: `[UTC]`.

## Successful completion

Release `[ID]` completed at `[UTC]`. Application `[version]`, migration head
`[identifier]`, and post-deployment verification passed. Observation ended at
`[UTC]`. Follow-ups: `[references or none]`.

## Rollback initiated

Release `[ID]` rollback began at `[UTC]` after threshold `[safe summary]`.
Incident severity/reference: `[SEV/reference]`. Last-known-good version:
`[version]`. Data-integrity status: `[verified/under review]`. Next update:
`[UTC]`.

## Rollback completed

Rollback completed at `[UTC]`; active version is `[version]`. Health/readiness:
`[status]`. Data and authorization verification: `[status]`. Remaining impact:
`[summary]`. Incident review and next release decision will follow.

## Incident update

**`[SEV]` — `[service-safe title]`**

Detected: `[UTC]`  
Impact: `[who/what, without PII]`  
Current state: `[investigating/mitigating/monitoring/resolved]`  
Actions: `[safe summary]`  
Data/security assessment: `[no indication/under review/confirmed; approved wording]`  
Next update: `[UTC]`

## Maintenance complete

Maintenance ended at `[UTC]`. Core CRM status is `[status]`; optional services are
`[status]`. Users experiencing issues should use `[approved support route]` and
provide the displayed correlation ID, not screenshots containing personal data.
