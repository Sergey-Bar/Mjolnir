/**
 * Tier 2 soak: 20 sequential full scans of FRESH TEMP COPIES of the
 * golden + demo repos (never scanned in place — baseline/stats write
 * .mjolnir/ state into the target and would contaminate later runs).
 * Asserts byte-identical JSON every run and a flat RSS slope.
 */

import { execFileSync, execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const RUNS = 20;
const DRIFT_DIR = join(ROOT, "soak-drift");
const TARGETS = [
  join(ROOT, "tests", "golden", "repo"),
  join(ROOT, "examples", "demo-repo"),
];

if (!existsSync(join(ROOT, "dist", "cli.mjs"))) {
  execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
}
// Recreate the drift-artifact dir fresh: leftovers from a prior run would
// otherwise masquerade as this run's evidence (and CI uploads the dir).
rmSync(DRIFT_DIR, { recursive: true, force: true });
mkdirSync(DRIFT_DIR, { recursive: true });

/** Strip timing fields exactly like output-determinism.spec.ts. */
function normalize(json) {
  const r = JSON.parse(json);
  const status = r.analysisStatus;
  if (status) delete status.durationMs;
  return JSON.stringify(r);
}

const rssSamples = [];
const signatures = [];
let failures = 0;

for (const target of TARGETS) {
  const firstJsonByTarget = new Map();
  for (let run = 1; run <= RUNS; run++) {
    // Fresh temp copy every run.
    const copy = mkdtempSync(join(tmpdir(), "mjolnir-soak-"));
    cpSync(target, copy, { recursive: true });
    rmSync(join(copy, ".mjolnir"), { recursive: true, force: true });

    const rssBefore = process.memoryUsage().rss;
    let json;
    try {
      json = execFileSync(
        "node",
        [join(ROOT, "dist", "cli.mjs"), copy, "--json"],
        { encoding: "utf8", env: { ...process.env, MJOLNIR_ASCII: "1" } },
      );
    } catch (err) {
      // Findings exits are fine — recover stdout from the error object.
      json = String(err && err.stdout ? err.stdout : "");
    }
    const rssAfter = process.memoryUsage().rss;
    rssSamples.push(rssAfter - rssBefore);

    const sig = normalize(json);
    const prev = firstJsonByTarget.get(target);
    if (prev === undefined) {
      firstJsonByTarget.set(target, sig);
    } else if (prev !== sig) {
      failures++;
      writeFileSync(
        join(
          DRIFT_DIR,
          `soak-drift-${target.replace(/[\\/]/g, "_")}-run${run}.json`,
        ),
        json,
      );
      console.error(
        `FAIL: run ${run} output differs from run 1 for ${target} — drift artifact written`,
      );
    }
    rmSync(copy, { recursive: true, force: true });
    console.log(`${target} run ${run}: ok (rss delta ${rssAfter - rssBefore})`);
  }
}

// Flat RSS slope: linear fit tolerance. A leak shows a consistent rise.
const n = rssSamples.length;
const meanX = (n - 1) / 2;
const meanY = rssSamples.reduce((a, b) => a + b, 0) / n;
let num = 0;
let den = 0;
for (let i = 0; i < n; i++) {
  num += (i - meanX) * (rssSamples[i] - meanY);
  den += (i - meanX) * (i - meanX);
}
const slope = num / den;
const maxAbsDelta = Math.max(...rssSamples.map((r) => Math.abs(r)));
const tolerance = maxAbsDelta * 0.5 + 32 * 1024 * 1024; // 0.5× max delta or 32 MB
if (Math.abs(slope) > tolerance) {
  failures++;
  console.error(`FAIL: RSS slope ${slope} exceeds tolerance ${tolerance}`);
}

console.log(
  `soak complete: ${failures} failure(s), RSS slope ${slope.toFixed(0)}`,
);
process.exit(failures > 0 ? 1 : 0);
