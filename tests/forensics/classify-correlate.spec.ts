/**
 * WI-18 taxonomy + WI-19 correlation tests (growth roadmap §19-20,
 * remediation plan §9 R6). Table-driven: every verdict in the canonical
 * set, the insufficient-evidence ⇒ INCONCLUSIVE default, the
 * contradictory-family forcing, Contract H (static never silently
 * weakened), and the no-correlation-⇒-no-claim law.
 */

import { describe, expect, it } from "vitest";

import {
  FORENSIC_VERDICTS,
  classifyForensicVerdict,
  reconcileStaticWithRuntime,
} from "../../src/forensics/classify.js";
import {
  correlateSelectorHealth,
  computeSpecHealth,
} from "../../src/playwright/selector-health.js";

const v = (over: {
  attempts?: number;
  finalStatus?: "passed" | "failed" | "timedOut" | "skipped";
  passedOnRetry?: boolean;
  everFailed?: boolean;
  skipped?: boolean;
}) => ({
  attempts: over.attempts ?? 1,
  finalStatus: over.finalStatus ?? "failed",
  passedOnRetry: over.passedOnRetry ?? false,
  everFailed: over.everFailed ?? true,
  skipped: over.skipped ?? false,
});

describe("WI-18 minimum-signal table", () => {
  it("TRUE-FLAKE is its own verdict (strongest named fact)", () => {
    expect(
      classifyForensicVerdict({
        verdict: v({ attempts: 3, finalStatus: "passed", passedOnRetry: true }),
        errorTexts: [],
      }).verdict,
    ).toBe("flaky");
  });

  it("named families classify exactly", () => {
    const cases: Array<[string, string, (typeof FORENSIC_VERDICTS)[number]]> = [
      [
        "ECONNREFUSED",
        "connection refused at startup",
        "infrastructure-failure",
      ],
      [
        "browser missing",
        "BrowserType.launch: Executable doesn't exist",
        "environmental-failure",
      ],
      [
        "selector timeout",
        "waiting for selector '.btn >> nth=0'",
        "unstable-construction",
      ],
    ];
    for (const [label, text, want] of cases) {
      const got = classifyForensicVerdict({
        verdict: v({}),
        errorTexts: [text],
      });
      expect(got.verdict, label).toBe(want);
      expect(got.evidenceState, label).toBe("exists");
    }
  });

  it("conflicting families force inconclusive + contradictory, never a guess", () => {
    const got = classifyForensicVerdict({
      verdict: v({}),
      errorTexts: ["ECONNREFUSED", "waiting for selector '.x'"],
    });
    expect(got.verdict).toBe("inconclusive");
    expect(got.evidenceState).toBe("contradictory");
    expect(
      got.signals.environmental +
        got.signals.infrastructure +
        got.signals.construction,
    ).toBeGreaterThan(1);
  });

  it("insufficient evidence never classifies confidently (Constitution §2 terminality)", () => {
    // A passing single attempt with no signals: inconclusive, NOT "likely-real-defect".
    const got = classifyForensicVerdict({
      verdict: v({ finalStatus: "passed", everFailed: false }),
      errorTexts: [],
    });
    expect(got.verdict).toBe("inconclusive");
    expect(got.evidenceState).toBe("insufficient");
  });

  it("a source that cannot carry error text is UNSUPPORTED, not insufficient-guess", () => {
    const got = classifyForensicVerdict({
      verdict: v({ attempts: 2, finalStatus: "failed" }),
      errorTexts: [],
      errorTextsUnsupported: true,
    });
    // Retry-dependent remains a named-attempt fact (no error text needed):
    expect(got.verdict).toBe("retry-dependent");
  });

  it("deterministic single-attempt failure with captured error text is likely-real-defect", () => {
    const got = classifyForensicVerdict({
      verdict: v({ attempts: 1 }),
      errorTexts: ["expect(received).toBe(expected): expected 1, received 2"],
    });
    expect(got.verdict).toBe("likely-real-defect");
  });

  it("the table is a TOTAL function over the canonical verdict set", () => {
    for (const outcome of [
      "passed",
      "failed",
      "timedOut",
      "skipped",
    ] as const) {
      for (const texts of [
        [],
        ["noise"],
        ["ECONNREFUSED"],
        ["timeout of", "ECONNREFUSED"],
      ]) {
        const got = classifyForensicVerdict({
          verdict: v({ finalStatus: outcome }),
          errorTexts: texts,
        });
        expect(FORENSIC_VERDICTS).toContain(got.verdict);
      }
    }
  });
});

describe("WI-18 Contract H: static claims are never silently weakened", () => {
  it("missing runtime ⇒ outcome insufficient, claim preserved untouched", () => {
    const r = reconcileStaticWithRuntime(true, undefined);
    expect(r.outcome).toBe("insufficient");
    expect(r.staticClaimPreserved).toBe(true);
    expect(r.reconciledClassification).toBeNull();
  });

  it("runtime failure corroborates a defect-class claim", () => {
    const r = reconcileStaticWithRuntime(true, "failed");
    expect(r.outcome).toBe("corroborates");
    expect(r.reconciledClassification).toBe("likely-real-defect");
  });

  it("runtime flake corroborates AND names the flaky verdict", () => {
    const r = reconcileStaticWithRuntime(true, "flaky");
    expect(r.outcome).toBe("corroborates");
    expect(r.reconciledClassification).toBe("flaky");
  });

  it("runtime pass CONTRADICTS a failure-predicting claim WITHOUT weakening it — the PAIR goes inconclusive", () => {
    const r = reconcileStaticWithRuntime(true, "passed");
    expect(r.outcome).toBe("contradicts");
    expect(r.staticClaimPreserved).toBe(true);
    expect(r.reconciledClassification).toBe("inconclusive");
  });
});

describe("WI-19 Selector Health v2 — no correlation ⇒ no claim", () => {
  const brittleSpec = computeSpecHealth("checkout.spec.ts", [
    "const btn = page.locator('div > span.btn-css');",
    "const row = page.locator('//html/body/div[2]/ul/li[1]');",
    "expect(btn).toBeVisible();",
  ]);
  const healthySpec = computeSpecHealth("login.spec.ts", [
    "const login = page.getByTestId('login-button');",
    "await expect(login).toBeVisible();",
  ]);

  it("absent runtime facts yield NO claim on either spec", () => {
    for (const spec of [brittleSpec, healthySpec]) {
      const c = correlateSelectorHealth(spec, undefined);
      expect(c.correlation).toBe("insufficient");
      expect(c.claim).toBeNull();
    }
  });

  it("a single green pass is INSUFFICIENT (missing evidence ≠ negative evidence)", () => {
    const c = correlateSelectorHealth(brittleSpec, { outcome: "passed" });
    expect(c.correlation).toBe("insufficient");
    expect(c.claim).toBeNull();
    // Contract H: the static score never moves.
    expect(c.staticScore).toBe(brittleSpec.score);
  });

  it("execution failure with brittle locators ⇒ corroborates + concrete safe action", () => {
    const c = correlateSelectorHealth(brittleSpec, { outcome: "failed" });
    expect(c.correlation).toBe("corroborates");
    expect(c.claim?.safeNextAction).toMatch(/line \d+/);
    // Score secondary: the claim speaks about locators, not a number.
    expect(c.claim?.assertion).not.toMatch(/\bscore\b/);
  });

  it("execution failure with a clean selector surface ⇒ CONTRADICTS: selector blame unsupported, action points elsewhere", () => {
    const c = correlateSelectorHealth(healthySpec, { outcome: "timedOut" });
    expect(c.correlation).toBe("contradicts");
    expect(c.claim?.safeNextAction).toMatch(/non-selector/i);
    // The static score stands (never silently weakened upward either).
    expect(c.staticScore).toBe(healthySpec.score);
  });

  it("flaky runtime on a brittle spec corroborates with a retries-off re-run action", () => {
    const c = correlateSelectorHealth(brittleSpec, { outcome: "flaky" });
    expect(c.claim?.safeNextAction).toContain("retries off");
  });
});
