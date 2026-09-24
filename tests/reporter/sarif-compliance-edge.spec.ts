import { describe, expect, it } from "vitest";
import {
  SARIF_SCHEMA_URL,
  SARIF_VERSION,
  toSarifReportingDescriptor,
  toSarifResult,
  validateSarifOutput,
} from "../../src/reporter/sarif-compliance.js";
import type { Finding } from "../../src/types.js";

const finding: Finding = {
  ruleId: "QA-TEST-001",
  category: "QA-TEST",
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  file: "a.ts",
  line: 0,
  column: 0,
  message: "message",
  why: "why",
  fix: "fix",
};

describe("SARIF compliance edge matrix", () => {
  it("rejects malformed run, tool, driver, and result shapes", () => {
    const errors = validateSarifOutput({
      $schema: SARIF_SCHEMA_URL,
      version: SARIF_VERSION,
      runs: [null, {}, { tool: null }, { tool: { driver: null } }],
    });
    expect(errors.map((error) => error.path)).toEqual(
      expect.arrayContaining([
        "$.runs[0]",
        "$.runs[1].tool",
        "$.runs[3].tool.driver",
      ]),
    );
    const resultErrors = validateSarifOutput({
      $schema: SARIF_SCHEMA_URL,
      version: SARIF_VERSION,
      runs: [
        {
          tool: { driver: { name: "m" } },
          results: [
            {
              ruleId: 1,
              level: "fatal",
              message: {},
              locations: null,
            },
          ],
        },
      ],
    });
    expect(resultErrors).toHaveLength(4);
    const missingResults = validateSarifOutput({
      $schema: SARIF_SCHEMA_URL,
      version: SARIF_VERSION,
      runs: [{ tool: { driver: { name: "m" } }, results: null }],
    });
    expect(missingResults[0]?.path).toBe("$.runs[0].results");
  });

  it("maps findings and optional rule metadata", () => {
    const result = toSarifResult(finding);
    expect(result.locations[0]?.physicalLocation.region).toEqual({
      startLine: 1,
      startColumn: 1,
    });
    expect(toSarifReportingDescriptor({ id: "R" })).toEqual({ id: "R" });
    expect(
      toSarifReportingDescriptor({
        id: "R",
        title: "T",
        docsUrl: "https://example.test",
        falsePositiveRisk: "low",
      }),
    ).toHaveProperty("properties.falsePositiveRisk", "low");
  });
});
