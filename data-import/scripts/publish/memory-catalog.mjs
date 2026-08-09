function clone(value) {
  return structuredClone(value);
}
const TABLE = {
  country: "countries",
  university: "universities",
  campus: "campuses",
  faculty: "faculties",
  program: "programs",
  "program-campus": "programCampuses",
  intake: "intakes",
  scholarship: "scholarships",
};
const TYPES = Object.keys(TABLE);
export class MemoryCatalogRepository {
  constructor(seed = {}) {
    this.state = {
      countries: clone(seed.countries ?? []),
      universities: clone(seed.universities ?? []),
      campuses: clone(seed.campuses ?? []),
    };
    for (const table of [
      "faculties",
      "programs",
      "programCampuses",
      "intakes",
      "scholarships",
    ])
      if (seed[table]) this.state[table] = clone(seed[table]);
  }
  async transaction(callback, { dryRun = false } = {}) {
    const original = clone(this.state);
    try {
      const result = await callback(this.#catalog());
      if (dryRun) this.state = original;
      return result;
    } catch (error) {
      this.state = original;
      throw error;
    }
  }
  #catalog() {
    return {
      find: async (type, d, deterministicId) => {
        const rows = this.state[TABLE[type]] ?? [];
        const deterministic = rows.find((row) => row.id === deterministicId);
        if (deterministic) return deterministic;
        if (type === "country")
          return (
            rows.find(
              (r) =>
                r.iso_code === d.iso_code ||
                r.name.toLowerCase() === d.name.toLowerCase(),
            ) ?? null
          );
        if (type === "university")
          return (
            rows.find(
              (r) =>
                r.country_id === d.country_id &&
                (d.dli_number
                  ? r.dli_number === d.dli_number
                  : r.slug === d.slug),
            ) ?? null
          );
        if (type === "campus" || type === "faculty" || type === "program")
          return (
            rows.find(
              (r) =>
                r.university_id === d.university_id &&
                r.name.toLowerCase() === d.name.toLowerCase(),
            ) ?? null
          );
        if (type === "program-campus")
          return (
            rows.find(
              (r) =>
                r.program_id === d.program_id && r.campus_id === d.campus_id,
            ) ?? null
          );
        if (type === "scholarship")
          return (
            rows.find(
              (r) =>
                r.university_id === d.university_id &&
                r.name.toLowerCase() === d.name.toLowerCase(),
            ) ?? null
          );
        return (
          rows.find(
            (r) =>
              r.program_id === d.program_id &&
              r.campus_id === d.campus_id &&
              (d.start_date
                ? r.start_date === d.start_date
                : r.start_date_precision === "term" &&
                  r.name.toLowerCase() === d.name.toLowerCase()),
          ) ?? null
        );
      },
      insert: async (type, row) => {
        this.state[TABLE[type]] ??= [];
        this.state[TABLE[type]].push(clone(row));
      },
      update: async (type, id, values) => {
        const row = this.state[TABLE[type]].find((item) => item.id === id);
        if (!row) throw new Error(`Missing ${type} ${id}`);
        Object.assign(row, clone(values));
      },
      verify: async ({ expected, dryRun, actions }) => {
        const effective = dryRun
          ? actions
              .filter((a) => a.operation !== "skipped")
              .map((a) => ({ entityType: a.entityType, ...a.after }))
          : expected.map((record) => ({
              entityType: record.entityType,
              id: actions.find((a) => a.canonicalId === record.canonicalId)
                ?.catalogId,
            }));
        const present = TYPES.filter((type) =>
          expected.some((r) => r.entityType === type),
        );
        const rowCounts = Object.fromEntries(
          present.map((type) => [
            type,
            effective.filter((r) => r.entityType === type).length,
          ]),
        );
        if (dryRun)
          return {
            rowCounts,
            foreignKeyIntegrity: true,
            identityConsistency: true,
          };
        const s = {
          faculties: [],
          programs: [],
          programCampuses: [],
          intakes: [],
          scholarships: [],
          ...this.state,
        };
        return {
          rowCounts,
          foreignKeyIntegrity:
            s.universities.every((r) =>
              s.countries.some((p) => p.id === r.country_id),
            ) &&
            s.campuses.every((r) =>
              s.universities.some((p) => p.id === r.university_id),
            ) &&
            s.faculties.every((r) =>
              s.universities.some((p) => p.id === r.university_id),
            ) &&
            s.programs.every(
              (r) =>
                s.universities.some((p) => p.id === r.university_id) &&
                (!r.faculty_id ||
                  s.faculties.some((p) => p.id === r.faculty_id)),
            ) &&
            s.programCampuses.every(
              (r) =>
                s.programs.some((p) => p.id === r.program_id) &&
                s.campuses.some((p) => p.id === r.campus_id),
            ) &&
            s.intakes.every((r) =>
              s.programCampuses.some(
                (p) =>
                  p.program_id === r.program_id && p.campus_id === r.campus_id,
              ),
            ) &&
            s.scholarships.every(
              (r) =>
                s.universities.some((u) => u.id === r.university_id) &&
                (!r.program_id ||
                  s.programs.some((p) => p.id === r.program_id)) &&
                (!r.intake_id || s.intakes.some((i) => i.id === r.intake_id)),
            ),
          identityConsistency: actions
            .filter((a) => a.operation !== "skipped")
            .every((a) => typeof a.catalogId === "string"),
        };
      },
    };
  }
}
