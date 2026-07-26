# Global Scholars OS — Volume 5 Acceptance Review

## Domain boundary

`crm.visa_cases` is the aggregate root. Checklists, documents, interviews,
decisions, travel plans, and internal-note links reference a case UUID.
Passports remain student-owned records and store only the final four passport
characters alongside the secure document reference.

Embassies and destination countries are normalized catalog records.

## Lifecycle and history

Visa stages follow a controlled transition function. Each successful transition
creates an immutable `crm.visa_stage_history` record. Visa decisions are also
immutable. Multiple concurrent cases are supported because no student-level
uniqueness constraint exists.

## Document and readiness flow

The existing student-document service remains the only binary upload boundary.
`uploadVisaDocument` securely links an authorized document to its visa case and
optional checklist item.

Visa readiness is calculated centrally from required checklist completion,
linked/accepted documents, interviews, active passports, and travel plans.
Document and stage mutations recalculate both visa readiness and the shared
student readiness service.

## Event integrations

Visa mutations emit `visa.*` Domain Events. Existing generic consumers project
those events into Timeline, Activity Feed, Audit Log, and Workflows.
Visa-specific consumers create preference-aware in-app notifications, authorized
search results, and event-only analytics.

Checklist deadlines are emitted by `crm.emit_due_visa_reminders()`. Each item is
marked after emission so scheduled invocations remain idempotent.

## Security

Students read only cases belonging to their CRM profile. Advisors and
administrators rely on shared student authorization. Internal-note links are
staff-only. Authenticated users receive select and RPC execution privileges, not
direct mutation privileges.

Every security-definer RPC uses an empty search path and qualified CRM
references. No Clerk identifier participates in a visa relationship.

## Extension compatibility

Embassy synchronization can target normalized embassy UUIDs. OCR and verification
can enrich existing student documents. Appointment providers can synchronize
visa interview UUIDs. AI preparation can consume authorized interview and
checklist contracts. Travel integrations can extend JSON metadata without
changing case ownership or lifecycle history.
