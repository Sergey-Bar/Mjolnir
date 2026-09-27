/**
 * T4 — a scan that loses its AST stage must say so.
 *
 * `src/engine/scan-pipeline.ts` computed
 * `const wantsAst = adapter.parseAst !== undefined && Date.now() <= deadline`.
 * Once a scan passes its `--max-duration` deadline, every REMAINING file is
 * analyzed by regex instead of AST — a different detection capability, not a
 * slower version of the same one, so the same tree yields different findings
 * and a different score. The mode is baked into the cache key, so the cache
 * faithfully recorded the downgrade; the REPORT never surfaced it. The only
 * related disclosure, `file-budget`, fired only incidentally, because the
 * per-file deadline at the rule loop was usually already in the past too.
 *
 * The fix is DISCLOSE, not remove. Deleting the time-based flip is a large
 * behaviour and performance change, and this repo's law forbids claiming a
 * change is safe without a measurement that does not exist yet. So the scan
 * names the loss (`ast-budget-fallback`), reports how many files it affected
 * (`ast-budget-fallback-files:<n>` in `analysisStatus.reasons`), and is
 * honestly `partial`. The measurement that would justify removal is a
 * separately scoped follow-up, not something to assert here.
 *
 * The important second half of this spec is the generous-budget arm. A
 * disclosure that can never turn off hardens into a permanent lie, and a
 * permanently-`partial` tool is its own false-green: it can no longer
 * distinguish a good run from a bad one.
 *
 * The arm is narrow, and the fixture is built for it on purpose. The loop-top
 * deadline check and the AST decision read the clock CONSECUTIVELY — nothing
 * between them calls `Date.now()` — so a file can only lose its AST stage if
 * the millisecond ticks over during the read and declaration counting that
 * happen first. Hence the deterministic clock: reads 1..193 answer in real
 * time, and read 194 onward answer 60 s later. 193 is
 * `1 scan start + 12 × (1 loop-top check + 12 walk entry checks + 3
 * workflow-adapter probes) + 1` — the last file's loop-top read. A change to
 * that topology makes this fixture miss its window and the assertion below
 * fails, which is the intended direction: a re-derivation, not a silent pass.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseArgs, runScan } from "../../src/cli.js";

const REASON = "ast-budget-fallback";
const COUNTED_PREFIX = "ast-budget-fallback-files:";
const FILE_COUNT = 12;
/** Reads that answer in real time; everything after is 60 s past the deadline. */
const REAL_TIME_READS = 193;

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-ast-budget-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  for (let i = 0; i < FILE_COUNT; i++) {
    writeFileSync(join(dir, "e2e", `a${i}.spec.ts`), "it('a', () => {});\n");
  }
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function scanArgs(target: string, over: Record<string, unknown> = {}) {
  const parsed = parseArgs([target]);
  if (!parsed) throw new Error("parseArgs failed");
  return { ...parsed, target, ...over };
}

function countedFiles(result: {
  analysisStatus: { reasons?: string[] };
}): number[] {
  return (result.analysisStatus.reasons ?? [])
    .filter((reason) => reason.startsWith(COUNTED_PREFIX))
    .map((reason) => Number(reason.slice(COUNTED_PREFIX.length)));
}

describe("T4: a deadline-truncated AST stage is disclosed", () => {
  it("names the fallback, counts the files, and refuses to call the scan whole", async () => {
    // The real clock, with a boundary moved rather than faked: the scan
    // itself decides when the deadline passes, exactly as in production.
    const realNow = Date.now;
    let reads = 0;
    Date.now = () => {
      reads += 1;
      return reads <= REAL_TIME_READS ? realNow() : realNow() + 60_000;
    };
    let result;
    try {
      result = await runScan(scanArgs(dir, { maxDurationMs: 1000 }));
    } finally {
      Date.now = realNow;
    }

    expect(result.analysisStatus.truncationReasons).toContain(REASON);
    expect(result.partial, "a lost AST stage is not a whole scan").toBe(true);
    // The COUNT, not just the flag. "Some capability was lost" and "this
    // much of the surface was analyzed by regex instead" are different
    // claims, and only the second tells a reader what the score is worth.
    expect(countedFiles(result)).toEqual([1]);
    expect(result.analysisStatus.truncationReasons).toContain("file-budget");
  });

  it("an adapter that declares no AST stage is a capability envelope, not a truncation", async () => {
    // github-actions is a pure YAML adapter: `parseAst` is undefined. A
    // repo scanned with nothing but a workflow must never read as partial
    // for a capability it never had. If the guard that distinguishes "no
    // AST stage" from "lost the AST stage" is ever dropped, this fails.
    const yamlOnly = mkdtempSync(join(tmpdir(), "mjolnir-ast-budget-yaml-"));
    try {
      mkdirSync(join(yamlOnly, ".github", "workflows"), { recursive: true });
      writeFileSync(
        join(yamlOnly, ".github", "workflows", "ci.yml"),
        "on:\n  push:\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test\n",
      );

      const result = await runScan(
        scanArgs(yamlOnly, { maxDurationMs: 600_000 }),
      );

      expect(result.analysisStatus.truncationReasons ?? []).not.toContain(
        REASON,
      );
      expect(countedFiles(result)).toEqual([]);
    } finally {
      rmSync(yamlOnly, { recursive: true, force: true });
    }
  });

  it("the disclosure does not add a field to the non-deterministic allowlist", async () => {
    // It must not perturb the machine contract's digest, and that allowlist
    // is deliberately EMPTY (doctor-json.spec.ts): every emitted contract
    // field is expected to be deterministic, so a new entry here is a
    // conscious decision rather than something this change slips in.
    const { NON_DETERMINISTIC_FIELDS } =
      await import("../../src/commands/doctor.js");
    expect(NON_DETERMINISTIC_FIELDS).toEqual([]);
  });
});

describe("T4: the disclosure can turn off, or it is a permanent lie", () => {
  it("a generous-budget scan carries NO ast-budget reason and is not partial", async () => {
    const result = await runScan(scanArgs(dir, { maxDurationMs: 600_000 }));

    expect(result.analysisStatus.truncationReasons ?? []).not.toContain(REASON);
    expect(result.analysisStatus.reasons ?? []).not.toContain(
      expect.stringContaining(REASON),
    );
    // The whole point: a scan that analyzed everything is allowed to say so.
    expect(result.partial).toBe(false);
    expect(result.analysisStatus.rules).toBe("complete");
    expect(result.analysisStatus.truncationReasons).toBeUndefined();
  });
});
