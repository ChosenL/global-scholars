# Dependency Vulnerability Risk Acceptance

## Record Status

- **System:** Global Scholars OS
- **Recorded:** 2026-07-30
- **Review date:** 2026-08-13
- **Decision status:** Temporary acceptance pending authorized approval
- **Scope:** Dependency findings remaining after the exact upgrade to Next.js 16.2.12

This document records a time-limited exception for known dependency findings. It does not represent approval until the accountable security and engineering owners review and authorize it.

## Remaining Audit Findings

The post-upgrade audit reports four high-severity package findings in the complete dependency tree and three in the production-only dependency tree.

| Package           | Installed version | Dependency path                       | Environment                   | Finding                                                                                            |
| ----------------- | ----------------- | ------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `postcss`         | `8.4.31`          | `next@16.2.12`                        | Production build path         | XSS and arbitrary file-disclosure risks when processing malicious CSS or source-map references     |
| `postcss`         | `8.5.16`          | `@tailwindcss/postcss@4.3.2`          | Development and build only    | Path traversal and arbitrary file-disclosure risks when processing malicious source-map references |
| `sharp`           | `0.34.5`          | Optional dependency of `next@16.2.12` | Production image optimization | Inherited libvips vulnerabilities; patched in Sharp 0.35.0                                         |
| `brace-expansion` | `1.1.15`, `5.0.7` | ESLint and TypeScript ESLint tooling  | Development only              | Denial-of-service risks from malicious or extreme glob expansion                                   |

The audit also lists `next@16.2.12` as affected indirectly because it introduces the vulnerable PostCSS and Sharp versions. The direct Next.js proxy, Server Action, SSRF, cache, and disclosure advisories affecting Next.js 16.2.10 were remediated by upgrading to 16.2.12.

## Why Immediate Remediation Is Not Currently Safe

Next.js 16.2.12 pins PostCSS 8.4.31 and declares Sharp `^0.34.5`. The patched Sharp release is 0.35.0, which is outside that declared range and is a semver-major change for a `0.x` package. Forcing it through an override could create unsupported image-processing behavior or platform-specific binary failures.

Forcing PostCSS 8.5.18 over Next.js's exact 8.4.31 dependency would also place the application outside the framework's tested dependency graph. Although both releases share major version 8, an override could affect CSS compilation, source-map handling, or production builds.

The `brace-expansion` findings are confined to local and CI development tooling. They do not appear in the production-only audit and do not justify broad upgrades or runtime dependency changes.

Automatic or forced audit remediation is not acceptable because npm currently proposes an incompatible Next.js downgrade as the available resolution for the transitive production findings. Broad upgrades, major-version changes, or unsupported overrides would carry greater immediate application-stability risk.

## Framework Dependency Constraints

- Keep `next` and `eslint-config-next` aligned at the same exact supported version.
- Do not downgrade Next.js to satisfy npm's proposed audit resolution.
- Do not force Sharp 0.35.0 until Next.js officially supports it or compatibility is independently validated.
- Do not override Next.js's pinned PostCSS version without a separate reviewed change and focused regression testing.
- Do not upgrade React, React DOM, Clerk, Supabase, Tailwind, TypeScript, OpenAI, or unrelated runtime packages as part of this exception.

## Interim Risk Controls

- Accept CSS, source maps, and build inputs only from trusted repository sources.
- Do not process untrusted user-supplied CSS during local, CI, or production builds.
- Restrict image-processing inputs to approved application assets and configured sources.
- Continue dependency auditing in CI and during every release review.
- Monitor the Next.js, PostCSS, Sharp, and npm advisory channels for compatible patched releases or changed exploit guidance.
- Treat any evidence of active exploitation or expanded exposure as an immediate release blocker.

## Planned Remediation Trigger

Remediation must be initiated when the earliest of the following occurs:

1. A stable Next.js patch officially updates PostCSS to 8.5.18 or later and supports Sharp 0.35.0 or later.
2. Next.js publishes an officially supported mitigation or dependency override for either finding.
3. A compatible parent-package patch resolves the development-only PostCSS or `brace-expansion` findings without a major upgrade.
4. New exploit evidence shows that current application inputs or deployment architecture expose these vulnerabilities.
5. The review date is reached, even if no compatible release is available.

The remediation change must rerun type checking, linting, the complete test suite, the production build, the full audit, the production-only audit, and focused image-optimization and CSS-build smoke tests.

## Approval

| Role              | Name    | Decision | Date    |
| ----------------- | ------- | -------- | ------- |
| Engineering owner | Pending | Pending  | Pending |
| Security owner    | Pending | Pending  | Pending |
| Release owner     | Pending | Pending  | Pending |

Approval is time-limited through the review date and must be renewed, revised, or closed after reassessment.
