/**
 * QA-TEST-002 skip-justification refinement:
 * bare skip → error · justified skip (issue ref / reason comment) → warning.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { skippedTest } from "../src/rules/test/qa-test-002-skipped-test.js";

const FIX = join(import.meta.dirname, "fixtures", "QA-TEST-002");

function run(rel: string) {
  return skippedTest.run({
    path: rel,
    text: readFileSync(join(FIX, rel), "utf8"),
  });
}

describe("QA-TEST-002 justification-aware severity", () => {
  it("escalates bare skips to error", () => {
    const findings = run(join("must-fire", "unjustified-skip.spec.ts"));
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.severity).toBe("error");
      expect(f.message).toContain("without justification");
    }
  });

  it("keeps justified skips at warning", () => {
    const findings = run(join("must-fire", "justified-skip-warning.spec.ts"));
    expect(findings.length).toBeGreaterThan(0);
    for (const f of findings) {
      expect(f.severity).toBe("warning");
      expect(f.message).not.toContain("without justification");
    }
  });

  it("accepts issue URL, #ref, and JIRA-style refs as justification", () => {
    const src = [
      "// blocked, see https://github.com/acme/app/issues/77",
      "it.skip('a', () => {});",
      "it.skip('b', () => {}); // fixed in #88, awaiting release",
      "// JIRA-42 covers this",
      "it.skip('c', () => {});",
    ].join("\n");
    const findings = skippedTest.run({ path: "x.spec.ts", text: src });
    expect(findings).toHaveLength(3);
    for (const f of findings) expect(f.severity).toBe("warning");
  });

  it("still fires on legacy xit() without justification", () => {
    const findings = run(join("must-fire", "skipped.spec.ts"));
    expect(findings.length).toBeGreaterThan(0);
  });
});
