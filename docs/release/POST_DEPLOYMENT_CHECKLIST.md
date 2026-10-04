# Post Deployment Checklist

Candidate: `b249e635dc0c86b3736aa93361fb11468f1f269a`
Status: **TEMPLATE ONLY - NOT EXECUTED**

Use this only after a separately approved production deployment.

## First 60 Minutes

- [ ] Verify `/api/health` and `/api/ready` without exposing secrets.
- [ ] Confirm authentication, advisor workflow, student workspace, matching, and
      application creation smoke tests.
- [ ] Confirm organization isolation and invalid hierarchy denial.
- [ ] Review error, latency, rate-limit, AI quota/circuit, database, and
      authorization-denial signals.
- [ ] Confirm monitoring alerts route to the named incident owner.
- [ ] Confirm Vercel, Supabase, OpenAI, and monitoring spend/budget signals.

## First Day

- [ ] Review application and database metrics.
- [ ] Verify scheduled backups and restore evidence remain current.
- [ ] Review user feedback and support inbox.
- [ ] Record deviations, incidents, rollback decisions, and follow-up owners.

Missing evidence remains **NOT VERIFIED** and cannot be converted into launch
approval after the fact.
