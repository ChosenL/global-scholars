# End-to-End Tests

Playwright browser tests live in this directory.

Run the suite with:

```bash
npm run test:e2e
```

Build the application before running the suite. Playwright starts the production
server on port `3100` by default. Set
`PLAYWRIGHT_BASE_URL` to test an already-running environment, or
`PLAYWRIGHT_PORT` to use another local port.

Reusable authenticated and data fixtures belong in `e2e/fixtures`. Never commit
credentials or storage-state files containing session data.

## Organization Management

The Organization Management workflow uses the real Clerk and Organization API
integrations. Configure a dedicated administrator and existing CRM profile UUIDs
for one advisor and one student:

```text
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_ADVISOR_PROFILE_ID=
E2E_STUDENT_PROFILE_ID=
E2E_RUN_ID=
```

`E2E_RUN_ID` must be unique for each isolated run because archived organization
slugs remain reserved. In GitHub Actions, use the workflow run ID and attempt.
When these values are absent, only the framework smoke test runs and the
authenticated workflow is reported as skipped.

The running application must also use the matching isolated Clerk and Supabase
projects. CI reads these from `E2E_CLERK_PUBLISHABLE_KEY`,
`E2E_CLERK_SECRET_KEY`, `E2E_SUPABASE_URL`, and
`E2E_SUPABASE_PUBLISHABLE_KEY` repository secrets.

## Student Application Management

The Student Application workflow uses the real Clerk and Application API
integrations through visible browser controls only. Configure a dedicated
administrator, one student profile, one open intake that has not already been
used by that student, and two authorized advisor profiles:

```text
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_APPLICATION_STUDENT_PROFILE_ID=
E2E_APPLICATION_INTAKE_ID=
E2E_ADVISOR_PROFILE_ID=
E2E_SECOND_ADVISOR_PROFILE_ID=
E2E_RUN_ID=
```

The configured student and intake pair must be unique for the test run because
applications enforce one active record per student and intake. When these values
are absent, the authenticated application workflow is reported as skipped.
