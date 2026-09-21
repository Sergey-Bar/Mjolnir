/**
 * `npm run docs:formats` — regenerates the JSON and SARIF renderings of
 * the SAME demo scan that `docs:hero` renders as a terminal capture.
 *
 * The landing page shows one scan in three output shapes (terminal /
 * JSON / SARIF) so that "machine-readable output" is something a visitor
 * can see rather than a claim they have to take on faith
 * (`.planning/SITE-REDESIGN-PLAN.md` §4, Phase 5).
 *
 * Both outputs are committed under assets/readme/ for the same reason
 * terminal-hero.svg is: the site build (site/package.json) runs on plain
 * Node with zero dependencies and cannot execute the TypeScript CLI, so
 * it consumes committed artifacts. `site/scripts/gen-report.mjs` slices
 * a small excerpt out of these for the page; the full files stay in the
 * repo and are linked, never shipped to the browser.
 *
 * The scan options MUST stay identical to generate-readme-hero.ts, or
 * the three tabs would show three different scans — the exact class of
 * drift this site's law exists to prevent. `tests/site-formats.spec.ts`
 * asserts the scores agree.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScan } from "../src/cli.js";
import type { ScanResult } from "../src/types.js";
import { renderSarif } from "../src/reporter/sarif.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DEMO_REPO = join(ROOT, "examples", "demo-repo");
const OUT_DIR = join(ROOT, "assets", "readme");

async function main(): Promise<void> {
  if (!existsSync(DEMO_REPO)) {
    console.error(`examples/demo-repo not found at ${DEMO_REPO}`);
    process.exit(1);
  }

  const result = await runScan({
    target: DEMO_REPO,
    json: false,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "terminal",
    // Identical to generate-readme-hero.ts — see the header note.
    strict: true,
  });

  mkdirSync(OUT_DIR, { recursive: true });

  // The wall-clock duration is real but non-deterministic; the hero asset
  // masks it for the same reason, so regenerating is a no-op diff when
  // nothing about the scan itself changed.
  const json = JSON.parse(JSON.stringify(result)) as ScanResult;
  if (json.analysisStatus?.durationMs !== undefined) {
    json.analysisStatus.durationMs = 0;
  }

  const jsonPath = join(OUT_DIR, "demo-report.json");
  writeFileSync(jsonPath, JSON.stringify(json, null, 2) + "\n");

  const sarifPath = join(OUT_DIR, "demo-report.sarif");
  writeFileSync(sarifPath, renderSarif(result) + "\n");

  console.log(
    `Wrote ${jsonPath} — score ${json.score}, ${json.findings.length} findings`,
  );
  console.log(`Wrote ${sarifPath}`);
}

await main();
