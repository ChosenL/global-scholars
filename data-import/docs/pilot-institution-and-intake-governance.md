# Pilot institution and intake governance

## Institution classification

IPEDS supplies the stable pilot identity. Every source entity is retained and classified as a degree-granting institution, system/administrative office, branch/campus, specialized entity, or unknown. Search eligibility is an explicit catalog decision and is never inferred from the institution name at query time. A record is selectable only when it is active, accepts direct applications, and is search eligible. System offices remain in the catalog for provenance but are not selectable.

The mapping defaults to degree-granting only because the IPEDS pilot acquisition already requires `DEGGRANT=1`; authoritative exceptions are maintained by UNITID in `institution-classifications.json`. Unknown future exceptions must use `classification_unknown` and remain search-ineligible until reviewed.

## Intake evidence and freshness

An open intake requires an authoritative admissions/application URL plus authoritative term or exact-date evidence. Exact precision requires a source-backed date; term precision forbids a fabricated date. Deadline evidence is retained separately when a deadline is published.

Each published intake records `lastVerifiedAt`. Open status is reviewed before each curated release and whenever its authoritative deadline passes or its source explicitly closes/cancels the term. The pipeline does not expire an intake solely because a fixed number of days elapsed: a stale verification instead triggers review against the authoritative status/deadline evidence. Missing, contradictory, or historically worded evidence remains quarantined.

## Pilot coverage

Coverage is reported against both all 50 raw IPEDS entities and the search-eligible denominator. Administrative offices never improve or reduce the eligible coverage denominator, and no program or intake is manufactured to increase coverage.
