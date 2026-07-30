import type { OrganizationAdvisor, OrganizationStudent } from "./types";

const CRM_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCrmProfileId(value: string): boolean {
  return CRM_UUID_PATTERN.test(value.trim());
}

export function hasActiveAdvisorAssignment(
  assignments: OrganizationAdvisor[],
  profileId: string,
): boolean {
  const normalized = profileId.trim().toLowerCase();
  return assignments.some(
    (assignment) =>
      assignment.ends_at === null &&
      assignment.advisor_profile_id.toLowerCase() === normalized,
  );
}

export function hasActiveStudentAssignment(
  assignments: OrganizationStudent[],
  profileId: string,
): boolean {
  const normalized = profileId.trim().toLowerCase();
  return assignments.some(
    (assignment) =>
      assignment.status === "active" &&
      assignment.student_profile_id.toLowerCase() === normalized,
  );
}
