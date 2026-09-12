/**
 * QA-PW-124 revision-2 regression lock (certification-audit Phase 3, D3+G4):
 * the D3 metadata alignment (configRule/configFiles + detectorRevision: 2)
 * is the exact class the manifest guards. This spec locks, against the
 * LIVE registry and manifest: (a) QA-PW-124 declares revision 2 and is
 * adapter-gated; (b) the committed manifest agrees with a fresh
 * computation for that rule (drift = stale manifest = doctor FAIL).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { RULES } from "../../src/rules/index.js";
import {
  computeDetectorHashes,
  declaredRevision,
} from "../../src/engine/detector-hash.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("QA-PW-124 D3 regression lock (G4)", () => {
  const rule = RULES.find((r) => r.id === "QA-PW-124");
  if (!rule) throw new Error("QA-PW-124 missing from the registry");

  it("QA-PW-124 is registered, adapter-gated, and declares detectorRevision 2", () => {
    expect(rule.configRule).toBe(true);
    expect(Array.isArray(rule.configFiles)).toBe(true);
    expect(declaredRevision(rule)).toBe(2);
  });

  it("the committed manifest agrees with a fresh computation for QA-PW-124", () => {
    const committed = JSON.parse(
      readFileSync(
        join(ROOT, "tests", "corpus", "detector-hashes.json"),
        "utf8",
      ),
    ) as Record<string, { logicHash: string; detectorRevision: number }>;
    const fresh = computeDetectorHashes(RULES, join(ROOT, "src", "rules"));
    expect(committed["QA-PW-124"]).toEqual(fresh["QA-PW-124"]);
    // And the whole manifest reconciles — the doctor's check A+B, proven
    // here without spawning the CLI.
    expect(committed).toEqual(fresh);
  });
});
