import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkVersionSurfaceEnvelope,
  synchronizeVersionSurfaceEnvelope,
  VERSION_SURFACE_PATHS,
} from "../../src/release/version-surface.js";

const ROOT = join(import.meta.dirname, "..", "..");
const version = (
  JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    version: string;
  }
).version;
const packageSpec = `mjolnir-qa@${version}`;
const surfaces = Object.fromEntries(
  VERSION_SURFACE_PATHS.map((path) => [
    path,
    readFileSync(join(ROOT, path), "utf8"),
  ]),
);

describe("version surface envelope", () => {
  it("binds every executable release surface to the package version", () => {
    expect(checkVersionSurfaceEnvelope(version, surfaces)).toEqual([]);
  });

  it("reports stale and mutable version surfaces", () => {
    const violations = checkVersionSurfaceEnvelope("9.9.9", {
      ...surfaces,
      "smithery.yaml": (surfaces["smithery.yaml"] ?? "").replace(
        packageSpec,
        "mjolnir-qa@latest",
      ),
    });
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("src/engine/version.ts"),
        expect.stringContaining("action.yml"),
        expect.stringContaining("smithery.yaml"),
        expect.stringContaining("README.md"),
        expect.stringContaining("site/guide/ci.md"),
        expect.stringContaining("docs/DISTRIBUTION-KIT.md"),
      ]),
    );
  });

  it("synchronizes every mutable literal without changing source consumers", () => {
    const result = synchronizeVersionSurfaceEnvelope("9.9.9", {
      ...surfaces,
      "smithery.yaml": (surfaces["smithery.yaml"] ?? "").replace(
        packageSpec,
        "mjolnir-qa@latest",
      ),
    });
    expect(result.changedPaths).toEqual(
      expect.arrayContaining([
        "src/engine/version.ts",
        "action.yml",
        "smithery.yaml",
        "site/.vitepress/theme/Home.vue",
      ]),
    );
    expect(checkVersionSurfaceEnvelope("9.9.9", result.surfaces)).toEqual([]);
    expect(result.surfaces["src/mcp/server.ts"]).toBe(
      surfaces["src/mcp/server.ts"],
    );
  });

  it("reports missing surfaces", () => {
    expect(
      checkVersionSurfaceEnvelope(version, { ...surfaces, "action.yml": "" }),
    ).toContain("action.yml: missing");
  });
});
