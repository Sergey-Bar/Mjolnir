import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkActionDefaultVersion,
  checkVersionSurfaceEnvelope,
  VERSION_SURFACE_PATHS,
} from "../src/release/version-surface.js";

const root = process.argv[2] ?? process.cwd();
const { version, publishedStable } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as { version: string; publishedStable?: string };
const surfaces = Object.fromEntries(
  VERSION_SURFACE_PATHS.map((path) => [
    path,
    existsSync(join(root, path))
      ? readFileSync(join(root, path), "utf8")
      : undefined,
  ]),
);
const violations = checkVersionSurfaceEnvelope(
  version,
  surfaces,
  publishedStable,
);
if (typeof publishedStable !== "string") {
  violations.push("package.json: publishedStable is missing");
} else {
  violations.push(...checkActionDefaultVersion(publishedStable, surfaces));
}

if (violations.length > 0) {
  console.error(
    JSON.stringify(
      { status: "FAIL", version, publishedStable, violations },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: "PASS",
    version,
    publishedStable,
    surfaces: VERSION_SURFACE_PATHS.length,
  }),
);
