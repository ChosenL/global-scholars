# Staging Acceptance Procedure

Use the exact candidate artifact and the isolated migration rehearsal target.
This procedure is **NOT VERIFIED** until all evidence is recorded.

1. Deploy the immutable artifact to clean isolated Staging and record SHA,
   deployment ID, environment fingerprint, and migration head.
2. Validate authentication, administrator workflow, assigned and unassigned
   advisor workflows, organization isolation, and the student workspace.
3. Validate matching, application creation, invalid hierarchy denial, and exact
   or term-only intake handling.
4. Execute the direct RLS/API/SECURITY DEFINER matrix in
   `authorization-rehearsal-matrix.md`.
5. Inject database timeout, AI disabled/circuit/quota, malformed authorization,
   and rollback scenarios without weakening controls.
6. Verify health/readiness, structured redacted logs, alerts, cost/budget limits,
   backup evidence, and catalog rollback boundaries.
7. Rehearse last-known-good application rollback, then repeat smoke tests.
8. Observe error, latency, denial, event, AI usage, and cost signals for at least
   60 minutes with named engineering, operations, security, and business owners.

Record PASS only after every item succeeds. A skipped test, missing alert, or
missing owner is NOT VERIFIED and remains a production NO-GO.
