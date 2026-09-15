import { describe, expect, it } from "vitest";

import { detectWorkflowBypasses } from "../../src/adapters/workflow-bypass.js";

describe("detectWorkflowBypasses", () => {
  it("detects path-filter exclusion for source paths", () => {
    const config = {
      on: {
        push: {
          "paths-ignore": ["src/**", "lib/**"],
        },
      },
      jobs: {
        test: { steps: [{ run: "npm test" }] },
      },
    };
    const patterns = detectWorkflowBypasses(config);
    expect(patterns.some((p) => p.type === "path-filter-exclusion")).toBe(true);
  });

  it("does not flag non-source path exclusions", () => {
    const config = {
      on: {
        push: {
          "paths-ignore": ["docs/**", "*.md"],
        },
      },
      jobs: {
        test: { steps: [{ run: "npm test" }] },
      },
    };
    const patterns = detectWorkflowBypasses(config);
    expect(patterns.some((p) => p.type === "path-filter-exclusion")).toBe(
      false,
    );
  });

  it("detects conditional test execution", () => {
    const config = {
      on: { push: {} },
      jobs: {
        test: {
          if: "github.event_name == 'push' && github.ref == 'refs/heads/main'",
          steps: [{ run: "npm test" }],
        },
      },
    };
    const patterns = detectWorkflowBypasses(config);
    expect(patterns.some((p) => p.type === "conditional-test-execution")).toBe(
      true,
    );
  });

  it("detects missing status checks for test jobs", () => {
    const config = {
      on: { push: {} },
      jobs: {
        build: {
          steps: [{ run: "npm run build" }],
        },
        "test-unit": {
          steps: [{ run: "npm test" }],
        },
      },
    };
    const patterns = detectWorkflowBypasses(config);
    expect(patterns.some((p) => p.type === "missing-status-check")).toBe(true);
  });

  it("does not flag test jobs that are required", () => {
    const config = {
      on: { push: {} },
      jobs: {
        build: {
          needs: "test-unit",
          steps: [{ run: "npm run build" }],
        },
        "test-unit": {
          steps: [{ run: "npm test" }],
        },
      },
    };
    const patterns = detectWorkflowBypasses(config);
    expect(patterns.some((p) => p.type === "missing-status-check")).toBe(false);
  });

  it("returns empty for non-object input", () => {
    expect(detectWorkflowBypasses(null)).toHaveLength(0);
    expect(detectWorkflowBypasses("string")).toHaveLength(0);
    expect(detectWorkflowBypasses(42)).toHaveLength(0);
  });

  it("returns empty for clean config", () => {
    const config = {
      on: { push: {} },
      jobs: {
        deploy: {
          needs: "test",
          steps: [{ run: "npm run build" }],
        },
        test: {
          steps: [{ run: "npm test" }],
        },
      },
    };
    const patterns = detectWorkflowBypasses(config);
    expect(patterns).toHaveLength(0);
  });
});
