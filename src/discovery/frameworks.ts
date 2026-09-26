/**
 * Framework detection via config resolution (Sprint-Plan W3-01, R8).
 *
 * Detection follows resolved config files, not just dependency presence:
 *  - Jest:      jest.config.{js,ts,mjs,cjs,json} (follows `preset`/`rootDir`),
 *               or "jest" key in package.json
 *  - Vitest:    vitest.config.{ts,js,mts,cts}
 *  - Playwright: playwright.config.{ts,js} / @playwright/test dependency
 *
 * When nothing is detectable we report `unknown` and the scanner analyzes
 * all test-looking files — stated honestly in output rather than guessed.
 *
 * ## One ID space (plan V5-024)
 *
 * This detector used to declare its own `TestFramework` union of three
 * literals while `src/frameworks/framework-inventory.ts` catalogued fourteen
 * framework ids. Two vocabularies for one concept is how a support matrix
 * starts disagreeing with what the tool actually detects: a framework can be
 * catalogued as OFFICIAL_PARTIAL and never once be emitted by the code that
 * claims to detect it.
 *
 * So the ids here are `FrameworkId`s — the inventory's own vocabulary — and
 * `DETECTABLE_TEST_FRAMEWORKS` is the subset this detector can actually
 * resolve from a checkout. That subset is the HONEST limit of detection, and
 * `detectableVsCatalogued()` reports the remainder rather than letting a
 * three-item list read as the whole catalog.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Workspace } from "../discovery/workspace.js";
import {
  FRAMEWORK_INVENTORY,
  type FrameworkId,
} from "../frameworks/framework-inventory.js";

/**
 * The catalogued frameworks whose detection is implemented today.
 *
 * Every entry must exist in the inventory — enforced by the parity spec, not
 * by comment.
 */
export const DETECTABLE_TEST_FRAMEWORKS = [
  "jest",
  "vitest",
  "playwright",
] as const satisfies readonly FrameworkId[];

/** The detection output type, in the inventory's vocabulary. */
export type DetectedFramework = (typeof DETECTABLE_TEST_FRAMEWORKS)[number];

export interface FrameworkInfo {
  /** Detected frameworks, as inventory ids. */
  frameworks: DetectedFramework[];
  /** True when no config evidence was found at all. */
  unknown: boolean;
}

/**
 * Catalogued test frameworks this detector does NOT detect.
 *
 * Reported rather than hidden: "we found jest" and "we found jest and nothing
 * else is installed" are different claims, and only the second is a claim about
 * the whole catalog.
 */
export function detectableVsCatalogued(): {
  detectable: readonly FrameworkId[];
  notDetectable: FrameworkId[];
} {
  const testFrameworks = FRAMEWORK_INVENTORY.filter(
    (entry) =>
      entry.entityType === "TEST_FRAMEWORK" ||
      entry.entityType === "E2E_FRAMEWORK",
  ).map((entry) => entry.frameworkId);
  return {
    detectable: DETECTABLE_TEST_FRAMEWORKS,
    notDetectable: testFrameworks.filter(
      (id) => !(DETECTABLE_TEST_FRAMEWORKS as readonly string[]).includes(id),
    ),
  };
}

const CONFIG_FILES: Record<DetectedFramework, string[]> = {
  jest: [
    "jest.config.ts",
    "jest.config.js",
    "jest.config.mjs",
    "jest.config.cjs",
    "jest.config.json",
  ],
  vitest: [
    "vitest.config.ts",
    "vitest.config.js",
    "vitest.config.mts",
    "vitest.config.cts",
  ],
  playwright: ["playwright.config.ts", "playwright.config.js"],
};

export function detectFrameworks(ws: Workspace): FrameworkInfo {
  const found = new Set<DetectedFramework>();

  // 1. Config files are the strongest signal.
  for (const fw of DETECTABLE_TEST_FRAMEWORKS) {
    if (CONFIG_FILES[fw].some((f) => existsSync(join(ws.root, f)))) {
      found.add(fw);
    }
  }

  // 2. package.json "jest" key (inline config).
  if (!found.has("jest") && ws.packageJson["jest"] !== undefined) {
    found.add("jest");
  }

  // 3. Dependencies — weakest signal, but confirms intent when a config
  //    file was already seen; alone it is NOT enough for jest/vitest
  //    because repos often carry transitive test deps.
  const deps = {
    ...(ws.packageJson["dependencies"] as Record<string, string> | undefined),
    ...(ws.packageJson["devDependencies"] as
      Record<string, string> | undefined),
  };
  if (deps["@playwright/test"]) found.add("playwright");

  // A repo with vitest.config but only jest deps still runs vitest —
  // config wins. But a repo with ONLY deps and no configs stays unknown
  // unless exactly one framework's runner dep is present.
  if (found.size === 0) {
    if (deps["vitest"]) return { frameworks: ["vitest"], unknown: false };
    if (deps["jest"]) return { frameworks: ["jest"], unknown: false };
    return { frameworks: [], unknown: true };
  }

  // Sort for deterministic output, in the inventory's order.
  return {
    frameworks: DETECTABLE_TEST_FRAMEWORKS.filter((f) => found.has(f)),
    unknown: false,
  };
}
