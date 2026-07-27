# Infrastructure Inventory and Environment Isolation

Last reviewed: 2026-07-26

This inventory contains identifiers and control status only. It must never contain
credentials, tokens, connection strings, signed URLs, or personal data.

## Resource inventory

| Layer | Known resource | Development | Preview/staging | Production | Status |
|---|---|---|---|---|---|
| Source | Git repository and GitHub Actions | Local branches | Pull-request gates | Protected release branch required | PARTIAL |
| Compute | Vercel project `global-scholars` | Local Next.js | Preview deployments | Production deployment | PARTIAL |
| Database | Supabase `Global Scholars Portal`, ref `lrgnsdxsuhzufodnstyn`, PostgreSQL 17, `us-east-1` | Local/linked | Dedicated project required | Linked project classification needs owner confirmation | FAIL |
| Identity | Clerk | Development instance expected | Dedicated staging instance required | Dedicated production instance expected | NOT VERIFIED |
| AI | OpenAI API | Environment-scoped key | Dedicated project/key and budget required | Dedicated project/key and budget required | NOT VERIFIED |
| Storage | Supabase private buckets | Local/linked | Dedicated staging buckets required | Three known private buckets | PARTIAL |
| Monitoring | Provider-agnostic application adapters | Console | Provider not connected | Provider not connected | PARTIAL |

Known private buckets are `message-attachments`, `student-documents`, and
`student-files`. The linked Supabase project was healthy when inspected, but its
environment classification, backup plan, and PITR settings were not
provider-verified. It must not be used for restore drills.

## Isolation requirements

- Development, staging, and production use distinct Supabase projects, Clerk
  instances, OpenAI projects or keys, storage namespaces, salts, and Vercel scopes.
- Production credentials are never available to Preview or Development builds.
- `crm.profiles` remains the canonical identity table; Clerk identifiers map to
  CRM UUIDs and are not duplicated into domain records.
- Schema changes move through reviewed migrations. Production data enters no
  lower environment unless approved and irreversibly de-identified.
- Environment fingerprints record non-secret project IDs, regions, migration
  heads, build commit, and configuration version. A gate rejects a staging
  fingerprint that equals production.
- Restore drills occur only in a new isolated recovery project with delivery,
  workflows, webhooks, and AI disabled.

## Configuration ownership

| Configuration | Owner required | Separation evidence |
|---|---|---|
| Vercel variables and deployment protection | Platform owner | Scope export with values redacted |
| Supabase database, backups, PITR, Storage | Database owner | Project IDs, plan/retention screen, restore record |
| Clerk origins, redirects, sessions, webhooks | Identity owner | Instance IDs and redacted settings export |
| OpenAI keys, limits, kill switch | AI operations owner | Project IDs, budgets, quota test |
| DNS and public routing | Platform owner | Zone and target inventory |
| Monitoring and escalation | Incident owner | Tested alert and acknowledgement record |

Classification remains **FAIL** until an owner proves distinct identifiers and
scopes, staging exists without production data, and a fingerprint gate is
exercised. Evidence must contain no secrets.
