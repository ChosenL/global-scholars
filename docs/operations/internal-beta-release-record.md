# Internal-beta release record

## Last certified release

- Commit: `1c7d5fc7dbc74acb1098ac3236a5d6518445d74a`
- Preview: `https://global-scholars-jr7ox2ify-thompsons.vercel.app`
- Environment: Preview/internal beta only
- Migration state: classification-evidence migration applied; no H3/H4 database
  migration is required
- Catalog publication checksum:
  `b6acae89d2985f33a7c78b158449f79a8494a0cb6deb1a8753830f1db49bc5f7`
- U.S. discoverable institutions: 2,514
- Application-ready institutions/programs: 47/47
- Selectable intakes: 5 (3 exact, 2 term-only)
- Governed scholarships: 6
- Canada: 927 institutions, 1,238 campuses, zero search exposure
- Application tests: 145/145
- Data tests: 26/26
- Database authorization: 9/9
- Playwright: 5/5
- Duplicate identities/broken foreign keys: 0/0

## H3/H4 candidate status

The source-factory implementation and operator package are not a certified new
release until the required 100-institution network pilot, full validation, commit,
new Preview deployment, and canonical Playwright run complete. The attempted
pilot was blocked by the external execution usage limit on 2026-08-09. Do not
substitute the working tree for the last certified release above.

## Known limitations

- 2,467 discoverable U.S. institutions lack current official program evidence.
- Only five program/intake combinations have selectable intake evidence.
- Matching is deterministic decision support, not admission prediction.
- Scholarship coverage is limited to six governed records.
- Canada is retained as a foundation and remains hidden from discovery.

## Recovery

No Production deployment or database migration is part of H3/H4. If a future
candidate Preview fails, keep the last certified Preview active, stop beta use of
the candidate URL, preserve request/correlation IDs without PII, and revert only
the candidate commit through the normal reviewed Git workflow. Catalog publication
remains transactional and checkpointed; verify reconciliation before reuse.
