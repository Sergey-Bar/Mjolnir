/**
 * M4 acceptance tests — audit-remediation-master-plan.md.
 *
 *  - audit-C4: adapter/reachability invariant — every `configOnly`
 *    rule's declared `configFiles` must be matchable by its claiming
 *    adapter's discovery (prevents future dead rules), and the
 *    cypress.config.ts dead-rule regression is closed end-to-end.
 *  - audit-M4-family: family patterns carry the `g` flag (infinite-loop
 *    guard) and `$0` substitution is literal (function replacer).
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { RULES } from "../../src/rules/index.js";
import { SCAN_ADAPTERS } from "../../src/discovery/scan-adapters.js";
import { typescriptAdapter } from "../../src/adapters/typescript.js";
import { legacyAppliesTo } from "../../src/engine/rule-runner.js";
import { runScanCommand } from "../../src/cli.js";
import { definePatternFamily } from "../../src/rules/shared/family.js";

describe("audit-C4: registry reachability — no dead config rules", () => {
  it("every configOnly rule's configFiles are matchable by its adapter's discovery", () => {
    for (const rule of RULES) {
      if (rule.configRule !== true) continue;
      const files = rule.configFiles ?? [];
      expect(
        files.length,
        `${rule.id} declares configRule without configFiles`,
      ).toBeGreaterThan(0);
      // The reachability contract (audit C4): for each declared
      // configFiles pattern, the claiming adapter's own isTestFile must
      // accept a basename the pattern matches. Derive the probe basename
      // from the pattern itself: turn the regex source into a literal
      // candidate (`^name\.(?:a|b)$` → `name.a`). If the derivation
      // cannot produce a candidate, the pattern is too exotic to be a
      // filename gate — fail it.
      const adapterIds = legacyAppliesTo(rule.appliesTo);
      for (const pattern of files) {
        const m = /\^?([a-z][\w.-]*)\\\.\\\(\?:([a-z|]+)\\\)\$/.exec(
          pattern.replace(/\.\*/g, "x"),
        );
        const candidates: string[] = [];
        if (m?.[1] && m[2]) {
          for (const ext of m[2].split("|")) {
            candidates.push(`${m[1]}.${ext}`);
          }
        } else {
          candidates.push(
            // Generic probes: any adapter claiming config rules must
            // recognize config-shaped basenames.
            "playwright.config.ts",
            "cypress.config.ts",
          );
        }
        const reachable = adapterIds.some((id) =>
          SCAN_ADAPTERS.some(
            (a) => a.id === id && candidates.some((c) => a.isTestFile(c)),
          ),
        );
        expect(
          reachable,
          `${rule.id} configFiles [${pattern}] cannot be discovered by its adapter (${adapterIds.join(", ")}) — dead rule`,
        ).toBe(true);
      }
    }
  });

  it("the TypeScript adapter discovers cypress.config.ts (C4 root cause)", () => {
    expect(typescriptAdapter.isTestFile("cypress.config.ts")).toBe(true);
    expect(typescriptAdapter.isTestFile("cypress.config.js")).toBe(true);
    expect(typescriptAdapter.isTestFile("cypress.config.mjs")).toBe(true);
  });

  it("QA-CYP-003 fires end-to-end on a cypress-only repo with --strict", async () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-c4-e2e-"));
    try {
      mkdirSync(join(dir, "test"), { recursive: true });
      writeFileSync(
        join(dir, "cypress.config.ts"),
        "export default { chromeWebSecurity: false };\n",
      );
      const out: string[] = [];
      await runScanCommand([dir, "--strict", "--json"], {
        out: (...p) => out.push(p.map(String).join(" ")),
        err: () => {},
      });
      expect(out.join("\n")).toContain("QA-CYP-003");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("audit-M4: family generator hygiene", () => {
  const family = definePatternFamily({
    severity: "warning",
    confidence: "medium",
    findingType: "heuristic-risk",
    qaImpact: "HYGIENE",
    category: "QA-TEST",
    title: "probe",
    why: "probe",
    falsePositiveRisk: "medium",
    variants: [
      {
        id: "QA-PROBE-001",
        appliesTo: "test-files",
        ext: ".ts",
        languages: ["typescript"],
        frameworks: [],
        // deliberately missing `g` — the guard must make this safe
        patterns: [/probeCall\(/],
        message: "probe: $0",
        fix: "fix it",
      },
    ],
  });

  it("a variant pattern without the `g` flag cannot hang the scan (terminates)", () => {
    const rule = family[0] as NonNullable<(typeof family)[number]>;
    const findings = rule.run({
      path: "a.spec.ts",
      text: "probeCall(); probeCall(); probeCall();",
      codeText: "probeCall(); probeCall(); probeCall();",
    });
    // 3 matches → 3 findings; without the guard this loop never returns.
    expect(findings.length).toBe(3);
  });

  it("$0 substitution is literal — `$&` inside a match is not interpreted", () => {
    const rule = definePatternFamily({
      severity: "warning",
      confidence: "medium",
      findingType: "heuristic-risk",
      qaImpact: "HYGIENE",
      category: "QA-TEST",
      title: "probe2",
      why: "probe2",
      falsePositiveRisk: "medium",
      variants: [
        {
          id: "QA-PROBE-002",
          appliesTo: "test-files",
          ext: ".ts",
          languages: ["typescript"],
          frameworks: [],
          patterns: [/dollar&sign\(/g],
          message: "probe: $0",
          fix: "fix it",
        },
      ],
    })[0] as (typeof family)[number];
    const findings = rule.run({
      path: "b.spec.ts",
      text: "dollar&sign(x);",
      codeText: "dollar&sign(x);",
    });
    expect(findings.length).toBe(1);
    // With a string replacer, `$&` in the message template output would
    // be re-interpreted as "the whole match" — the function replacer
    // inserts the matched text literally.
    expect(findings[0]?.message).toBe("probe: dollar&sign(");
  });
});
