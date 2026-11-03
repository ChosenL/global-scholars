# Scholar Portal authentication investigation — November 2, 2026

## Independent initial sign-in watchdog — November 3, 2026

Branch: `fix/portal-signin-watchdog-20261103`. The owner authorized only the
confirmed recovery-coverage correction. This does **not** establish or fix the
root cause of the original browser-specific Clerk failure.

### Why a separate watchdog is needed

The installed Clerk React mounting fallback ends when its host has children.
Those children can still be an internal loading surface. SDK `ready`, arbitrary
children and completion of a mounting fallback therefore cannot establish a
usable authentication interface. Existing SDK initialization and dashboard
navigation recovery remain in place.

The new PortalSignInWatchdog wraps the existing SignIn without changing its
identity, routing, withSignUp behavior or redirect props. It starts its own
15-second initial-controls deadline independently of the mounting fallback.
The fallback remains a loading-only presentation to avoid duplicate recovery
panels; the independent watchdog owns post-SDK initial-UI recovery, whether the
component is still empty or has inserted a spinner.

### Usability and active-authentication boundaries

- Supported Clerk appearance.elements options add owned markers to
  formFieldInput, socialButtonsBlockButton and formButtonPrimary. No private
  Clerk class names, child counts, provider-specific English button text or
  component internals are used as readiness signals.
- A scoped MutationObserver inspects only these markers within the SignIn
  surface. A usable control must be a native input/button with an accessible
  name, positive layout dimensions, visible ancestors and an enabled state.
  Hidden, transparent, inert, disabled and read-only controls do not count.
  Native labels, aria-label and aria-labelledby are recognized. The check
  determines naming presence, never reads credential values or sends telemetry.
- A 250-ms visibility check covers stylesheet/animation changes that do not
  mutate attributes. Both it and the observer stop permanently once readiness or
  authentication activity is detected. Cleanup also removes event listeners and
  the deadline on completion/unmount; this is not a continuously running
  authentication monitor.
- Supported useSignIn/useSignUp resource status and fetchStatus signals stop the
  watchdog for an existing attempt or in-flight request, even if no control is
  rendered. Focus, pointer/key/input/change events on usable marked controls and
  form submission also stop it before a legitimate flow can be timed out.
- Resumed non-root hash routes (including verification/MFA and OAuth callback
  routes) and callback/invitation parameter names are excluded. Parameter values
  are never read or logged. Returning to the initial route or ending a request
  does not re-arm a watchdog that has already finished.
- A genuinely stalled initial surface gets the existing alert, reload/support
  links and safe fixed diagnostics. The alert is a sibling of the SignIn surface:
  it never replaces, conceals, disables or remounts Clerk. There is no automatic
  navigation, reload, focus transfer or session manipulation. If controls arrive
  late, recovery disappears and the same mounted controls remain available.

### Tests and limits

The focused Playwright suite includes isolated component-state fixtures that
execute the actual watchdog/recovery TypeScript source with installed React.
Clerk hook snapshots and Link presentation are stubbed only in this test harness;
imperative child updates represent Clerk's separately managed UI root. No test
authentication shortcut is present in application code and no fixture accesses
Clerk accounts, Supabase or student records.

Independent scenarios cover empty mounting, a mounted indefinite spinner,
unusable/hidden/disabled/zero-size children, slow readiness, readiness after the
deadline, email-only and Google-only controls, password entry, later verification
or MFA, request/sign-in/sign-up activity before controls appear, permanent
disarming when that activity ends, resumed MFA/OAuth routes, and stylesheet-only
visibility changes. Existing real-page synthetic SDK failure, stalled SDK and
responsive logo checks remain included. Clock-based fixtures wait for React
effects before advancing the deadline.

The fixtures validate the recovery mechanism, not a real credential exchange,
Google consent, email delivery or MFA provider. An isolated protected Preview
must verify that the installed Clerk UI continues applying the documented
appearance markers to its real named controls. Custom future controls that do
not expose these markers/native semantics need a reviewed readiness adapter.
Non-root/resumed authentication flows intentionally have no new deadline. Failures
before React hydration cannot be handled by this client watchdog.

### Exact scope

1. `app/student-portal/page.tsx` — wrapper, owned appearance markers and loading-only fallback.
2. `app/student-portal/PortalAuthLoading.tsx` — independent watchdog and reuse of the recovery presentation.
3. `e2e/portal/login-loading.spec.ts` — isolated state fixtures and expanded scenarios.
4. `tests/portal-auth-branding.test.mjs` — necessary additional test-only file: the pre-existing single-line fallback assertion was made whitespace-independent and updated to retain the wrapper/fallback contract. This additional file was explained before editing.
5. `docs/operations/portal-auth-hotfix-20261102.md` — this record.

No ClerkProvider, proxy, redirect, hash-routing, Invite-only, dependency, logo,
dashboard, marketing, database migration/RLS, assignment, sharing or privilege
changes. No production credentials, service configuration, commit, push, merge
or deployment actions. The registry check during this turn still reported
16.4.4 as latest stable Next.js 16.x. Dependencies were not upgraded; the announced
November security release remains a reason to recheck before deployment.

### Final validation and recommendation

| Check                              | Result                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm.cmd run typecheck`            | Passed.                                                                                                                                                |
| `npm.cmd run lint`                 | Passed.                                                                                                                                                |
| `npm.cmd test`                     | All 158 passed; no failures/skips.                                                                                                                     |
| Focused production-mode Playwright | All 16 passed: 13 isolated watchdog state/visibility/interaction fixtures and the 3 existing real-page/asset checks.                                   |
| Synthetic production `next build`  | Passed on Next.js 16.4.4: compilation, built-in TypeScript, 26/26 static pages and optimization.                                                       |
| `npm audit --omit=dev --json`      | Exit 0; zero reported production vulnerabilities. This does not clear the development-tool findings from the earlier review.                           |
| Final stable-release recheck       | At 2026-11-03 16:35:55 UTC (11:35:55 a.m. America/New_York), latest stable 16.x remained 16.4.4, matching the installed version. No upgrade performed. |
| Git whitespace and scope           | Passed; exactly the five listed files changed.                                                                                                         |

The build child process received only allowlisted OS variables plus synthetic CI
Clerk keys for `clerk.portal-test.invalid` and a placeholder Supabase URL/key for
`supabase.build-test.invalid`. No inherited application credentials, production
student accounts or production database were used. All fixtures are local and
the real-page SDK-failure tests block or hold external requests. Verification
logs and audit JSON are ignored artifacts in `playwright-report/signin-watchdog/`.

The initial checks found and corrected prefer-const lint errors, and the existing
format-sensitive source assertion needed the explained test-only update. An
earlier 15-test run passed; the final 16-test run includes the zero-size/hidden
control refinements, permanent disarming after requests finish, and stylesheet
visibility coverage. No dependency compatibility changes were needed.

**Recommendation:** ready for owner-approved protected Vercel Preview testing
with isolated Clerk/Supabase resources and Invite-only intact. Verify real Clerk
marker application, Google/email rendering, slow loading, real invited/uninvited
registration behavior, verification/MFA and OAuth return without a watchdog
interruption. This is recovery-gap verification, not evidence that the original
Chrome-specific failure is fixed. No commit, push, merge, deployment or
production configuration change was performed.

## Authorized dependency remediation — November 3, 2026

This section supersedes the earlier dependency assessment and recommendation to
patch Next.js before Preview. All earlier portal changes are preserved. Work
remained exclusively in this hotfix workspace on branch
`fix/portal-auth-branding-20261102`.

### Selected stable versions and scope

The npm registry's latest tag and numerically highest stable 16.x version were
both **16.4.4**, verified again at 2026-11-03 05:08:19 UTC (12:08:19 a.m.
America/New_York). The [official release](https://github.com/vercel/next.js/releases/tag/v16.4.4)
is stable, not canary/prerelease. It includes the October security patches
introduced in 16.4.1. The current Node 24.18.0, React/React DOM 19.2.4,
TypeScript 5.9.3 and Clerk 7.5.18 satisfy the reviewed peer/engine ranges and were
not upgraded. No application compatibility correction was necessary.

| Package                                                          | Before           | After     | Change                                                                                   |
| ---------------------------------------------------------------- | ---------------- | --------- | ---------------------------------------------------------------------------------------- |
| next                                                             | 16.3.8           | 16.4.4    | Exact manifest pin and lockfile; stable same-major update.                               |
| eslint-config-next                                               | 16.3.8           | 16.4.4    | Exact matching configuration version.                                                    |
| @next/env, @next/eslint-plugin-next, @next/swc platform variants | 16.3.8           | 16.4.4    | Required aligned Next.js transitive packages.                                            |
| source-map-js                                                    | 1.2.1            | 1.2.2     | Lockfile-only patch within PostCSS's existing ^1.2.1 range.                              |
| zod                                                              | 4.4.3            | 4.6.7     | Lockfile-only same-major update; compatible with existing OpenAI/lint peer requirements. |
| minimatch                                                        | 3.1.5 and 10.2.5 | Unchanged | No safe same-major patched release identified.                                           |

No top-level dependencies, blanket overrides, canary packages, forced peer
resolutions or npm audit fix operations were introduced. Existing brace-expansion
overrides remain unchanged. npm also recorded six inBundle/optional metadata
entries inside the existing Tailwind WASM package. Tailwind itself was not
upgraded; these entries describe dependencies already bundled in that optional
package, not new runtime features or application changes.

### Security result and remaining risk

- Full `npm audit --json`: **16 moderate, 0 high, 0 critical**; exit 1 because
  development findings remain.
- `npm audit --omit=dev --json`: **0 vulnerabilities**; exit 0.
- The previous three affected production package entries (Next, source-map-js,
  Zod) are absent from the updated audit. This resolves the three reviewed Next
  advisories (two RCE and one Server Actions DoS), the source-map DoS advisory and
  the Zod memory-exhaustion advisory in this dependency tree.
- The 16 remaining entries are the same minimatch advisory and its lint-tool
  dependency effects. They are dev-only, not 16 distinct vulnerabilities. The
  affected package names remain those listed in the earlier table below, with
  the Next ESLint plugin/config now at 16.4.4.
- Registry metadata marks minimatch <11.0.1 affected. The maintainer description
  specifically discusses pattern amplification with optimizationLevel >=2.
  No student-facing endpoint accepting minimatch patterns was found. Risk is
  principally untrusted lint/build inputs; a clean production audit does not
  eliminate CI/tooling risk.
- ESLint 9's current maintenance version still requests minimatch ^3.1.5,
  eslint-plugin-import still requests ^3.1.2, and even newer TypeScript ESLint 8
  requests ^10.2.2. Moving consumers to minimatch 11 via override would cross
  major APIs. ESLint 10 is also outside the peer ranges of installed React/import
  plugins. These were not forced into the tree. npm's suggested older ESLint or
  Next ESLint configuration downgrades were rejected as incompatible. Track
  compatible upstream toolchain fixes rather than suppressing the advisory.

The official [November security-release notice](https://nextjs.org/blog/upcoming-nextjs-security-release-november-2026)
announces seven medium vulnerabilities and a scheduled November 3 release.
No newer stable package was published at the final registry check. Recheck the
stable release and advisories before deploying/promoting; update and revalidate
if a newer stable security patch appears. Zero findings means none reported by
the current registry, not proof that undisclosed vulnerabilities do not exist.

### Validation after clean installation

`npm.cmd ci --ignore-scripts --no-audit --no-fund` succeeded from the updated
lockfile (393 installed packages). Lifecycle scripts were omitted to avoid
unnecessary git-hook writes; no tests or build checks were disabled. The manifest
and lockfile root agree, and installed versions were independently inspected.

| Check                                        | Result                                                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| TypeScript                                   | Passed.                                                                                                              |
| ESLint                                       | Passed with the matching Next 16.4.4 configuration.                                                                  |
| Application unit/contract tests              | 158 passed; no failures/skips.                                                                                       |
| Separate data-import contract suite          | 12 passed; no failures/skips.                                                                                        |
| Full auxiliary data-import suite             | 28 passed, 6 failed: five failures caused by missing snapshot files and one sandbox-blocked public DLI-source fetch. |
| Production-equivalent build                  | Passed on Next.js 16.4.4; compilation, built-in TypeScript and 26/26 static pages.                                   |
| Production-mode portal Playwright            | All 3 passed in 55.1 seconds: blocked SDK/reload, responsive logo assets, stalled SDK recovery.                      |
| Git whitespace/scope and preservation checks | Passed; exact nine-file hotfix scope, with six pre-existing UI/test files byte-for-byte unchanged.                   |

The data-import failures concern fixtures absent before the dependency update and
an EACCES network restriction, not an identified dependency compatibility issue.
No fixtures were copied from the original development directory, no public data
was published, and no production database/test account was used. The broader
data-import integration suite is therefore **not fully green** in this workspace.

The production build used the same synthetic production-format Clerk fixture and
reserved invalid Supabase domain described below, with an OS-variable allowlist
and no inherited application credentials. Google font downloads were allowed.
This Windows production build is not a Vercel/Linux deployment or successful
production authentication. Actual invited/uninvited registration, Google/Apple
callbacks, account linking, sessions and student-data isolation still require
isolated functional Preview testing.

### Exact modified-file list

Only `package.json`, `package-lock.json` and this report were changed during the
dependency-remediation turn. Hash checks confirm that all six pre-existing
portal UI/branding/focused-test files are byte-for-byte preserved. Relative to
branch HEAD, the complete hotfix consists of exactly these nine files:

1. `package.json`
2. `package-lock.json`
3. `app/student-portal/page.tsx`
4. `app/student-portal/PortalAuthLoading.tsx`
5. `app/scholar-dashboard/page.tsx`
6. `e2e/portal/login-loading.spec.ts`
7. `playwright.portal.config.ts`
8. `tests/portal-auth-branding.test.mjs`
9. `docs/operations/portal-auth-hotfix-20261102.md`

Supabase migrations/RLS, proxy, authorization code, student assignments, sharing,
marketing design/source, Clerk settings, production variables and unfinished
private-beta development were not modified. Logs and audit JSON are ignored
local artifacts under `playwright-report/dependency-remediation/`.

**Current recommendation:** ready for owner-approved **protected Vercel Preview
testing** with isolated Clerk and Supabase resources, subject to the stable-release
recheck noted above. Retain Invite-only and deployment protection, use synthetic
students, and finish functional auth/authorization checks before production
promotion. The auxiliary data-import integration gaps and dev-tool vulnerabilities
remain explicitly open; this is not a claim that every repository test passed or
a production security sign-off. No commit, push, merge, deployment, live credential
change or production settings change was performed.

## Predeployment verification follow-up

This follow-up supersedes the earlier open-registration observation and the
earlier statement that no production build had been run. Work remains exclusively
in `global-scholars-portal-hotfix`, branch `fix/portal-auth-branding-20261102`.

### Registration and recovery review

A fresh, read-only, no-cache GET of the public Clerk Frontend API environment
endpoint returned HTTP 200 and `user_settings.sign_up.mode: restricted` at
2026-11-03 04:53:02 UTC (November 2, 11:53:02 p.m. America/New_York). This agrees
with the owner's Production Dashboard confirmation of Invite-only. Email address
and Google remain advertised identifiers, email-code verification is advertised,
and Apple is not advertised. No signed-in endpoint or student data was accessed.
This confirms the advertised mode, not an end-to-end uninvited signup rejection.

Review of PortalAuthLoading found no additional evidence-based application fix:
the timer starts on mount, clears on unmount, and has a separate keyed instance
for initialization versus dashboard navigation. The SignIn mounting fallback
clears when the UI mounts; typing credentials, MFA and consent are not timed out.
Clerk error/degraded status shows recovery immediately, and a stalled load shows
recovery after 15 seconds. Neither timeout nor reload creates a session, changes
registration mode, grants a role, or bypasses auth.protect(). Late readiness can
still render the normal form. There is no automatic reload loop. A failure before
hydration, a mounted Clerk form's own network operations, and dashboard profile
loading after navigation remain outside this component's deadline.

The original affected-browser failure remains unconfirmed. No global provider,
domain rewrite, SDK downgrade, or authorization change is justified by this review.

### Production-equivalent build

`node node_modules/next/dist/bin/next build` succeeded with Next.js 16.3.8,
Turbopack, Node 24.18.0 (matching `.nvmrc`), `NODE_ENV=production`, and `CI=true`.
Compilation, built-in TypeScript validation, page-data collection, all 26 static
page generations, and final optimization passed. Proxy and API routes were
included. No ignoreBuildErrors option, mocked font implementation, or build skip
was used. This was a Windows Node production build, not a Linux/Vercel deployment.

The build child process received an allowlist of OS/process variables plus
explicit synthetic CI settings. There were no loadable `.env` files in this
workspace (only `.env.example`). Clerk keys were nonfunctional synthetic values;
the final build used production-format placeholders for
`clerk.portal-test.invalid`, matching the browser fixture. Supabase pointed only
to `https://supabase.build-test.invalid` with a placeholder publishable key.
No production keys, database connection string, OpenAI key, or service-role key
was supplied. Public Google font downloads were permitted. No database test or
production database connection was performed. These build artifacts must never
be deployed as a working authentication configuration.

The initial build also passed, but its development-format placeholder triggered
Clerk's development handshake during a subsequent next start test. Rebuilding
with matching production-format synthetic placeholders corrected the fixture;
this did not require changing application code or weakening authentication.

Successful build/compilation does **not** prove successful production sign-in,
OAuth callback processing, session validation, invitation rejection or data
authorization. Those require isolated real test-instance credentials and users.

Latest validation results after the follow-up:

| Check                                             | Result                                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Production `next build`                           | Passed; final matching fixture compiled in 4.4 seconds and generated 26/26 static pages.                                                               |
| `npm.cmd run typecheck`                           | Passed.                                                                                                                                                |
| `npm.cmd run lint`                                | Passed.                                                                                                                                                |
| `npm.cmd test`                                    | 158 passed; no failures or skips.                                                                                                                      |
| Production-mode portal Playwright                 | 3 passed in 52.1 seconds: blocked SDK/reload and safe diagnostics; 375/1280-pixel logo previews; stalled external request failure within the deadline. |
| `git diff --check` and protected-path diff review | Passed; only the seven intended files listed below differ.                                                                                             |

To repeat the production browser check after an isolated build in PowerShell:
`$env:PLAYWRIGHT_PORTAL_PRODUCTION = 'true'` followed by
`npx.cmd playwright test --config=playwright.portal.config.ts`.
The fixture uses next start in this mode; its default remains next dev.
Browser output is scoped to `test-results/portal-browser`. The final build log
and raw registry advisory response are ignored local verification artifacts in
`playwright-report/hotfix-review/`, not files intended for commit.

Clerk itself also has a 15-second SDK-script deadline, so the stalled-request
test permits either the SDK error or the app timer to surface first; both must
produce recovery and leave the visitor on the unauthenticated portal. An initial
accelerated-clock assertion ran before hydration installed the app timer; the
final test uses real elapsed time instead. This was a test correction only.
Full OAuth, invited/uninvited registration, session persistence, account linking,
authenticated dashboard rendering and cross-student authorization were not
tested without real isolated credentials/users/database. No exploit tests were
performed. These remain required functional Preview checks, not build checks.

### Dependency security review

A fresh `npm audit --json` reproduced **19 affected package entries: 16 moderate,
2 high, 1 critical**. Exit 1 is expected for findings, not an audit transport
failure. The registry bulk advisory response was also checked directly against
the locked package versions. There are six underlying advisories across four
packages; npm propagates the minimatch advisory through its dependent lint tools.
All 16 moderate entries are dev-only in the lockfile. The other three packages
are in the production dependency graph, although installed presence does not by
itself demonstrate an attacker-reachable code path.

| Affected production package              | Installed version/path                                            | Assessment and remediation                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `next` (direct, critical package rating) | 16.3.8                                                            | Two critical RCE advisories and one high DoS advisory, detailed below. Minimum patched Next 16 version is 16.4.1; audit proposes 16.4.4. Review that update and matching eslint-config-next, then rerun builds, auth and regression checks. No upgrade was performed.                                                                                                                                                          |
| `source-map-js` (transitive, high)       | 1.2.1 through Next → PostCSS, and Tailwind/PostCSS build tooling  | Malicious indexed source maps can stall processing. No application endpoint accepting/parsing user-supplied source maps was found; practical exposure appears concentrated in build/tooling and untrusted source inputs. It is not dev-only because Next also brings PostCSS. Refresh the lock to >=1.2.2 after reviewing the small patch and rebuild CSS. [Upstream fix](https://github.com/7rulnik/source-map-js/pull/79).   |
| `zod` (transitive/peer, high)            | 4.4.3 through OpenAI's optional peer and shared lint dependencies | Excessive validation errors for oversized collections can exhaust memory. No direct app Zod parsing or Zod response-format helper use was found; the API uses responses.create and separate JSON validation. This lowers observed reachability without proving immunity. Review a lockfile update to >=4.6.6; OpenAI declares ^3.25 or ^4.0 peer compatibility. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). |

Next.js advisories and actual applicability:

- [Image optimization RCE, GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw): applies to the published Next version range and concerns upstream image processing on glibc Linux. The maintainer workaround is sharp >=0.35.5; this lockfile and installed tree already use **sharp 0.35.5**. SVG optimization is not enabled, no remotePatterns are configured, and changed logos are WebP. The documented dependency workaround is therefore satisfied; npm still flags the broader Next version. This Windows build cannot establish Linux exploitability, and no exploit was attempted.
- [Cache typed-array RCE, GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr): requires Cache Components and a use-cache function returning multiple typed arrays. No cacheComponents option or use-cache directives exist in the reviewed application source. That stated prerequisite was not found. The maintainer still recommends upgrading even without the pattern.
- [Server Actions DoS, GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r): needs App Router plus at least one Server Action. Although application source has no use-server directive, the production server-reference manifest contains **four Clerk-generated actions**, including invalidateCacheAction. The affected feature is present, so this finding cannot be dismissed. Framework request parsing can precede action-specific logic; invitation mode and business authorization are not a substitute for patching. No crafted request or DoS probe was sent.

All moderate entries below inherit the same
[minimatch glob amplification advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).
The registry marks minimatch <11.0.1 affected; the described mechanism requires
attacker-controlled patterns and optimizationLevel >=2. Both installed versions
are flagged; legacy 3.x reachability is not established by that mechanism alone.
These packages execute during lint/build tooling, not a discovered student-facing
glob endpoint. Untrusted repository patterns/configuration may affect CI. Avoid
feeding untrusted patterns into these tools, but do not disable lint/security
checks as remediation.

| Dev-only affected package            | Locked version          |
| ------------------------------------ | ----------------------- |
| @eslint-community/eslint-utils       | 4.9.1                   |
| @eslint/config-array                 | 0.21.2                  |
| @eslint/eslintrc                     | 3.3.5                   |
| @next/eslint-plugin-next             | 16.3.8                  |
| @typescript-eslint/eslint-plugin     | 8.62.1                  |
| @typescript-eslint/parser            | 8.62.1                  |
| @typescript-eslint/type-utils        | 8.62.1                  |
| @typescript-eslint/typescript-estree | 8.62.1                  |
| @typescript-eslint/utils             | 8.62.1                  |
| eslint                               | 9.39.4                  |
| eslint-config-next                   | 16.3.8                  |
| eslint-plugin-import                 | 2.32.0                  |
| eslint-plugin-jsx-a11y               | 6.10.2                  |
| eslint-plugin-react                  | 7.37.5                  |
| minimatch                            | 3.1.5 and nested 10.2.5 |
| typescript-eslint                    | 8.62.1                  |

Do not apply npm's proposed automatic fix blindly: it suggests downgrading ESLint
to 4.0.0 and eslint-config-next to 0.2.4 for some meta-vulnerabilities, which is
incompatible with the current flat-config toolchain. The existing overrides patch
brace-expansion within minimatch 3.1.5 and 10.2.5; they do not fix glob amplification.
A blanket override to minimatch 11
crosses major APIs and needs review of consumers. Prefer compatible upstream
toolchain releases; separately review targeted overrides only where compatibility
is established. No npm audit fix, install/update, package manifest, lockfile or
node_modules patch was applied in this follow-up.

### Scope and outstanding deployment gates

The exact modified/new file set relative to branch HEAD is:

1. `app/student-portal/page.tsx` — login loading/fallback UI and two logos.
2. `app/student-portal/PortalAuthLoading.tsx` — bounded recovery UI and safe diagnostics.
3. `app/scholar-dashboard/page.tsx` — desktop/mobile logo markup only.
4. `e2e/portal/login-loading.spec.ts` — failure/reload, stalled-timeout and logo-asset checks.
5. `playwright.portal.config.ts` — isolated fixture; optional production-server mode and scoped output directory.
6. `tests/portal-auth-branding.test.mjs` — Clerk protection and branding contracts.
7. `docs/operations/portal-auth-hotfix-20261102.md` — evidence, configuration instructions and review.

No changes to Supabase migrations, RLS, database policies, assignments, sharing,
admin privileges, platform authorization code, proxy, root layout, marketing
source, CI workflows, dependencies, lockfile or unrelated private-beta development.
The original development directory was not accessed. Existing dashboard data
logic remains untouched; the diff is limited to its logo markup.

Keep Production Invite-only. Verify the Preview Clerk instance independently is
also Invite-only: production restrictions do not automatically establish Preview
settings. Use a separate Clerk test/development instance and isolated Supabase
test project, correct Preview callback URLs and the existing protected-deployment
controls; never production student data or keys. Real test credentials must
replace placeholders for functional auth testing. Apple still needs the owner
configuration detailed later in this report. Test invited and uninvited email,
Google/Apple, account linking (including Apple's relay address), role/assignment
checks and cross-student isolation before considering production promotion.

**Recommendation:** the UI hotfix compiles, but hold an unrestricted/public Vercel
Preview until the Next.js security update is reviewed and verified. A protected,
owner-approved Preview using isolated test services could be used for further
validation, but is not a security sign-off or approval for production. Prefer
patching the framework first. No commit, push, merge, deployment or production
configuration mutation has occurred.

## Findings before changes

The confirmed application defect is an indefinite loading gate, not a proven
Clerk configuration failure. `app/student-portal/page.tsx` returned only a spinner
until `useUser().isLoaded`, without a deadline, failure UI, or diagnostics. The
embedded SignIn also lacked a mounting fallback. A profile-specific or transient
Clerk failure would therefore leave the user unable to recover.

Read-only production checks in a fresh, signed-out Edge Playwright context:

- Apex `/student-portal` redirects to `https://www.globalscholarspathway.com/student-portal`.
- The portal, ClerkJS script and public Frontend API environment endpoint return 200. More decisively, browser execution reached Clerk `loaded: true`,
  `status: ready`, runtime version `6.41.0`, and rendered Google, email and password
  fields. No pageerror or failed Clerk request was recorded in that run.
- Clerk's script comes from `clerk.globalscholarspathway.com`, consistent with the
  app's production domain. A subdomain for the Frontend API is normal.
- Public production settings advertise Google, email code and password factors;
  Apple is absent. These public settings do not verify private provider credentials.
- **Historical observation (superseded by the restricted-mode recheck above): production public settings reported sign-up mode `public`, not `restricted`,
  with allowlist disabled.** The requested invitation-only restriction is not
  established by the currently observable production configuration.

Source review: one root ClerkProvider, supported outside-html placement, public
student portal, hash routing (no catch-all route required), fallback redirects to
the protected scholar dashboard, and Next.js 16 `proxy.ts` using clerkMiddleware.
No app-level CSP, custom ClerkJS URL, domain override, or proxy URL is configured
in source. Environment-based overrides remain possible. The `/__clerk` matcher
alone does not prove that Frontend API proxying is configured. Installed versions
are Next.js 16.3.8 and @clerk/nextjs 7.5.18; Clerk's Core 3 minimum Next.js 16
requirement is satisfied. No evidence warrants an SDK downgrade or domain rewrite.

The user's specific initialization failure remains unconfirmed. A stale browser
profile, extension, blocked script/cookie, intermittent Frontend API request, or
deployment-specific environment override remains possible; none is asserted as
the root cause. HTTP 200 alone was not used as readiness evidence.

## Code correction

PortalAuthLoading replaces unbounded loading with a 15-second deadline, recovery
links and a manual reload. It identifies initialization, sign-in UI mounting, and
dashboard navigation separately. Clerk error/degraded status also displays a
failure. Timeout never marks the visitor authenticated or opens the dashboard.
The sign-in mounting fallback unmounts when Clerk mounts its UI, clearing its
timer. It does not impose a deadline on typing credentials, MFA, or OAuth consent.
Late SDK readiness can still render the normal form.

Browser warnings include only a fixed event, phase, reason, Clerk status, online
flag and hostname. No credentials, user data, cookie, full URL, query string or
raw SDK error is logged. These warnings are local console diagnostics, not a new
telemetry service. A failure before React hydration cannot display this client
timer; inspect document/chunk delivery separately in that case.

The portal's dark panel and both dashboard menus use the approved white-lettered
1779×739 logo. The portal's light mobile panel uses the navy-lettered 1784×711
logo. CSS uses automatic height, contain, and responsive maximum width, at
220–260 CSS pixels wide. Marketing files and provider/proxy configuration are
unchanged.

## Required operator actions — no production changes made

1. Select the correct **Production instance** in Clerk Dashboard. On **Access
   mode**, verify and restore **Invite-only** (`restricted`), retaining the
   existing invitation workflow. Do this before enabling any further providers.
   Hiding sign-up links is not enforcement. Existing uninvited users are not
   revoked by changing future registration mode: review that separately through
   the authorized security workflow, without granting roles or student records.
2. In Vercel Project → Settings → Environment Variables, privately compare the
   Production publishable and secret keys with the same Clerk Production
   instance. Do not paste keys into logs, screenshots or this report. Verify
   `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/student-portal` and fallback URLs point to
   `/scholar-dashboard`. If sign-up uses Clerk's hosted Account Portal, preserve
   its invitation URL rather than pointing it to a nonexistent `/sign-up` route.
   Check domain, satellite, proxy and Clerk script/UI URL/version overrides for
   stale values; this app has no intentional satellite/custom proxy setup.
   Public Next.js variables are embedded at build time: any approved corrections
   require a fresh approved deployment; editing the Vercel variable alone does
   not update the existing browser bundle.
3. Preserve `www` as the observed canonical host and the apex redirect. In Clerk
   Domains, verify the primary application/Frontend API domain, HTTPS and DNS
   records exactly as Clerk provides. In Clerk Paths, use the actual canonical
   application URL and `/student-portal` for sign-in. Do not change metadataBase
   or add a satellite configuration as a speculative auth fix.
4. Reproduce in the affected profile and a fresh private window. In Network,
   inspect ClerkJS, any Clerk UI asset, `/v1/environment`, and `/v1/client`
   requests, including bodies/errors, redirect chains, blocked cookies and
   browser extension messages. Verify `window.Clerk.loaded` and
   `window.Clerk.status` without dumping the Clerk object or session. Record the
   new `portal-*` reference and safe warning. Do not share an unredacted HAR.

## Google, Apple and ordinary email

The existing prebuilt Clerk SignIn reads instance settings, so provider buttons
need no custom OAuth implementation or hardcoded list in application code.

- **Google:** Already advertised by production. Clerk Dashboard → SSO connections
  → Google: verify enabled for sign-up/sign-in and custom production credentials.
  In Google Cloud, use a Web application OAuth client, the exact JavaScript origin
  and redirect URI supplied by Clerk, configured consent screen/authorized
  domains, and In production publishing status. Do not use development shared
  credentials in production. Keep Invite-only mode.
- **Email:** Clerk Dashboard → User & authentication → Email: enable email as an
  identifier, verification at sign-up and email verification code as a sign-in
  factor. Preserve existing password/MFA and other security settings. Invited
  Gmail, Yahoo, Outlook, iCloud and other ordinary addresses use the same Clerk
  email flow; no native Yahoo OAuth integration is necessary. Do not add a broad
  email-domain allowlist to implement private-beta invitations. Verify delivery
  in an isolated test instance without relaxing abuse protections.
- **Apple:** In Clerk Production → SSO connections → Add connection → For all
  users → Apple, enable sign-up/sign-in and custom credentials only after the
  invitation restriction is verified. The label “For all users” describes the
  connection type, not permission to access student data. Copy the exact Return
  URL and Email Source for Apple Private Email Relay shown by Clerk.
  In Apple Developer → Certificates, Identifiers & Profiles, create/select a
  primary App ID with Sign in with Apple enabled; register a Services ID for the
  web app, associate that primary App ID, register the actual Clerk Frontend API
  hostname without protocol, and register Clerk's exact Return URL.
  Create an Apple Sign in with Apple private key associated with the primary
  App ID. Enter Services ID, Team ID (Membership details), Key ID and downloaded
  `.p8` private key directly in Clerk. Store the key securely; never in this repo
  or NEXT_PUBLIC variables. Register the Email Source from Clerk under Apple's
  Sign in with Apple email communication/Private Email Relay settings and verify
  sending-domain requirements for the actual email sender. Test relay delivery.

Keep Clerk's native verified-email account linking. Do not create or merge
Supabase student rows on OAuth callbacks. For an existing student, use the same
verified email and confirm the Clerk user ID remains unchanged. Apple Hide My
Email and other different addresses cannot reliably auto-link to an existing
email identity: sign in to the existing account first and connect Apple through
Clerk's authenticated account-management flow. Do not issue a second invitation
to the relay address as a workaround. Resolve any existing duplicate identity
through the authorized support process, with no automatic student-data merge.

Before rollout, use isolated Clerk/test database resources and synthetic users
to verify: invited email-code registration; existing-user Google linking; Apple
linking and relay delivery; uninvited email/Google/Apple registration denied;
signed-out dashboard denied; signed-in unassigned user gets no student data;
existing student cannot access another student's records. No production student
data or real authentication attempts were used during this investigation.

## Validation and limits

- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: 158 passed, no failures or skips, including two new portal
  authentication/branding contract tests.
- `npx.cmd playwright test --config=playwright.portal.config.ts`: 2 passed.
  Blocked ClerkJS produces a failure UI, fixed safe diagnostics and working
  manual reload. Logo asset previews pass aspect-ratio and viewport checks at
  375 and 1280 pixels; both screenshots were visually inspected.
  The preview is an asset-only fixture, not an authenticated dashboard render.
- `git diff --check`: passed. Public marketing source, root layout, proxy,
  Next configuration, database schema and policies have no changes.
- Earlier browser attempts failed because the synthetic development key caused
  Clerk's development handshake, then local proxy networking and an overly
  broad alert selector. The final isolated fixture uses synthetic production-
  format keys for a reserved `.invalid` host, localhost, and an alert selector
  scoped to the application content. All external browser requests in the
  failure test are blocked; no real Clerk users or database are involved.
- Full credential entry, Google/Apple callbacks, invitation rejection, native
  account linking and authenticated dashboard visual inspection were not run:
  isolated provider credentials, invited test users and a test database were
  unavailable. No production build or deployment was performed. The affected
  browser profile's original initialization failure remains unconfirmed.
- Dependency installation reported 19 existing audit findings (16 moderate,
  2 high, 1 critical). Exploitability was not assessed; dependency remediation
  is separate from this focused change. No dependency versions or lockfile changed.
- No commits, pushes, merges, deployments or production configuration changes.

Run the isolated browser checks with Microsoft Edge installed; the config uses
its `msedge` channel. Synthetic values in that config are test placeholders and
must never be copied into Vercel or used to replace real authentication keys.

## Reference documentation

- [Clerk SignIn and mounting fallback](https://clerk.com/docs/nextjs/reference/components/authentication/sign-in)
- [Clerk Core 3 compatibility](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3)
- [Clerk access restrictions](https://clerk.com/docs/guides/secure/restricting-access)
- [Clerk Google production setup](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google)
- [Clerk Apple production setup](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/apple)
- [Apple web authentication setup](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple)
- [Clerk account linking](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/account-linking)
