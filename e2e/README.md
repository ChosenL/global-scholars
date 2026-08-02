# End-to-End Tests

Playwright browser tests live in this directory.

Run the suite with:

```bash
npm run test:e2e
```

Build the application before running the suite. Playwright starts the production
server on port `3100` by default. Set `PLAYWRIGHT_BASE_URL` to test an
already-running Preview environment, or `PLAYWRIGHT_PORT` to use another local
port. Preview certification must provide the same base URL used by the browser
tests.

Reusable authenticated and data fixtures belong in `e2e/fixtures`. Never commit
credentials or storage-state files containing session data.

## Organization Management

The Organization Management workflow uses the real Clerk and Organization API
integrations. Configure a dedicated administrator and existing CRM profile UUIDs
for one advisor and one student:

```text
E2E_ADMIN_EMAIL=
E2E_ADVISOR_PROFILE_ID=
E2E_STUDENT_PROFILE_ID=
E2E_RUN_ID=
SUPABASE_DB_URL=
```

When `SUPABASE_DB_URL` is configured, Playwright generates a fresh run ID,
provisions its deterministic database fixtures before the test projects, and
cleans them after the complete run, including failed test runs. `E2E_RUN_ID`
and the derived fixture IDs do not need to be exported manually. Without a
database URL, `E2E_RUN_ID` must be unique because archived organization
slugs remain reserved. In GitHub Actions, use the workflow run ID and attempt.
When these values are absent, only the framework smoke test runs and the
authenticated workflow is reported as skipped.

The Playwright process requires `CLERK_PUBLISHABLE_KEY` and
`CLERK_SECRET_KEY` from the same isolated Clerk instance used by the Preview.
CI maps these from the `E2E_CLERK_PUBLISHABLE_KEY` and
`E2E_CLERK_SECRET_KEY` repository secrets. The application uses the matching
Supabase project configured through `E2E_SUPABASE_URL` and
`E2E_SUPABASE_PUBLISHABLE_KEY`. Use `PLAYWRIGHT_BASE_URL` when validating an
already-deployed Preview URL.

The serial `clerk setup` Playwright project calls Clerk's official
`clerkSetup()` and `clerk.signIn({ emailAddress })` helpers. It verifies that
the CRM administrator reaches `/advisor-dashboard`, then writes temporary
browser state under `playwright/.clerk/`. The authenticated Organization and
Application projects depend on this setup and reuse that state. Client Trust
remains enabled; no password, inbox automation, or UI verification bypass is
used.

When both `PLAYWRIGHT_BASE_URL` and `VERCEL_AUTOMATION_BYPASS_SECRET` are set,
the shared Playwright fixture makes a same-origin `/api/health` request before
each test. That request follows the Vercel redirect and installs `_vercel_jwt`
in the test's browser context. The bypass headers apply only to this request;
normal page navigation and cross-origin Clerk requests receive no Vercel
headers. Local runs without a bypass secret are unchanged.

## Student Application Management

The Student Application workflow uses the real Clerk and Application API
integrations through visible browser controls only. Configure a dedicated
administrator, one student profile, one open intake that has not already been
used by that student, and two authorized advisor profiles:

```text
E2E_ADMIN_EMAIL=
E2E_APPLICATION_STUDENT_PROFILE_ID=
E2E_APPLICATION_INTAKE_ID=
E2E_ADVISOR_PROFILE_ID=
E2E_SECOND_ADVISOR_PROFILE_ID=
E2E_RUN_ID=
```

The configured student and intake pair must be unique for the test run because
applications enforce one active record per student and intake. When these values
are absent, the authenticated application workflow is reported as skipped.

## Preview Certification Variables

Authenticated Preview E2E certification requires these non-secret and secret
values to be configured consistently in the Preview environment, CI, and any
local shell used to run Playwright:

```text
PLAYWRIGHT_BASE_URL=
VERCEL_AUTOMATION_BYPASS_SECRET=
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
E2E_ADMIN_EMAIL=
E2E_ADVISOR_PROFILE_ID=
E2E_SECOND_ADVISOR_PROFILE_ID=
E2E_STUDENT_PROFILE_ID=
E2E_APPLICATION_STUDENT_PROFILE_ID=
E2E_APPLICATION_INTAKE_ID=
E2E_RUN_ID=
```
