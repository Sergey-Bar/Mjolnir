/**
 * `qa-doctor fix` write-failure path (Test Hardening Plan — coverage
 * gap closure).
 *
 * planAndApplyFixes has a real safety net for this: if writeFileSync
 * throws after a fix has been planned and proof-verified in memory
 * (e.g. the file became read-only, or was deleted, between the scan and
 * the fix), it reports the fix as "failed — write failed" instead of
 * throwing and losing the whole run. Nothing exercised that catch block
 * before this.
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runScan } from "../src/cli.js";
import { planAndApplyFixes, type FixResult } from "../src/commands/fix.js";

let dir: string;
const SPEC_REL = "e2e/checkout.spec.ts";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qa-doctor-fix-write-fail-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, SPEC_REL),
    "it.only('pays', () => { expect(true).toBe(true); });\n",
  );
});

afterEach(() => {
  try {
    chmodSync(join(dir, SPEC_REL), 0o644);
  } catch {
    /* already gone or never locked */
  }
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

describe("write failure during apply is reported, not thrown", () => {
  it("a read-only target file produces a 'failed' result instead of crashing planAndApplyFixes", () => {
    const scanResult = scan();
    let madeReadOnly = false;
    try {
      chmodSync(join(dir, SPEC_REL), 0o444);
      madeReadOnly = true;
    } catch {
      /* platform doesn't support this — nothing to assert here */
    }
    if (!madeReadOnly) return;

    let results: FixResult[] | undefined;
    expect(() => {
      results = planAndApplyFixes(scanResult, dir, {});
    }).not.toThrow();

    expect(
      results?.some((r) => r.status === "failed"),
      "expected at least one 'failed' result when the target file is " +
        "read-only, not a silent no-op or a thrown exception",
    ).toBe(true);

    // The file must genuinely be untouched — the whole point of the
    // write-failure path is "left untouched", not partially written.
    chmodSync(join(dir, SPEC_REL), 0o644);
    const after = readFileSync(join(dir, SPEC_REL), "utf8");
    expect(after).toContain(".only");
  });
});
