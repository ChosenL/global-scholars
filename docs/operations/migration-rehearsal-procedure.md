# Isolated Migration Rehearsal Procedure

Candidate: `b249e635dc0c86b3736aa93361fb11468f1f269a`  
Repository migration head: `20260904_add_catalog_classification_evidence.sql`

The candidate changes application UI and tests only. It introduces no migration.
Production schema currency is **NOT VERIFIED**.

## Preconditions

- Name the engineering, database, rollback, and security owners in controlled
  operations evidence.
- Create an isolated staging or restore project with synthetic data only; do not
  use Production credentials, data, buckets, webhooks, or AI delivery.
- Record non-secret source/target project fingerprints, pre-change migration
  head, recovery point, and expected head.

## Rehearsal

1. Run `supabase migration list` against the isolated target and record its head.
2. Run `supabase db push --dry-run`; require the ordered local migrations through
   `20260904_add_catalog_classification_evidence.sql` and no unexpected files.
3. Apply once to the isolated target, then prove local and remote heads match.
4. Inventory constraints, indexes, functions, grants, RLS/forced-RLS tables, and
   SECURITY DEFINER search paths before and after the rehearsal.
5. Execute the authorization matrix and application smoke tests against the exact
   candidate artifact. Test the catalog classification constraints with synthetic
   records only.
6. Rehearse application-first rollback; use a new forward corrective migration
   for database remediation and never edit applied migration history.
7. Retain redacted command output, timings, row/checksum comparisons, failure
   evidence, and approvals. Any mismatch is NO-GO.

## Change characteristics

The repository migrations are additive through the reported head. They include
indexes and constraints, forced-RLS tables, and the `20260820` privileged
function hardening. Their rollback model is application rollback plus reviewed
forward correction; destructive rollback or restored anonymous privileged
execution is prohibited.
