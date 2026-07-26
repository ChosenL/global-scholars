# Global Scholars OS release runbook

## Release decision

Use preview first. Promotion to staging requires a clean migration rehearsal,
negative RLS tests, student/advisor smoke journeys, and configured monitoring.
Production additionally requires stakeholder acceptance, a verified backup or
point-in-time recovery, and an approved rollback owner.

## Pre-deployment

1. Create a stabilization branch after active implementation is committed.
2. Run `npm ci` and `npm run verify:release`.
3. Start a clean local Supabase stack and apply every migration in filename
   order. Run all tests in `supabase/tests`.
4. Apply the same migration set to staging and record migration identifiers.
5. Verify Clerk origins and redirects, Supabase URL allowlists, storage bucket
   policies, and environment separation.
6. Back up the database or confirm point-in-time recovery and record its
   recovery timestamp.
7. Test student and advisor journeys with separate accounts.

## Environment inventory

Required core variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the legacy anon-key fallback remains supported)

AI additionally requires:

- `OPENAI_API_KEY`
- `OPENAI_SAFETY_SALT`
- `OPENAI_CRM_MODEL` (optional override)

No service-role key is consumed by the browser application. Keep provider,
database, webhook, and telemetry secrets server-only and different in preview,
staging, and production.

## Smoke tests

- Anonymous requests to dashboards and `/api/ai` are denied.
- Student can load their own profile, documents, tasks, applications, visa
  cases, safe timeline entries, notifications, messages, and AI advice.
- Student cannot read notes, audit log, activity feed, AI operational events, or
  another student's records.
- Advisor can open an assigned student, review a document, create a note, update
  task/application/visa state, and observe event/audit effects.
- Advisor cannot open an unassigned student.
- Document download uses a signed URL and fails after expiry.
- Empty, loading, mutation refresh, error, and mobile states render correctly.

## Rollback and outages

Application rollback is the primary recovery path because release migrations are
additive. Redeploy the last known-good application version without reverting
tables. Disable `/api/ai` by removing its provider key if the AI provider is
degraded; CRM workflows remain available. Preserve domain events during consumer
failures and replay only idempotent consumers.

For authentication incidents, disable sign-in at Clerk and preserve CRM data.
For database incidents, stop mutations, retain read-only diagnostics, and use
the approved Supabase recovery point. For storage incidents, keep document
metadata and retry signed-link operations after service restoration.

Never log tokens, signed document URLs, raw authorized AI context, or full
personal records. Use invocation IDs, domain-event correlation IDs, and error
codes for support investigations.
