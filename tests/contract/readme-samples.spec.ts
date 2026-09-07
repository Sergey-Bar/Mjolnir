/**
 * The README's terminal samples are the generated ones (P2 follow-up).
 *
 * Two transcripts in the README — the FLAKINESS LEADERBOARD and the
 * SELECTOR HEALTH report — were hand-maintained copies of output that is
 * already generated and drift-locked under assets/readme/. They happened
 * to be accurate; nothing made them stay that way, which is the same gap
 * that let the `explain` sample rot until readme-doctest.spec.ts started
 * checking it (a stale transcript in a document about honesty is the
 * worst place in the repo for one).
 *
 * The assertion is contiguous-run containment rather than equality: the
 * README quotes the part of each sample that illustrates the point and
 * omits trailer lines that belong to the generator's own invocation —
 * `forensics-sample.txt` ends with "FLAKY.md not written (--no-flaky-md)"
 * because the generator passes that flag, while the README documents the
 * plain `mjolnir forensics ./test-results/` form, which does write it.
 * Every line the README does show must match the generated file exactly,
 * indentation included.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const README = readFileSync(join(ROOT, "README.md"), "utf8");

/** The ```text fenced block containing `marker`, minus the fences. */
function fencedBlockContaining(marker: string): string {
  const blocks = [...README.matchAll(/```text\n([\s\S]*?)```/g)].map(
    (m) => m[1] ?? "",
  );
  const found = blocks.filter((b) => b.includes(marker));
  expect(
    found.length,
    `expected exactly one \`\`\`text block in README.md containing "${marker}"`,
  ).toBe(1);
  return (found[0] ?? "").replace(/\s+$/, "");
}

function generatedSample(file: string): string {
  return readFileSync(join(ROOT, "assets", "readme", file), "utf8")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n");
}

describe("README terminal samples come from the generated, drift-locked files", () => {
  it.each([
    ["▚ FLAKINESS LEADERBOARD", "forensics-sample.txt"],
    ["▚ SELECTOR HEALTH", "selector-health-sample.txt"],
  ])(
    'the README\'s "%s" block is a verbatim run of assets/readme/%s',
    (marker, file) => {
      const block = fencedBlockContaining(marker)
        .split("\n")
        .map((l) => l.replace(/\s+$/, ""))
        .join("\n");
      expect(
        generatedSample(file).includes(block),
        `the README's "${marker}" transcript is no longer a verbatim run of ` +
          `assets/readme/${file} — regenerate the samples with ` +
          `\`npm run docs:forensics-samples\` and paste the current output, ` +
          `rather than editing the README block by hand.`,
      ).toBe(true);
    },
  );

  it("both samples are non-trivial (guards the containment check itself)", () => {
    // A blank or one-line block would be "contained" by anything.
    for (const marker of ["▚ FLAKINESS LEADERBOARD", "▚ SELECTOR HEALTH"]) {
      expect(fencedBlockContaining(marker).split("\n").length).toBeGreaterThan(
        4,
      );
    }
  });
});
