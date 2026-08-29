/**
 * Suppression enforcement (Test Hardening Plan — product-quality gap,
 * not just infra hardening).
 *
 * `src/config/suppressions.ts`'s own header comment calls this
 * "Suppression governance" and `mjolnir suppressions` reports what's
 * configured — but nothing in `runScan` / `src/cli.ts` ever calls
 * `loadSuppressions` or `isSuppressionActive` to actually filter the
 * findings a scan produces. A user who configures
 * `{ "ignore": [{ "ruleId": "QA-TEST-001", "reason": "..." }] }` in
 * `mjolnir.config.json` still gets that finding in every output
 * format, still gets scored down for it, and still gets exit code 1.
 * The suppression command shows the config; it just never gets wired
 * into the thing that config exists to control.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runScan } from "../src/cli.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-suppress-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, "e2e", "checkout.spec.ts"),
    "it.only('checkout', () => { expect(true).toBe(true); });\n",
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function scan() {
  return runScan({
    target: dir,
    json: true,
    verbose: true,
    maxDurationMs: 10_000,
    scopeChanged: false,
    format: "json",
  });
}

describe("mjolnir.config.json `ignore` entries", () => {
  it("baseline: QA-TEST-001 fires without any suppression config", () => {
    const result = scan();
    expect(result.findings.map((f) => f.ruleId)).toContain("QA-TEST-001");
  });

  it("a configured, active suppression removes the finding from scan output", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [
          {
            ruleId: "QA-TEST-001",
            reason: "known, tracked in JIRA-123",
          },
        ],
      }),
    );

    const result = scan();
    expect(
      result.findings.map((f) => f.ruleId),
      "QA-TEST-001 is configured as suppressed in mjolnir.config.json " +
        "but still appears in scan output — suppressions are reported " +
        "by `mjolnir suppressions` but never actually enforced during " +
        "a scan. A user who suppresses a finding still gets flagged for " +
        "it, still gets scored down for it, and CI still exits 1 for it.",
    ).not.toContain("QA-TEST-001");
  });

  it("an expired suppression does NOT suppress (stale config doesn't hide new debt)", () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({
        ignore: [
          {
            ruleId: "QA-TEST-001",
            reason: "known, tracked in JIRA-123",
            expires: "2020-01-01",
          },
        ],
      }),
    );

    const result = scan();
    // This one currently "passes" only because suppression isn't wired
    // in at all — once it is, this is the case that actually needs the
    // expiry check to matter.
    expect(result.findings.map((f) => f.ruleId)).toContain("QA-TEST-001");
  });
});
