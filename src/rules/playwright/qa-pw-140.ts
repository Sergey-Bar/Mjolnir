/**
 * QA-PW-140 — Screenshot without maxDiffPixelRatio.
 *
 * TODO(implement): replace the placeholder below. The rule currently
 * returns no findings on purpose so the fixture harness FAILS until
 * real detection logic lands (anti-creep law §18.1).
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
  appliesTo: "test-files" as unknown as "test-files",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    void ctx; // TODO: implement detection over ctx.path / ctx.text
    return findings;
  },
});
