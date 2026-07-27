# Environment Matrix

See [infrastructure-inventory.md](./infrastructure-inventory.md) for the resource
inventory, isolation requirements, ownership, and acceptance criteria.

No secret values belong in this document. Record only provider resource names,
IDs approved for disclosure, configuration scope, and verification timestamps.

| Control | Development | Preview | Staging | Production | Status |
|---|---|---|---|---|---|
| Vercel project/environment | Linked `global-scholars`; Development variables present | Preview deployments present | No dedicated staging evidence | Production deployments present | PARTIAL |
| Clerk instance | Variables present | Variables present | Not defined | Variables present | NOT VERIFIED |
| Supabase project | Linked project may be reused | Variables present | No dedicated project | Variables present | FAIL |
| OpenAI project/key | Key present | Key and safety salt present | Not defined | Key present; safety salt not listed | FAIL |
| Application base URL | Local URL implicit | Generated Vercel URL | Not defined | Production deployment/domain not documented | PARTIAL |
| Database migration target | Linked project | Not independently identified | Not defined | Linked project relationship not formally documented | FAIL |
| Storage buckets | Local policy from migrations | Target not independently identified | Not defined | Three private buckets on linked project | PARTIAL |
| Monitoring DSN/environment | None | None | None | None | FAIL |
| Rate-limit store/namespace | None | None | None | None | FAIL |
| Cost budget/alerts | None documented | Not verified | Not defined | Not verified | NOT VERIFIED |
| Backup/PITR | Local disposable | Not verified | Not defined | Not verified | NOT VERIFIED |

## Required environment fingerprint

Before Preview-to-Staging promotion, record these non-secret values for every
environment and prove that Staging and Production differ:

| Fingerprint field | Development | Preview | Staging | Production |
|---|---|---|---|---|
| Vercel project/environment ID | | | | |
| Application hostname | | | | |
| Git branch/commit/artifact digest | | | | |
| Supabase project ref and region | | | | |
| Database migration head | | | | |
| Clerk instance ID | | | | |
| OpenAI project ID/key fingerprint | | | | |
| Storage namespace/bucket inventory | | | | |
| Monitoring environment | | | | |
| Configuration version | | | | |

Use one-way key fingerprints only; never record a key or secret value.

## Required variables

| Variable | Client exposure | Development | Preview | Staging | Production | Validation |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public by design | Required | Required | Required | Required | Format and environment fingerprint |
| `CLERK_SECRET_KEY` | Server only | Required | Required | Required | Required | Never bundled/logged |
| Clerk redirect URL variables | Public by design | Required | Required | Required | Required | Exact approved origins |
| `NEXT_PUBLIC_SUPABASE_URL` | Public by design | Required | Required | Required | Required | Must identify intended environment |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public by design | Required | Required | Required | Required | Must pair with URL |
| `OPENAI_API_KEY` | Server only | Optional/live-test | Required if AI enabled | Required | Required | Separate provider project/key |
| `OPENAI_SAFETY_SALT` | Server only | Required if AI enabled | Required | Required | Required | Unique private random value |
| `OPENAI_CRM_MODEL` | Server only | Optional | Recommended | Required/approved | Required/approved | Allowlisted model |
| Monitoring DSN/token | Server only unless public DSN | Future | Required | Required | Required | Environment-tagged |
| Rate-limit credentials | Server only | Future | Required | Required | Required | Separate namespace |
| Clerk webhook secret | Server only | If webhook enabled | Required if sync enabled | Required | Required | Signature test |

## Separation acceptance criteria

- Development, Preview, Staging, and Production resolve to different Clerk,
  Supabase, OpenAI, monitoring, and rate-limit resources as applicable.
- No server secret has a `NEXT_PUBLIC_` prefix.
- Preview credentials cannot read or mutate production CRM or Storage.
- Health reports booleans/status only, never values or provider identifiers.
- CI verifies required variable names and environment fingerprint assertions.
- Rotation ownership and last-rotated dates are recorded outside source control.
