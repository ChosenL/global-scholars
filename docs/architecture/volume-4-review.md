# Global Scholars OS — Volume 4 Acceptance Review

## Domain boundaries

The admissions catalog owns countries, universities, campuses, faculties,
programs, intakes, and scholarships. Student applications reference catalog
UUIDs and never copy university, campus, program, or intake attributes.

`crm.profiles.id` remains the identity source for students, advisors, creators,
decision actors, payment actors, and history actors.

## Lifecycle integrity

- A student may hold multiple applications, with one record per intake.
- Status transitions are controlled by `crm.application_transition_allowed`.
- Every transition creates an immutable status-history row.
- Decisions are immutable and may create offer, rejection, or waitlist states.
- Paid deposits advance eligible offers to `deposit_paid`.
- Deferrals and waitlists retain their own operational history.
- Archiving preserves the application and its business history.

## Platform integrations

- Application creation resolves inherited document requirements and links
  matching active student documents.
- Submission rejects applications with unresolved required documents.
- Mutations recalculate centralized student readiness.
- Application Domain Events automatically feed Timeline, Activity Feed, Audit,
  Analytics, and configured Workflows.
- Application events create preference-aware in-app notifications.
- Global Search includes authorized applications through its stable contract.
- Internal notes are associated through `crm.application_notes`; students cannot
  access the underlying note or link.

## Security acceptance

- Students select only applications belonging to their CRM profile.
- Advisors and administrators rely on shared student authorization.
- All application writes occur through security-definer RPCs with empty search
  paths.
- Transactional tables grant authenticated users read access only; RLS limits
  those reads.
- Application-note links are staff-only.
- No Clerk identifier participates in an admissions relationship.

## Future modules

Visa Management can attach its workflow to `application.status_changed` events
entering `visa_stage`. AI services can consume authorized application contracts
and events without bypassing RPCs. Neither capability is implemented here.
