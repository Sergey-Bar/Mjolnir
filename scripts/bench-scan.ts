/**
 * `npm run bench:scan` — produce a benchmark artifact for HEAD.
 *
 * Usage: npx tsx scripts/bench-scan.ts [outdir] [--files N]
 * Writes <outdir>/bench-artifact.json (cwd default).
 * Policy: advisory compare against the pinned baseline, warnings printed
 * loudly — the gate never blocks (§340).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

import {
  generateFixture,
  runBenchmark,
  advisoryCompare,
} from "../src/bench/harness.js";
import { CLI_VERSION } from "../src/cli.js";

const outDir = resolve(process.argv[2] ?? ".");
const filesFlagIdx = process.argv.indexOf("--files");
const fileCount =
  filesFlagIdx !== -1 ? Number(process.argv[filesFlagIdx + 1]) || 300 : 300;

function currentCommit(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const fixtureRoot = join(outDir, ".bench-fixture");
mkdirSync(fixtureRoot, { recursive: true });
const fixture = generateFixture(fixtureRoot, { fileCount });
const artifact = await runBenchmark(fixtureRoot, fixture, {
  mjolnirVersion: CLI_VERSION,
  commit: currentCommit(),
});
const outPath = join(outDir, "bench-artifact.json");
writeFileSync(outPath, JSON.stringify(artifact, null, 2) + "\n");
console.log(`Benchmark artifact written: ${outPath}`);
for (const s of artifact.samples) {
  console.log(
    `  ${s.scenario.padEnd(18)} median ${String(s.durationMs).padStart(6)}ms  (runs: ${s.runs.join(", ")})`,
  );
}

// Advisory compare (§340): never blocks — a missing baseline is a loud
// warning, and a regression is a fail-noisy warning.
const baselinePath = join(process.cwd(), ".mjolnir", "bench-baseline.json");
if (!existsSync(baselinePath)) {
  console.warn(
    "WARNING: no pinned baseline at .mjolnir/bench-baseline.json — " +
      "regressions cannot be detected. Commit one from a trusted revision.",
  );
} else {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as Parameters<
    typeof advisoryCompare
  >[1];
  if (baseline.schemaVersion !== artifact.schemaVersion) {
    console.warn(
      "WARNING: baseline schemaVersion differs — regenerating the baseline is required before deltas are meaningful.",
    );
  } else {
    const warnings = advisoryCompare(artifact, baseline);
    if (warnings.length === 0) {
      console.log(
        "Advisory perf compare: no scenario regressed >25% vs pinned baseline.",
      );
    } else {
      console.warn("PERF REGRESSION WARNING (advisory — does not block):");
      for (const w of warnings) console.warn(`  - ${w}`);
    }
  }
}
