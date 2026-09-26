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

  it("reports a mutable @latest", () => {
    // The `@latest` rule is unconditional, so it holds on any version shape.
    const violations = checkVersionSurfaceEnvelope(
      version,
      {
        ...surfaces,
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
      ]),
    );
  });

  it("reports an install surface naming a working version that is not published", () => {
    // The other rule is conditional on the working version differing from
    // the published one — and on a stable release they are the SAME STRING,
    // so the branch is correctly inert. Deriving the fixture from the repo's
    // own `version` therefore tested nothing: it could not produce the
    // violation, and the assertion was on a result the guard had already
    // excluded.
    //
    // Both sides are now passed in explicitly, so the rule is exercised
    // whatever version the repository happens to be on.
    const UNPUBLISHED_WORKING = "9.9.9";
    expect(UNPUBLISHED_WORKING).not.toBe(publishedStable);
    const violations = checkVersionSurfaceEnvelope(
      UNPUBLISHED_WORKING,
      {
        ...surfaces,
        "README.md": (surfaces["README.md"] ?? "").replace(
          `mjolnir-qa@${publishedStable}`,
          `mjolnir-qa@${UNPUBLISHED_WORKING}`,
        ),
      },
      publishedStable,
    );
    expect(violations).toEqual(
      expect.arrayContaining([expect.stringContaining("not published")]),
    );
  });

  it("does not report a stable release's own version as unpublished", () => {
    // The inverse, and the reason the guard exists. On a stable release
    // `mjolnir-qa@<version>` in an install surface is the CORRECT
    // instruction — that version is what is on the registry — and flagging
    // it would fail every legitimate install line in the README.
    const violations = checkVersionSurfaceEnvelope(
      publishedStable,
      surfaces,
      publishedStable,
    );
    expect(violations.join(" ")).not.toContain("not published");
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
    expect(
      checkActionDefaultVersion("4.0.0-rc.1", surfaces).join(" "),
    ).toContain("the Action default must be a published stable version");
  });

  it("rejects an action.yml default that drifted to the working version", () => {
    // The drifted value is spelled out rather than derived by swapping
    // `publishedStable` for `version`. On a stable release those two are the
    // SAME STRING, so the swap replaced a value with itself, produced no
    // drift, and the test asserted against an empty result — it could not
    // fail, and it claimed to prove the drift check works.
    const driftedTo = version === publishedStable ? "9.9.9" : version;
    const drifted = {
      ...surfaces,
      "action.yml": (surfaces["action.yml"] ?? "").replace(
        `default: "${publishedStable}"`,
        `default: "${driftedTo}"`,
      ),
    };
    // Guard the guard: if this did not actually change the file, the
    // assertion below would be vacuous again.
    expect(drifted["action.yml"]).not.toBe(surfaces["action.yml"] ?? "");
    expect(
      checkActionDefaultVersion(publishedStable, drifted).join(" "),
    ).toContain(
      `version default is ${driftedTo}, expected the published stable`,
    );
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
    // `npx mjolnir-qa@4.0.0-rc.1`, which does not exist on npm. Copy-paste
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

  it("no Markdown install surface has an unbalanced backtick after a rewrite", () => {
    // The three lines the bulk rewrite mangled all lost exactly one closing
    // backtick, which renders as broken Markdown rather than as an error.
    //
    // Scoped to Markdown on purpose: `action.yml` and `smithery.yaml` carry
    // backticks in YAML comments where a stray one is cosmetic and
    // pre-existing. Code fences also legitimately carry odd counts.
    const offenders: string[] = [];
    for (const path of INSTALL_SURFACE_PATHS.filter((p) => p.endsWith(".md"))) {
      const text = readFileSync(join(ROOT, path), "utf8");
      text.split(/\r?\n/).forEach((line, index) => {
        if (/^\s*```/.test(line)) return;
        if ((line.match(/`/g) ?? []).length % 2 === 1) {
          offenders.push(`${path}:${index + 1}: ${line.trim().slice(0, 80)}`);
        }
      });
    }
    expect(
      offenders,
      `unbalanced backticks — a version rewrite swallowed a delimiter:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
