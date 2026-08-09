export function assertAdapter(adapter) {
  for (const method of [
    "acquire",
    "normalize",
    "validate",
    "plan",
    "reconcile",
  ]) {
    if (typeof adapter?.[method] !== "function")
      throw new TypeError(`Adapter must implement ${method}()`);
  }
  if (!/^[a-z][a-z0-9_]+$/.test(adapter.name ?? ""))
    throw new TypeError("Adapter name is invalid");
  return adapter;
}
