# Global Scholars internal-beta operator runbook

## Scope

Use only the certified Preview deployment listed in the release record. Approved
users are Global Scholars administrators and advisors who have been assigned to
the relevant student through the existing CRM access model. Preview is an
internal working environment, not a public admissions service.

Beta records may contain real student information. Enter only information needed
for advising, do not copy it into defect reports, and never use screenshots that
contain passports, contact details, test scores, or other sensitive fields.

## Start a beta session

1. Open the certified Preview URL from the release record and sign in with the
   approved admin/advisor account.
2. Confirm the dashboard identifies the expected advisor context.
3. Open **Assigned Students** and select only a student you are authorized to
   advise. If the student is absent, stop and ask an administrator to review the
   assignment; do not request or paste a UUID.
4. Review the student profile. Destination, preferred degree, preferred program,
   intended intake, education, GPA, budget/currency, and English-test evidence can
   improve the explanation. Missing fields are allowed and remain unknown.

## Find and interpret matches

Select **Find Matches** in the Student Workspace.

- **Compatibility** compares known student preferences with known catalog facts.
  It is not an admission probability.
- **Evidence completeness** describes how many relevant facts Global Scholars can
  currently verify.
- **Why** lists aligned known facts.
- **Unknown / verify** lists missing profile or catalog evidence. Unknown is not a
  negative finding.
- **Known blockers** lists direct conflicts in known facts, such as destination or
  degree mismatch.
- “No verified selectable intake” means no selectable intake is currently proven
  in Global Scholars. It does not mean the institution has no intake.
- “No confirmed international scholarship evidence” means Global Scholars has no
  governed positive evidence. It does not mean no scholarship exists.

Never promise admission, describe a result as a safe school, quote an acceptance
chance, or imply that missing evidence proves ineligibility.

## Start an application

For a viable program, select **Start Application**. Confirm that the student,
university, and program were preselected. Select an available verified intake and
advisor, then create the application through the existing form. The matching
action never creates an application automatically.

Some discoverable universities have no selectable program because institution
discovery and current program verification are separate evidence layers. Some
verified programs have no selectable intake because a program catalog does not
prove that applications are open.

## Record beta feedback

Use the owner-designated internal beta log. Record:

- release commit and Preview URL;
- date/time and operator role;
- workflow step;
- expected and actual behavior;
- request/correlation ID shown in the response headers when available;
- severity and whether the problem blocks the session.

Do not include student names, UUIDs, profile contents, credentials, screenshots
with personal data, or database error details. For an authorization concern,
unexpected student visibility, or suspected data exposure, stop immediately and
notify the owner through the established internal escalation channel.

## End a beta session

Confirm deliberately created applications are correctly assigned and labeled.
Archive disposable manual records where appropriate. Automated certification
fixtures clean themselves up; operators must not reuse the `e2e-preview-*`
namespace or manually edit those fixtures.
