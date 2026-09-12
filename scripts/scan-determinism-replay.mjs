/**
 * Scan-artifact determinism gate (certification F2, remediation plan
 * 1788806598818): two identical `mjolnir <target> --json` scans must
 * produce byte-identical artifacts after stripping ONLY the two
 * documented wall-clock fields:
 *
 *   $.analysisStatus.durationMs
 *   $.contract.completeness.durationMs
 *
 * This is the scan-side allowlist — deliberately narrower than "diff
 * the objects and ignore what differs". Any OTHER difference (score,
 * findings, contract counts, field order, extra keys) fails with a
 * JSON-pointer-style diff hint and exit 1.
 *
 * The two durationMs fields are the exact same wall-clock fields the
 * machine-contract digest already excludes (src/engine/machine-contract.ts,
 * canonicalScanJson: "durationMs is EXCLUDED — it is wall-clock, not
 * semantics"). The doctor --json byte-equality gate keeps NO allowlist
 * (G5, doctor model carries a NON_DETERMINISTIC_FIELDS constant that is
 * empty by default).
 *
 * CI (certification job, hard-blocking — no `|| true`, no
 * continue-on-error): build is already present, so this runs against
 * `.`.
 *
 * Usage: node scripts/scan-determinism-replay.mjs [target] [cli]
 *   target  scan target (default: repo root)
 *   cli     CLI entry to invoke (default: dist/cli.mjs)
 */
import { spawnSync } from "node:child_process";
import { Buffer } from "node:buffer";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const target = process.argv[2] ?? ROOT;
const cli = process.argv[3] ?? join(ROOT, "dist", "cli.mjs");

/** The ONLY fields allowed to differ between two identical scans. */
const DURATION_MS_ALLOWLIST = [
  ["analysisStatus", "durationMs"],
  ["contract", "completeness", "durationMs"],
];

function scanOnce(label) {
  const r = spawnSync(process.execPath, [cli, target, "--json"], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  // Exit 0 = clean scan, 1 = findings found — BOTH are successful scan
  // completions whose --json artifact is the object under test. Anything
  // else is a crash/usage error and fails the replay.
  if (r.status !== 0 && r.status !== 1) {
    console.error(`scan-determinism: run ${label} exited ${r.status}`);
    if (r.stderr) console.error(r.stderr.slice(0, 4000));
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(r.stdout);
  } catch (e) {
    console.error(
      `scan-determinism: run ${label} printed unparseable JSON: ${e.message}`,
    );
    process.exit(1);
  }
  return parsed;
}

/** Walk to a path; undefined when any prefix is missing. */
function at(doc, path) {
  let node = doc;
  for (const key of path) {
    if (node === undefined || node === null || typeof node !== "object") {
      return undefined;
    }
    node = node[key];
  }
  return node;
}

/**
 * The allowlist is an EXACT contract with the shipped schema: every
 * listed path must exist in the report (they are required fields), or
 * the schema changed deliberately and the allowlist must be updated in
 * the same PR — silently shrinking the allowlist would hide drift.
 */
function requireAllowlistedPaths(doc) {
  for (const path of DURATION_MS_ALLOWLIST) {
    if (at(doc, path) === undefined) {
      console.error(
        `scan-determinism: allowlisted field $.${path.join(".")} is MISSING from the report — update the allowlist only if the schema changed deliberately`,
      );
      process.exit(1);
    }
  }
}

/**
 * Strip exactly the allowlisted durationMs paths (in place) and return
 * the canonical serialization. Stripping, not overwriting with a
 * constant, so an implementation that stops emitting the field at all
 * is still caught by the requireAllowlistedPaths shape check above.
 */
function stripAndCanonicalize(doc) {
  for (const path of DURATION_MS_ALLOWLIST) {
    const parent = at(doc, path.slice(0, -1));
    delete parent[path[path.length - 1]];
  }
  return Buffer.from(JSON.stringify(doc), "utf8");
}

const first = scanOnce("A");
requireAllowlistedPaths(first);
const bytesA = stripAndCanonicalize(first);
const second = scanOnce("B");
requireAllowlistedPaths(second);
const bytesB = stripAndCanonicalize(second);

if (bytesA.equals(bytesB)) {
  console.log(
    `scan-determinism: two scans of ${target} are byte-identical after stripping the ${DURATION_MS_ALLOWLIST.length} allowlisted durationMs fields ✓`,
  );
  process.exit(0);
}

// Failure: point at the FIRST divergent path instead of dumping blobs.
function firstDiffPath(a, b, path = "$") {
  if (typeof a !== typeof b) return path;
  if (Array.isArray(a) || a === null || b === null || typeof a !== "object") {
    return JSON.stringify(a) === JSON.stringify(b) ? undefined : path;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const ka = k in a;
    const kb = k in b;
    if (ka !== kb) return `${path}.${k} (present: ${ka ? "A" : "B"} only)`;
    const d = firstDiffPath(a[k], b[k], `${path}.${k}`);
    if (d !== undefined) return d;
  }
  return undefined;
}
let docA;
let docB;
try {
  docA = JSON.parse(bytesA.toString("utf8"));
  docB = JSON.parse(bytesB.toString("utf8"));
} catch {
  docA = undefined;
  docB = undefined;
}
const where = docA ? (firstDiffPath(docA, docB) ?? "(byte-level)") : "(parse)";
console.error(
  `scan-determinism: two scans of ${target} DIFFER beyond the durationMs allowlist — first divergence at ${where}`,
);
console.error(
  "scan-determinism: scan artifacts must be deterministic (F2); a semantic field that varies between runs is a determinism bug, not an allowlist candidate",
);
process.exit(1);
