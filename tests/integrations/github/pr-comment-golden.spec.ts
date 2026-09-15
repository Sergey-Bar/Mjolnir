import { describe, expect, it } from "vitest";

import {
  renderCommentBody,
  PR_COMMENT_MARKER,
  type PrCommentModelV1,
} from "../../../src/integrations/github/pr-comment-publisher.js";
import { renderJobSummary } from "../../../src/integrations/github/job-summary-fallback.js";

const VERDICTS = ["pass", "warn", "fail"] as const;
const COMPLETENESS_LEVELS = [
  { label: "full", errors: 0, warnings: 0, infos: 0 },
  { label: "errors-only", errors: 5, warnings: 0, infos: 0 },
  { label: "warnings-only", errors: 0, warnings: 3, infos: 0 },
  { label: "mixed", errors: 2, warnings: 4, infos: 6 },
  { label: "infos-only", errors: 0, warnings: 0, infos: 10 },
] as const;

function buildModel(
  verdict: "pass" | "warn" | "fail",
  completeness: (typeof COMPLETENESS_LEVELS)[number],
): PrCommentModelV1 {
  return {
    verdict,
    score: verdict === "pass" ? 95 : verdict === "warn" ? 72 : 35,
    findings: {
      errors: completeness.errors,
      warnings: completeness.warnings,
      infos: completeness.infos,
    },
    summary:
      verdict === "pass"
        ? "All checks passed."
        : verdict === "warn"
          ? "Some warnings found."
          : "Critical issues found.",
    sha: "abc1234567890abcdef1234567890abcdef123456",
  };
}

describe("PR Comment Golden Suite (TI-018)", () => {
  for (const verdict of VERDICTS) {
    for (const completeness of COMPLETENESS_LEVELS) {
      const testName = `${verdict} + ${completeness.label}`;
      it(`renderCommentBody: ${testName}`, () => {
        const m = buildModel(verdict, completeness);
        const body = renderCommentBody(m);
        expect(body).toMatchSnapshot();
      });
      it(`renderJobSummary: ${testName}`, () => {
        const m = buildModel(verdict, completeness);
        const summary = renderJobSummary(m);
        expect(summary).toMatchSnapshot();
      });
    }
  }
});

describe("Byte-identity rendering (TI-018)", () => {
  it("same model produces byte-identical PR comment", () => {
    const m = buildModel("pass", COMPLETENESS_LEVELS[0] ?? "complete");
    const a = renderCommentBody(m);
    const b = renderCommentBody(m);
    expect(a).toBe(b);
  });

  it("same model produces byte-identical job summary", () => {
    const m = buildModel("fail", COMPLETENESS_LEVELS[3] ?? "error");
    const a = renderJobSummary(m);
    const b = renderJobSummary(m);
    expect(a).toBe(b);
  });

  it("marker is always first line of PR comment", () => {
    for (const verdict of VERDICTS) {
      const body = renderCommentBody(
        buildModel(verdict, COMPLETENESS_LEVELS[0] ?? "complete"),
      );
      expect(body.startsWith(PR_COMMENT_MARKER + "\n")).toBe(true);
    }
  });

  it("job summary never contains the PR comment marker", () => {
    for (const verdict of VERDICTS) {
      const summary = renderJobSummary(
        buildModel(verdict, COMPLETENESS_LEVELS[0] ?? "complete"),
      );
      expect(summary).not.toContain(PR_COMMENT_MARKER);
    }
  });

  it("verdict label matches model", () => {
    for (const verdict of VERDICTS) {
      const body = renderCommentBody(
        buildModel(verdict, COMPLETENESS_LEVELS[0] ?? "complete"),
      );
      const expected =
        verdict === "pass" ? "PASS" : verdict === "warn" ? "WARN" : "FAIL";
      expect(body).toContain(expected);
    }
  });

  it("score is always rendered", () => {
    const scores = [0, 35, 72, 95, 100];
    for (const score of scores) {
      const m: PrCommentModelV1 = {
        verdict: "pass",
        score,
        findings: { errors: 0, warnings: 0, infos: 0 },
        summary: "test",
      };
      const body = renderCommentBody(m);
      expect(body).toContain(`${score}/100`);
    }
  });
});
