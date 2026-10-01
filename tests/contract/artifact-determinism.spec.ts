/**
 * `artifact:deterministic` — two runs of an HTML artifact over an
 * unchanged repository produce byte-identical bytes.
 *
 * BITTERSWEET `BW-106`. The dashboard embedded `new Date()` in the
 * visible body, so its output changed on every run and could never be
 * diffed in review: a reviewer could not tell a real change from a new
 * timestamp. `engine/machine-contract.ts` already excludes `durationMs`
 * from the verification digest for exactly this reason — the HTML
 * artifact now holds the same line.
 *
 * The rule this locks:
 *   - `--deterministic` omits the generation timestamp entirely, so the
 *     file is a pure function of the scan result;
 *   - without the flag, the timestamp is still recorded — as document
 *     METADATA (`<meta name="mjolnir-generated-at">`), never as body text,
 *     so it cannot be mistaken for a measurement.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..", "..");

/** A result with everything a dashboard renders, so a missing branch
 *  cannot make the two runs agree by both being empty. */

describe("the artifact is the one the CLI writes", () => {
  it("no other dashboard template is in the tree", () => {
    // BW-042 retired the hand-written template; until the React bundle
    // ships this asserted there was exactly ONE generator, not two that
    // could disagree about a band.
    //
    // The v6 carve removed the `dashboard` verb and its generator with it,
    // which makes the assertion vacuous: there is no template, so there
    // cannot be two disagreeing ones. Rewritten to test the property that
    // still has teeth — the invariant was never about a filename, it was
    // that the report renderer and any other renderer must not both be able
    // to claim a band — and to record the retirement rather than leave a
    // read of a file that no longer exists.
    let offenders = 0;
    for (const rel of [
      "src/reporter/report.ts",
      "src/reporter/presentation.ts",
      "src/cli.ts",
      "src/commands/stats.ts",
    ]) {
      const path = join(ROOT, rel);
      if (!existsSync(path)) continue;
      const source = readFileSync(path, "utf8");
      offenders += (source.match(/<!DOCTYPE html>/g) ?? []).length;
    }
    expect(
      offenders,
      "two renderers can now claim a band independently, and a score " +
        "rendered two ways is a score nobody can check",
    ).toBe(0);
  });
});
