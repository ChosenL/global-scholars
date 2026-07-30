# Student Application Pipeline Architecture

## 1. Goals

### Business Purpose

The Student Application Pipeline gives students and authorized staff one
auditable view of every university application from initial planning through
enrollment or closure. It supports consistent advising, prevents incomplete
submissions, preserves admission decisions and status history, and provides
reliable operational data for deadlines, workload, readiness, reporting, and
future automation.

This design evolves the existing admissions domain rather than introducing a
second application model. `crm.student_applications` remains the aggregate root,
`crm.universities` remains the university catalog, and `crm.profiles.id` remains
the identity source for students, advisors, and actors.

### User Stories

- As a student, I can create and track my own applications and understand what
  documents and tasks remain.
- As an advisor, I can manage applications for students I am authorized to
  support, record progress, and identify blocked submissions.
- As an administrator, I can oversee all applications, correct assignments,
  archive records, and audit lifecycle changes.
- As an operations leader, I can measure pipeline volume, conversion, decision
  time, advisor workload, and enrollment outcomes without reading transactional
  tables directly.
- As a compliance reviewer, I can determine who changed an application, when it
  changed, and why.

### Scope

In scope:

- Application creation, assignment, status transitions, submission, decisions,
  offers, acceptance/deposit progression, visa handoff, enrollment, closure,
  withdrawal, rejection, cancellation, and archival.
- Links to catalog universities, programs, intakes, document requirements,
  student documents, tasks, advisors, scholarships, notes, and audit history.
- Student, advisor, and administrator experiences.

Out of scope:

- Managing the university catalog itself.
- Treating customer organizations as universities.
- University-side applicant portals or direct admissions decisions.
- Payment processing, visa-case implementation, predictive scoring, or AI
  decision-making.
- Schema, migration, API, or UI implementation in this design phase.

## 2. Core Entity: Application

The logical Application represents one student's application to one catalog
intake. The current physical aggregate is `crm.student_applications`. Catalog
attributes should be referenced through UUID relationships instead of copied
onto each application.

| Logical field              | Recommended representation                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `id`                       | UUID primary key                                                                                                      |
| `student_id`               | `student_profile_id`, foreign key to `crm.profiles(id)`                                                               |
| `university_id`            | Derived through the selected intake and program; optionally exposed in read models, not duplicated in the write model |
| `advisor_id`               | Nullable `advisor_profile_id`, foreign key to an authorized advisor or administrator profile                          |
| `intake`                   | `intake_id`, foreign key to `crm.intakes(id)`                                                                         |
| `program`                  | Derived from `intake_id -> crm.intakes.program_id`; a direct `program_id` would be redundant                          |
| `degree_level`             | Derived from the catalog program                                                                                      |
| `application_status`       | Controlled canonical status value                                                                                     |
| `submitted_at`             | First successful submission timestamp                                                                                 |
| `decision_at`              | Derived from the immutable decision record; not independently editable                                                |
| `offer_type`               | Decision type such as conditional or unconditional offer                                                              |
| `tuition`                  | Catalog/program pricing or a versioned application financial snapshot with amount, currency, and provenance           |
| `scholarship`              | Many-to-many records through `crm.application_scholarships`, including award status and amount                        |
| `notes`                    | Links through `crm.application_notes`; sensitive note text remains in the existing notes domain                       |
| `external_reference`       | Optional bounded identifier from an approved admissions system                                                        |
| `closed_at`                | Business closure timestamp                                                                                            |
| `withdrawn_at`             | Student withdrawal timestamp                                                                                          |
| `archived_at`              | Non-destructive administrative archive timestamp                                                                      |
| `created_by_profile_id`    | CRM profile UUID of the creator                                                                                       |
| `created_at`, `updated_at` | Lifecycle timestamps                                                                                                  |

Related normalized records should continue to hold:

- Immutable transitions in `crm.application_status_history`.
- Admission outcomes in `crm.application_decisions`.
- Deposit obligations and payments in `crm.application_deposits`.
- Deferrals and waitlists in their dedicated entities.
- Required-document state in `crm.application_document_requirements`.
- Scholarship interest and awards in `crm.application_scholarships`.

An application should be unique for a student and intake unless a future
business rule explicitly supports versioned reapplications. Hard deletion is
not part of normal business behavior.

## 3. Relationships

```text
crm.organizations
  1 --- * crm.organization_students * --- 1 crm.profiles (student)
  1 --- * crm.organization_advisors * --- 1 crm.profiles (advisor)

crm.profiles (student)
  1 --- * crm.student_applications * --- 1 crm.intakes
                                            |
                                            * --- 1 crm.programs
                                                       |
                                                       * --- 1 crm.universities

crm.student_applications
  1 --- * application_status_history
  1 --- * application_decisions
  1 --- * application_document_requirements * --- 1 student_documents
  1 --- * application_tasks (logical association)
  * --- * student_notes through application_notes
  * --- * scholarships through application_scholarships
```

### Organizations

Organizations are customer or partner organizations using Global Scholars OS.
They are not catalog universities. Organization/student membership and
organization/advisor assignment may provide operational context for filtering
or routing work, but must not become an implicit application owner or grant
application access by itself.

If organization-scoped reporting is required, it should resolve the student's
effective organization membership for the relevant date or use a separately
reviewed application-organization attribution record with provenance. It must
not infer a relationship by matching organization and university names.

### Students

Each application belongs to exactly one student CRM profile. A student may have
many applications across universities and intakes. Student identity attributes
are never copied into the application.

### Universities, Programs, and Intakes

An application references an intake, which resolves one program and university
through the normalized admissions catalog. This prevents inconsistent
university/program/intake combinations and keeps catalog updates centralized.

### Advisors

An application may have one primary responsible advisor while broader access
continues to use the shared student-authorization model. Reassignment should be
audited and should not rewrite historical status actors.

### Documents

Application document requirements connect catalog requirements to existing
student documents. Documents remain student-owned, versioned storage records.
Submission is blocked while required or applicable conditional requirements are
unresolved.

### Tasks

Tasks remain in the student task domain and may reference an application through
a reviewed typed association or metadata contract. Application transitions may
create or complete tasks through domain events. Task completion must not mutate
application status without an authorized application command.

## 4. State Machine

### User-Facing Lifecycle

```text
Draft
  -> Preparing
  -> Submitted
  -> Awaiting Decision
  -> Conditional Offer
  -> Unconditional Offer
  -> Accepted
  -> Visa
  -> Enrolled
  -> Closed
```

The pipeline also supports controlled branches:

- Preparing -> Draft when staff returns an application for correction.
- Awaiting Decision -> Additional Documents Requested -> Awaiting Decision.
- Awaiting Decision -> Interview -> Awaiting Decision or an offer decision.
- Awaiting Decision -> Waitlisted -> Offer, Rejected, or Withdrawn.
- An approved deferral returns the application to preparation for the approved
  intake under an explicit deferral workflow.

### Canonical Status Mapping

User-facing labels should map to canonical statuses rather than creating
parallel state:

| User-facing label              | Canonical status                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Draft                          | `draft`                                                                                                         |
| Preparing                      | `ready_for_review`                                                                                              |
| Submitted                      | `submitted`                                                                                                     |
| Awaiting Decision              | `under_review`                                                                                                  |
| Additional Documents Requested | `additional_documents_requested`                                                                                |
| Interview                      | `interview`                                                                                                     |
| Conditional Offer              | `conditional_offer`                                                                                             |
| Unconditional Offer            | `unconditional_offer`                                                                                           |
| Accepted                       | `deposit_paid` when a required deposit is paid, or a future explicit acceptance event if no deposit is required |
| Visa                           | `visa_stage`                                                                                                    |
| Enrolled                       | `enrolled`                                                                                                      |
| Closed                         | `closed`                                                                                                        |
| Waitlisted                     | `waitlisted`                                                                                                    |
| Deferred                       | `deferred`                                                                                                      |

### Terminal States

- `rejected`: the institution declined the application.
- `withdrawn`: the student intentionally withdrew it.
- `cancelled`: an authorized administrative cancellation before submission or
  where the record was created in error.
- `closed`: operational completion after enrollment, rejection, withdrawal, or
  another resolved outcome.

Rejected, withdrawn, and cancelled records remain immutable business history and
may transition to `closed` for operational completion. The current canonical
model already supports rejected, withdrawn, and closed. Adding `cancelled` or an
explicit no-deposit `accepted` state would require a separately reviewed future
migration and transition update; this document does not implement either.

Every status change must:

1. Lock and validate the current application.
2. Check the transition allowlist.
3. Enforce actor authorization and transition-specific prerequisites.
4. Update lifecycle timestamps in the same transaction.
5. Append immutable status history with actor, time, and bounded reason.
6. Emit an application domain event after the mutation succeeds.

## 5. Authorization

Authentication uses Clerk, while authorization uses CRM UUID identity, existing
student access helpers, RLS, and controlled mutation functions.

| Action                | Student                                                                | Advisor                                                           | Administrator                        |
| --------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| View                  | Own application and student-visible related data                       | Applications for students allowed by shared student authorization | All applications, including archived |
| Create                | Own application for an open, valid intake                              | For an authorized student                                         | For any active student               |
| Update details        | Own draft/preparation fields only                                      | Authorized student's non-decision fields                          | All permitted fields                 |
| Change status         | Limited self-service transitions such as prepare, submit, and withdraw | Allowed transitions for authorized students                       | All allowed transitions              |
| Record decision/offer | No                                                                     | Yes when authorized and policy permits                            | Yes                                  |
| Archive               | No                                                                     | Only if explicitly granted by policy; recommended default is no   | Yes                                  |
| Close                 | No direct close command                                                | Authorized advisor after a terminal outcome                       | Yes                                  |

Additional rules:

- Students never see staff-only notes, internal decision commentary, audit
  metadata, or other students' records.
- Organization membership alone never grants application access.
- Advisor assignment must be validated against existing student authorization.
- All writes use narrowly scoped commands/RPCs; clients do not update
  transactional tables directly.
- Service-role administration remains server-side and is never exposed to a
  browser.

## 6. API Design

The API should be a thin authenticated layer over an Application Service Layer
and controlled database commands. It must preserve RLS, stable error codes,
request correlation, idempotency where appropriate, and sanitized errors.

### Read Endpoints

| Method and path                                   | Purpose                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/applications`                           | Authorized cursor-paginated list with status, student, advisor, organization-context, university, program, and intake filters |
| `GET /api/applications/{applicationId}`           | Application detail                                                                                                            |
| `GET /api/applications/{applicationId}/history`   | Ordered immutable status history                                                                                              |
| `GET /api/applications/{applicationId}/documents` | Requirements and linked documents                                                                                             |
| `GET /api/applications/{applicationId}/tasks`     | Related tasks                                                                                                                 |
| `GET /api/applications/{applicationId}/decisions` | Authorized decision and offer history                                                                                         |

### Mutation Endpoints

| Method and path                                                         | Purpose                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| `POST /api/applications`                                                | Create for a student and intake                  |
| `PATCH /api/applications/{applicationId}`                               | Update allowed non-status fields                 |
| `POST /api/applications/{applicationId}/transitions`                    | Execute an allowed status transition with reason |
| `POST /api/applications/{applicationId}/submit`                         | Validate requirements and submit atomically      |
| `POST /api/applications/{applicationId}/decisions`                      | Record an immutable decision                     |
| `POST /api/applications/{applicationId}/documents/{requirementId}/link` | Link an authorized student document              |
| `POST /api/applications/{applicationId}/archive`                        | Archive non-destructively                        |
| `POST /api/applications/{applicationId}/close`                          | Close after validating an eligible outcome       |

Commands should return the updated application and append history/events in the
same transaction. Clients must not submit actor IDs, roles, derived university
attributes, or audit fields.

## 7. UI

### Application List

- Role-appropriate list with search, bounded pagination, status tabs, and
  filters for student, advisor, organization context, university, program,
  intake, and deadline.
- Summary columns for student, university/program, intake, status, advisor,
  missing requirements, next task, and last update.
- Saved views may support advisor queues without changing authorization.
- Archived applications are excluded by default.

### Application Details

- Header with student, university, program, intake, status, responsible advisor,
  and allowed actions.
- Overview of submission, decision, offer, tuition/deposit, scholarship, and
  lifecycle dates.
- Transition controls show only currently allowed actions and explain unmet
  prerequisites.
- Staff-only information is visually and technically separated from
  student-visible data.

### Timeline and Status History

- A human-readable timeline combines application domain events, transitions,
  decisions, document milestones, and task completion.
- A dedicated status-history view shows from/to status, actor, timestamp, and
  reason from immutable records.
- Timeline projections must not replace transactional history.

### Documents

- Requirement checklist grouped by required, conditional, and optional.
- Current linked document, review status, waiver details, and revision history.
- Upload and link actions use the existing document service and storage
  controls.

### Tasks

- Application-specific tasks display assignee, priority, due date, status, and
  visibility.
- Transition-generated tasks link back to the originating event.
- Student-invisible tasks and notes remain excluded from student responses.

All screens require loading, empty, error, and unauthorized states; responsive
layouts; keyboard navigation; accessible status announcements; and confirmation
for destructive-looking but non-destructive actions.

## 8. Scalability

The model supports thousands of applications by:

- Keeping the transactional aggregate normalized and storing catalog,
  documents, tasks, decisions, and scholarships in dedicated entities.
- Using UUID foreign keys and indexed access paths for student, advisor, intake,
  status, archive state, and update time.
- Using cursor pagination with stable ordering rather than unbounded lists or
  large offsets.
- Applying partial indexes to active/unarchived work queues and index-supported
  RLS predicates.
- Returning list projections instead of loading every related record.
- Avoiding per-row relationship requests by using reviewed aggregate/read
  models for counts and readiness summaries.
- Emitting domain events for notifications, search, analytics, workflows, and
  timeline projections so those consumers scale independently.
- Processing bulk reminders, catalog updates, and analytics asynchronously with
  idempotency and bounded batches.
- Partitioning immutable event/history data by time only when measured volume
  warrants it, without prematurely partitioning the core application table.

Operational targets should be established with production-like data, including
p95 list and detail latency, transition throughput, event-delivery lag, and
authorization-query cost.

## 9. Migration Strategy

The pipeline should be introduced through additive, independently reversible
application exposure:

1. Treat the existing admissions catalog and `crm.student_applications`
   aggregate as authoritative; do not create a replacement table.
2. Document the mapping from user-facing pipeline labels to existing canonical
   statuses and retain the current controlled transition function.
3. Add future fields only when they cannot be derived or represented by existing
   normalized entities. Tuition snapshots, cancellation, or explicit
   no-deposit acceptance require separate design and migration review.
4. Build read services and projections behind existing RLS before exposing new
   UI. Existing student and advisor dashboards continue operating unchanged.
5. Introduce list and detail experiences incrementally, followed by controlled
   mutation commands and status actions.
6. Integrate documents and tasks through existing services and domain events;
   do not copy files, task state, or sensitive notes into applications.
7. Add optional organization-context filtering only after an explicit
   authorization and attribution review. Do not alter
   `crm.organization_students`, `crm.organization_advisors`, or
   `crm.universities`.
8. Validate migrations, rollback procedures, RLS isolation, transition
   integrity, audit/event delivery, and production-scale query plans in staging.
9. Roll back UI/API exposure through feature controls when necessary. Preserve
   recorded applications and immutable history, then correct forward rather
   than dropping business data.

This approach preserves current Organization Management, university catalog,
student/advisor workflows, CRM UUID identity, RLS, documents, tasks, audit,
search, analytics, and messaging behavior while allowing the application
pipeline to evolve safely.
