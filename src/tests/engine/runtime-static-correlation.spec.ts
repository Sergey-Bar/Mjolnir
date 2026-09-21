import { describe, expect, it } from "vitest";

import {
  buildTestIdentity,
  matchQuality,
  deriveCorroborationLevel,
  mapTrustLevel,
  correlateTest,
} from "../../src/engine/runtime-static-correlation.js";
import type { TestVerdict } from "../../src/forensics/types.js";

function verdict(overrides: Partial<TestVerdict> = {}): TestVerdict {
  return {
    file: "e2e/shop.spec.ts",
    title: "checkout flow",
    attempts: 1,
    finalStatus: "passed",
    totalDurationMs: 100,
    passedOnRetry: false,
    everFailed: false,
    skipped: false,
    ...overrides,
  };
}

describe("buildTestIdentity", () => {
  it("builds identity from finding and runtime record", () => {
    const identity = buildTestIdentity(
      { file: "src/test.ts", line: 10, ruleId: "QA-TEST-001", message: "msg" },
      verdict(),
    );
    expect(identity.file).toBe("src/test.ts");
    expect(identity.sourceRange.startLine).toBe(10);
    expect(identity.testName).toBeTruthy();
  });

  it("parses suite hierarchy from nested title", () => {
    const identity = buildTestIdentity(
      { file: "src/test.ts", line: 10, ruleId: "QA-TEST-001", message: "msg" },
      { ...verdict(), title: "Suite > SubSuite > test name" },
    );
    expect(identity.suiteHierarchy).toEqual(["Suite", "SubSuite"]);
    expect(identity.testName).toBe("test name");
  });
});

describe("matchQuality", () => {
  it("returns EXACT for same file and identical name", () => {
    const identity = {
      framework: "unknown",
      file: "e2e/shop.spec.ts",
      suiteHierarchy: [],
      testName: "checkout flow",
      sourceRange: { startLine: 10 },
    };
    expect(matchQuality(identity, verdict())).toBe("EXACT");
  });

  it("returns AMBIGUOUS for different files", () => {
    const identity = {
      framework: "unknown",
      file: "other.spec.ts",
      suiteHierarchy: [],
      testName: "checkout flow",
      sourceRange: { startLine: 10 },
    };
    expect(matchQuality(identity, verdict())).toBe("AMBIGUOUS");
  });

  it("returns STRONG when names match last segment", () => {
    const identity = {
      framework: "unknown",
      file: "e2e/shop.spec.ts",
      suiteHierarchy: [],
      testName: "checkout flow",
      sourceRange: { startLine: 10 },
    };
    expect(
      matchQuality(identity, { ...verdict(), title: "Suite > checkout flow" }),
    ).toBe("STRONG");
  });

  it("returns STRONG when lines are close", () => {
    const identity = {
      framework: "unknown",
      file: "e2e/shop.spec.ts",
      suiteHierarchy: [],
      testName: "different name",
      sourceRange: { startLine: 10, endLine: 15 },
    };
    expect(
      matchQuality(identity, { ...verdict(), title: "other", line: 12 }),
    ).toBe("STRONG");
  });

  it("returns APPROXIMATE when lines are moderately far", () => {
    const identity = {
      framework: "unknown",
      file: "e2e/shop.spec.ts",
      suiteHierarchy: [],
      testName: "different name",
      sourceRange: { startLine: 10, endLine: 15 },
    };
    expect(
      matchQuality(identity, { ...verdict(), title: "other", line: 30 }),
    ).toBe("APPROXIMATE");
  });
});

describe("deriveCorroborationLevel", () => {
  it("returns NONE for AMBIGUOUS quality", () => {
    expect(deriveCorroborationLevel("AMBIGUOUS", verdict())).toBe("NONE");
  });

  it("returns NONE for skipped tests", () => {
    expect(
      deriveCorroborationLevel("EXACT", { ...verdict(), skipped: true }),
    ).toBe("NONE");
  });

  it("returns CONFIRMED for EXACT match with failure evidence", () => {
    expect(
      deriveCorroborationLevel("EXACT", { ...verdict(), everFailed: true }),
    ).toBe("CONFIRMED");
  });

  it("returns SUPPORTING for STRONG match", () => {
    expect(deriveCorroborationLevel("STRONG", verdict())).toBe("SUPPORTING");
  });

  it("returns SUPPORTING for APPROXIMATE match", () => {
    expect(deriveCorroborationLevel("APPROXIMATE", verdict())).toBe(
      "SUPPORTING",
    );
  });
});

describe("mapTrustLevel (TI-016 enforcement)", () => {
  it("L0 for E0 + NONE corroboration", () => {
    expect(mapTrustLevel("E0", "NONE")).toBe("L0");
  });

  it("L1 for E1 + NONE corroboration", () => {
    expect(mapTrustLevel("E1", "NONE")).toBe("L1");
  });

  it("L2 for E2 + NONE corroboration", () => {
    expect(mapTrustLevel("E2", "NONE")).toBe("L2");
  });

  it("L3 for E0/E1 + SUPPORTING corroboration", () => {
    expect(mapTrustLevel("E0", "SUPPORTING")).toBe("L3");
    expect(mapTrustLevel("E1", "SUPPORTING")).toBe("L3");
  });

  it("L4 for E2 + SUPPORTING corroboration", () => {
    expect(mapTrustLevel("E2", "SUPPORTING")).toBe("L4");
  });

  it("L4 for E0 + CONFIRMED corroboration", () => {
    expect(mapTrustLevel("E0", "CONFIRMED")).toBe("L4");
  });

  it("L5 for E1/E2 + CONFIRMED corroboration", () => {
    expect(mapTrustLevel("E1", "CONFIRMED")).toBe("L5");
    expect(mapTrustLevel("E2", "CONFIRMED")).toBe("L5");
  });

  it("trust level never rises from runtime alone (TI-016)", () => {
    expect(mapTrustLevel("E0", "CONFIRMED")).toBe("L4");
    expect(mapTrustLevel("E0", "SUPPORTING")).toBe("L3");
    expect(mapTrustLevel("E0", "NONE")).toBe("L0");
  });
});

describe("correlateTest", () => {
  it("returns complete match result", () => {
    const result = correlateTest(
      {
        file: "e2e/shop.spec.ts",
        line: 10,
        ruleId: "QA-TEST-001",
        message: "msg",
      },
      verdict(),
    );
    expect(result.quality).toBe("EXACT");
    expect(result.corroborationLevel).toBe("SUPPORTING");
    expect(result.staticIdentity.file).toBe("e2e/shop.spec.ts");
  });
});
