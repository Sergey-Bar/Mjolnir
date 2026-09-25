import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  synchronizeVersionSurfaceEnvelope,
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
const result = synchronizeVersionSurfaceEnvelope(
  version,
  surfaces,
  publishedStable,
);

for (const path of result.changedPaths) {
  const content = result.surfaces[path];
  if (typeof content === "string") {
    writeFileSync(join(root, path), content, "utf8");
  }
}

console.log(
  JSON.stringify({
    status: "PASS",
    version,
    publishedStable,
    changedPaths: result.changedPaths,
  }),
);
