/**
 * QA-PW-119 — Test writes state read by later tests (order dependence).
 * Severity: error · Confidence: medium · heuristic-risk
 * A test that mutates module-level/shared state for others to read is
 * the classic hidden-order-dependency bug.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const pwOrderDependence = defineRule({
  id: "QA-PW-119",
  category: "QA-PW",
  title: "Test depends on execution order",
  severity: "error",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "FALSE-GREEN",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "regex pattern",
  introduced: "0.3.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!/\.(spec|test)\.[tj]sx?$/.test(ctx.path)) return findings;

    // Module-level `let x` assigned inside one test — a smell that another
    // test reads it. (const at module level is fine.)
    const declRe = /^let\s+([\w{}[\], :]+?)(?:\s*=\s*[^;]+)?;?\s*$/gm;
    const shared = new Set<string>();
    let d: RegExpExecArray | null;
    while ((d = declRe.exec(ctx.text)) !== null) {
      for (const name of (d[1] ?? "").split(/[,]/)) {
        const n = name.trim().split(/[:\s]/)[0];
        if (n) shared.add(n);
      }
    }

    // Assignment to those names inside a test body. Assignments inside
    // beforeEach/beforeAll/afterEach/afterAll are the LEGITIMATE setup
    // pattern (fresh state per test) and must not be flagged.
    const hookRanges: Array<[number, number]> = [];
    const hookRe =
      /\b(?:beforeEach|beforeAll|afterEach|afterAll)\s*\(\s*(?:async\s*)?\(/g;
    let h: RegExpExecArray | null;
    while ((h = hookRe.exec(ctx.text)) !== null) {
      const open = ctx.text.indexOf("{", h.index + h[0].length - 1);
      if (open === -1) continue;
      let depth = 0;
      let end = open;
      for (let i = open; i < ctx.text.length; i++) {
        if (ctx.text[i] === "{") depth++;
        else if (ctx.text[i] === "}") {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      hookRanges.push([h.index, end]);
    }
    const inHook = (idx: number) =>
      hookRanges.some(([s, e]) => idx > s && idx < e);

    for (const name of shared) {
      const assignRe = new RegExp(
        `(?:^|[^\\w.])(?:await\\s+)?${name}\\s*=[^=]`,
        "g",
      );
      let a: RegExpExecArray | null;
      while ((a = assignRe.exec(ctx.text)) !== null) {
        if (inHook(a.index)) continue; // setup hooks are fine
        findings.push({
          severity: "error",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(ctx.text, a.index),
          column: colAt(ctx.text, a.index),
          message: `\`${name}\` is module-level mutable state assigned in a test.`,
          why: "Tests reading state that another test wrote pass only in one execution order — shuffle the order (or parallelize) and they fail mysteriously.",
          fix: "Create the state inside each test that needs it, or use beforeAll explicitly with cleanup in afterAll.",
        });
        break; // one finding per variable
      }
    }
    return findings;
  },
});

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
