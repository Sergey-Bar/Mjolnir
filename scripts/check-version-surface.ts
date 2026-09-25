import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  checkVersionSurfaceEnvelope,
  VERSION_SURFACE_PATHS,
} from "../src/release/version-surface.js";

const root = process.argv[2] ?? process.cwd();
const { version } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as { version: string };
const surfaces = Object.fromEntries(
  VERSION_SURFACE_PATHS.map((path) => [
    path,
    existsSync(join(root, path))
      ? readFileSync(join(root, path), "utf8")
      : undefined,
  ]),
);
const violations = checkVersionSurfaceEnvelope(version, surfaces);

if (violations.length > 0) {
  console.error(
    JSON.stringify({ status: "FAIL", version, violations }, null, 2),
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: "PASS",
    version,
    surfaces: VERSION_SURFACE_PATHS.length,
  }),
);
