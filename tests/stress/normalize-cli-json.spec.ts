import { describe, expect, it } from "vitest";

import {
  normalizeCliJson,
  normalizeCliResult,
} from "../../scripts/lib/normalize-cli-json.mjs";

function result(analysisMs: number, contractMs: number) {
  return {
    analysisStatus: { durationMs: analysisMs, rules: "complete" },
    contract: {
      completeness: { durationMs: contractMs, partial: false },
    },
    custom: { durationMs: 7 },
  };
}

describe("CLI output normalization", () => {
  it("normalizes only the two wall-clock fields", () => {
    expect(normalizeCliResult(result(10, 20))).toEqual(
      normalizeCliResult(result(30, 40)),
    );
  });

  it("preserves unrelated duration fields", () => {
    const first = normalizeCliResult(result(10, 20)) as ReturnType<
      typeof result
    >;
    const second = result(10, 20);
    second.custom.durationMs = 8;
    expect(normalizeCliResult(second)).not.toEqual(first);
  });

  it("rejects a shape that omits an allowlisted field", () => {
    const malformed = result(10, 20);
    Reflect.deleteProperty(malformed.contract, "completeness");
    expect(() => normalizeCliJson(JSON.stringify(malformed))).toThrow(
      "contract.completeness.durationMs",
    );
  });
});
