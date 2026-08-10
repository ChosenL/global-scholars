import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeUrl,
  classifyOfficialSource,
  discoverCandidateUrls,
  extractProgramCandidates,
  identifyPlatformFamily,
  selectPilotCohort,
  verifyInstitutionalDomain,
} from "../../scripts/lib/official-source-factory.mjs";

test("candidate discovery is deterministic and limited to program-like official links", () => {
  const html = `
    <a href="/about">About</a>
    <a href="/academics/programs?utm_source=test">Programs</a>
    <a href="https://catalog.example.edu/undergraduate/">Catalog</a>`;
  const first = discoverCandidateUrls("https://www.example.edu/", html);
  const second = discoverCandidateUrls("https://www.example.edu/", html);
  assert.deepEqual(first, second);
  assert.ok(
    first.candidates.includes("https://www.example.edu/academics/programs"),
  );
  assert.ok(
    first.candidates.includes("https://catalog.example.edu/undergraduate/"),
  );
  assert.ok(!first.candidates.includes("https://www.example.edu/about"));
});

test("domain verification accepts institutional domains and explicit official links only", () => {
  assert.equal(
    verifyInstitutionalDomain({
      institutionalUrl: "https://www.example.edu",
      candidateUrl: "https://catalog.example.edu/programs",
    }).result,
    "verified",
  );
  assert.equal(
    verifyInstitutionalDomain({
      institutionalUrl: "https://www.example.edu",
      candidateUrl: "https://catalog.vendor.test/example",
      officialPageLinks: ["https://catalog.vendor.test/example"],
    }).result,
    "verified",
  );
  assert.equal(
    verifyInstitutionalDomain({
      institutionalUrl: "https://www.example.edu",
      candidateUrl: "https://www.usnews.com/example",
    }).result,
    "rejected",
  );
});

test("source classification and platform identification preserve unsupported layouts", () => {
  assert.equal(
    classifyOfficialSource("https://catalog.example.edu/programs"),
    "official_academic_catalog",
  );
  assert.equal(
    identifyPlatformFamily("https://catalog.example.edu/programs"),
    "official_catalog_subdomain",
  );
  assert.equal(
    classifyOfficialSource(
      "https://www.example.edu/about",
      "About our history",
    ),
    "unsupported_official_source",
  );
});

test("program extraction accepts explicit degrees and quarantines ambiguity for review", () => {
  const source = {
    unitid: "123456",
    canonicalUrl: "https://catalog.example.edu/programs",
    sourceRegistryId: "factory:source",
    evidenceChecksum: "a".repeat(64),
  };
  const programs = extractProgramCandidates(
    `<a href="/computer-science-bs">Computer Science, B.S.</a>
     <a href="/business-minor">Business Minor, B.A.</a>
     <a href="/courses">Computer Science Courses</a>`,
    source,
  );
  assert.equal(programs.length, 1);
  assert.equal(programs[0].credentialLevel, "bachelor");
  assert.equal(programs[0].validationStatus, "candidate_requires_review");
});

test("pilot cohort excludes certified institutions and is stable across region/type buckets", () => {
  const records = [
    ...["A", "B", "C"].map((unitid, index) => ({
      entityType: "university",
      canonicalId: `u${index}`,
      provenance: { sourceEntityId: unitid },
      name: unitid,
      institutionType: index % 2 ? "Private nonprofit" : "Public",
      degreeLevels: index === 2 ? ["associate"] : ["bachelor"],
      websiteUrl: `https://${unitid.toLowerCase()}.edu`,
      isActive: true,
      searchEligible: true,
    })),
    ...["CA", "NY", "TX"].map((region, index) => ({
      entityType: "campus",
      universityCanonicalId: `u${index}`,
      region,
      isPrimary: true,
    })),
  ];
  const selected = selectPilotCohort(records, new Set(["B"]), 2);
  assert.deepEqual(
    selected.map(({ unitid }) => unitid),
    ["A", "C"],
  );
  assert.equal(
    canonicalizeUrl("/programs", "https://a.edu"),
    "https://a.edu/programs",
  );
});
