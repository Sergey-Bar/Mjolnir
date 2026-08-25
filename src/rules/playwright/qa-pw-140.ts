/**
 * QA-PW-140 — Screenshot without maxDiffPixelRatio.
 *
 * A visual snapshot with no tolerance bound flakes on sub-pixel rendering
 * differences (fonts, GPU, CI vs local). Every toHaveScreenshot call should
 * declare either maxDiffPixelRatio or maxDiffPixels so diffs are intentional,
 * not environmental noise (anti-creep law §18.1).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const qaPw140 = defineRule({
  id: "QA-PW-140",
  category: "QA-PW",
  title: "Screenshot without maxDiffPixelRatio",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
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

    const re = /toHaveScreenshot\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      const openParen = m.index + m[0].length - 1;
      const closeParen = matchParen(ctx.text, openParen);
      // Unbalanced parens: bail rather than guess the argument list.
      if (closeParen === -1) continue;
      const args = ctx.text.slice(openParen + 1, closeParen);

      if (
        !/maxDiffPixelRatio\s*:/.test(args) &&
        !/maxDiffPixels\s*:/.test(args)
      ) {
        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message:
            "`toHaveScreenshot` without a diff tolerance (maxDiffPixelRatio/maxDiffPixels).",
          why: "Pixel-exact snapshots flake on font rasterization and GPU differences between machines, training the team to ignore red builds.",
          fix: "Pass `{ maxDiffPixelRatio: 0.02 }` (or maxDiffPixels) so only meaningful visual regressions fail.",
        });
      }
    }
    return findings;
  },
});

function matchParen(text: string, open: number): number {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf("\n", index - 1);
  return index - lastBreak;
}
