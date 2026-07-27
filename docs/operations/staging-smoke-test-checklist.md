# Staging Smoke-Test Checklist

Release ID: __________  
Commit: __________  
Migration head: __________  
Environment fingerprint: __________  
Tester/time (UTC): __________

Use separate synthetic anonymous, student A, student B, assigned advisor,
unassigned advisor, and administrator identities. Record correlation IDs and
redacted evidence only. Any unauthorized access, identity mismatch, data
integrity failure, or secret/PII exposure is an immediate FAIL.

## Authentication

- [ ] Anonymous access to scholar/advisor dashboards redirects or denies.
- [ ] Student, advisor, and administrator sign-in uses the Staging Clerk instance.
- [ ] Expired/invalid sessions fail closed; sign-out prevents subsequent access.
- [ ] Clerk identity resolves exactly one canonical `crm.profiles` CRM UUID.
- [ ] Redirects/origins remain inside approved Staging domains.

## Authorization

- [ ] Student A can read only Student A records; Student B cross-access is denied.
- [ ] Student cannot read advisor notes, audit log, activity feed, administrative
  AI context, or restricted timeline entries.
- [ ] Assigned advisor can manage the assigned student through approved RPCs.
- [ ] Unassigned advisor is denied; administrator follows the approved matrix.
- [ ] Anonymous SECURITY DEFINER execution and mutable-search-path queries pass.
- [ ] Every CRM table retains enabled and forced RLS.

## Student dashboard

- [ ] Root `/scholar-dashboard` opens Home/Overview on direct load and refresh.
- [ ] Profile, documents, tasks, messages, readiness, applications, visa,
  notifications, and safe timeline load with synthetic data.
- [ ] Empty, loading, error, refresh, mobile, and expired-session states are safe.
- [ ] Private file link is short-lived and cross-user access is denied.

## Advisor dashboard

- [ ] Assigned-student list and workspace use CRM UUIDs.
- [ ] Advisor can review a document, manage a task, and create an internal note.
- [ ] Student cannot see that internal note.
- [ ] Authorized mutations produce expected event/audit effects exactly once.
- [ ] Unassigned-student URL and stale browser state fail closed.

## Applications

- [ ] Multiple synthetic applications for one student load independently.
- [ ] Advisor performs one permitted status transition through the secure service.
- [ ] Status history records actor CRM UUID and timestamp exactly once.
- [ ] Readiness, timeline, notification, activity, analytics, and audit effects are
  consistent with the domain event.
- [ ] Student cannot perform advisor-only transitions or access another application.

## Visa workflows

- [ ] Multiple visa cases and current stages load for the authorized student.
- [ ] Advisor performs one permitted stage update through the secure service.
- [ ] Checklist/history, readiness, timeline, notification, activity, analytics,
  and audit effects occur exactly once.
- [ ] Cross-student and unassigned-advisor access is denied.

## AI Assistant

- [ ] Anonymous AI request is denied and authorized context uses the caller CRM UUID.
- [ ] Student AI context excludes advisor notes, audit/activity, and other students.
- [ ] Advisor request respects assigned-student authorization.
- [ ] Citations resolve only to authorized records and output validation passes.
- [ ] Per-user quota, distributed rate limit, timeout/retry, circuit behavior, and
  `AI_OPERATIONS_ENABLED=false` safe degradation are verified.
- [ ] Invocation/audit/analytics records contain no raw prompt context or secrets.

## Timeline

- [ ] Authorized business mutation creates one immutable timeline event.
- [ ] Restricted note/AI administrative events remain hidden from students.
- [ ] Ordering, actor CRM UUID, entity reference, correlation, and timestamps match.
- [ ] Timeline remains separate from administrator activity and audit history.

## Notifications

- [ ] Expected in-app notification is created from the domain event exactly once.
- [ ] Recipient is the authorized CRM profile; other users cannot read it.
- [ ] Read/unread behavior works through the authorized path.
- [ ] No external email, SMS, or push delivery occurs.

## `/api/health`

- [ ] Authorized monitoring receives HTTP 200, `status: ok`, no-store, request ID,
  and correlation ID.
- [ ] Response contains no secret values, provider identifiers, or PII.
- [ ] It points monitoring to `/api/ready` and remains a liveness signal.

## `/api/ready`

- [ ] Healthy core configuration/database returns HTTP 200 and `status: ready`.
- [ ] Database timeout/unavailability returns HTTP 503 within the approved bound.
- [ ] AI disabled/unavailable reports degraded but does not make core CRM unready.
- [ ] Response/logs expose no provider error, secret, signed URL, or PII.

## Operational completion

- [ ] Structured logs correlate all smoke requests and redact sensitive values.
- [ ] Required alerts fire and are acknowledged by the named owner.
- [ ] No unexplained error, latency, connection, event-backlog, usage, or cost spike.
- [ ] Test data cleanup uses supported archive/soft-delete behavior.
- [ ] Evidence manifest is complete and contains no secrets or personal data.

Result: PASS / FAIL  
Failed checks and incident references: __________  
Engineering: __________ Operations: __________ Security: __________
