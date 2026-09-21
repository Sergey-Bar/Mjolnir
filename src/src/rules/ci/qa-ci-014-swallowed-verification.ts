/**
 * QA-CI-014 — try/catch swallowing a verification-stage failure without
 * rethrow or failure-marking (product-gap master plan P3c).
 * Severity: error · Confidence: high · deterministic-defect
 *
 * The Jenkins spelling of the silent-swallow class: a `try` block that
 * runs a verification gate and a `catch` that neither rethrows, calls
 * `error(...)`, downgrades via `unstable(...)`, nor sets
 * `currentBuild.result` — the stage's failure never reaches the build.
 * (`unstable()`/`currentBuild.result = 'UNSTABLE'` ARE failure markings;
 * a catch that only downgrades is QA-CI-008's Jenkins rescue arm — the
 * two arms split the family without overlap.)
 *
 * BORN QUARANTINE (§15.5): unmeasured rules can never default into scans —
 * this rule surfaces only under --strict until corpus-measured.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import {
  lineOfOffset,
  textIsVerificationGate,
  tryCatchPairs,
} from "./jenkins-gates.js";

const FAILURE_MARKING_RE =
  /\bthrow\b|\berror\s*\(|\bunstable\s*\(|currentBuild\.result\s*=/i;

export const swallowedVerificationFailure = defineRule({
  id: "QA-CI-014",
  category: "QA-CI",
  title: "try/catch swallows a verification-stage failure",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "ci-workflows",
  // Trust Metadata
  languages: ["groovy"],
  frameworks: ["jenkins"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "FRAMEWORK",
  detectionNotes:
    "Groovy try/catch block scan (string-aware brace matching) over the Jenkinsfile text",
  introduced: "1.1.1",

  // BORN QUARANTINE (§15.5): ships opt-in via --strict until the corpus
  // measurement proves its FP envelope. Never silent-core.
  tier: "quarantine",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    // Text-target Jenkins surface only (the discovery contract delivers
    // exactly the root Jenkinsfile).
    if (ctx.path.replaceAll("\\", "/").split("/").pop() !== "Jenkinsfile") {
      return findings;
    }

    for (const { tryBlock, catchBlock } of tryCatchPairs(ctx.text)) {
      if (!textIsVerificationGate(tryBlock.text)) continue;
      if (FAILURE_MARKING_RE.test(catchBlock.text)) continue;
      findings.push({
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        file: ctx.path,
        line: lineOfOffset(ctx.text, catchBlock.start),
        column: 1,
        message:
          "A verification stage runs in a `try` whose `catch` swallows the failure — no rethrow, `error(...)`, `unstable(...)`, or result marking.",
        why: "The gate can fail every run while the build stays green: the catch absorbs the exception and the stage completes without ever recording the failure.",
        fix: "Rethrow in the catch, or call `error(...)`/`unstable(...)` so the failure reaches the build result.",
        qaImpact: "FALSE-GREEN",
      });
    }
    return findings;
  },
});
