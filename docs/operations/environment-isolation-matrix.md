# Environment Isolation Matrix

Assessment date: 2026-10-04. This record contains only Vercel variable names,
types, and environment scopes observed through `vercel env ls`; it never records
secret values.

| Variable                               | Development                      | Preview                          | Production                       | Scope  | Vercel type  | Required                            | Purpose/status                                                     |
| -------------------------------------- | -------------------------------- | -------------------------------- | -------------------------------- | ------ | ------------ | ----------------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`    | Present                          | Present                          | Present                          | Public | Config       | Required                            | Clerk browser identity; distinct resource fingerprint NOT VERIFIED |
| `CLERK_SECRET_KEY`                     | Present                          | Present                          | Present                          | Server | Config       | Required                            | Clerk server operations; secret isolation NOT VERIFIED             |
| Clerk redirect URL variables           | Present                          | Present                          | Present                          | Public | Config       | Required                            | Sign-in/sign-up routing; production origins NOT VERIFIED           |
| `NEXT_PUBLIC_SUPABASE_URL`             | Present                          | Present                          | Present                          | Public | Config       | Required                            | Supabase endpoint; distinct project fingerprint NOT VERIFIED       |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Present                          | Present                          | Present                          | Public | Config       | Required                            | Supabase browser access; isolation NOT VERIFIED                    |
| `OPENAI_API_KEY`                       | Present                          | Present                          | Present                          | Server | Config       | Required when AI is enabled         | AI provider access; project/budget isolation NOT VERIFIED          |
| `OPENAI_SAFETY_SALT`                   | MISSING - VALUE MUST BE PROVIDED | Present                          | MISSING - VALUE MUST BE PROVIDED | Server | Config       | Required when AI is enabled         | AI safety identifier hashing; Production missing                   |
| `OPERATIONS_HASH_SALT`                 | MISSING - VALUE MUST BE PROVIDED | Present                          | MISSING - VALUE MUST BE PROVIDED | Server | Secret       | Required                            | Operational rate-limit hashing; Production missing                 |
| Monitoring DSN/token                   | MISSING - VALUE MUST BE PROVIDED | MISSING - VALUE MUST BE PROVIDED | MISSING - VALUE MUST BE PROVIDED | Server | Not present  | Required for production             | Monitoring integration                                             |
| Rate-limit provider credentials        | Not applicable                   | Not applicable                   | Not applicable                   | Server | Not present  | Optional                            | Database RPC currently supplies the store                          |
| Clerk webhook secret                   | NOT VERIFIED                     | NOT VERIFIED                     | NOT VERIFIED                     | Server | Not observed | Required if webhook sync is enabled | Webhook signature verification                                     |

## Required Remediation

- Create distinct Clerk, Supabase, OpenAI, Storage, salt, and Vercel scopes for
  each environment. Do not copy lower-environment values into Production.
- Supply unique server-only values for `OPENAI_SAFETY_SALT` and
  `OPERATIONS_HASH_SALT` in Production through the approved secret manager.
- Store server-only secrets using the strongest available Vercel secret handling
  for the project, and never commit or print their values.
- Record redacted resource fingerprints, Clerk origins/redirects/session policy,
  monitoring configuration, and rotation ownership in controlled operations
  evidence.
- Re-run `/api/health`, `/api/ready`, rate-limit, AI, and authorization checks
  after each environment is configured. Missing salts must remain visible only as
  degraded/unavailable status, never as values.
