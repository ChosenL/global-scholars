# U.S. classification and matching API V1

## Classification audit

The previous unknown count was caused by the mapping default, not missing IPEDS evidence. The adapter already restricts the supported U.S. foundation to records where `CYACTIVE=1`, `POSTSEC=1`, `DEGGRANT=1`, and `ICLEVEL=1`. It now applies these explicit rules:

- `ipeds-2024-active-four-year-degree-granting`: active four-year degree-granting institution.
- Explicit certified overrides remain authoritative for system/administrative offices, branches/campuses, and specialized entities.
- Search eligibility is evaluated separately. An active non-administrative record needs an institution-reported `APPLURL`, or the existing certified institutional evidence, before it is visible.
- `APPLURL` decisions are labeled `inferred_from_authoritative_structure`; they do not claim that a particular program, intake, deadline, or international pathway is available.

Every canonical university carries the rule, rule version, source fields used, and visibility-evidence state. These fields are published into `crm.universities` so a UUID can be explained without consulting an unversioned spreadsheet.

## Program-source audit

IPEDS completions/CIP data can show historical instructional activity, but cannot establish a currently advertised admissions program. DAPIP accreditation data can support institution/accreditation identity, but does not establish current program advertising or availability. Neither was promoted to application-ready program evidence.

The controlled official-catalog cohort therefore remains at 47 institutions and 47 programs in this release. Expanding toward 250 requires a separately acquired, immutable set of official catalog/program URLs with the existing evidence contract. Intake absence remains unknown and does not block publishing an otherwise verified program.

## Matching API

`GET /api/matching?studentProfileId=<crm UUID>` uses the existing Clerk-authenticated Supabase client. It reads `crm.student_profiles` through the existing `student_profiles_select_authorized` RLS policy, which delegates to `crm.can_access_student`. That preserves self, administrator, assigned-advisor/conversation, and organization-isolation behavior without a parallel role model.

Candidate generation begins with active application-ready programs, restricts their institutions to active/search-eligible records, and loads only related open intakes and governed scholarships. The deterministic engine applies known hard conflicts, ranks soft evidence, and returns compatibility separately from evidence completeness.

The advisor student workspace contains the minimal `Find Matches` seam. It loads only on request and handles loading, insufficient evidence, incomplete catalog evidence, results, and service errors. It never uses admissions-probability language.

## Performance

The prior publication profile is dominated by per-record PostgreSQL natural-key resolution and action recording, not normalization or batch setup. A bulk-resolution rewrite was deferred because it would materially change the certified transaction/reconciliation path. Batching, checkpoint recovery, and deterministic reruns remain the safe controls for this release.
