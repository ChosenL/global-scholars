import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PlatformServiceError } from "@/lib/crm/platformErrors";
import { requireCrmUuid } from "@/lib/crm/validation";

import {
  rankCandidates,
  type DeterministicMatchResult,
  type MatchCatalogCandidate,
  type MatchStudentFacts,
} from "./deterministicMatching";

export interface StudentMatchingResponse {
  studentProfileId: string;
  status: "results" | "insufficient_evidence" | "no_catalog_evidence";
  message: string;
  results: DeterministicMatchResult[];
}

interface StudentRow {
  profile_id: string;
  nationality: string | null;
  preferred_destination_country: string | null;
  preferred_degree: string | null;
  preferred_program: string | null;
  intended_intake: string | null;
  budget: number | null;
  budget_currency: string | null;
}

export async function findStudentMatches(
  supabase: SupabaseClient,
  studentProfileId: string,
): Promise<StudentMatchingResponse> {
  const profileId = requireCrmUuid(studentProfileId, "Student profile");
  const crm = supabase.schema("crm");
  const { data: student, error: studentError } = await crm
    .from("student_profiles")
    .select(
      "profile_id,nationality,preferred_destination_country,preferred_degree,preferred_program,intended_intake,budget,budget_currency",
    )
    .eq("profile_id", profileId)
    .is("deleted_at", null)
    .maybeSingle();
  if (studentError) throw studentError;
  if (!student)
    throw new PlatformServiceError(
      "NOT_FOUND",
      "Student profile was not found or is not accessible.",
    );

  const facts: MatchStudentFacts = {
    nationality: (student as StudentRow).nationality,
    preferredDestinationCountry: (student as StudentRow)
      .preferred_destination_country,
    preferredDegree: (student as StudentRow).preferred_degree,
    preferredProgram: (student as StudentRow).preferred_program,
    intendedIntake: (student as StudentRow).intended_intake,
    budget: (student as StudentRow).budget,
    budgetCurrency: (student as StudentRow).budget_currency,
  };
  if (
    !facts.preferredDestinationCountry &&
    !facts.preferredDegree &&
    !facts.preferredProgram
  )
    return {
      studentProfileId: profileId,
      status: "insufficient_evidence",
      message:
        "This student profile needs a destination, degree, or program preference before strong matches can be produced.",
      results: [],
    };

  const { data: programRows, error: programError } = await crm
    .from("programs")
    .select("id,university_id,name,credential_level")
    .eq("is_active", true)
    .order("id")
    .limit(1_000);
  if (programError) throw programError;
  if (!programRows?.length)
    return {
      studentProfileId: profileId,
      status: "no_catalog_evidence",
      message:
        "Global Scholars has institutions for this search, but not enough verified program evidence yet.",
      results: [],
    };
  const programUniversityIds = [
    ...new Set(programRows.map(({ university_id }) => university_id)),
  ];

  const [
    { data: countries, error: countryError },
    { data: universities, error: universityError },
  ] = await Promise.all([
    crm.from("countries").select("id,iso_code").eq("is_active", true),
    crm
      .from("universities")
      .select("id,name,country_id")
      .in("id", programUniversityIds)
      .eq("is_active", true)
      .eq("search_eligible", true)
      .order("id"),
  ]);
  if (countryError) throw countryError;
  if (universityError) throw universityError;
  const universityIds = (universities ?? []).map(({ id }) => id);
  const eligibleUniversityIds = new Set(universityIds);
  const programs = programRows.filter(({ university_id }) =>
    eligibleUniversityIds.has(university_id),
  );
  if (!programs.length)
    return {
      studentProfileId: profileId,
      status: "no_catalog_evidence",
      message:
        "Global Scholars does not yet have enough verified catalog evidence to produce strong matches.",
      results: [],
    };

  const programIds = programs.map(({ id }) => id);
  const [
    { data: intakes, error: intakeError },
    { data: scholarships, error: scholarshipError },
  ] = await Promise.all([
    crm
      .from("intakes")
      .select("id,program_id,name")
      .in("program_id", programIds)
      .eq("status", "open"),
    crm
      .from("scholarships")
      .select("id,university_id,name,international_eligibility")
      .in("university_id", universityIds)
      .eq("is_active", true),
  ]);
  if (intakeError) throw intakeError;
  if (scholarshipError) throw scholarshipError;

  const universityById = new Map(
    (universities ?? []).map((row) => [row.id, row]),
  );
  const countryById = new Map(
    (countries ?? []).map((row) => [row.id, row.iso_code]),
  );
  const candidates: MatchCatalogCandidate[] = programs.map((program) => {
    const university = universityById.get(program.university_id)!;
    return {
      institutionId: university.id,
      institutionName: university.name,
      countryCode: countryById.get(university.country_id) ?? null,
      programId: program.id,
      programName: program.name,
      credentialLevel: program.credential_level,
      selectableIntakes: (intakes ?? [])
        .filter(({ program_id }) => program_id === program.id)
        .map(({ id, name }) => ({ id, name })),
      scholarships: (scholarships ?? [])
        .filter(({ university_id }) => university_id === university.id)
        .map(({ id, name, international_eligibility }) => ({
          id,
          name,
          internationalEligibility: international_eligibility as
            "confirmed_eligible" | "confirmed_ineligible" | "unspecified",
        })),
    };
  });
  const ranked = rankCandidates(facts, candidates);
  const viable = ranked.filter(({ excluded }) => !excluded);
  const results = (viable.length ? viable : ranked).slice(0, 50);
  return {
    studentProfileId: profileId,
    status: "results",
    message: viable.length
      ? "Matches are based on verified catalog evidence and require advisor review."
      : "No exact alignment was found; known mismatches are shown for review.",
    results,
  };
}
