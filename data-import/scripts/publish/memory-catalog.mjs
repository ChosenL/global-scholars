function clone(value) {
  return structuredClone(value);
}
const TABLE = {
  country: "countries",
  university: "universities",
  campus: "campuses",
};

export class MemoryCatalogRepository {
  constructor(seed = {}) {
    this.state = {
      countries: clone(seed.countries ?? []),
      universities: clone(seed.universities ?? []),
      campuses: clone(seed.campuses ?? []),
    };
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
      find: async (type, desired) => {
        const rows = this.state[TABLE[type]];
        if (type === "country")
          return (
            rows.find(
              (row) =>
                row.iso_code === desired.iso_code ||
                row.name.toLowerCase() === desired.name.toLowerCase(),
            ) ?? null
          );
        if (type === "university")
          return (
            rows.find(
              (row) =>
                row.country_id === desired.country_id &&
                (row.slug === desired.slug ||
                  row.name.toLowerCase() === desired.name.toLowerCase()),
            ) ?? null
          );
        return (
          rows.find(
            (row) =>
              row.university_id === desired.university_id &&
              row.name.toLowerCase() === desired.name.toLowerCase(),
          ) ?? null
        );
      },
      insert: async (type, row) => {
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
              .filter(({ operation }) => operation !== "skipped")
              .map(({ entityType, after }) => ({ entityType, ...after }))
          : expected.map((record) => ({
              entityType: record.entityType,
              id: actions.find(
                (action) => action.canonicalId === record.canonicalId,
              )?.catalogId,
            }));
        const rowCounts = Object.fromEntries(
          ["country", "university", "campus"].map((type) => [
            type,
            effective.filter((row) => row.entityType === type).length,
          ]),
        );
        const countries = dryRun
          ? effective.filter((row) => row.entityType === "country")
          : this.state.countries;
        const universities = dryRun
          ? effective.filter((row) => row.entityType === "university")
          : this.state.universities;
        const campuses = dryRun
          ? effective.filter((row) => row.entityType === "campus")
          : this.state.campuses;
        return {
          rowCounts,
          foreignKeyIntegrity:
            universities.every((row) =>
              countries.some((country) => country.id === row.country_id),
            ) &&
            campuses.every((row) =>
              universities.some(
                (university) => university.id === row.university_id,
              ),
            ),
          identityConsistency: actions
            .filter(({ operation }) => operation !== "skipped")
            .every(({ catalogId }) => typeof catalogId === "string"),
        };
      },
    };
  }
}
