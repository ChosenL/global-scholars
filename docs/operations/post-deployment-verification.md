# Post-Deployment Verification

This procedure begins only after an approved deployment. Use synthetic accounts
and data. Record pass/fail, timestamps, version, migration head, correlation IDs,
and redacted evidence.

## Immediate checks: 0–10 minutes

1. Confirm the Vercel deployment and commit match the approved artifact.
2. Confirm the database migration head exactly matches the release.
3. Verify `/api/health` returns HTTP 200, no-store, and request/correlation IDs.
4. Verify `/api/ready` returns HTTP 200 with database ready; AI may be degraded
   only if the approved plan allows it.
5. Confirm no unexpected migration lock, connection saturation, error spike,
   credential error, or provider incident.
6. Confirm logs and errors contain no PII, secrets, tokens, or signed URLs.

Any core readiness failure, unknown migration state, authorization regression,
secret exposure, or integrity error stops verification and invokes rollback or
incident response.

## Security and identity: 10–20 minutes

- Anonymous dashboard and AI requests are denied.
- Synthetic student sees only their CRM profile and owned records.
- Student cannot access advisor notes, audit/activity data, restricted timeline,
  another student, or administrative AI context.
- Assigned advisor succeeds; unassigned advisor is denied.
- Administrator access follows the approved matrix.
- SECURITY DEFINER anonymous-denial/search-path query passes.
- Private Storage cross-user denial and bounded signed-link generation pass.

## Business-platform integrity: 20–35 minutes

Use a reversible synthetic transaction or approved test record:

- Read profile, documents, tasks, applications, visa, messages, notifications,
  readiness, and safe timeline.
- Perform one authorized mutation through its secure RPC/service path.
- Confirm exactly one domain event and correct timeline, notification, activity,
  analytics, audit, and workflow effects where applicable.
- Confirm CRM UUID relationships and no duplicated identity fields.
- Clean up only through supported soft-delete/archive behavior; retain required
  audit evidence.

## Operational controls: 35–45 minutes

- Verify structured logs correlate the synthetic request across boundaries.
- Exercise a safe public rate-limit threshold in the approved test scope.
- Verify AI quota and kill switch using synthetic identity without generating
  unbounded provider cost.
- Verify error reporting adapter behavior and alert acknowledgement.
- Confirm database, Storage, Vercel, OpenAI, and egress/connection cost dashboards
  show no unexpected spike.

## Observation window

Observe at least 60 minutes or the approved risk-based duration. Compare error
rate, p95 latency, readiness, authorization denials, database connections,
storage errors, event backlog/age, AI failures/tokens/cost, and provider health
against the approved baseline.

Rollback thresholds must be numerical before release. At minimum, roll back or
declare an incident for any authorization/data-integrity failure, unknown
migration state, sustained core readiness failure, uncontrolled error increase,
event duplication/loss, secret/PII exposure, or inability to meet RTO/RPO.

## Completion record

| Check | Result | Time/evidence |
|---|---|---|
| Artifact and migration identity | | |
| Health and readiness | | |
| Authorization matrix | | |
| Platform mutation/event integrity | | |
| Storage signed-link isolation | | |
| Logs/redaction/correlation | | |
| Alerts, rate limits, AI controls | | |
| Observation metrics | | |

Verifier: __________  
Operations approval: __________  
Security approval: __________  
Outcome: ACCEPT / MONITOR / ROLLBACK
