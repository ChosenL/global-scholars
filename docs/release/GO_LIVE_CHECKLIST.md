# Go Live Checklist

Candidate: `b249e635dc0c86b3736aa93361fb11468f1f269a`
Decision: **NO-GO - production deployment is not authorized**

## Required Before Any Production Deployment

- [ ] **NOT VERIFIED** - named deployment, rollback, incident, engineering,
      security, operations, and business/product owners.
- [ ] **NOT VERIFIED** - production environment fingerprint differs from
      Development, Preview, and isolated Staging.
- [ ] **NOT VERIFIED** - `OPENAI_SAFETY_SALT` and `OPERATIONS_HASH_SALT` are
      present in Production as server-only secret configuration.
- [ ] **NOT VERIFIED** - production migration head and isolated restore rehearsal.
- [ ] **NOT VERIFIED** - direct database RLS, API authorization, and
      SECURITY DEFINER truth table.
- [ ] **NOT VERIFIED** - monitoring dashboards, alerts, budget/cost limits, and
      tested incident routing.
- [ ] **NOT VERIFIED** - rollback rehearsal for application, catalog, and
      database recovery.
- [ ] **NOT VERIFIED** - SBOM, dependency review, secret scanning, and required
      GitHub checks enforced on the protected branch.
- [ ] **NOT VERIFIED** - isolated Staging acceptance with a 60-minute observation
      period.

## Deployment Boundary

Do not deploy, publish catalog data, run production migrations, or modify
production data until every item above has durable evidence and formal approval.
