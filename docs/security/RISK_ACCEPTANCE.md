# Dependency Vulnerability Risk Acceptance

## Record Status

- **System:** Global Scholars OS
- **Candidate:** `b249e635dc0c86b3736aa93361fb11468f1f269a`
- **Assessment date:** 2026-10-04
- **Decision status:** APPROVAL PENDING
- **Scope:** Remaining full-tree development dependency finding after upgrading
  Next.js to `16.3.8`

The previous temporary acceptance for `next@16.2.12`, PostCSS, Sharp, and
`baseline-browser-mapping` is obsolete. Production-only audit now reports zero
known vulnerabilities after the Next.js upgrade and targeted transitive
overrides.

## Remediated Findings

| Package                    | Previous exposure                                                                                                                | Remediation                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `next`                     | Critical advisories through `16.3.5`, including Windows-hosted RCE, AVIF image optimization RCE, and `next/og` ImageResponse RCE | Upgraded to `16.3.8`                                           |
| `postcss`                  | Vulnerable versions from Next.js and build tooling                                                                               | Resolved by `next@16.3.8` and patched transitive resolution    |
| `sharp`                    | Vulnerable optional image optimization dependency                                                                                | Resolved by `next@16.3.8` dependency graph                     |
| `baseline-browser-mapping` | Moderate development/build finding                                                                                               | Overridden to `2.11.27`                                        |
| `brace-expansion`          | High development-tooling DoS findings                                                                                            | Overridden to `1.1.21` and `5.0.12` on the two minimatch lines |
| `browserslist`             | High development-tooling findings                                                                                                | Overridden to `4.29.3`                                         |
| `js-yaml`                  | High development-tooling findings                                                                                                | Overridden to `4.3.2`                                          |

## Remaining Audit Finding

| Field                  | Record                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Package                | `braces`                                                                                                                                                                                                                       |
| Advisory               | GHSA-vfj7-8cjw-p6xm / CVE-2026-93687                                                                                                                                                                                           |
| Severity               | High                                                                                                                                                                                                                           |
| Installed version      | `3.0.3`                                                                                                                                                                                                                        |
| Affected version range | `<= 3.0.3`                                                                                                                                                                                                                     |
| Fixed version          | None published as of 2026-10-04                                                                                                                                                                                                |
| Dependency path        | `eslint-config-next@16.3.8` -> `@next/eslint-plugin-next@16.3.8` -> `fast-glob@3.3.1` -> `micromatch@4.0.8` -> `braces@3.0.3`                                                                                                  |
| Runtime exposure       | Development/CI lint tooling only; production-only audit is clean                                                                                                                                                               |
| Why it remains         | npm has no patched `braces` release. `npm audit fix --force` proposes downgrading `eslint-config-next` to `14.2.35`, which is incompatible with the selected Next.js `16.3.8` line and would weaken framework alignment.       |
| Mitigation             | Do not run lint/glob tooling on attacker-supplied patterns or untrusted repositories; keep CI isolated; keep dependency review/audit enabled; upgrade immediately when a patched `braces` or compatible parent release exists. |
| Owner                  | Security owner and Engineering owner                                                                                                                                                                                           |
| Remediation deadline   | 2026-10-18, or sooner if a patched release is published                                                                                                                                                                        |
| Approval status        | APPROVAL PENDING                                                                                                                                                                                                               |

## Approval

Do not treat this record as approved. A named security owner and engineering
owner must review the residual development-only risk, accept or reject the
temporary exception, and set the final remediation owner/date.

| Role              | Name    | Decision | Date    |
| ----------------- | ------- | -------- | ------- |
| Engineering owner | Pending | Pending  | Pending |
| Security owner    | Pending | Pending  | Pending |
| Release owner     | Pending | Pending  | Pending |
