# Deterministic student matching V1

## Existing student capability map

The existing `crm.student_profiles` model already provides nationality, current country, highest qualification, prior institution, GPA, graduation year, English test type/score, preferred destination country, preferred degree, preferred program, intended intake, budget, and budget currency. No profile migration is required for V1.

Current catalog evidence does not support deterministic evaluation of admission probability, tuition fit, GPA thresholds, English-score thresholds, or detailed nationality restrictions. Those dimensions remain unknown and are not negative signals.

## Evidence logic

Every evaluated dimension is `match`, `mismatch`, or `unknown`. Country and degree are hard constraints only when both student and catalog evidence are known. Field alignment, verified intake availability, and governed scholarship evidence are soft signals. Missing intake or scholarship records mean only that Global Scholars has no verified evidence.

Compatibility is the percentage of evaluated weighted evidence that aligns: destination and degree are weighted 30 each, field 20, intake 10, and scholarship 10. Unknown dimensions are omitted from compatibility rather than penalized. Evidence completeness separately reports the percentage of the five dimensions that are known. Results use decision-support language and never claim admission probability or guaranteed acceptance.

Stable ordering is: non-excluded before excluded, compatibility, evidence completeness, institution name, program name, and deterministic identifier.

## UI decision

V1 remains an independently testable domain/service contract. The current advisor dashboard does not provide a clean, authorized student-selection and catalog-result seam without broader dashboard work, so the matching UI is deferred.
