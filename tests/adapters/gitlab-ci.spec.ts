import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  detectGitLabCi,
  parseGitLabCi,
  detectGitLabCiRisks,
} from "../../src/adapters/gitlab-ci.js";

function tmpDir(): string {
  const dir = join(
    tmpdir(),
    `qa-doctor-gitlab-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("detectGitLabCi", () => {
  it("finds .gitlab-ci.yml", () => {
    const dir = tmpDir();
    try {
      writeFileSync(join(dir, ".gitlab-ci.yml"), "stages: [test]", "utf8");
      expect(detectGitLabCi(dir)).toBe(join(dir, ".gitlab-ci.yml"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("finds .gitlab-ci.yaml", () => {
    const dir = tmpDir();
    try {
      writeFileSync(join(dir, ".gitlab-ci.yaml"), "stages: [test]", "utf8");
      expect(detectGitLabCi(dir)).toBe(join(dir, ".gitlab-ci.yaml"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns null when no CI file found", () => {
    const dir = tmpDir();
    try {
      expect(detectGitLabCi(dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("parseGitLabCi", () => {
  it("parses a minimal GitLab CI config", () => {
    const content = `
stages:
  - test
  - build

test:
  stage: test
  script:
    - npm test
`;
    const result = parseGitLabCi(content);
    expect(result.stages).toEqual(["test", "build"]);
    expect(result["test"]).toBeDefined();
  });

  it("throws on non-object YAML", () => {
    expect(() => parseGitLabCi("- just\n- a\n- list")).toThrow(
      "not a valid object",
    );
  });
});

describe("detectGitLabCiRisks", () => {
  it("detects allow_failure on jobs", () => {
    const config = {
      stages: ["test"],
      "unit-tests": {
        stage: "test",
        script: ["npm test"],
        allow_failure: true,
      },
    };
    const risks = detectGitLabCiRisks(config);
    expect(risks).toHaveLength(1);
    expect(risks[0]?.type).toBe("allow-failure");
    expect(risks[0]?.jobName).toBe("unit-tests");
  });

  it("detects exit code suppression in scripts", () => {
    const config = {
      stages: ["test"],
      lint: {
        stage: "test",
        script: ["npm run lint || true"],
      },
    };
    const risks = detectGitLabCiRisks(config);
    expect(risks).toHaveLength(1);
    expect(risks[0]?.type).toBe("exit-code-suppression");
  });

  it("detects exit 0 suppression", () => {
    const config = {
      stages: ["test"],
      build: {
        stage: "test",
        script: ["npm run build", "exit 0"],
      },
    };
    const risks = detectGitLabCiRisks(config);
    expect(risks.some((r) => r.type === "exit-code-suppression")).toBe(true);
  });

  it("detects empty test stage", () => {
    const config = {
      stages: ["build", "test"],
      "build-app": {
        stage: "build",
        script: ["npm run build"],
      },
    };
    const risks = detectGitLabCiRisks(config);
    expect(risks.some((r) => r.type === "empty-test-stage")).toBe(true);
  });

  it("returns no risks for clean config", () => {
    const config = {
      stages: ["test"],
      test: {
        stage: "test",
        script: ["npm test"],
      },
    };
    const risks = detectGitLabCiRisks(config);
    expect(risks).toHaveLength(0);
  });

  it("handles empty config", () => {
    expect(detectGitLabCiRisks({})).toHaveLength(0);
  });
});
