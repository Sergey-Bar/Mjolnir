import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { validateRoadmap } from "./validate.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const root = process.argv[2] ?? process.cwd();
const document: unknown = parse(
  readFileSync(join(root, "docs/ROADMAP.yaml"), "utf8"),
);
const result = validateRoadmap(document);
const trains =
  isRecord(document) && Array.isArray(document.trains)
    ? document.trains.filter(isRecord)
    : [];
const errors = [...result.errors];
const ids = new Set<string>();
for (const train of trains) {
  if (typeof train.id === "string") ids.add(train.id);
}
for (const train of trains) {
  for (const dependency of Array.isArray(train.dependsOn)
    ? train.dependsOn
    : []) {
    if (
      typeof dependency === "string" &&
      !ids.has(dependency) &&
      !["M12", "M19"].includes(dependency)
    ) {
      errors.push(`${String(train.id)} backlink missing: ${dependency}`);
    }
  }
  for (const workstream of Array.isArray(train.workstreams)
    ? train.workstreams
    : []) {
    if (
      typeof workstream !== "string" ||
      !workstream.startsWith(`${String(train.id)}-`)
    ) {
      errors.push(
        `${String(train.id)} workstream backlink invalid: ${String(workstream)}`,
      );
    }
  }
}
if (
  isRecord(document) &&
  isRecord(document.dependencyResolution) &&
  document.dependencyResolution.status !== "APPROVED_STAGED"
) {
  errors.push("dependency resolution is not approved staged");
}
if (isRecord(document) && isRecord(document.provisionalArtifacts)) {
  for (const paths of Object.values(document.provisionalArtifacts)) {
    if (!Array.isArray(paths)) continue;
    for (const path of paths) {
      if (typeof path === "string" && !existsSync(join(root, path))) {
        errors.push(`provisional artifact missing: ${path}`);
      }
    }
  }
}
console.log(
  JSON.stringify(
    { status: errors.length === 0 ? "PASS" : "FAIL", errors },
    null,
    2,
  ),
);
if (errors.length > 0) process.exit(1);
