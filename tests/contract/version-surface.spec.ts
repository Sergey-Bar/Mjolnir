import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkActionDefaultVersion,
  checkVersionSurfaceEnvelope,
  INSTALL_SURFACE_PATHS,
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

const INSTALL_PREFIXES = [
  "npx ",
  "npx --yes ",
  "npx -y ",
  "npm i -g ",
  '"-y", "',
];
const installedVersions = (text: string): string[] => {
  const versions: string[] = [];
  for (const prefix of INSTALL_PREFIXES) {
    const token = `${prefix}mjolnir-qa@`;
    let offset = text.indexOf(token);
    while (offset >= 0) {
      const start = offset + token.length;
      const rest = text.slice(start);
      const terminator = rest.search(/[ \t\r\n"'`]/u);
      versions.push(rest.slice(0, terminator < 0 ? undefined : terminator));
      offset = text.indexOf(token, start);
    }
  }
  return versions;
};
const surfaces = Object.fromEntries(
  VERSION_SURFACE_PATHS.map((path) => [
    path,
    readFileSync(join(ROOT, path), "utf8"),
  ]),
);

describe("version surface envelope", () => {
  it("binds every executable release surface to the package version", () => {
    expect(
      checkVersionSurfaceEnvelope(version, surfaces, publishedStable),
    ).toEqual([]);
  });

  it("reports stale identity surfaces but not correctly-pinned install ones", () => {
    // Syncing the WORKING version must not drag the install surfaces with it:
    // they are pinned to the published release, which is exactly the property
    // that keeps `npx mjolnir-qa@…` runnable.
    const violations = checkVersionSurfaceEnvelope(
      "9.9.9",
      surfaces,
      publishedStable,
    );
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("src/engine/version.ts"),
        expect.stringContaining("site/.vitepress/theme/Home.vue"),
      ]),
    );
    expect(violations.join(" ")).not.toContain("README.md");
    expect(violations.join(" ")).not.toContain("DISTRIBUTION-KIT.md");
  });

  it("reports a mutable @latest and an install surface drifted to the working version", () => {
    const driftedInstall = {
      ...surfaces,
      "README.md": (surfaces["README.md"] ?? "").replace(
        `mjolnir-qa@${publishedStable}`,
        `mjolnir-qa@${version}`,
      ),
    };
    const violations = checkVersionSurfaceEnvelope(
      version,
      {
        ...driftedInstall,
        "smithery.yaml": (surfaces["smithery.yaml"] ?? "").replace(
          `mjolnir-qa@${publishedStable}`,
          "mjolnir-qa@latest",
        ),
      },
      publishedStable,
    );
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining("mutable mjolnir-qa@latest is forbidden"),
        expect.stringContaining("not published"),
      ]),
    );
    expect(violations.join(" ")).toContain("README.md");
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
    // Identity surfaces follow the working version, so they change.
    expect(result.changedPaths).toEqual(
      expect.arrayContaining([
        "src/engine/version.ts",
        "site/.vitepress/theme/Home.vue",
      ]),
    );
    // Install surfaces follow the PUBLISHED version, so synchronizing the
    // working version to 9.9.9 must not move them onto an unpublished one.
    expect(result.surfaces["smithery.yaml"]).toBe(
      (surfaces["smithery.yaml"] ?? "").replace(
        /mjolnir-qa@[^"\s]+/g,
        `mjolnir-qa@${publishedStable}`,
      ),
    );
    expect(
      checkVersionSurfaceEnvelope("9.9.9", result.surfaces, publishedStable),
    ).toEqual([]);
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
    expect(checkActionDefaultVersion("4.0.0", surfaces).join(" ")).toContain(
      "the Action default must be a published stable version",
    );
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

describe("no install surface instructs an unpublished version (V5-007)", () => {
  it("every npx/npm install command names a published version", () => {
    // The defect this catches: the README and the site told readers to run
    // `npx mjolnir-qa@4.0.0`, which does not exist on npm. Copy-paste
    // produced a 404 with no explanation. A version *reference* elsewhere in
    // a doc is fine; an install command is a promise.
    const offenders: string[] = [];
    const semver = /^\d+\.\d+\.\d+/;
    for (const path of INSTALL_SURFACE_PATHS) {
      const text = readFileSync(join(ROOT, path), "utf8");
      for (const installed of installedVersions(text)) {
        if (!semver.test(installed)) continue;
        if (installed !== publishedStable) {
          offenders.push(
            `${path}: installs mjolnir-qa@${installed}, expected ${publishedStable}`,
          );
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("the version-reference count per surface is stable, so a hand edit fails", () => {
    // An occurrence-count probe, per the V5-007 DoD. It catches the drift a
    // substring check cannot: a hand-edited surface that keeps ONE correct
    // reference and leaves nine stale ones still passes "contains".
    const counts = INSTALL_SURFACE_PATHS.map(
      (path) =>
        `${path}: ${(readFileSync(join(ROOT, path), "utf8").match(/mjolnir-qa@/g) ?? []).length}`,
    );
    // Recomputed from the committed files; the assertion is that a stale
    // copy is visible as a count change, so the probe is printed in the
    // failure message and compared against the synchronized result below.
    const synced = synchronizeVersionSurfaceEnvelope(
      version,
      { ...surfaces },
      publishedStable,
    );
    const drifted = INSTALL_SURFACE_PATHS.filter(
      (path) => synced.surfaces[path] !== surfaces[path],
    );
    expect(
      drifted,
      `version surfaces differ from the synchronized form:\n${counts.join("\n")}`,
    ).toEqual([]);
  });

  it("the sync is idempotent and does not consume Markdown backticks", () => {
    // The sync once rewrote `` `npx mjolnir-qa@3.0.0` `` into
    // `` `npx mjolnir-qa@3.0.0 `` — the closing backtick was swallowed as
    // part of the version literal, corrupting the translated README.
    const result = synchronizeVersionSurfaceEnvelope(
      version,
      { ...surfaces },
      publishedStable,
    );
    expect(result.changedPaths).toEqual([]);
    for (const path of INSTALL_SURFACE_PATHS) {
      const text = result.surfaces[path] ?? "";
      expect(text, path).not.toMatch(/mjolnir-qa@[^\s"`]+\s+sem/);
    }
  });
});
