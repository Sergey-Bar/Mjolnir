/**
 * QA-PW-119 — Test writes state read by later tests (order dependence).
 * Severity: error · Confidence: medium · heuristic-risk
 * A test that mutates module-level/shared state for others to read is
 * the classic hidden-order-dependency bug.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

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
    const text = ctx.codeText ?? ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    if (!/\.(spec|test)\.[tj]sx?$/.test(ctx.path)) return findings;

    // Module-level `let x` assigned inside one test — a smell that another
    // test reads it. (const at module level is fine.)
    //
    // Simple identifiers only (optionally a comma list, optionally a type
    // annotation). Destructuring — `let [a, b] = …`, `let { page } = …` —
    // is deliberately skipped: splitting `[a, b]` on `,` used to yield
    // junk "names" like `[a` that were then interpolated into a RegExp.
    const declRe =
      /^let\s+([A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)*)(?:\s*:[^=;\n]+)?\s*(?:=|;|$)/gm;
    const shared = new Set<string>();
    let d: RegExpExecArray | null;
    while ((d = declRe.exec(text)) !== null) {
      for (const name of (d[1] as string).split(",")) {
        // declRe requires [A-Za-z_$] before every comma-separated entry.
        shared.add(name.trim());
      }
    }

    // Assignment to those names inside a test body. Assignments inside
    // beforeEach/beforeAll/afterEach/afterAll are the LEGITIMATE setup
    // pattern (fresh state per test) and must not be flagged.
    const hookRanges: Array<[number, number]> = [];
    const hookRe =
      /\b(?:beforeEach|beforeAll|afterEach|afterAll)\s*\(\s*(?:async\s*)?/g;
    let h: RegExpExecArray | null;
    while ((h = hookRe.exec(text)) !== null) {
      // Locate the callback BODY brace, not a destructured-param brace:
      // `beforeEach(async ({ page }) => { … })`. Walk from the match end,
      // skip a balanced param list `(...)`, then take the first `{` (an
      // arrow body); tolerate `function (…) {` too.
      let cursor = h.index + h[0].length;
      if (text[cursor] === "(") {
        let d = 0;
        for (; cursor < text.length; cursor++) {
          if (text[cursor] === "(") d++;
          else if (text[cursor] === ")") {
            d--;
            if (d === 0) {
              cursor++;
              break;
            }
          }
        }
      }
      const open = text.indexOf("{", cursor);
      if (open === -1) continue;
      let depth = 0;
      let end = open;
      for (let i = open; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") {
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
      while ((a = assignRe.exec(text)) !== null) {
        if (inHook(a.index)) continue; // setup hooks are fine
        findings.push({
          severity: "error",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: lineAt(text, a.index),
          column: colAt(text, a.index),
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
