import { describe, expect, it } from "vitest";

import { detectExitCodeViolations } from "../../src/adapters/exit-code-integrity.js";

describe("detectExitCodeViolations", () => {
  it("detects || true pattern", () => {
    const config = {
      jobs: {
        test: {
          steps: [{ run: "npm test || true" }],
        },
      },
    };
    const violations = detectExitCodeViolations(config);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.type).toBe("or-true");
    expect(violations[0]?.fix).toContain("|| true");
  });

  it("detects 2>/dev/null pattern", () => {
    const config = {
      jobs: {
        lint: {
          steps: [{ run: "eslint . 2>/dev/null" }],
        },
      },
    };
    const violations = detectExitCodeViolations(config);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.type).toBe("stderr-suppression");
  });

  it("detects exit 0 pattern", () => {
    const config = {
      jobs: {
        build: {
          steps: [{ run: "npm run build && exit 0" }],
        },
      },
    };
    const violations = detectExitCodeViolations(config);
    // Its own type, not `or-true`. These are two unrelated suppressions and the
    // finding said so in its description while reporting the other one's name —
    // so a consumer grouping by `type` conflated them, and a reader grepping the
    // reported type would find nothing in the script.
    expect(violations.some((v) => v.type === "exit-zero")).toBe(true);
    const hit = violations.find((v) => v.type === "exit-zero");
    expect(hit?.script).toContain("exit 0");
    expect(hit?.description).toContain("forces exit code 0");
    expect(hit?.description).not.toContain("|| true");
  });

  it("tells `|| true` and `|| :` apart", () => {
    // One pattern covered both, and the description said `|| true`
    // unconditionally — naming a construct the script does not contain, on
    // precisely the finding a reader is about to go and look for.
    const colon = detectExitCodeViolations({
      jobs: { build: { steps: [{ run: "npm ci || :" }] } },
    });
    expect(colon.some((v) => v.type === "or-colon")).toBe(true);
    expect(colon.some((v) => v.type === "or-true")).toBe(false);
    const colonHit = colon.find((v) => v.type === "or-colon");
    expect(colonHit?.description).toContain("|| :");
    expect(colonHit?.description).not.toContain("|| true");

    const truthy = detectExitCodeViolations({
      jobs: { build: { steps: [{ run: "npm ci || true" }] } },
    });
    expect(truthy.some((v) => v.type === "or-true")).toBe(true);
    expect(truthy.some((v) => v.type === "or-colon")).toBe(false);
  });

  it("detects job-level continue-on-error", () => {
    const config = {
      jobs: {
        test: {
          "continue-on-error": true,
          steps: [{ run: "npm test" }],
        },
      },
    };
    const violations = detectExitCodeViolations(config);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.type).toBe("continue-on-error");
  });

  it("detects step-level continue-on-error", () => {
    const config = {
      jobs: {
        test: {
          steps: [{ run: "npm test", "continue-on-error": true }],
        },
      },
    };
    const violations = detectExitCodeViolations(config);
    expect(violations.some((v) => v.type === "continue-on-error")).toBe(true);
  });

  it("detects GitLab allow_failure", () => {
    const config = {
      jobs: {
        test: {
          allow_failure: true,
          script: ["npm test"],
        },
      },
    };
    const violations = detectExitCodeViolations(config);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.type).toBe("allow-failure");
  });

  it("returns empty for clean config", () => {
    const config = {
      jobs: {
        test: {
          steps: [{ run: "npm test" }],
        },
      },
    };
    const violations = detectExitCodeViolations(config);
    expect(violations).toHaveLength(0);
  });

  it("returns empty for non-object input", () => {
    expect(detectExitCodeViolations(null)).toHaveLength(0);
    expect(detectExitCodeViolations("string")).toHaveLength(0);
  });

  it("returns empty for config without jobs", () => {
    expect(detectExitCodeViolations({ on: "push" })).toHaveLength(0);
  });

  it("handles multiline script", () => {
    const config = {
      jobs: {
        test: {
          steps: [{ run: "npm run lint\nnpm test || true\nnpm run build" }],
        },
      },
    };
    const violations = detectExitCodeViolations(config);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.script).toContain("npm test || true");
  });

  it("ignores comments with exit 0", () => {
    const config = {
      jobs: {
        test: {
          steps: [{ run: "# exit 0 is fine in comments" }],
        },
      },
    };
    const violations = detectExitCodeViolations(config);
    expect(violations).toHaveLength(0);
  });
});
