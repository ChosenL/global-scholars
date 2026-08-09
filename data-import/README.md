# Admissions catalog import framework

## Official program and intake enrichment

`us_official_catalog` layers source-traceable facts onto the certified 50-school IPEDS pilot. Its dated evidence file contains facts supported by linked official catalogs, admissions pages, and calendars. Run the CLI `acquire`, `normalize`, `validate`, `plan`, and `publish` stages with `--source us_official_catalog`. Publication preserves country → university → campus → faculty → program → program-campus → intake order.

An intake is `open` only when an official admissions page supports current application availability and an official calendar supplies an exact start date. Term-only and not-yet-open candidates are retained as evidence quarantine entries and never normalized. Refresh by adding a newly dated evidence file, updating the release, rechecking every official link, then running the complete pipeline. Every normalized fact carries its source identifier/URL, retrieval time, evidence checksum, release, and mapping version.

Term-only intakes use `startDatePrecision: "term"` with `startDate: null`; exact intakes use `"exact"` with an authoritative date. Rollback of the additive database migration requires first removing or closing every term-only row, then restoring `start_date NOT NULL`, the original exact-date unique constraint, and dropping the precision column and partial indexes. Never coerce term-only rows to placeholder dates during recovery.

This directory contains the source-adapter ETL framework for publishing public
university information into the existing normalized `crm` admissions catalog.
It does not connect to Supabase, write to a database, or contain real source data.

## Repository policy

Committed: source templates, mapping policy, canonical JSON Schemas, scripts,
validation rules, tests, small synthetic fixtures, and placeholder files.

Ignored: raw datasets, normalized run outputs, runtime manifests, validation
reports, quarantine records, checkpoints, and logs. Production implementations
must put those artifacts in access-controlled, immutable, versioned object
storage. Never place credentials, tokens, connection strings, headers, cookies,
or student/application information in an import artifact.

## Lifecycle

`acquire -> normalize -> validate -> plan -> publish -> reconcile`

Every run uses immutable source snapshots and explicit source, adapter, mapping,
pipeline, Git, and target-environment versions. A stage checkpoint is reusable
only with the same inputs and versions. `resume` continues incomplete stages;
it must never silently acquire a newer "latest" source.

The IPEDS adapter implements acquisition, normalization, validation, planning,
transactional preview publication, and reconciliation for a deterministic
50-institution pilot. Production publication remains disabled.

## IPEDS pilot and full-dataset replacement

The pinned 2024 pilot uses the official NCES `HD2024` directory and `IC2024`
institutional-characteristics archives. Run `npm run data:acquire` once, followed
by `npm run data:normalize`, `npm run data:validate`, and `npm run data:plan`.
Artifacts are written only to ignored directories under this framework.

The pilot selects the first 50 active, postsecondary, degree-granting, four-year
institutions by numeric `UNITID`. To process the complete matching population,
invoke normalize with `--limit all` after capacity review, then run validation
and planning normally. To replace the
release, update both pinned artifact URLs, release version, and independently
verified SHA-256 values in the IPEDS source configuration. Never mix survey years.

Expected pilot runtime is under one minute after acquisition and normally one to
three minutes including download, subject to NCES/network speed. A full directory
run should take a few minutes locally; publication/database time is not included.

Validation expects exact checksums, complete source metadata, unique `UNITID`,
valid canonical fields, deterministic hashes, resolvable country/campus links,
and a zero-error report. Warnings require review before publication approval.
The generated plan is an offline proposal. `npm run data:publish -- --dry-run`
resolves the same deterministic dependency order without database writes. An
approved preview publication requires `SUPABASE_DB_URL` and runs country,
university, and campus resolution plus inserts/updates in one transaction.

## Publication lifecycle and guarantees

Publication requires normalized records and a successful matching validation
report. The publisher resolves existing rows by the catalog's unique natural
keys, assigns deterministic IDs only to new rows, and records every insert,
update, unchanged, or skipped action. Re-running a completed or interrupted run
is resumable and idempotent because the same identities resolve to the same rows.

Any operation or post-write verification failure rolls back the entire database
transaction. Reports are written locally only after the transaction succeeds.
Dry runs use the same ordered publisher and generate stable reports while leaving
the database untouched. Publication, reconciliation, and summary reports include
the run and manifest identities, Git and pipeline versions, source release,
timestamp, counts, action diff, and report checksum.

Reconciliation verifies run-scoped row counts, country/university and
university/campus foreign keys, and canonical-to-catalog identity resolution.
Future entity types remain ordered and are explicitly skipped until their
publishers are enabled.

## Source precedence

1. Official institutional catalog, admissions, calendar, or scholarship page.
2. Current government regulator or eligibility directory.
3. Current government bulk program dataset.
4. Prior government releases.

Official institutional sources override bulk discovery sources for current
admissions facts. Fuzzy matching must never automatically resolve identity.

## Publication dependency order

Countries, universities, campuses, faculties, programs, program-campus links,
intakes, scholarships, then reconciliation. `program-campus` is mandatory before
an intake because the existing catalog enforces that relationship.

## Adding a country adapter

1. Add source templates under `config/sources/<iso-code>/`.
2. Implement an adapter under `scripts/adapters/` that emits canonical records.
3. Add explicit country, institution-type, and credential mappings.
4. Add frozen synthetic fixtures and contract tests.
5. Validate deterministic source IDs, record hashes, and relationship ordering.
6. Document licensing and source precedence before enabling acquisition.

Adapters may discover candidates from bulk data, but ambiguous identities must be
quarantined for review. Disappearance from one release must not cause automatic
deletion or deactivation.
