# Authorization Rehearsal Matrix

Run only with synthetic identities and isolated database credentials. A source
contract or local test is not evidence of Preview, Staging, or Production.

| Scenario                                          | Source contract         | Local database | Preview               | Staging  | Production   |
| ------------------------------------------------- | ----------------------- | -------------- | --------------------- | -------- | ------------ |
| Administrator authorized operations               | Tested                  | NOT VERIFIED   | Preview E2E certified | REQUIRED | NOT VERIFIED |
| Assigned advisor workspace/matching               | Tested                  | NOT VERIFIED   | Preview E2E certified | REQUIRED | NOT VERIFIED |
| Unassigned advisor denied                         | Tested                  | NOT VERIFIED   | REQUIRED              | REQUIRED | NOT VERIFIED |
| Student self-access only                          | Tested                  | NOT VERIFIED   | REQUIRED              | REQUIRED | NOT VERIFIED |
| Cross-organization/cross-student denial           | Tested                  | NOT VERIFIED   | REQUIRED              | REQUIRED | NOT VERIFIED |
| Inaccessible student URL/state denial             | Tested                  | NOT VERIFIED   | REQUIRED              | REQUIRED | NOT VERIFIED |
| Matching API authorization                        | Tested                  | NOT VERIFIED   | REQUIRED              | REQUIRED | NOT VERIFIED |
| Application creation/hierarchy/intake validation  | Tested                  | NOT VERIFIED   | Preview E2E certified | REQUIRED | NOT VERIFIED |
| Direct database RLS truth table                   | Migration/test contract | REQUIRED       | REQUIRED              | REQUIRED | NOT VERIFIED |
| SECURITY DEFINER anonymous denial and search path | Migration/test contract | REQUIRED       | REQUIRED              | REQUIRED | NOT VERIFIED |

For Staging, test anonymous, student A, student B, assigned advisor, unassigned
advisor, cross-organization advisor/student, and administrator identities. Record
only pass/fail, HTTP/SQL status, correlation IDs, and redacted evidence. Any
unexpected row, mutation, or privileged function execution is an immediate FAIL.
