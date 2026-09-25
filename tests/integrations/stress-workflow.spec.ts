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

  it("the 120 s budget gate can actually fail", () => {
    // G-V5-003: the duration was published as `scan-seconds` and read back as
    // `${{ steps.scan.outputs.scan-seconds }}`. A hyphen in a step output name
    // is parsed as subtraction, so the expression evaluated to 0 and the
    // budget compared 0 > 120 — a gate that could never fail.
    expect(source).toContain("scan_seconds=$((end - start))");
    expect(source).toContain("${{ steps.scan.outputs.scan_seconds }}");
    expect(source).not.toMatch(/steps\.scan\.outputs\.\w+-/);
    // A missing measurement must fail loudly, not read as zero seconds.
    expect(source).toContain("recorded no duration");
  });
});
