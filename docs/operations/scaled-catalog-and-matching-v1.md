# Scaled catalog and deterministic matching V1

## Sources and evidence boundaries

- U.S. institution identity comes from the immutable, checksum-verified IPEDS 2024 HD and IC archives. Run `node data-import/scripts/cli.mjs normalize --source us_ipeds --limit all`; omitting `--limit all` deliberately retains the 50-record pilot behavior.
- Canadian institution and campus identity comes from the immutable acquisition snapshot of the Government of Canada IRCC designated learning institution list. DLI designation supports international-student designation, but does not prove degree level, direct institutional admissions, a current program, or an institution's official website. Those fields remain unknown, the records remain outside normal selector search, and the authoritative listing URL is retained in provenance.
- The U.S. official-catalog source remains the only application-ready program enrichment. Historical completion/CIP data was audited but is not published as a current admissions program in this version.

Unknown classifications remain active foundation records but are not search eligible. The certified 47 U.S. institutions remain the only U.S. search-eligible set until stronger classification and admissions evidence is added.

## Local scale lifecycle

1. Acquire the enabled sources with `npm run data:acquire`.
2. Normalize all U.S. records with `node data-import/scripts/cli.mjs normalize --source us_ipeds --limit all`.
3. Normalize the dependent official catalog and Canada source with `npm run data:normalize`.
4. Run `npm run data:validate`, `npm run data:plan`, and `npm run data:test`.
5. Simulate bounded publication with `npm run data:publish:scale -- --dry-run --source us_official_catalog` and repeat for `ca_ircc_dli`.
6. After applying the additive DLI metadata migration to Preview, remove `--dry-run`. Each 250-institution batch is one transaction. A failure rolls back only that batch; the checkpoint resumes at its next unpublished batch.
7. Repeat both publication commands from the beginning. Every canonical row must resolve unchanged and no duplicate identity may appear.
8. Run `npm run data:verify-preview` for global counts, foreign keys, DLI identities, search-eligibility exposure, and publication checksums.

Snapshots are immutable; rerunning acquisition verifies the stored checksum. Manifests and canonical IDs make reruns deterministic. Validation failures remain outside publication, and previously committed batches are not disturbed by a later batch failure.

## Matching contract

The pure matching service is documented in `docs/deterministic-student-matching-v1.md`. It consumes only existing student profile facts and certified catalog evidence. Compatibility uses known evidence; evidence completeness is reported separately. Unknown evidence neither excludes nor receives a mismatch penalty.

## Expected local performance

On the certification workstation, normalization of 2,825 supported U.S. institutions (5,651 country/university/campus records) took about 2.5 seconds. Publication is split into 12 U.S. batches and 4 Canada batches at the default size of 250 institutions. Database and network latency determine Preview runtime; checkpoint files make interruption safe.
