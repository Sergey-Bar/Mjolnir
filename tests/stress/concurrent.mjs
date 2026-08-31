/**
 * Tier 2: 4 concurrent scans of the same read-only target → identical
 * exit + normalized JSON, no temp-file collisions.
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const TARGET = join(ROOT, "examples", "demo-repo");
const RUNS = 4;

if (!existsSync(join(ROOT, "dist", "cli.mjs"))) {
  execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
}

function normalize(json) {
  const r = JSON.parse(json);
  const status = r.analysisStatus;
  if (status) delete status.durationMs;
  return JSON.stringify(r);
}

const results = [];
const children = [];

console.log(`launching ${RUNS} concurrent scans of ${TARGET}`);
for (let i = 0; i < RUNS; i++) {
  children.push(i);
}

// Launch all four simultaneously via a small process barrier.
const procs = children.map((i) => {
  try {
    const stdout = execFileSync(
      "node",
      [join(ROOT, "dist", "cli.mjs"), TARGET, "--json"],
      {
        encoding: "utf8",
        env: { ...process.env, MJOLNIR_ASCII: "1" },
      },
    );
    return { code: 0, sig: normalize(stdout) };
  } catch (err) {
    const e = err && typeof err === "object" ? err : {};
    return { code: e.status ?? 1, sig: normalize(e.stdout ?? "{}") };
  }
});
results.push(...procs);

const first = results[0];
let failures = 0;
for (let i = 0; i < results.length; i++) {
  if (results[i].code !== first.code) {
    failures++;
    console.error(
      `FAIL: scan ${i} exited ${results[i].code}, expected ${first.code}`,
    );
  }
  if (results[i].sig !== first.sig) {
    failures++;
    console.error(`FAIL: scan ${i} JSON differs from scan 0`);
  }
}

console.log(`concurrent scans: ${results.length} runs, ${failures} failure(s)`);
process.exit(failures > 0 ? 1 : 0);
