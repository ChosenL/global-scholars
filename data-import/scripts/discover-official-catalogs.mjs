#!/usr/bin/env node
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FACTORY_VERSION,
  discoverInstitutionSources,
  selectPilotCohort,
} from "./lib/official-source-factory.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const limitFlag = process.argv.indexOf("--limit");
const limit = limitFlag >= 0 ? Number(process.argv[limitFlag + 1]) : 100;
const concurrencyFlag = process.argv.indexOf("--concurrency");
const concurrency =
  concurrencyFlag >= 0 ? Number(process.argv[concurrencyFlag + 1]) : 5;
if (!Number.isInteger(limit) || limit < 1 || limit > 500)
  throw new Error("limit must be 1..500");
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10)
  throw new Error("concurrency must be 1..10");

const ipeds = JSON.parse(
  await readFile(
    path.join(ROOT, "normalized/us/ipeds/2024/records.json"),
    "utf8",
  ),
);
const certified = JSON.parse(
  await readFile(
    path.join(
      ROOT,
      "config/sources/us/official-program-catalog-2026-08-09.json",
    ),
    "utf8",
  ),
);
const existing = new Set(certified.programs.map(({ unitid }) => unitid));
const cohort = selectPilotCohort(ipeds.records, existing, limit);
const results = new Array(cohort.length);
let cursor = 0;
const started = performance.now();
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (cursor < cohort.length) {
      const index = cursor++;
      results[index] = await discoverInstitutionSources(cohort[index]);
      process.stderr.write(
        `DISCOVERY ${index + 1}/${cohort.length} ${cohort[index].unitid}\n`,
      );
    }
  }),
);
const sources = results.flatMap(({ sources }) => sources);
const programs = results.flatMap(({ programs }) => programs);
const report = {
  factoryVersion: FACTORY_VERSION,
  cohortRule: "round-robin(region,institutionType,degree-band), then UNITID",
  attempted: cohort.length,
  institutionUnitids: cohort.map(({ unitid }) => unitid),
  counts: {
    domainsAvailable: cohort.filter(({ institutionalUrl }) => institutionalUrl)
      .length,
    candidateSources: results.reduce(
      (sum, result) => sum + result.candidates.length,
      0,
    ),
    verifiedSources: sources.filter(
      ({ verificationResult }) => verificationResult === "verified",
    ).length,
    rejectedSources: sources.filter(
      ({ verificationResult }) => verificationResult === "rejected",
    ).length,
    unsupportedSources: sources.filter(
      ({ acquisitionStatus }) => acquisitionStatus === "unsupported",
    ).length,
    noSourceInstitutions: results.filter(
      (result) => result.status === "no_source",
    ).length,
    institutionsWithVerifiedSources: results.filter(
      (result) => result.status === "source_discovered",
    ).length,
    programsExtracted: programs.length,
    programsValidated: programs.filter(
      ({ validationStatus }) => validationStatus === "validated",
    ).length,
    programsQuarantined: programs.filter(
      ({ validationStatus }) => validationStatus !== "validated",
    ).length,
    retries: results.reduce((sum, result) => sum + result.retries, 0),
    failures: results.filter(({ failure }) => failure).length,
  },
  performanceMs: {
    total: Math.round(performance.now() - started),
    averagePerInstitution: Math.round(
      results.reduce((sum, result) => sum + result.timingMs.total, 0) /
        results.length,
    ),
  },
  results,
};
const output = path.join(
  ROOT,
  "config/sources/us/official-source-discovery-pilot-2026-08-09.json",
);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  `SOURCE_DISCOVERY attempted=${report.attempted} verified=${report.counts.verifiedSources} programs=${report.counts.programsExtracted} quarantined=${report.counts.programsQuarantined} retries=${report.counts.retries} failures=${report.counts.failures} runtimeMs=${report.performanceMs.total}`,
);
