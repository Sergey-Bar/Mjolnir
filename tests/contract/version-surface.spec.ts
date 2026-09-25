import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkActionDefaultVersion,
  checkVersionSurfaceEnvelope,
  synchronizeVersionSurfaceEnvelope,
  VERSION_SURFACE_PATHS,
} from "../../src/release/version-surface.js";

const ROOT = join(import.meta.dirname, "..", "..");
const { version, publishedStable } = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
) as {
  version: string;
  publishedStable: string;
};
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
        expect.stringContaining("smithery.yaml"),
        expect.stringContaining("README.md"),
        expect.stringContaining("site/guide/ci.md"),
        expect.stringContaining("docs/DISTRIBUTION-KIT.md"),
      ]),
    );
  });

  it("synchronizes every mutable literal without changing source consumers", () => {
    const result = synchronizeVersionSurfaceEnvelope(
      "9.9.9",
      {
        ...surfaces,
        "smithery.yaml": (surfaces["smithery.yaml"] ?? "").replace(
          packageSpec,
          "mjolnir-qa@latest",
        ),
      },
      publishedStable,
    );
    expect(result.changedPaths).toEqual(
      expect.arrayContaining([
        "src/engine/version.ts",
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

describe("action default version is the published stable release", () => {
  it("matches the recorded published stable version", () => {
    expect(checkActionDefaultVersion(publishedStable, surfaces)).toEqual([]);
  });

  it("rejects a prerelease as the published stable record", () => {
    // A release candidate exists only in this repository. Naming one as the
    // default means every consumer who pins nothing gets a 404.
    expect(
      checkActionDefaultVersion("4.0.0-rc.1", surfaces).join(" "),
    ).toContain("the Action default must be a published stable version");
  });

  it("rejects an action.yml default that drifted to the working version", () => {
    const drifted = {
      ...surfaces,
      "action.yml": (surfaces["action.yml"] ?? "").replace(
        `default: "${publishedStable}"`,
        `default: "${version}"`,
      ),
    };
    expect(
      checkActionDefaultVersion(publishedStable, drifted).join(" "),
    ).toContain(`version default is ${version}, expected the published stable`);
  });

  it("rejects a malformed published stable record", () => {
    expect(checkActionDefaultVersion("not-a-version", surfaces)).toEqual([
      "publishedStable: invalid semver not-a-version",
    ]);
  });

  it("reports an action.yml with no version input", () => {
    expect(
      checkActionDefaultVersion(publishedStable, {
        ...surfaces,
        "action.yml": "name: x\n",
      }),
    ).toEqual(["action.yml: version input missing"]);
  });
});
