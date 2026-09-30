/**
 * T8 — the version-surface drift checks are release-gate code with no reviewer
 * pressure on them.
 *
 * `src/release/version-surface.ts` runs inside `npm run version:check` on
 * every certify, and it is excluded from the coverage ratchet
 * (`docs/COVERAGE-EXEMPTIONS.json` classifies it SHIPPED_SURFACE debt). The
 * existing contract spec covers the happy path and the drift cases somebody
 * hit. What it does not cover is the FAIL-FAST arms — the throws a reader
 * reaches only when a surface is malformed — and those are the arms that turn
 * a hand-edited `action.yml` into an unhelpful `undefined` stack instead of a
 * sentence naming the file.
 *
 * Table-driven for the same reason as the m26 reject arms: the property worth
 * protecting is completeness, and completeness is exactly what a
 * one-example-per-arm suite forgets.
 */

import { describe, expect, it } from "vitest";

import {
  checkActionDefaultVersion,
  checkVersionSurfaceEnvelope,
  IDENTITY_SURFACE_PATHS,
  INSTALL_SURFACE_PATHS,
  synchronizeVersionSurfaceEnvelope,
  VERSION_SURFACE_PATHS,
} from "../../src/release/version-surface.js";

/**
 * The shape of the surface map, restated here rather than imported:
 * VersionSurfaces is deliberately NOT exported by src/release/version-surface.ts, and
 * widening the module's public surface for a test would be the wrong trade. The
 * test builds a fixture, so it states the contract it builds — a path to file
 * contents, with an absent path represented by undefined rather than a hole.
 */
type Surfaces = Record<string, string | undefined>;

const VERSION = "4.1.0";
const STABLE = "4.0.0";

/** A surface set that passes every check, built from the source's own lists. */
function cleanSurfaces(): Surfaces {
  const surfaces: Record<string, string> = {};
  for (const path of VERSION_SURFACE_PATHS) {
    if (path === "action.yml") {
      surfaces[path] = [
        "name: Mjolnir QA",
        "inputs:",
        "  version:",
        "    description: The version to install",
        `    default: "${STABLE}"`,
        "runs:",
        "  using: node20",
        "  main: dist/cli.mjs",
        "",
      ].join("\n");
    } else if (path === "src/engine/version.ts") {
      surfaces[path] = `export const ENGINE_VERSION = "${VERSION}";\n`;
    } else if (path === "src/mcp/server.ts") {
      surfaces[path] =
        'import { ENGINE_VERSION as CLI_VERSION } from "../engine/version.js"\nconst info = { version: CLI_VERSION };\n';
    } else if (path === "src/reporter/sarif.ts") {
      surfaces[path] =
        'import { ENGINE_VERSION } from "../engine/version.js"\nexport const version = ENGINE_VERSION;\n';
    } else if (path === "capability-manifest.json") {
      surfaces[path] =
        `{\n  "product": "mjolnir-qa",\n  "version": "${VERSION}"\n}\n`;
    } else if (path === "smithery.yaml") {
      surfaces[path] =
        `"version": "${STABLE}"\ncommand: npx\nargs: ["-y", "mjolnir-qa@${STABLE}"]\n`;
    } else if (path === "site/.vitepress/theme/Home.vue") {
      surfaces[path] = [
        `<code>npx mjolnir-qa@${STABLE} scan</code>`,
        `<code>mjolnir-qa@${STABLE} mcp serve</code>`,
        `https://github.com/Sergey-Bar/Mjolnir@v4`,
        `version: ${VERSION}`,
        "",
      ].join("\n");
    } else if (path === "README.md") {
      surfaces[path] = `npm i -g mjolnir-qa@${STABLE}\n`;
    } else if (path === "README.br.md") {
      surfaces[path] = `npm i -g mjolnir-qa@${STABLE}\n`;
    } else if (path === "site/guide/getting-started.md") {
      surfaces[path] = `npx mjolnir-qa@${STABLE}\n`;
    } else if (path === "site/guide/ci.md") {
      surfaces[path] = `npx mjolnir-qa@${STABLE}\n`;
    } else if (path === "site/guide/forensics.md") {
      surfaces[path] = `npx mjolnir-qa@${STABLE} forensics\n`;
    } else if (path === "docs/DISTRIBUTION-KIT.md") {
      surfaces[path] = `npx mjolnir-qa@${STABLE}\n`;
    } else {
      surfaces[path] = "";
    }
  }
  return surfaces;
}

describe("T8: the clean surface set the negative arms are measured against", () => {
  it("passes the envelope check and the action-default check", () => {
    const surfaces = cleanSurfaces();
    expect(checkVersionSurfaceEnvelope(VERSION, surfaces, STABLE)).toEqual([]);
    expect(checkActionDefaultVersion(STABLE, surfaces)).toEqual([]);
  });

  it("the surface lists agree with each other, or a check is silently skipped", () => {
    // Every install surface is an identity surface or a version surface; a
    // path in one list and not the other means some loop below never runs
    // over it.
    // `Set<string>`, not `new Set(LITERAL[])`: the exported lists are
    // narrowed to their own literal types, so a set of one cannot be asked
    // about a member of another and the check below would not typecheck —
    // which is the wrong reason for a boundary assertion to be unwriteable.
    const install = new Set<string>(INSTALL_SURFACE_PATHS);
    const identity = new Set<string>(IDENTITY_SURFACE_PATHS);
    const all = new Set<string>(VERSION_SURFACE_PATHS);
    for (const path of install) expect(all.has(path), path).toBe(true);
    for (const path of identity) expect(all.has(path), path).toBe(true);
    // The two roles are disjoint: a surface cannot both report which build
    // is running and tell a reader what to install.
    for (const path of install) expect(identity.has(path), path).toBe(false);
  });
});

describe("T8: the envelope check refuses a version it cannot reason about", () => {
  // `4.1.0-` is deliberately absent. `isValidSemver` is the semver.org
  // reference pattern, and that pattern accepts a lone `-` as a prerelease
  // identifier — a documented quirk of the reference, not a defect here.
  // Changing it would be a deliberate release-gate decision, not a cleanup,
  // so it is left alone rather than silently tightened by a test.
  it.each(["", "4", "4.1", "v4.1.0", "not-a-version", "4.1.0.0.0", "01.1.0"])(
    "refuses %o as a package version, naming the value",
    (bad) => {
      const violations = checkVersionSurfaceEnvelope(
        bad,
        cleanSurfaces(),
        STABLE,
      );
      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain(bad);
    },
  );

  it("names EVERY missing surface, not just the first", () => {
    const surfaces = cleanSurfaces();
    delete surfaces["README.md"];
    delete surfaces["action.yml"];
    const violations = checkVersionSurfaceEnvelope(VERSION, surfaces, STABLE);
    expect(violations.some((v) => v.startsWith("README.md: missing"))).toBe(
      true,
    );
    expect(violations.some((v) => v.startsWith("action.yml: missing"))).toBe(
      true,
    );
  });

  it("catches a Home.vue pinned to a different Action major", () => {
    // The one drift rule the existing suite does not reach: a site that
    // still advertises `Mjolnir@v3` while the CLI is 4.x. Nothing else
    // would notice, because both strings are internally consistent.
    const surfaces = cleanSurfaces();
    surfaces["site/.vitepress/theme/Home.vue"] = surfaces[
      "site/.vitepress/theme/Home.vue"
    ]?.replace("Sergey-Bar/Mjolnir@v4", "Sergey-Bar/Mjolnir@v3");
    const violations = checkVersionSurfaceEnvelope(VERSION, surfaces, STABLE);
    expect(
      violations.some((v) => v.includes("action major v3 does not match v4")),
      violations.join("; "),
    ).toBe(true);
  });
});

describe("T8: the action-default check refuses a malformed action.yml", () => {
  it("refuses an absent action.yml", () => {
    const surfaces = cleanSurfaces();
    delete surfaces["action.yml"];
    expect(checkActionDefaultVersion(STABLE, surfaces)).toEqual([
      "action.yml: missing",
    ]);
  });

  it("refuses an action.yml with no version input", () => {
    const surfaces = cleanSurfaces();
    surfaces["action.yml"] = "name: Mjolnir QA\nruns:\n  using: node20\n";
    expect(checkActionDefaultVersion(STABLE, surfaces)).toEqual([
      "action.yml: version input missing",
    ]);
  });

  it("refuses a version input with no default", () => {
    const surfaces = cleanSurfaces();
    surfaces["action.yml"] = [
      "name: Mjolnir QA",
      "inputs:",
      "  version:",
      "    description: The version to install",
      "runs:",
      "  using: node20",
      "",
    ].join("\n");
    expect(checkActionDefaultVersion(STABLE, surfaces)).toEqual([
      "action.yml: version default missing",
    ]);
  });

  it("a malformed publishedStable is refused before the file is even read", () => {
    // Ordering matters: a bad record must not be masked by a good file, and
    // a good file must not be blamed for a bad record.
    expect(checkActionDefaultVersion("4.0", cleanSurfaces())).toEqual([
      "publishedStable: invalid semver 4.0",
    ]);
  });
});

describe("T8: synchronization fails loudly rather than writing half a truth", () => {
  it("refuses to start from a version it cannot parse", () => {
    expect(() =>
      synchronizeVersionSurfaceEnvelope("nope", cleanSurfaces(), STABLE),
    ).toThrow(/invalid version: nope/);
  });

  it("refuses when a surface it must rewrite is absent", () => {
    const surfaces = cleanSurfaces();
    delete surfaces["README.md"];
    expect(() =>
      synchronizeVersionSurfaceEnvelope(VERSION, surfaces, STABLE),
    ).toThrow(/README\.md: missing/);
  });

  it("refuses when the literal it is meant to rewrite is gone", () => {
    // A hand-edit that removed the version assignment. Silently writing a
    // file that no longer carries the version would leave the drift in place
    // while reporting success.
    const surfaces = cleanSurfaces();
    surfaces["src/engine/version.ts"] = "// the version moved\n";
    expect(() =>
      synchronizeVersionSurfaceEnvelope(VERSION, surfaces, STABLE),
    ).toThrow(/src\/engine\/version\.ts: version literal missing/);
  });

  it("refuses when the literal runs to the end of the file", () => {
    const surfaces = cleanSurfaces();
    surfaces["src/engine/version.ts"] =
      'export const ENGINE_VERSION = "4.0.0-with-no-terminator';
    expect(() =>
      synchronizeVersionSurfaceEnvelope(VERSION, surfaces, STABLE),
    ).toThrow(/version literal is malformed/);
  });

  it("refuses when action.yml has no version input to rewrite", () => {
    const surfaces = cleanSurfaces();
    surfaces["action.yml"] = "name: Mjolnir QA\n";
    expect(() =>
      synchronizeVersionSurfaceEnvelope(VERSION, surfaces, STABLE),
    ).toThrow(/action\.yml: version input missing/);
  });

  it("refuses when a rewrite still leaves the envelope inconsistent", () => {
    // The post-condition arm. If a new surface were added to the required
    // map but not to the rewrite loop, the sync would "succeed" and the next
    // `version:check` would fail — a gate that breaks itself.
    const surfaces = cleanSurfaces();
    surfaces["docs/DISTRIBUTION-KIT.md"] = "# distribution kit\n";
    expect(() =>
      synchronizeVersionSurfaceEnvelope(VERSION, surfaces, STABLE),
    ).toThrow(/version surface synchronization failed/);
  });

  it("a sync with nothing to do changes nothing", () => {
    // The control for every throw above, and the property a hand-driven
    // release depends on: if a sync reports a change for an already
    // consistent tree, the operator is told to commit a diff they cannot
    // explain, and the next one stops reading the output.
    const result = synchronizeVersionSurfaceEnvelope(
      VERSION,
      cleanSurfaces(),
      STABLE,
    );
    expect(
      result.changedPaths,
      `a no-op sync rewrote ${result.changedPaths.join(", ")}`,
    ).toEqual([]);
  });

  it("a successful sync rewrites only the surface that had drifted", () => {
    const surfaces = cleanSurfaces();
    surfaces["src/engine/version.ts"] =
      'export const ENGINE_VERSION = "3.9.0";\n';
    const result = synchronizeVersionSurfaceEnvelope(VERSION, surfaces, STABLE);
    expect(result.changedPaths).toContain("src/engine/version.ts");
    expect(result.surfaces["src/engine/version.ts"]).toContain(VERSION);
    // The post-condition: after the rewrite, the envelope is consistent.
    // Without this, "it returned" would be a complete description.
    expect(
      checkVersionSurfaceEnvelope(VERSION, result.surfaces, STABLE),
    ).toEqual([]);
  });
});
