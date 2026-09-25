/**
 * Tier 2 soak: 20 sequential full scans of FRESH TEMP COPIES of the
 * golden + demo repos (never scanned in place — baseline/stats write
 * .mjolnir/ state into the target and would contaminate later runs).
 * Asserts byte-identical JSON every run.
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

import { normalizeCliJson } from "../../scripts/lib/normalize-cli-json.mjs";

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

const signatures = [];
let failures = 0;

for (const target of TARGETS) {
  const firstJsonByTarget = new Map();
  for (let run = 1; run <= RUNS; run++) {
    // Fresh temp copy every run.
    const copy = mkdtempSync(join(tmpdir(), "mjolnir-soak-"));
    cpSync(target, copy, { recursive: true });
    rmSync(join(copy, ".mjolnir"), { recursive: true, force: true });

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

    const sig = normalizeCliJson(json);
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
    console.log(`${target} run ${run}: ok`);
  }
}

console.log(`soak complete: ${failures} byte-drift failure(s)`);
process.exit(failures > 0 ? 1 : 0);
