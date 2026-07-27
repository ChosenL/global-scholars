# Operational Ownership Matrix

Named assignments and contact paths must be recorded in the controlled operations
directory before staging certification. Personal contact details do not belong in
this repository.

## RACI

R = Responsible, A = Accountable, C = Consulted, I = Informed.

| Control/activity | Engineering | Operations | Security | Product/business |
|---|---:|---:|---:|---:|
| Application code and tests | A/R | C | C | I |
| Database migrations and compatibility | R | A/R | C | I |
| RLS, RPC grants, identity authorization | R | C | A/R | I |
| CI gates and artifact provenance | R | A | C | I |
| Vercel/Supabase/Clerk/OpenAI configuration | C | A/R | C | I |
| Secret lifecycle and access review | I | R | A/R | I |
| Logging, monitoring, alerts, and redaction | C | A/R | R | I |
| Backup/PITR, Storage backup, restore drills | C | A/R | C | I |
| Vulnerability and incident investigation | R | R | A/R | I |
| AI safety, quotas, kill switch, budgets | R | R | A | C |
| Release execution and rollback | R | A/R | C | I |
| Go/no-go business decision | C | C | C | A/R |
| Incident command | C | A/R | C | I |
| Regulatory/privacy response | C | C | A/R | A |
| External communications | I | C | C | A/R |

No person approves their own unreviewed high-risk change. Security has stop
authority for confidentiality, integrity, authorization, credential, and
supply-chain risk. Operations has stop authority for recovery, capacity,
monitoring, provider, and change-window risk.

## Required named roles

| Role | Primary | Backup | Evidence/roster reference |
|---|---|---|---|
| Engineering owner | | | |
| Database/migration owner | | | |
| Deployment owner | | | |
| Rollback owner | | | |
| Operations/on-call owner | | | |
| Incident commander | | | |
| Security incident owner | | | |
| Identity/Clerk owner | | | |
| Vercel owner | | | |
| Supabase owner | | | |
| OpenAI/AI operations owner | | | |
| Communications owner | | | |
| Accountable business owner | | | |

## Escalation expectations

- SEV-1 pages incident command, operations, engineering, security, and business
  leadership immediately.
- SEV-2 pages operations and affected technical owners; security joins when data,
  identity, abuse, or authorization may be involved.
- SEV-3 creates an owned operational ticket within the working day.
- SEV-4 follows normal backlog triage.
- Acknowledgement and update targets are defined in
  [incident-severity-classification.md](./incident-severity-classification.md).
