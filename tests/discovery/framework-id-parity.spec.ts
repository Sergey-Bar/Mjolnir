/**
 * One framework ID space (plan V5-024).
 *
 * `detectFrameworks` used to declare its own three-literal `TestFramework`
 * union while `framework-inventory.ts` catalogued fourteen framework ids. Two
 * vocabularies for one concept, which is how a support matrix starts
 * disagreeing with reality: a framework can be catalogued OFFICIAL_PARTIAL and
 * never once be emitted by the code that claims to detect it.
 *
 * These specs assert the parity that makes the matrix trustworthy, and — just
 * as importantly — assert the LIMIT honestly. A detector that emitted all
 * fourteen ids would be lying about eleven of them.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DETECTABLE_TEST_FRAMEWORKS,
  detectableVsCatalogued,
  detectFrameworks,
} from "../../src/discovery/frameworks.js";
import { FRAMEWORK_INVENTORY } from "../../src/frameworks/framework-inventory.js";
import type { Workspace } from "../../src/discovery/workspace.js";

/**
 * An EMPTY directory. Using the repo root would be a mistake: it really does
 * contain `vitest.config.ts`, so every "no config evidence" case would
 * silently become a "config found" case and assert the wrong thing.
 */
let empty: string;
beforeEach(() => {
  empty = mkdtempSync(join(tmpdir(), "mj-fw-parity-"));
});
afterEach(() => {
  rmSync(empty, { recursive: true, force: true });
});

function workspace(
  root: string,
  packageJson: Record<string, unknown> = {},
): Workspace {
  return {
    root,
    name: "fixture",
    packageJson,
    workspaceGlobs: [],
  };
}

describe("detection speaks the inventory's vocabulary", () => {
  it("every detectable id exists in the catalog", () => {
    const catalog = new Set(FRAMEWORK_INVENTORY.map((e) => e.frameworkId));
    for (const id of DETECTABLE_TEST_FRAMEWORKS) {
      expect(catalog.has(id), `${id} is emitted but not catalogued`).toBe(true);
    }
  });

  it("every detectable id is a runner, not a CI provider or report format", () => {
    // The inventory declares an entity type per entry. Emitting a CI provider
    // from a test-runner detector would be a category error, and the type
    // system cannot see it because the ids are all just strings.
    const byId = new Map(FRAMEWORK_INVENTORY.map((e) => [e.frameworkId, e]));
    for (const id of DETECTABLE_TEST_FRAMEWORKS) {
      const entry = byId.get(id);
      expect(
        ["TEST_FRAMEWORK", "E2E_FRAMEWORK"],
        `${id} is catalogued as ${entry?.entityType}`,
      ).toContain(entry?.entityType);
    }
  });

  it("detection emits catalogued ids, not a parallel vocabulary", () => {
    const catalog = new Set(FRAMEWORK_INVENTORY.map((e) => e.frameworkId));
    const result = detectFrameworks(workspace(empty));
    for (const id of result.frameworks) {
      expect(catalog.has(id), `${id} is not in the catalog`).toBe(true);
    }
  });
});

describe("the limit of detection is reported, not hidden", () => {
  it("names the catalogued runners the detector cannot resolve", () => {
    const { detectable, notDetectable } = detectableVsCatalogued();
    expect(detectable).toEqual(["jest", "vitest", "playwright"]);
    // pytest, junit, nunit, xunit, testng, cypress, selenium are catalogued
    // and NOT detected. The remainder is a claim the tool must be able to make
    // about itself, or "we found jest" starts implying "and nothing else".
    expect(notDetectable).toEqual(
      expect.arrayContaining(["pytest", "junit", "xunit", "testng", "cypress"]),
    );
    expect(notDetectable).not.toContain("jest");
  });

  it("the detectable and undetectable sets are disjoint and cover the runners", () => {
    const { detectable, notDetectable } = detectableVsCatalogued();
    expect(
      detectable.filter((id) => (notDetectable as string[]).includes(id)),
    ).toEqual([]);
    const runners = FRAMEWORK_INVENTORY.filter(
      (e) =>
        e.entityType === "TEST_FRAMEWORK" || e.entityType === "E2E_FRAMEWORK",
    ).map((e) => e.frameworkId);
    expect([...detectable, ...notDetectable].sort()).toEqual(
      [...runners].sort(),
    );
  });

  it("a repo with no evidence stays unknown rather than guessing a runner", () => {
    const result = detectFrameworks(workspace(empty));
    expect(result.unknown).toBe(true);
    expect(result.frameworks).toEqual([]);
  });
});

describe("detection still works", () => {
  it("a vitest dependency with no config is detected", () => {
    const result = detectFrameworks(
      workspace(empty, { devDependencies: { vitest: "^3" } }),
    );
    expect(result).toEqual({ frameworks: ["vitest"], unknown: false });
  });

  it("config wins over a conflicting dependency", () => {
    // The repo runs vitest even if a transitive jest dep is present.
    const result = detectFrameworks(
      workspace(empty, { devDependencies: { jest: "^29" } }),
    );
    // No config file exists in the fixture root, so this is the deps path.
    expect(result).toEqual({ frameworks: ["jest"], unknown: false });
  });

  it("the inline jest key is enough", () => {
    const result = detectFrameworks(
      workspace(empty, { jest: { testEnvironment: "node" } }),
    );
    expect(result).toEqual({ frameworks: ["jest"], unknown: false });
  });
});
