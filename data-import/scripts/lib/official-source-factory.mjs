import { createHash } from "node:crypto";

export const FACTORY_VERSION = "official_source_factory@1.0.0";
export const SOURCE_TYPES = new Set([
  "official_program_directory",
  "official_academic_catalog",
  "official_degree_page",
  "official_admissions_program_directory",
  "official_catalog_platform",
  "unsupported_official_source",
  "rejected_non_authoritative",
]);

const PATH_CANDIDATES = [
  "/academics",
  "/programs",
  "/degrees",
  "/majors",
  "/academic-programs",
  "/undergraduate/programs",
  "/graduate/programs",
  "/catalog",
];
const REJECTED_HOST_FRAGMENTS = [
  "wikipedia.org",
  "usnews.com",
  "niche.com",
  "princetonreview.com",
  "collegeconfidential.com",
  "petersons.com",
];
const PROGRAM_PATH =
  /(?:academics?|programs?|degrees?|majors?|catalog|bulletin)/i;
const PROGRAM_SIGNAL =
  /(?:academic programs|degree programs|undergraduate programs|graduate programs|programs of study|majors and programs)/i;
const PROGRAM_NAME =
  /\b(?:B\.?(?:A|S|B|F\.?A)\.?|M\.?(?:A|S|B\.?A|F\.?A)\.?|A\.?(?:A|S|A\.?S)\.?|Bachelor(?:'s)?|Master(?:'s)?|Associate(?:'s)?|Doctor(?:ate|al)|Ph\.?D\.?)\b/i;
const EXCLUDED_VARIANT =
  /\b(?:minor|concentration|track|course|department|emphasis)\b/i;

const hash = (value) => createHash("sha256").update(value).digest("hex");
const cleanText = (value) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();

export function canonicalizeUrl(value, base) {
  try {
    const url = new URL(value, base);
    if (!/^https?:$/.test(url.protocol)) return null;
    url.protocol = "https:";
    url.hash = "";
    for (const key of [...url.searchParams.keys()])
      if (/^(?:utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return null;
  }
}

function rootDomain(hostname) {
  const parts = hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .split(".");
  return parts.slice(-2).join(".");
}

export function verifyInstitutionalDomain({
  institutionalUrl,
  candidateUrl,
  officialPageLinks = [],
}) {
  const official = new URL(institutionalUrl);
  const candidate = new URL(candidateUrl);
  if (REJECTED_HOST_FRAGMENTS.some((host) => candidate.hostname.endsWith(host)))
    return { result: "rejected", reason: "known_non_authoritative_domain" };
  if (rootDomain(official.hostname) === rootDomain(candidate.hostname))
    return { result: "verified", reason: "same_institutional_root_domain" };
  const linked = officialPageLinks.some((link) => {
    try {
      return new URL(link).hostname === candidate.hostname;
    } catch {
      return false;
    }
  });
  return linked
    ? {
        result: "verified",
        reason: "externally_hosted_source_linked_by_institution",
      }
    : {
        result: "rejected",
        reason: "domain_not_controlled_or_linked_by_institution",
      };
}

export function identifyPlatformFamily(url, html = "") {
  const host = new URL(url).hostname.toLowerCase();
  if (/catalog\./.test(host)) return "official_catalog_subdomain";
  if (/acalog|catalog\.academiccatalog|courseleaf/i.test(`${url} ${html}`))
    return "recurring_catalog_platform";
  if (/catalog|bulletin/i.test(url)) return "institutional_catalog_path";
  if (/program|degree|major|academic/i.test(url))
    return "institutional_directory";
  return "unknown_layout";
}

export function classifyOfficialSource(url, html = "") {
  const material = `${url} ${cleanText(html.slice(0, 100_000))}`;
  if (
    /admissions?.{0,30}(?:program|degree)|(?:program|degree).{0,30}admissions?/i.test(
      material,
    )
  )
    return "official_admissions_program_directory";
  if (/catalog|bulletin/i.test(url)) return "official_academic_catalog";
  if (/programs?|majors?/i.test(url)) return "official_program_directory";
  if (/degrees?/i.test(url)) return "official_degree_page";
  return PROGRAM_SIGNAL.test(material)
    ? "official_program_directory"
    : "unsupported_official_source";
}

export function discoverCandidateUrls(institutionalUrl, html = "") {
  const candidates = new Set(
    PATH_CANDIDATES.map((pathname) =>
      canonicalizeUrl(pathname, institutionalUrl),
    ),
  );
  const links = [];
  for (const match of html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)) {
    const url = canonicalizeUrl(match[1], institutionalUrl);
    if (!url) continue;
    links.push(url);
    const parsed = new URL(url);
    if (
      PROGRAM_PATH.test(parsed.pathname) ||
      /catalog\./i.test(parsed.hostname)
    )
      candidates.add(url);
  }
  return {
    officialPageLinks: [...new Set(links)].sort(),
    candidates: [...candidates].filter(Boolean).sort(),
  };
}

function credentialFromName(name) {
  if (/\b(?:associate|A\.?(?:A|S|A\.?S)\.?)\b/i.test(name)) return "associate";
  if (/\b(?:bachelor|B\.?(?:A|S|B|F\.?A)\.?)\b/i.test(name)) return "bachelor";
  if (/\b(?:master|M\.?(?:A|S|B\.?A|F\.?A)\.?)\b/i.test(name)) return "master";
  if (/\b(?:doctor|Ph\.?D\.?)\b/i.test(name)) return "doctorate";
  return null;
}

export function extractProgramCandidates(html, source) {
  const programs = new Map();
  for (const match of html.matchAll(
    /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const name = cleanText(match[2]);
    if (
      name.length < 5 ||
      name.length > 180 ||
      !PROGRAM_NAME.test(name) ||
      EXCLUDED_VARIANT.test(name)
    )
      continue;
    const credentialLevel = credentialFromName(name);
    if (!credentialLevel) continue;
    const programUrl = canonicalizeUrl(match[1], source.canonicalUrl);
    if (!programUrl) continue;
    const identity = `${source.unitid}:${programUrl}:${name.toLowerCase()}`;
    programs.set(identity, {
      sourceIdentifier: `factory:${hash(identity).slice(0, 24)}`,
      unitid: source.unitid,
      name,
      credentialLevel,
      programUrl,
      sourceRegistryId: source.sourceRegistryId,
      evidenceChecksum: hash(`${source.evidenceChecksum}:${identity}`),
      validationStatus: "candidate_requires_review",
    });
  }
  return [...programs.values()].sort((a, b) =>
    a.sourceIdentifier.localeCompare(b.sourceIdentifier),
  );
}

export function selectPilotCohort(records, existingUnitids, limit = 100) {
  const campuses = new Map(
    records
      .filter((record) => record.entityType === "campus" && record.isPrimary)
      .map((record) => [record.universityCanonicalId, record]),
  );
  const candidates = records
    .filter(
      (record) =>
        record.entityType === "university" &&
        record.isActive &&
        record.searchEligible &&
        record.websiteUrl &&
        !existingUnitids.has(record.provenance.sourceEntityId),
    )
    .map((record) => ({
      canonicalId: record.canonicalId,
      unitid: record.provenance.sourceEntityId,
      name: record.name,
      institutionType: record.institutionType,
      degreeLevels: record.degreeLevels,
      region: campuses.get(record.canonicalId)?.region ?? "unknown",
      institutionalUrl: canonicalizeUrl(record.websiteUrl),
    }))
    .filter(({ institutionalUrl }) => institutionalUrl)
    .sort(
      (a, b) =>
        a.region.localeCompare(b.region) ||
        a.institutionType.localeCompare(b.institutionType) ||
        a.unitid.localeCompare(b.unitid),
    );
  const buckets = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.region}:${candidate.institutionType}:${candidate.degreeLevels.includes("bachelor") ? "four-year" : "two-year"}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(candidate);
  }
  const selected = [];
  const orderedBuckets = [...buckets.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (let offset = 0; selected.length < limit; offset += 1) {
    let added = false;
    for (const [, bucket] of orderedBuckets) {
      if (bucket[offset]) {
        selected.push(bucket[offset]);
        added = true;
        if (selected.length === limit) break;
      }
    }
    if (!added) break;
  }
  return selected;
}

export async function fetchPage(url, { timeoutMs = 8_000, attempts = 2 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "GlobalScholarsCatalogResearch/1.0" },
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("text/html"))
        throw new Error(
          `HTTP ${response.status} ${contentType || "unknown-content"}`,
        );
      return {
        ok: true,
        url: canonicalizeUrl(response.url) ?? url,
        html: await response.text(),
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  return {
    ok: false,
    url,
    html: "",
    attempts,
    error: lastError?.message ?? "request_failed",
  };
}

export async function discoverInstitutionSources(institution) {
  const started = performance.now();
  const homepage = await fetchPage(institution.institutionalUrl);
  if (!homepage.ok)
    return {
      institution,
      status: "no_source",
      candidates: [],
      sources: [],
      programs: [],
      retries: homepage.attempts - 1,
      failure: homepage.error,
      timingMs: { total: Math.round(performance.now() - started) },
    };
  const discovered = discoverCandidateUrls(homepage.url, homepage.html);
  const sources = [];
  let retries = homepage.attempts - 1;
  const bounded = discovered.candidates.slice(0, 12);
  for (const candidateUrl of bounded) {
    const verification = verifyInstitutionalDomain({
      institutionalUrl: homepage.url,
      candidateUrl,
      officialPageLinks: discovered.officialPageLinks,
    });
    if (verification.result !== "verified") {
      sources.push({
        candidateUrl,
        ...verification,
        sourceType: "rejected_non_authoritative",
      });
      continue;
    }
    const page = await fetchPage(candidateUrl);
    retries += page.attempts - 1;
    if (!page.ok) continue;
    const sourceType = classifyOfficialSource(page.url, page.html);
    const platformFamily = identifyPlatformFamily(page.url, page.html);
    const evidenceChecksum = hash(page.html);
    const source = {
      sourceRegistryId: `factory:${hash(`${institution.unitid}:${page.url}`).slice(0, 24)}`,
      unitid: institution.unitid,
      candidateUrl,
      canonicalUrl: page.url,
      institutionalDomain: new URL(homepage.url).hostname,
      discoveryMethod: discovered.officialPageLinks.includes(candidateUrl)
        ? "official_site_navigation"
        : "deterministic_path_probe",
      verificationResult: "verified",
      verificationReason: verification.reason,
      sourceType,
      platformFamily,
      evidenceChecksum,
      acquisitionStatus:
        sourceType === "unsupported_official_source"
          ? "unsupported"
          : "acquired",
      parserVersion: FACTORY_VERSION,
      attempts: page.attempts,
      html: page.html,
    };
    sources.push(source);
  }
  const programs = sources.flatMap((source) =>
    source.acquisitionStatus === "acquired"
      ? extractProgramCandidates(source.html, source)
      : [],
  );
  for (const source of sources) delete source.html;
  return {
    institution,
    status: sources.some(
      ({ acquisitionStatus }) => acquisitionStatus === "acquired",
    )
      ? "source_discovered"
      : "unsupported",
    candidates: bounded,
    sources,
    programs,
    retries,
    failure: null,
    timingMs: { total: Math.round(performance.now() - started) },
  };
}
