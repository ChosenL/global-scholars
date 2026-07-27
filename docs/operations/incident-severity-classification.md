# Incident Severity Classification

Classify by observed or credible impact. When uncertain between levels, start at
the higher severity and downgrade with evidence.

| Severity | Definition/examples | Acknowledge | Update cadence | Authority |
|---|---|---:|---:|---|
| SEV-1 Critical | Widespread production outage; confirmed/likely unauthorized data access; identity or RLS bypass; destructive corruption; secrets exposed; recovery objectives in immediate jeopardy | 5 minutes | 15 minutes | Incident commander; security may isolate systems |
| SEV-2 High | Major function unavailable for many users; sustained write failures; material event backlog; provider outage without safe degradation; active abuse; backup failure threatening RPO | 15 minutes | 30 minutes | Operations lead with engineering/security |
| SEV-3 Moderate | Limited users or non-core function affected; recoverable latency/error increase; AI unavailable while CRM works; isolated failed workflow; no data/security impact | 4 business hours | Daily or on material change | Service owner |
| SEV-4 Low | Cosmetic/operational defect, documentation gap, low-risk alert noise, planned maintenance issue, no meaningful user impact | 2 business days | At milestones | Backlog owner |

Targets require an approved on-call roster and paging provider; until then they
are requirements, not verified capabilities.

## Classification factors

- Confidentiality: unauthorized visibility of notes, documents, identity, AI
  context, tokens, signed URLs, or personal data.
- Integrity: incorrect or lost business state, duplicated mutations/events,
  bypassed RPC authorization, audit/timeline modification.
- Availability: breadth, duration, core versus optional capability, safe
  degradation, and RTO risk.
- Recoverability: RPO exposure, backup health, restore confidence, and data replay.
- Abuse/cost: uncontrolled public traffic, quota bypass, AI/provider spend spike.
- Compliance/reputation: notification duties or public impact.

## Mandatory actions

For SEV-1/SEV-2: open an incident record; preserve redacted evidence and
correlation IDs; assign roles; stop harmful writes; assess notification duties;
notify provider escalation; choose mitigate, rollback, or restore; and maintain
the update cadence.

For any suspected security event, do not wait for confirmed impact before engaging
security. Rotate exposed credentials, revoke sessions/links as appropriate, and
preserve forensic evidence without copying personal data into chat or tickets.

## Resolution and review

Resolution requires stable health/readiness, verified authorization/integrity,
cleared or controlled backlogs, user-impact assessment, and incident-commander
approval. SEV-1/SEV-2 require a blameless review with timeline, root/contributing
causes, actual RTO/RPO, detection gaps, corrective owners, and due dates.
