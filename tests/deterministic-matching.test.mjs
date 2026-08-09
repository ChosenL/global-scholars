import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const file = path.resolve("lib/matching/deterministicMatching.ts");
const output = ts.transpileModule(readFileSync(file, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: file,
}).outputText;
const loaded = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${output}\n})`, {
  filename: file,
})(() => {}, loaded, loaded.exports);
const { evaluateCandidate, rankCandidates } = loaded.exports;

const student = {
  preferredDestinationCountry: "US",
  preferredDegree: "Bachelor's",
  preferredProgram: "Computer Science",
  nationality: "Ghanaian",
};
const candidate = {
  institutionId: "asu",
  institutionName: "Arizona State University",
  countryCode: "US",
  programId: "asu-cs",
  programName: "Computer Science, BS",
  credentialLevel: "bachelor",
  selectableIntakes: [{ id: "spring-2027", name: "Spring 2027" }],
  scholarships: [
    {
      id: "namu",
      name: "New American University Scholarship",
      internationalEligibility: "confirmed_eligible",
    },
  ],
};

test("exact degree, country, and field alignment is explainable", () => {
  const result = evaluateCandidate(student, candidate);
  assert.equal(result.label, "strong_alignment");
  assert.equal(result.compatibility, 100);
  assert.equal(result.evidenceCompleteness, 100);
  assert.equal(result.excluded, false);
  assert.equal(
    result.reasons.filter((item) => item.state === "match").length,
    5,
  );
});

test("degree mismatch is a known hard exclusion", () => {
  const result = evaluateCandidate(student, {
    ...candidate,
    credentialLevel: "master",
  });
  assert.equal(result.excluded, true);
  assert.equal(result.label, "known_mismatch");
  assert.match(result.potentialBlockers.join(" "), /degree level/i);
});

test("unknown degree is not mismatch or exclusion", () => {
  const result = evaluateCandidate(student, {
    ...candidate,
    credentialLevel: null,
  });
  assert.equal(result.excluded, false);
  assert.equal(
    result.reasons.find((item) => item.dimension === "degree").state,
    "unknown",
  );
});

test("country mismatch excludes only with known evidence", () => {
  assert.equal(
    evaluateCandidate(student, { ...candidate, countryCode: "CA" }).excluded,
    true,
  );
  assert.equal(
    evaluateCandidate(student, { ...candidate, countryCode: null }).excluded,
    false,
  );
});

test("program field alignment is soft and does not exclude", () => {
  const result = evaluateCandidate(student, {
    ...candidate,
    programName: "History, BA",
  });
  assert.equal(result.excluded, false);
  assert.equal(
    result.reasons.find((item) => item.dimension === "field").state,
    "mismatch",
  );
});

test("missing program evidence remains unknown", () => {
  const result = evaluateCandidate(student, {
    ...candidate,
    programId: null,
    programName: null,
  });
  assert.equal(
    result.reasons.find((item) => item.dimension === "field").state,
    "unknown",
  );
});

test("scholarship eligibility uses all three evidence states", () => {
  const eligible = evaluateCandidate(student, candidate);
  const ineligible = evaluateCandidate(student, {
    ...candidate,
    scholarships: [
      {
        id: "x",
        name: "Domestic",
        internationalEligibility: "confirmed_ineligible",
      },
    ],
  });
  const unspecified = evaluateCandidate(student, {
    ...candidate,
    scholarships: [
      { id: "x", name: "Unknown", internationalEligibility: "unspecified" },
    ],
  });
  assert.equal(eligible.reasons.at(-1).state, "match");
  assert.equal(ineligible.reasons.at(-1).state, "mismatch");
  assert.equal(unspecified.reasons.at(-1).state, "unknown");
});

test("missing scholarship evidence never claims none exist", () => {
  const result = evaluateCandidate(student, { ...candidate, scholarships: [] });
  assert.match(
    result.scholarshipEvidence,
    /No confirmed.*evidence currently exists/,
  );
  assert.doesNotMatch(result.scholarshipEvidence, /no scholarships exist/i);
});

test("verified open intake is positive and missing intake is unknown", () => {
  const open = evaluateCandidate(student, candidate);
  const missing = evaluateCandidate(student, {
    ...candidate,
    selectableIntakes: [],
  });
  assert.equal(
    open.reasons.find((item) => item.dimension === "intake").state,
    "match",
  );
  assert.equal(
    missing.reasons.find((item) => item.dimension === "intake").state,
    "unknown",
  );
  assert.equal(missing.excluded, false);
});

test("evidence completeness is separate from compatibility", () => {
  const result = evaluateCandidate(
    { preferredDestinationCountry: "US" },
    { institutionId: "x", institutionName: "Limited", countryCode: "US" },
  );
  assert.equal(result.compatibility, 100);
  assert.equal(result.evidenceCompleteness, 20);
  assert.equal(result.label, "limited_evidence");
});

test("soft evidence ranks without hard exclusion", () => {
  const ranked = rankCandidates(student, [
    {
      ...candidate,
      institutionId: "weak",
      institutionName: "Weak",
      selectableIntakes: [],
      scholarships: [],
    },
    candidate,
  ]);
  assert.equal(ranked[0].institutionId, "asu");
  assert.equal(ranked[1].excluded, false);
});

test("ordering and output are stable for identical inputs", () => {
  const tied = [
    { ...candidate, institutionId: "b", institutionName: "Beta" },
    { ...candidate, institutionId: "a", institutionName: "Alpha" },
  ];
  assert.deepEqual(
    rankCandidates(student, tied),
    rankCandidates(student, tied),
  );
  assert.deepEqual(
    rankCandidates(student, tied).map((item) => item.institutionName),
    ["Alpha", "Beta"],
  );
});
