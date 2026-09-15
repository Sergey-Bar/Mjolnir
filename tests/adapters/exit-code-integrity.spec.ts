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
    expect(violations.some((v) => v.type === "or-true")).toBe(true);
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
