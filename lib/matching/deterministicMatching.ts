export type EvidenceState = "match" | "mismatch" | "unknown";
export type MatchLabel =
  | "strong_alignment"
  | "potential_match"
  | "limited_evidence"
  | "known_mismatch";

export interface MatchStudentFacts {
  preferredDestinationCountry?: string | null;
  preferredDegree?: string | null;
  preferredProgram?: string | null;
  intendedIntake?: string | null;
  nationality?: string | null;
  budget?: number | null;
  budgetCurrency?: string | null;
}

export interface MatchCatalogCandidate {
  institutionId: string;
  institutionName: string;
  countryCode?: string | null;
  programId?: string | null;
  programName?: string | null;
  credentialLevel?: string | null;
  selectableIntakes?: Array<{ id: string; name: string }>;
  scholarships?: Array<{
    id: string;
    name: string;
    internationalEligibility:
      "confirmed_eligible" | "confirmed_ineligible" | "unspecified";
  }>;
}

export interface EvidenceReason {
  dimension: "country" | "degree" | "field" | "intake" | "scholarship";
  state: EvidenceState;
  explanation: string;
  hardConstraint: boolean;
}

export interface DeterministicMatchResult {
  institutionId: string;
  institutionName: string;
  programId: string | null;
  programName: string | null;
  label: MatchLabel;
  excluded: boolean;
  compatibility: number | null;
  evidenceCompleteness: number;
  reasons: EvidenceReason[];
  unknowns: string[];
  potentialBlockers: string[];
  intakeEvidence: string;
  scholarshipEvidence: string;
}

const normalize = (value?: string | null) =>
  value
    ?.trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim() || null;

const degreeAliases: Record<string, string> = {
  bachelors: "bachelor",
  "bachelor s": "bachelor",
  bachelor: "bachelor",
  bs: "bachelor",
  ba: "bachelor",
  masters: "master",
  "master s": "master",
  master: "master",
  ms: "master",
  ma: "master",
  doctorate: "doctorate",
  doctoral: "doctorate",
  phd: "doctorate",
  associate: "associate",
  associates: "associate",
  certificate: "certificate",
};

function comparableDegree(value?: string | null) {
  const key = normalize(value);
  return key ? (degreeAliases[key] ?? key.replaceAll(" ", "_")) : null;
}

function words(value?: string | null) {
  return new Set(
    (normalize(value) ?? "").split(" ").filter((word) => word.length > 2),
  );
}

function fieldState(
  preference?: string | null,
  program?: string | null,
): EvidenceState {
  const wanted = words(preference);
  const offered = words(program);
  if (!wanted.size || !offered.size) return "unknown";
  return [...wanted].some((word) => offered.has(word)) ? "match" : "mismatch";
}

function scholarshipState(candidate: MatchCatalogCandidate): EvidenceState {
  const evidence = candidate.scholarships ?? [];
  if (
    evidence.some(
      (item) => item.internationalEligibility === "confirmed_eligible",
    )
  )
    return "match";
  if (
    evidence.length > 0 &&
    evidence.every(
      (item) => item.internationalEligibility === "confirmed_ineligible",
    )
  )
    return "mismatch";
  return "unknown";
}

function label(
  excluded: boolean,
  compatibility: number | null,
  completeness: number,
): MatchLabel {
  if (excluded) return "known_mismatch";
  if (completeness < 40) return "limited_evidence";
  if ((compatibility ?? 0) >= 75) return "strong_alignment";
  return "potential_match";
}

export function evaluateCandidate(
  student: MatchStudentFacts,
  candidate: MatchCatalogCandidate,
): DeterministicMatchResult {
  const countryWanted = normalize(student.preferredDestinationCountry);
  const countryOffered = normalize(candidate.countryCode);
  const country: EvidenceState =
    !countryWanted || !countryOffered
      ? "unknown"
      : countryWanted === countryOffered
        ? "match"
        : "mismatch";
  const degreeWanted = comparableDegree(student.preferredDegree);
  const degreeOffered = comparableDegree(candidate.credentialLevel);
  const degree: EvidenceState =
    !degreeWanted || !degreeOffered
      ? "unknown"
      : degreeWanted === degreeOffered
        ? "match"
        : "mismatch";
  const field = fieldState(student.preferredProgram, candidate.programName);
  const intake: EvidenceState =
    (candidate.selectableIntakes?.length ?? 0) > 0 ? "match" : "unknown";
  const scholarship = scholarshipState(candidate);
  const states = { country, degree, field, intake, scholarship };
  const hard = new Set(["country", "degree"]);
  const weights = {
    country: 30,
    degree: 30,
    field: 20,
    intake: 10,
    scholarship: 10,
  };
  let earned = 0;
  let evaluated = 0;
  const reasons = Object.entries(states).map(([dimension, state]) => {
    if (state !== "unknown") {
      evaluated += weights[dimension as keyof typeof weights];
      if (state === "match")
        earned += weights[dimension as keyof typeof weights];
    }
    const explanations = {
      country:
        state === "unknown"
          ? "Destination-country evidence is incomplete."
          : state === "match"
            ? "Preferred destination country matches."
            : "Preferred destination country does not match.",
      degree:
        state === "unknown"
          ? "Degree-level evidence is incomplete."
          : state === "match"
            ? "Requested degree level matches."
            : "Requested degree level does not match.",
      field:
        state === "unknown"
          ? "Requested field or program evidence is incomplete."
          : state === "match"
            ? "Requested field aligns with the program name."
            : "Requested field does not align with the program name.",
      intake:
        state === "match"
          ? "A verified selectable intake is available."
          : "No verified selectable intake evidence currently exists in Global Scholars.",
      scholarship:
        state === "match"
          ? "A scholarship has confirmed international eligibility."
          : state === "mismatch"
            ? "Available scholarship evidence explicitly excludes international eligibility."
            : "No confirmed international scholarship evidence currently exists in Global Scholars.",
    };
    return {
      dimension: dimension as EvidenceReason["dimension"],
      state,
      explanation: explanations[dimension as keyof typeof explanations],
      hardConstraint: hard.has(dimension),
    };
  });
  const excluded = reasons.some(
    ({ hardConstraint, state }) => hardConstraint && state === "mismatch",
  );
  const known = reasons.filter(({ state }) => state !== "unknown").length;
  const evidenceCompleteness = Math.round((known / reasons.length) * 100);
  const compatibility = evaluated
    ? Math.round((earned / evaluated) * 100)
    : null;
  const unknowns = reasons
    .filter(({ state }) => state === "unknown")
    .map(({ explanation }) => explanation);
  const potentialBlockers = reasons
    .filter(({ state }) => state === "mismatch")
    .map(({ explanation }) => explanation);
  return {
    institutionId: candidate.institutionId,
    institutionName: candidate.institutionName,
    programId: candidate.programId ?? null,
    programName: candidate.programName ?? null,
    label: label(excluded, compatibility, evidenceCompleteness),
    excluded,
    compatibility,
    evidenceCompleteness,
    reasons,
    unknowns,
    potentialBlockers,
    intakeEvidence:
      intake === "match"
        ? `${candidate.selectableIntakes?.length} verified selectable intake(s).`
        : "No verified selectable intake evidence currently exists in Global Scholars.",
    scholarshipEvidence:
      scholarship === "match"
        ? "Confirmed international-eligible scholarship evidence is available."
        : scholarship === "mismatch"
          ? "Available scholarship evidence confirms international ineligibility."
          : "No confirmed international scholarship evidence currently exists in Global Scholars.",
  };
}

export function rankCandidates(
  student: MatchStudentFacts,
  candidates: MatchCatalogCandidate[],
): DeterministicMatchResult[] {
  return candidates
    .map((candidate) => evaluateCandidate(student, candidate))
    .sort(
      (a, b) =>
        Number(a.excluded) - Number(b.excluded) ||
        (b.compatibility ?? -1) - (a.compatibility ?? -1) ||
        b.evidenceCompleteness - a.evidenceCompleteness ||
        a.institutionName.localeCompare(b.institutionName) ||
        (a.programName ?? "").localeCompare(b.programName ?? "") ||
        (a.programId ?? a.institutionId).localeCompare(
          b.programId ?? b.institutionId,
        ),
    );
}
