import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  deterministicIdentity,
  recordHash,
  sha256,
  stableStringify,
} from "../lib/identity.mjs";
import {
  validateCanonicalRecord,
  validateDeterministicRecords,
  validateDuplicates,
  validateRelationships,
} from "../lib/validation.mjs";

const SOURCE_SYSTEM = "canada_ircc_dli";
const VERSION = "ca_ircc_dli@1.0.0";

function entity(entityType, naturalKey, material) {
  const canonicalId = deterministicIdentity(entityType, naturalKey);
  const record = { entityType, canonicalId, ...material };
  return { ...record, recordHash: recordHash(record) };
}

function text(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#39;", "'")
    .replaceAll("&rsquo;", "’")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function parseDliHtml(html) {
  const rows = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (cell) => text(cell[1]),
    );
    const dliIndex = cells.findIndex((value) => /^O\d{8,15}$/.test(value));
    if (dliIndex < 1 || cells.length < dliIndex + 3) continue;
    const province = cells[dliIndex - 2] ?? cells[0];
    const name = cells[dliIndex - 1];
    const city = cells[dliIndex + 1];
    const campus = cells[dliIndex + 2];
    const visibility = cells.at(-1);
    if (!province || !name || !city || !campus) continue;
    rows.push({
      province,
      name,
      dliNumber: cells[dliIndex],
      city,
      campus,
      institutionType: /public/i.test(visibility)
        ? "Public institution"
        : /private/i.test(visibility)
          ? "Private institution"
          : null,
    });
  }
  return rows;
}

function provenance(config, snapshot, sourceEntityId) {
  return {
    sourceSystem: SOURCE_SYSTEM,
    sourceEntityId,
    sourceUrl: config.sourceUrl,
    sourceVersion: config.releaseVersion,
    retrievedAt: snapshot.retrievedAt,
    rawChecksum: snapshot.artifacts[0].sha256,
    mappingVersion: "1.0.0",
  };
}

function canonicalCampusName(row, repeatedName) {
  const suffix = repeatedName ? ` — ${row.city}` : "";
  const available = 150 - suffix.length;
  return `${row.campus.slice(0, Math.max(2, available)).trim()}${suffix}`;
}

export const canadaDliAdapter = {
  name: "ca_ircc_dli",
  version: VERSION,
  async acquire({
    config,
    rawDirectory,
    retrievedAt = new Date().toISOString(),
    fetchImpl = fetch,
  }) {
    const directory = path.join(rawDirectory, config.releaseVersion);
    const file = path.join(directory, "ircc-dli.html");
    await mkdir(directory, { recursive: true });
    let bytes;
    try {
      bytes = await readFile(file);
    } catch {
      const response = await fetchImpl(config.sourceUrl);
      if (!response.ok)
        throw new Error(`Canada DLI acquisition failed (${response.status}).`);
      bytes = Buffer.from(await response.arrayBuffer());
      await writeFile(file, bytes, { flag: "wx" });
    }
    return {
      sourceName: config.sourceName,
      releaseVersion: config.releaseVersion,
      retrievedAt: new Date(retrievedAt).toISOString(),
      artifacts: [
        {
          name: "dli-list",
          fileName: "ircc-dli.html",
          url: config.sourceUrl,
          sha256: sha256(bytes),
          bytes: (await stat(file)).size,
          file,
        },
      ],
    };
  },
  async normalize({ config, snapshot }) {
    const rows = parseDliHtml(
      await readFile(snapshot.artifacts[0].file, "utf8"),
    );
    if (!rows.length)
      throw new Error("Canada DLI source contained no parseable institutions.");
    const country = entity(
      "country",
      { isoCode: "CA" },
      {
        provenance: provenance(config, snapshot, "CA"),
        isoCode: "CA",
        name: "Canada",
        defaultCurrency: "CAD",
        isActive: true,
      },
    );
    const records = [country];
    const universities = new Map();
    const seenCampuses = new Set();
    const campusNameCounts = rows.reduce((counts, row) => {
      const key = `${row.dliNumber}:${row.campus.toLowerCase()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map());
    for (const row of rows) {
      let university = universities.get(row.dliNumber);
      if (!university) {
        university = entity(
          "university",
          { sourceSystem: SOURCE_SYSTEM, sourceEntityId: row.dliNumber },
          {
            provenance: provenance(config, snapshot, row.dliNumber),
            countryCanonicalId: country.canonicalId,
            name: row.name,
            slug: `${row.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")}-${row.dliNumber.toLowerCase()}`,
            institutionType: row.institutionType,
            websiteUrl: null,
            catalogClassification: "classification_unknown",
            degreeGranting: null,
            acceptsDirectApplications: null,
            // DLI status proves international designation, not that the
            // institution accepts direct applications through this catalog.
            searchEligible: false,
            classificationRule: "ircc-dli-designation-only",
            classificationEvidence: {
              source: "Government of Canada IRCC DLI list",
              ruleVersion: "1.0.0",
              sourceFields: {
                dliNumber: row.dliNumber,
                institutionType: row.institutionType,
                province: row.province,
              },
            },
            searchEligibilityEvidence: "unknown",
            internationalStudentStatus: "designated",
            dliNumber: row.dliNumber,
            degreeLevels: [],
            isActive: true,
          },
        );
        universities.set(row.dliNumber, university);
        records.push(university);
      }
      const campusKey = `${row.dliNumber}:${row.city}:${row.campus}`;
      if (seenCampuses.has(campusKey)) continue;
      seenCampuses.add(campusKey);
      const repeatedName =
        campusNameCounts.get(`${row.dliNumber}:${row.campus.toLowerCase()}`) >
        1;
      records.push(
        entity(
          "campus",
          {
            universityCanonicalId: university.canonicalId,
            sourceEntityId: campusKey,
          },
          {
            provenance: provenance(config, snapshot, campusKey),
            universityCanonicalId: university.canonicalId,
            name: canonicalCampusName(row, repeatedName),
            city: row.city,
            region: row.province,
            isPrimary: !records.some(
              (record) =>
                record.entityType === "campus" &&
                record.universityCanonicalId === university.canonicalId,
            ),
            isActive: true,
          },
        ),
      );
    }
    return records.sort(
      (a, b) =>
        a.entityType.localeCompare(b.entityType) ||
        a.canonicalId.localeCompare(b.canonicalId),
    );
  },
  async validate({ records, runId }) {
    const issues = [
      ...records.flatMap((record) =>
        validateCanonicalRecord(record, { runId }),
      ),
      ...validateRelationships(records, { runId }),
      ...validateDuplicates(records, { runId }),
      ...validateDeterministicRecords(records, { runId }),
    ];
    const errors = issues.filter(
      ({ severity }) => severity === "error" || severity === "fatal",
    ).length;
    return {
      valid: errors === 0,
      counts: { records: records.length, errors, warnings: 0 },
      issues,
    };
  },
  async plan({ records, runId }) {
    const operations = records.map((after) => ({
      runId,
      entityType: after.entityType,
      canonicalId: after.canonicalId,
      catalogId: null,
      operation: "insert",
      before: null,
      after,
      recordHash: after.recordHash,
    }));
    return {
      runId,
      mode: "offline",
      writesPerformed: false,
      operations,
      checksum: sha256(stableStringify(operations)),
    };
  },
  async reconcile({ records, plan }) {
    return {
      runId: plan.runId,
      status: "not-published",
      writesPerformed: false,
      normalizedRecords: records.length,
      plannedOperations: plan.operations.length,
      missingFromPlan: [],
      unexpectedOperations: [],
      planChecksum: plan.checksum,
    };
  },
};

export const canadaDliVersions = {
  adapter: "ca_ircc_dli",
  mapping: "1.0.0",
  pipeline: "1.0.0",
};
