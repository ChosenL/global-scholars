# Application-ready programs and internal-beta certification

## Evidence layers

The catalog keeps three independent readiness layers:

1. Institution discovery may use `confirmed` or the approved
   `inferred_from_authoritative_structure` IPEDS evidence.
2. Application-ready programs require a current official institutional catalog,
   program directory, degree page, or admissions program listing.
3. Selectable intakes require authoritative current admissions evidence. A
   calendar or customary Fall/Spring schedule is not evidence that applications
   are open.

IPEDS completion/CIP data remains useful discovery evidence, but it describes
reported program awards and has a release lag. DAPIP describes accreditation and
explicitly does not guarantee that reported information is current or complete.
Neither source is promoted to current application-ready program evidence.

## Controlled acquisition

`us_official_catalog@2.0.0` processes the curated official-source batch in a
deterministic order. Acquisition creates one source-registry entry per program
with the IPEDS UNITID, official URL, source type/version, retrieval and
last-verified timestamps, evidence checksum, adapter version, status, and attempt
count. Normalized program, faculty, campus relationship, and intake records carry
the registered evidence checksum rather than only the enclosing dataset checksum.

Publication is blocked when a program lacks a registry entry, a source is not
HTTPS, a checksum is malformed, or acquisition status is not `verified`.
Ambiguous variants are not fuzzy-merged. Majors, concentrations, tracks,
certificates, online variants, and campus variants must have distinct official
identifiers or remain quarantined.

New batches should be assembled outside the publisher, restricted to official
institutional domains, and merged only after deterministic parsing and review.
Transient acquisition failures may be retried by the acquisition runner; an
unsupported layout or ambiguous identity must be recorded as failed/quarantined,
not converted into a program. Checkpoints and the transactional publisher remain
the publication/resume boundary.

The H1 audit retained the certified 47-institution/47-program cohort. No national
source located during the audit establishes current advertised program identity
and availability at 250 institutions. Increasing the count from historical CIP
or accreditation records would collapse discovery into application readiness and
was therefore rejected.

## Advisor internal-beta journey

An authorized advisor opens a student workspace and requests deterministic
matches. Compatibility, evidence completeness, unknown facts, and known blockers
are shown separately. “No verified intake” and “no confirmed international
scholarship evidence” describe Global Scholars evidence only; they are not claims
that the institution offers none.

For a viable program, **Start Application** opens the existing application modal
with student, institution, and program preselected. It never creates a record.
The advisor must select a verified intake and submit through the existing
application service and authorization boundary.

Database-backed pgTAP coverage executes as the `authenticated` role with Clerk
JWT subjects. It proves authorized advisor and administrator access, isolated and
missing-student nondisclosure, and direct-table RLS enforcement through
`crm.can_access_student`.

Matching and application failures use the existing request-context error reporter.
Only request/correlation identifiers, route, status, actor identity, and redacted
error metadata are logged. Full student profiles, preferences, secrets, and
credentials are not logged.
