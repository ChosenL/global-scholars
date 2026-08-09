import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { stableStringify } from "./identity.mjs";

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
export function stableJson(value) {
  return `${stableStringify(value)}\n`;
}
