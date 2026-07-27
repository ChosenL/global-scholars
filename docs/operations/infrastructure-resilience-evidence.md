# Infrastructure Resilience Evidence

Assessment date: 2026-07-26  
Overall status: **PARTIAL**

| Control | Status | Current evidence | Evidence still required |
|---|---|---|---|
| Liveness | PASS | Secret-safe `/api/health`, no-store and correlation headers | Preview synthetic access |
| Dependency readiness | PARTIAL | `/api/ready`, bounded DB RPC, optional AI | Apply migration and test success/timeout/failure |
| Database backup/PITR | NOT VERIFIED | Procedure and proposed 15-minute RPO | Provider retention/PITR export |
| Database restore | FAIL | Isolated restore runbook | Timed clean restore with RLS evidence |
| Storage privacy | PARTIAL | Three private buckets and bounded links | Policy cleanup and automated inventory |
| Storage backup | FAIL | Manifest/checksum/restore procedure | Encrypted backup and sample restore |
| Signed-link security | PARTIAL | Five- and ten-minute TTLs | Automated cross-user and expiry tests |
| Environment isolation | FAIL | Inventory and requirements | Dedicated staging and fingerprints |
| Graceful AI degradation | PARTIAL | Timeout/retry/circuit/quota/kill switch | Failure injection and alert |
| Recovery objectives | PARTIAL | Proposed RTO/RPO and cadence | Owner approval |
| Recovery ownership | FAIL | Recovery roles defined | Named contacts and exercise |

## Evidence produced

- `20260822_add_infrastructure_readiness.sql` defines a `SECURITY INVOKER`,
  empty-search-path probe returning no business data.
- `/api/health` represents liveness; `/api/ready` returns 503 for required
  dependency failure.
- Database readiness is bounded and logs status/latency without provider errors.
  AI remains optional for core readiness.
- Inventory, isolation, recovery, backup/restore, checksum, and signed-link
  validation procedures are documented.

Infrastructure resilience does not support staging promotion yet. Provider
backups/PITR, isolated staging, restore drills, signed-link automation, alerts,
and named recovery ownership remain gating evidence.
