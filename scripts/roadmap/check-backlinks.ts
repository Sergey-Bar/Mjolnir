import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  assertPathsExist,
  type PathClaim,
} from "../../src/lib/path-existence.js";
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
  // Through the shared check, not a local `existsSync`. This check was
  // already correct and already red — it was simply wired into no gate tier,
  // so 19 dead artifact claims sat in the file for a release. The existence
  // test itself is now shared with the ledger and the inventory so a third
  // caller cannot come back weaker.
  const claims: PathClaim[] = [];
  for (const [train, paths] of Object.entries(document.provisionalArtifacts)) {
    if (!Array.isArray(paths)) continue;
    for (const path of paths) {
      if (typeof path === "string") claims.push({ path, citedBy: train });
    }
  }
  assertPathsExist(root, claims, (missing) => {
    errors.push(
      `provisional artifact missing: ${missing.path} (cited by ${missing.citedBy})`,
    );
  });
}
console.log(
  JSON.stringify(
    { status: errors.length === 0 ? "PASS" : "FAIL", errors },
    null,
    2,
  ),
);
if (errors.length > 0) process.exit(1);
