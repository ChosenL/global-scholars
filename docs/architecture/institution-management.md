# Organization Management Module

## Status and Terminology

This document defines the Version 1.1 architecture formerly described as “Institution Management.” Persistence phase 1 is represented by the additive `20260823_create_crm_organizations.sql` migration and generated database types. The service phase is represented by `20260824_create_crm_organization_services.sql` and `lib/crm/organizations.ts`, which provide administrator-authorized mutation RPCs, RLS-protected reads, validation, and structured errors. UI, pages, application APIs, customer provisioning, and broader authorization changes remain out of scope and are not implemented.

The proposed entity represents **customer and partner organizations that use or participate in Global Scholars OS**. It does not represent universities that students apply to.

The two concepts are separate:

- `crm.organizations` is the proposed operational and tenant-facing record for customer organizations such as partner schools, advising agencies, sponsors, and Global Scholars operating units.
- `crm.universities` remains the existing admissions catalog of universities to which students may apply. It continues to own campuses, faculties, programs, intakes, and scholarships.
- Student applications continue to reference the university catalog through existing admissions entities. Organization membership does not imply that a student has applied to, attends, or is academically affiliated with a catalog university.
- If a customer organization and a catalog university refer to the same real-world legal entity, they still have different platform responsibilities and identifiers. Any future mapping between them must be explicit and must not merge their records or authorization boundaries.

This document therefore uses **organization** for the new operational entity and **university** only for the admissions catalog.

## 1. Goals

### Purpose

Organization Management provides a controlled system of record for customer organizations and partner organizations using Global Scholars OS, together with the students and advisors operating within their scope. It replaces informal customer ownership and membership tracking with explicit, auditable relationships.

### Business Value

- Give administrators a consistent view of customer organizations, operational ownership, and lifecycle state.
- Scope advisor assignments and student memberships to the correct customer organization.
- Support organization-level service delivery, reporting, onboarding, and future workflow automation.
- Reduce duplicate customer records and manual reconciliation across operational teams.
- Preserve a strict boundary between platform customers and the university admissions catalog.

### Supported Use Cases

- Register and maintain a customer or partner organization.
- Find organizations by name, type, country, status, or external reference.
- Archive an organization without deleting its business history.
- Assign one or more advisors to an organization with effective dates and responsibilities.
- Associate students with an organization and record membership status.
- Review organization details, assignments, membership counts, and audit history.
- Report on operational activity by organization without changing university or application data.

## 2. Functional Requirements

### Create Organization

- Administrators can create an organization with a unique normalized identity.
- Organization type, country, contact details, and external customer reference are validated.
- Creation records the acting CRM profile and emits an `organization.created` domain event.
- Duplicate detection should warn on normalized name, country, domain, or external reference.
- Creating an organization must not create or modify a `crm.universities` record.

### Edit Organization

- Administrators can update mutable profile, contact, classification, and operational fields.
- Stable identity fields and relationship history cannot be rewritten through a general update.
- Each successful update records the actor and emits an `organization.updated` event with a safe changed-field summary.
- Concurrent updates use an `updated_at` or version precondition to prevent lost changes.

### Archive Organization

- Archiving is a reversible lifecycle transition, not a hard delete.
- Archiving records `archived_at`, `archived_by_profile_id`, and an optional reason.
- Archived organizations remain visible to administrators and in historical reports.
- New advisor assignments and student memberships are blocked while an organization is archived; existing history remains intact.
- The transition emits `organization.archived`; an approved reactivation flow emits `organization.reactivated`.
- Archiving an organization has no effect on catalog universities or student applications.

### List and Search Organizations

- Provide server-side pagination, deterministic sorting, and filters for status, type, country, and assigned advisor.
- Search normalized organization name, slug, approved domain, and external customer reference.
- Default staff views show active organizations; administrators may include archived records.
- Results expose bounded summary fields and counts without loading complete relationship histories.

### Assign Advisors

- Administrators can assign active advisor profiles to active organizations.
- Multiple advisors may be assigned, but only one active primary advisor is allowed per organization unless policy later changes.
- Assignments include role, effective dates, creator, and optional operational scope.
- Ending or replacing an assignment preserves history and emits domain events.

### Associate Students With Organizations

- Administrators can associate active student profiles with active organizations.
- A student may have multiple organization memberships when business rules require them, with at most one active primary organization.
- Memberships include type, status, effective dates, creator, and an optional organization-local student reference.
- Ending a membership preserves history and must not alter applications, conversations, documents, tasks, university selections, or advisor access implicitly.
- Organization membership is not itself permission to read every student resource; existing student authorization remains authoritative until explicitly extended.

## 3. Non-Functional Requirements

### Security

- Use Clerk only for authentication; all organization relationships use immutable `crm.profiles.id` UUIDs.
- Enable and force row-level security on every proposed table.
- Expose reads through least-privilege grants and RLS; perform writes through narrowly scoped security-definer RPCs with `search_path = ''`.
- Derive actor identity and role from trusted CRM helpers, never client-supplied role or profile identifiers.
- Validate referenced profiles are active and have the required `advisor` or `student` role.
- Prevent cross-organization data disclosure and exclude sensitive student details from list responses.
- Do not infer organization authorization from university applications or catalog relationships.
- Validate all text lengths, domains, URLs, status values, date ranges, and relationship invariants at the database and application boundaries.

### Performance

- Organization list and search requests should target a p95 response time below 500 ms for the initial expected dataset.
- Use cursor-based pagination for large result sets and return bounded page sizes.
- Index normalized name, status, country, type, domain, external reference, and active advisor/student relationship lookups.
- Fetch summary counts through aggregate queries or a reviewed read model, avoiding per-row requests.

### Scalability

- Support multiple advisors and students per organization and multiple historical relationships per profile.
- Model assignments and memberships as join tables rather than arrays or copied profile data.
- Keep authorization predicates index-supported and avoid recursive RLS.
- Emit domain events so analytics, notifications, search, and workflows can scale independently.
- Design identifiers and constraints to support later customer provisioning and approved CRM integrations.

### Auditability

- Record organization creation, update, archive, assignment, unassignment, membership, and membership-end events.
- Include actor CRM profile UUID, timestamp, entity UUID, request correlation ID when available, and a sanitized change summary.
- Preserve historical relationships through effective dates and lifecycle status; do not hard-delete business history.
- Integrate with the existing immutable audit log and domain-event contracts.
- Never copy Clerk identifiers, credentials, or unnecessary personal data into audit payloads.

## 4. Proposed Database Model

The names below are logical proposals for a future migration and may be refined during implementation review.

### `crm.organizations`

Customer or partner organization record.

| Field                              | Purpose                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `id uuid`                          | Primary key generated by the database                                                        |
| `country_id uuid null`             | Optional foreign key to `crm.countries(id)` for normalized geography                         |
| `name text`                        | Customer-facing display name                                                                 |
| `normalized_name text`             | Search and duplicate-detection value maintained server-side                                  |
| `slug text`                        | Stable human-readable identifier                                                             |
| `organization_type text`           | Controlled value such as `partner_school`, `advising_agency`, `sponsor`, or `operating_unit` |
| `status text`                      | `active` or `archived`                                                                       |
| `website_url text null`            | Validated public website                                                                     |
| `approved_domain text null`        | Validated organization domain for future provisioning rules                                  |
| `primary_email text null`          | Operational contact email                                                                    |
| `primary_phone text null`          | Operational contact phone                                                                    |
| `external_reference text null`     | Unique customer identifier from an approved upstream system                                  |
| `created_by_profile_id uuid`       | Foreign key to `crm.profiles(id)`                                                            |
| `archived_by_profile_id uuid null` | Foreign key to `crm.profiles(id)`                                                            |
| `archived_at timestamptz null`     | Archive timestamp                                                                            |
| `archive_reason text null`         | Bounded administrative rationale                                                             |
| `created_at`, `updated_at`         | Lifecycle timestamps                                                                         |

Key constraints should enforce valid lifecycle combinations, normalized uniqueness, unique external references when present, and restricted deletion. This table contains no university program, intake, scholarship, or application fields.

### `crm.organization_advisors`

Time-bounded many-to-many relationship between customer organizations and advisor profiles.

| Field                           | Purpose                                                         |
| ------------------------------- | --------------------------------------------------------------- |
| `id uuid`                       | Primary key                                                     |
| `organization_id uuid`          | Foreign key to `crm.organizations(id)` with restricted deletion |
| `advisor_profile_id uuid`       | Foreign key to an active advisor in `crm.profiles(id)`          |
| `assignment_role text`          | Controlled value such as `primary`, `support`, or `manager`     |
| `scope jsonb null`              | Optional validated, non-sensitive operational scope             |
| `starts_at timestamptz`         | Effective start                                                 |
| `ends_at timestamptz null`      | Effective end                                                   |
| `assigned_by_profile_id uuid`   | Administrative actor                                            |
| `ended_by_profile_id uuid null` | Actor ending the assignment                                     |
| `created_at`, `updated_at`      | Lifecycle timestamps                                            |

Use a partial unique constraint to prevent duplicate active advisor assignments and another to allow only one active primary advisor per organization. Profile-role validation should occur in controlled mutation functions because a foreign key alone cannot enforce the profile role.

### `crm.organization_students`

Time-bounded many-to-many membership between customer organizations and student profiles.

| Field                                  | Purpose                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `id uuid`                              | Primary key                                                              |
| `organization_id uuid`                 | Foreign key to `crm.organizations(id)` with restricted deletion          |
| `student_profile_id uuid`              | Foreign key to an active student in `crm.profiles(id)`                   |
| `membership_type text`                 | Controlled value such as `client`, `sponsored`, `referred`, or `managed` |
| `status text`                          | `active` or `ended`                                                      |
| `is_primary boolean`                   | Marks the student's primary active customer organization                 |
| `external_student_reference text null` | Organization-local reference protected from broad disclosure             |
| `starts_at timestamptz`                | Effective start                                                          |
| `ends_at timestamptz null`             | Effective end                                                            |
| `associated_by_profile_id uuid`        | Administrative actor                                                     |
| `ended_by_profile_id uuid null`        | Actor ending the membership                                              |
| `created_at`, `updated_at`             | Lifecycle timestamps                                                     |

Use partial unique constraints for active organization/student pairs and one active primary organization per student. These records reference, but never copy, CRM identity attributes.

### Existing University Catalog

No new organization table has a direct ownership relationship over `crm.universities`. The catalog remains:

```text
crm.universities
  ├── crm.campuses
  ├── crm.faculties
  ├── crm.programs
  ├── crm.intakes
  └── crm.scholarships
```

Applications continue to connect a student to a university through the existing program and intake catalog relationships. If future reporting needs to state that a customer organization is also a specific catalog university, that should use a separately designed mapping entity with its own provenance and cardinality rules. It must not be inferred from matching names, email domains, or student membership.

### Proposed Organization Relationships

```text
crm.organizations        1 --- * crm.organization_advisors
crm.profiles (advisor)   1 --- * crm.organization_advisors
crm.organizations        1 --- * crm.organization_students
crm.profiles (student)   1 --- * crm.organization_students
```

There is deliberately no implied relationship between `crm.organization_students` and a student's university applications.

## 5. Authorization Model

Version 1.1 should use only the existing trusted roles: `student`, `advisor`, and `admin`. A future organization-manager role requires a separate authorization design and must not be inferred from catalog data.

| Action                           | Student                       | Advisor                                                                                         | Administrator                         |
| -------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| View organization summary        | Own active organizations only | Assigned active organizations only                                                              | All active and archived organizations |
| View advisor assignments         | No                            | Own assignment and approved peers in the same organization                                      | All                                   |
| View student membership          | Own membership only           | Students in an assigned organization only when existing `can_access_student` also allows access | All                                   |
| Create organization              | No                            | No                                                                                              | Yes                                   |
| Update organization              | No                            | No                                                                                              | Yes                                   |
| Archive/reactivate organization  | No                            | No                                                                                              | Yes                                   |
| Assign/end advisor relationship  | No                            | No                                                                                              | Yes                                   |
| Associate/end student membership | No                            | No                                                                                              | Yes                                   |

Recommended authorization helpers include `can_view_organization(uuid)`, `can_manage_organization(uuid)`, and narrowly scoped membership checks. Organization membership must not silently broaden `crm.can_access_student`; any future extension requires explicit policy review and cross-organization isolation tests. University catalog visibility and application authorization remain governed by their existing policies.

## 6. API Design

Thin authenticated route handlers or server-side service functions should call secure database RPCs rather than writing tables directly.

### Proposed Read Endpoints

| Method and path                                    | Purpose                                   |
| -------------------------------------------------- | ----------------------------------------- |
| `GET /api/organizations`                           | Cursor-paginated search and filter        |
| `GET /api/organizations/{organizationId}`          | Authorized organization detail            |
| `GET /api/organizations/{organizationId}/advisors` | Active and authorized advisor assignments |
| `GET /api/organizations/{organizationId}/students` | Authorized, paginated student memberships |

### Proposed Mutation Endpoints

| Method and path                                                      | Purpose                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /api/organizations`                                            | Create through `crm.create_organization(...)`                             |
| `PATCH /api/organizations/{organizationId}`                          | Update through `crm.update_organization(...)` with a version precondition |
| `POST /api/organizations/{organizationId}/archive`                   | Archive through `crm.archive_organization(...)`                           |
| `POST /api/organizations/{organizationId}/reactivate`                | Optional controlled reactivation                                          |
| `POST /api/organizations/{organizationId}/advisors`                  | Assign through `crm.assign_organization_advisor(...)`                     |
| `DELETE /api/organizations/{organizationId}/advisors/{assignmentId}` | End, not delete, an advisor assignment                                    |
| `POST /api/organizations/{organizationId}/students`                  | Associate through `crm.associate_organization_student(...)`               |
| `DELETE /api/organizations/{organizationId}/students/{membershipId}` | End, not delete, a student membership                                     |

All mutation requests should use schema validation, return stable error codes, support request correlation, and use idempotency keys where retries could duplicate relationships. Responses should expose CRM UUIDs only to authorized clients and must not expose Clerk identifiers.

## 7. UI Overview

### Organization List

- Administrative page with search, status/type/country filters, sortable columns, and cursor pagination.
- Summary columns for organization name, type, country, primary advisor, student count, and status.
- Archived organizations are hidden by default and clearly labeled when included.
- University catalog records do not appear in this list unless they have independently been onboarded as customer organizations.

### Organization Details

- Header with customer identity, lifecycle state, external reference, and authorized actions.
- Overview, advisors, students, and audit/activity sections.
- Counts and relationship tables load independently to keep the initial view responsive.
- Archive actions require confirmation and explain downstream operational effects.
- The page does not present programs, intakes, or applications as organization-owned data.

### Create/Edit Form

- Shared validated form for name, organization type, country, contact data, approved domain, and external reference.
- Duplicate warnings appear before submission without exposing inaccessible records.
- Edit mode displays concurrency conflicts and preserves unsaved input.
- Archive controls remain separate from general editing.
- The form does not create or select a catalog university.

### Advisor Assignment Screen

- Search active advisor CRM profiles by approved display fields.
- Show current, scheduled, and historical organization assignments with roles and effective dates.
- Prevent invalid duplicate or second-primary assignments before submission and enforce them again server-side.
- Require confirmation when replacing or ending a primary assignment.

Student membership management may use a parallel panel on the organization details page, with strict authorization and paginated search.

## 8. Migration Strategy

Implementation should be additive and staged:

1. Introduce proposed organization tables, constraints, indexes, authorization helpers, RPCs, and RLS policies in a forward-only migration. Do not rename, alter, or backfill `crm.universities`; do not change profile identity, applications, conversations, or existing advisor/student authorization.
2. Keep admissions workflows unchanged. Applications continue to reference `crm.universities`, programs, and intakes exactly as they do today.
3. Seed customer organization records only from reviewed customer and partner data. Do not derive them automatically from the university catalog. Use deterministic external customer references to make imports idempotent.
4. Deploy organization read services and administrator UI behind a controlled rollout boundary. Existing student and advisor dashboards must not depend on the new tables.
5. Enable organization mutations only after RLS, RPC authorization, audit-event coverage, cross-organization tests, and rollback checks pass.
6. Add advisor assignment and student membership views incrementally. Do not use organization membership to grant existing student-resource access until a separately reviewed authorization migration explicitly extends `crm.can_access_student`.
7. Validate query performance, duplicate detection, archive behavior, domain events, and audit records in staging.
8. Roll back application exposure by disabling the new UI and services if required; retain additive schema and recorded history for a forward corrective migration rather than dropping tables or data.

This sequence keeps current student, advisor, messaging, admissions, university catalog, documents, tasks, RLS, and CRM UUID identity behavior unchanged while Organization Management is introduced.
