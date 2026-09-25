import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(import.meta.dirname, "..", "..", ".github", "workflows", "stress.yml"),
  "utf8",
);

describe("stress workflow", () => {
  it("does not mask pathological scan failures", () => {
    expect(source).not.toContain(
      'patho" --json > "$RUNNER_TEMP/patho-result.json" || true',
    );
    expect(source).toContain('if [ "$status" -ne 0 ] && [ "$status" -ne 2 ]');
    expect(source).toContain("internal or rule crash");
  });

  it("keeps the strict 10k completeness assertions", () => {
    expect(source).toContain("partial scan");
    expect(source).toContain("incomplete analysis");
    expect(source).toContain("scan exceeded the 120 s budget");
  });
});
