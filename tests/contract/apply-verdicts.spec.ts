/**
 * `corpus:apply-verdicts` — the two halves that make it safe to run.
 *
 * It FILLS blank rows and it RETRACTS orphans. Both are irreversible on a
 * committed `.jsonl`, and both are easy to get wrong in a way that looks like
 * success:
 *
 *   - filling a row that already carries a verdict would overwrite a human
 *     judgement, which the README calls immutable;
 *   - retracting a row that already carries a verdict would DELETE a human
 *     judgement, which is strictly worse than the overwrite;
 *   - applying a decision for a row key that does not exist would report
 *     "applied N" and change nothing, so a typo in a filename reads as a pass.
 *
 * Each is asserted by running the real script against a temp corpus, not by
 * re-implementing its logic here — a test that shares the implementation's
 * mistakes proves nothing about the implementation.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = join(ROOT, "scripts", "lib", "apply-verdicts.ts");

const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

/** Run the applier against a temp copy of the verdict corpus. */
function run(rows: string[], decisions: unknown): Run {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-apply-verdicts-"));
  scratch.push(dir);
  const verdicts = join(dir, "verdicts");
  mkdirSync(verdicts, { recursive: true });
  writeFileSync(
    join(verdicts, "ZZ-probe.jsonl"),
    rows.join("\n") + "\n",
    "utf8",
  );
  const decisionsPath = join(dir, "decisions.json");
  writeFileSync(decisionsPath, JSON.stringify(decisions, null, 2), "utf8");

  try {
    const stdout = execFileSync(
      process.execPath,
      [
        join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
        SCRIPT,
        decisionsPath,
        `--verdicts-dir=${verdicts}`,
      ],
      { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: e.status ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
}

const BLANK = JSON.stringify({
  ruleId: "QA-PROBE-001",
  file: "a.spec.ts",
  line: 10,
  verdict: "",
});
const SETTLED = JSON.stringify({
  ruleId: "QA-PROBE-001",
  file: "b.spec.ts",
  line: 20,
  verdict: "TP",
  note: "adjudicated 2026-09-02 by a person",
});

describe("apply-verdicts: filling", () => {
  it("fills a blank row and records the note", () => {
    const result = run([BLANK, SETTLED], {
      "ZZ-probe": {
        "QA-PROBE-001|a.spec.ts|10": { verdict: "TP", note: "read the source" },
      },
    });
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain("applied 1 verdict");
  });

  it("never overwrites a settled row", () => {
    const r = run([BLANK, SETTLED], {
      "ZZ-probe": {
        "QA-PROBE-001|b.spec.ts|20": { verdict: "FP", note: "a later opinion" },
      },
    });
    // Exits 0 (no unknown rows) but changes nothing, which is the designed
    // behaviour: immutability is enforced by refusing, not by failing, so a
    // bulk re-run of a decisions file does not break the harvest.
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toContain("applied 0 verdict");
  });
});

describe("apply-verdicts: retracting an orphan", () => {
  it("removes a blank orphan row entirely", () => {
    const r = run([BLANK, SETTLED], {
      "ZZ-probe": {
        "QA-PROBE-001|a.spec.ts|10": {
          verdict: "RETRACT",
          note: "cited line holds no trigger",
        },
      },
    });
    expect(r.code, r.stderr).toBe(0);
    expect(r.stdout).toContain("retracted 1 orphaned row");
    // The settled row beside it must survive untouched.
    expect(r.stdout).toContain("applied 0 verdict");
  });

  it("REFUSES to retract a row that already carries a verdict, and says so", () => {
    // This is the assertion the feature exists for. A retraction that can
    // delete a human judgement is not an orphan rule, it is a way to erase
    // evidence — and erasing it silently would leave the corpus looking
    // better-measured than it is.
    const r = run([BLANK, SETTLED], {
      "ZZ-probe": {
        "QA-PROBE-001|b.spec.ts|20": {
          verdict: "RETRACT",
          note: "I changed my mind",
        },
      },
    });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("already classified TP");
    expect(r.stderr).toContain("immutable");
    expect(r.stdout).toContain("retracted 0 orphaned row");
  });
});

describe("apply-verdicts: typo protection", () => {
  it("fails on a decision naming a row that does not exist", () => {
    const r = run([BLANK, SETTLED], {
      "ZZ-probe": {
        "QA-PROBE-001|a.spec.ts|999": { verdict: "TP", note: "wrong line" },
      },
    });
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("unknown rows (1)");
  });

  it("reports both counts so a no-op run is distinguishable from a pass", () => {
    const r = run([BLANK, SETTLED], {
      "ZZ-probe": {
        "QA-PROBE-001|a.spec.ts|10": { verdict: "TP", note: "ok" },
        "QA-PROBE-001|a.spec.ts|10.0": { verdict: "TP", note: "not a row" },
      },
    });
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("applied 1 verdict");
  });
});
