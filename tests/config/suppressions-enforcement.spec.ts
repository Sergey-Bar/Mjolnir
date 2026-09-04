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

import { runScan, pathMatchesGlob } from "../../src/cli.js";
import { ConfigValidationError } from "../../src/config/config.js";

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

async function scan() {
  return runScan({
    target: dir,
    json: true,
    verbose: true,
    maxDurationMs: 10_000,
    scopeChanged: false,
    format: "json",

    strict: true,
  });
}

describe("mjolnir.config.json `ignore` entries", () => {
  it("baseline: QA-TEST-001 fires without any suppression config", async () => {
    const result = await scan();
    expect(result.findings.map((f) => f.ruleId)).toContain("QA-TEST-001");
  });

  it("a configured, active suppression removes the finding from scan output", async () => {
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

    const result = await scan();
    expect(
      result.findings.map((f) => f.ruleId),
      "QA-TEST-001 is configured as suppressed in mjolnir.config.json " +
        "but still appears in scan output — suppressions are reported " +
        "by `mjolnir suppressions` but never actually enforced during " +
        "a scan. A user who suppresses a finding still gets flagged for " +
        "it, still gets scored down for it, and CI still exits 1 for it.",
    ).not.toContain("QA-TEST-001");
  });

  it("an expired suppression does NOT suppress (stale config doesn't hide new debt)", async () => {
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

    const result = await scan();
    // This one currently "passes" only because suppression isn't wired
    // in at all — once it is, this is the case that actually needs the
    // expiry check to matter.
    expect(result.findings.map((f) => f.ruleId)).toContain("QA-TEST-001");
  });
});

describe("scan behavior with a broken config (bug-audit M4)", () => {
  it("a typo'd severityOverrides value fails the scan loudly — never a NaN score or silent un-gating", async () => {
    writeFileSync(
      join(dir, "mjolnir.config.json"),
      JSON.stringify({ severityOverrides: { "QA-TEST-001": "eror" } }),
    );
    // runScan propagates the config validation error; the CLI layer maps
    // it to the usage-error path (exit 10) with the actionable message.
    await expect(scan()).rejects.toThrow(ConfigValidationError);
    await expect(scan()).rejects.toThrow(/eror/);
  });
});

describe("suppression glob semantics (bug-audit M5)", () => {
  // The old matcher compiled `tests/**/*.spec.ts` to `^tests/.*/.*\.spec\.ts$`
  // — it demanded at least one intermediate directory, so suppressions for
  // single-level paths silently never matched and the findings kept
  // gating CI and costing score.
  const CASES: Array<[string, string, boolean]> = [
    // [glob, path, expected]
    ["tests/**/*.spec.ts", "tests/foo.spec.ts", true], // the M5 case
    ["tests/**/*.spec.ts", "tests/a/b/foo.spec.ts", true],
    ["tests/**/*.spec.ts", "src/foo.spec.ts", false],
    ["**/*.spec.ts", "root.spec.ts", true], // `**/` matches zero segments
    ["**/*.spec.ts", "a/b/root.spec.ts", true],
    ["**/*.spec.ts", "root.ts", false],
    ["tests/**", "tests/a.spec.ts", true],
    ["tests/**", "tests/a/b/c.ts", true],
    ["tests/**", "src/a.ts", false],
    ["a/**/b", "a/b", true], // `**` between segments can be empty
    ["a/**/b", "a/x/y/b", true],
    ["a/**/b", "a/xb", false],
    ["**", "anything/at/any/depth.ts", true],
    ["src/*.ts", "src/a.ts", true],
    ["src/*.ts", "src/a/b.ts", false], // `*` never crosses "/"
    ["src/foo.spec.ts", "src/foo.spec.ts", true],
    ["src/foo.spec.ts", "src/bar.spec.ts", false],
    ["data/*.json", "data.test.json", false], // glob is segment-anchored
  ];

  for (const [glob, path, expected] of CASES) {
    it(`glob "${glob}" ${expected ? "matches" : "rejects"} "${path}"`, () => {
      expect(pathMatchesGlob(path, glob)).toBe(expected);
    });
  }
});
