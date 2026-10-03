import { describe, expect, it } from "vitest";

import { renderSarif } from "../../src/reporter/sarif.js";
import type { Finding, ScanResult } from "../../src/types.js";

const base = {
  ruleId: "QA-PW-003",
  severity: "error",
  confidence: "high",
  message: "`test.only()` committed in an e2e spec.",
  why: "test.only() skips every other e2e test while CI reports green.",
  fix: "Remove `.only` before committing.",
  file: "e2e/checkout.spec.ts",
  line: 2,
  column: 1,
} as unknown as Finding;

function scanResult(findings: Finding[]): ScanResult {
  return {
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      rulesCrashed: 0,
      rulesApplied: 45,
      rulesWithheld: 34,
      reasons: ["coverage:quarantine:34"],
      coverageState: "PARTIAL",
    },
  } as unknown as ScanResult;
}

function result(f: Finding): Record<string, unknown> {
  // Typed rather than `as any` on the parse: JSON.parse returns `any`, and an
  // untyped walk of it is exactly the hole the lint rule exists to close.
  const parsed = JSON.parse(renderSarif(scanResult([f]))) as {
    runs: Array<{ results: Array<Record<string, unknown>> }>;
  };
  // Thrown rather than asserted non-null: under noUncheckedIndexedAccess a `!`
  // here would silence the compiler about a shape this test then depends on. A
  // document with no result IS the failure, and it should say so.
  const run = parsed.runs[0];
  const first = run?.results[0];
  if (first === undefined) {
    throw new Error("SARIF document carried no result to inspect");
  }
  return first;
}
const primary = (o: Record<string, unknown>): string =>
  JSON.stringify(o.fingerprints) ?? "undefined";
const partial = (o: Record<string, unknown>, key: string): string =>
  (o.partialFingerprints as Record<string, string | undefined>)[key] ?? "";

/**
 * SARIF fingerprints are not a nicety. Without them GitHub code scanning has
 * no way to tell an unchanged finding from a new one, so every upload re-opens
 * every alert as "new" and a dismissed alert comes back on the next run.
 *
 * The engine already computed three stable identities in
 * `src/engine/finding-identity.ts` for exactly this purpose and emitted none of
 * them — it established a finding's identity and then discarded it at the
 * format boundary. These assert the identities mean what the comment claims,
 * because the first version of this code got the polarity wrong and only a
 * behavioural assertion caught it.
 */
describe("SARIF fingerprints", () => {
  it("emits a fingerprint and partialFingerprints on every result", () => {
    const r = result(base);
    expect(r.fingerprints).toBeTypeOf("object");
    expect(r.partialFingerprints).toBeTypeOf("object");
    expect(Object.keys(r.partialFingerprints as object).length).toBeGreaterThan(
      0,
    );
  });

  it("the PRIMARY fingerprint does not move when an edit shifts the line", () => {
    // This is the property the whole mechanism exists for: a finding whose
    // line number changed because 40 lines were inserted ABOVE it is the same
    // finding. Using the position-sensitive identity here — which looks more
    // precise — silently re-opens the alert on every unrelated edit.
    expect(primary(result({ ...base, line: 42 }))).toBe(primary(result(base)));
  });

  it("still emits a line-sensitive identity, as a partial fingerprint", () => {
    // Dropping the positional half would lose the ability to tell "the same
    // finding shifted" from "a different finding appeared here". Both halves
    // are representable, so neither is omitted.
    expect(
      partial(result({ ...base, line: 42 }), "mjFingerprint/lineSensitiveV1"),
    ).not.toBe(partial(result(base), "mjFingerprint/lineSensitiveV1"));
  });

  it("a different message, or a different rule, is a different finding", () => {
    expect(primary(result({ ...base, message: "another defect" }))).not.toBe(
      primary(result(base)),
    );
    expect(primary(result({ ...base, ruleId: "QA-PW-101" }))).not.toBe(
      primary(result(base)),
    );
  });

  it("is deterministic across runs", () => {
    expect(primary(result(base))).toBe(primary(result({ ...base })));
  });

  it("leaks no control characters into the JSON", () => {
    // The engine joins identity parts with NUL, which is what makes the
    // separator safe — and which is illegal unescaped in a JSON string. That is
    // why the identity is hashed rather than embedded verbatim.
    expect(renderSarif(scanResult([base]))).not.toContain("\\u0000");
  });
});
