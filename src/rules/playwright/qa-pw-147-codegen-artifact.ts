/**
 * QA-PW-147 — Playwright codegen artifact left unedited (plan §17.1).
 * Severity: info · Confidence: medium · observation
 *
 * The codegen recorder names its first test exactly "test" and records
 * a linear goto/click script. A committed spec whose test still carries
 * that default title is a recording artifact that no human reviewed —
 * the provenance marker is the finding (§17.1: "codegen patterns").
 * observation findingType: the marker proves RECORDING ORIGIN, not a
 * defect — the script may be fine.
 *
 * Trust Metadata: BORN QUARANTINE (plan §17 exit gate).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { lineAt, colAt } from "../shared/positions.js";

const CODEGEN_DEFAULT_TITLE_RE =
  /\b(?:test|it)\s*\(\s*['"]test(?:\s+\d+)?['"]\s*,/g;

const WHY =
  'The default codegen title ("test") says this spec is an unreviewed recording — recorded browser actions frequently include navigation noise and never carry the assertions a real regression test needs.';
const FIX =
  "Rename the test to describe the behavior under test, prune the recorded noise, and add assertions on the expected outcome — or delete the recording.";

export const pwCodegenArtifact = defineRule({
  id: "QA-PW-147",
  category: "QA-PW",
  title: "Playwright codegen default test title (recording artifact)",
  severity: "info",
  confidence: "medium",
  findingType: "observation",
  qaImpact: "HYGIENE",
  appliesTo: "test-files",
  // Trust Metadata
  languages: ["typescript", "javascript"],
  frameworks: ["playwright"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "LEXICAL",
  detectionNotes:
    "the codegen recorder's default test title ('test', 'test 1', 'test 2', …) committed verbatim, on the RAW text view (the title is a string literal)",
  introduced: "0.6.0",
  tier: "quarantine",
  detectorRevision: 1,

  run(ctx) {
    // RAW text — the default title lives INSIDE a string literal, which
    // the code-only view blanks.
    const text = ctx.text;
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    const re = new RegExp(CODEGEN_DEFAULT_TITLE_RE.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        severity: "info",
        confidence: "medium",
        findingType: "observation",
        qaImpact: "HYGIENE",
        file: ctx.path,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
        message: `Codegen default test title (${m[0].replace(/\s+/g, " ").trim()}) — an unreviewed recording artifact.`,
        why: WHY,
        fix: FIX,
      });
    }
    return findings;
  },
});
