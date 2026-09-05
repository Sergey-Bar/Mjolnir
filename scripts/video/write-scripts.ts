/**
 * `npm run docs:video:capture` — regenerates the committed video scripts
 * from real Mjolnir executions.
 *
 * Writes assets/video/script.{demo,tour}.json. Those files are the only
 * thing the renderer is allowed to draw, and
 * `tests/contract/video-script.spec.ts` re-runs these same captures and
 * fails if either has drifted from what the CLI now prints.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { stripAnsi } from "../readme-svg.js";
import { captureDemoScript, captureTourScript } from "./capture.js";
import { assertGlyphCoverage } from "./check-glyphs.js";
import { scriptPath, serialize } from "./script-io.js";
import type { VideoScript } from "./script-types.js";

/**
 * Every glyph the captured output actually contains must resolve in the
 * vendored font stack. Checked against the real captures, not only the
 * static inventory: a new rule message can introduce a character no
 * shipped face covers, and that would render as a tofu box.
 */
export function assertCapturedGlyphs(scripts: VideoScript[]): void {
  const text = scripts
    .flatMap((s) => s.beats.flatMap((b) => b.ansi))
    .map(stripAnsi)
    .join("");
  assertGlyphCoverage([
    ...new Set([...text].filter((c) => (c.codePointAt(0) ?? 0) > 0x20)),
  ]);
}

async function main(): Promise<void> {
  const scripts = [await captureDemoScript(), await captureTourScript()];
  assertCapturedGlyphs(scripts);

  for (const script of scripts) {
    const path = scriptPath(script.id);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, serialize(script));
    const lines = script.beats.reduce((n, b) => n + b.ansi.length, 0);
    console.log(
      `Wrote ${path} - ${script.beats.length} beats, ${lines} captured lines`,
    );
    for (const beat of script.beats) {
      const a = beat.assertions;
      console.log(
        `  ${beat.id.padEnd(16)} ${String(beat.ansi.length).padStart(4)} lines` +
          (a
            ? `  score=${a.score} errors=${a.errorCount} findings=${a.findingCount}`
            : ""),
      );
    }
  }
}

// Only when invoked as a script. Importing this module must never
// regenerate the committed scripts — see script-io.ts.
if (process.argv[1]?.endsWith("write-scripts.ts")) await main();
