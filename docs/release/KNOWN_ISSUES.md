# Known Issues

Candidate: `b249e635dc0c86b3736aa93361fb11468f1f269a`

## Critical

- Production `OPENAI_SAFETY_SALT` is missing in Vercel environment metadata.
- Production `OPERATIONS_HASH_SALT` is missing in Vercel environment metadata.
- Environment isolation between Development, Preview, and Production is not
  evidenced by distinct provider fingerprints.
- Production migration state, isolated restore rehearsal, and direct RLS truth
  table are not fully evidenced.

## High

- Full dependency audit retains GHSA-vfj7-8cjw-p6xm for `braces@3.0.3` through
  development-only lint tooling; no patched `braces` release is available.
- Monitoring, alerting, budget/cost controls, rollback rehearsal, and named
  ownership remain NOT VERIFIED.
- Isolated Staging acceptance and failure injection are not certified.
- Supply-chain workflow controls are present, but protected-branch enforcement,
  artifact provenance, and manual repository settings remain NOT VERIFIED.

## Medium

- Release and rollback checklists are templates until executed with durable
  evidence.
- Catalog broad publication remains out of scope; the controlled cohort boundary
  must be preserved.
