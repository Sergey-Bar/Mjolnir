/**
 * False-positive corpus audit (Test Hardening Plan, P0 #1).
 *
 * Fixtures prove a rule fires on ONE hand-written example. They say
 * nothing about real code. This script runs the real scan pipeline
 * (`runScan`, the same function the CLI calls) against small, real,
 * actively-maintained OSS repos and snapshots the per-rule finding
 * count as a baseline.
 *
 * Usage:
 *   npx tsx tests/corpus/audit.ts            # check against committed baseline
 *   npx tsx tests/corpus/audit.ts --update    # regenerate the baseline
 *
 * "Check" mode fails (exit 1) if a rule fires MORE on real code than the
 * committed baseline recorded — that's a false-positive regression signal.
 * A rule firing less is fine (it got quieter). New repos or new rules
 * with no baseline entry are reported but don't fail the run — add them
 * via --update once you've manually reviewed the findings as legitimate.
 *
 * Not part of `npm test` — this clones real repos over the network and
 * is meant to run as its own (nightly) CI job, not on every PR.
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScan } from "../../src/cli.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(HERE, ".cache");
const BASELINE_DIR = join(HERE, "baseline");

interface CorpusRepo {
  /** Baseline filename stem — keep stable, renaming loses history. */
  name: string;
  url: string;
  /** What this repo is meant to exercise. */
  note: string;
}

// Small, real, actively-maintained repos chosen for size (fast shallow
// clone) and genuine coverage of an adapter's rule families. Add more
// here as adapters grow — one entry, one `--update` run.
const CORPUS: CorpusRepo[] = [
  {
    name: "pallets-click",
    url: "https://github.com/pallets/click.git",
    note: "real pytest suite — Python adapter FP surface",
  },
  {
    name: "microsoft-playwright-mcp",
    url: "https://github.com/microsoft/playwright-mcp.git",
    note: "real Playwright + GitHub Actions — TS/PW/CI adapter FP surface",
  },
  {
    name: "pytest-dev-pytest",
    url: "https://github.com/pytest-dev/pytest.git",
    note: "large real pytest suite — Python adapter FP surface (QA-PY-001..012)",
  },
  {
    name: "psf-requests",
    url: "https://github.com/psf/requests.git",
    note: "small real pytest suite — Python adapter FP surface",
  },
];

interface BaselineEntry {
  countsByRule: Record<string, number>;
  totalFindings: number;
}

function cloneRepo(repo: CorpusRepo): string {
  const dest = join(CACHE_DIR, repo.name);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(CACHE_DIR, { recursive: true });
  execFileSync("git", ["clone", "--depth", "1", repo.url, dest], {
    stdio: "pipe",
  });
  // The corpus is someone else's live git history — never let our own
  // git-aware code (--scope changed, discovery) treat it as part of
  // qa-doctor's own repo.
  rmSync(join(dest, ".git"), { recursive: true, force: true });
  return dest;
}

function scanRepo(dir: string): BaselineEntry {
  const result = runScan({
    target: dir,
    json: true,
    verbose: true,
    maxDurationMs: 60_000,
    scopeChanged: false,
    format: "json",
  });
  const countsByRule: Record<string, number> = {};
  for (const f of result.findings) {
    countsByRule[f.ruleId] = (countsByRule[f.ruleId] ?? 0) + 1;
  }
  return { countsByRule, totalFindings: result.findings.length };
}

function loadBaseline(name: string): BaselineEntry | undefined {
  const p = join(BASELINE_DIR, `${name}.json`);
  if (!existsSync(p)) return undefined;
  return JSON.parse(readFileSync(p, "utf8"));
}

function writeBaseline(name: string, entry: BaselineEntry): void {
  mkdirSync(BASELINE_DIR, { recursive: true });
  writeFileSync(
    join(BASELINE_DIR, `${name}.json`),
    JSON.stringify(entry, null, 2) + "\n",
  );
}

function main(): number {
  const update = process.argv.includes("--update");
  let regressed = false;

  for (const repo of CORPUS) {
    console.log(`\n=== ${repo.name} — ${repo.note} ===`);
    let dir: string;
    try {
      dir = cloneRepo(repo);
    } catch (err) {
      console.error(
        `  SKIP: could not clone ${repo.url} (offline? — ${
          err instanceof Error ? err.message : String(err)
        })`,
      );
      continue;
    }

    const current = scanRepo(dir);
    const baseline = loadBaseline(repo.name);

    if (!baseline) {
      console.log(
        `  NO BASELINE — ${current.totalFindings} findings across ${
          Object.keys(current.countsByRule).length
        } rules. Review manually, then run --update to record it.`,
      );
      for (const [ruleId, count] of Object.entries(current.countsByRule)) {
        console.log(`    ${ruleId}: ${count}`);
      }
      if (update) writeBaseline(repo.name, current);
      continue;
    }

    const ruleIds = new Set([
      ...Object.keys(baseline.countsByRule),
      ...Object.keys(current.countsByRule),
    ]);
    let repoRegressed = false;
    for (const ruleId of [...ruleIds].sort()) {
      const before = baseline.countsByRule[ruleId] ?? 0;
      const after = current.countsByRule[ruleId] ?? 0;
      if (after > before) {
        console.error(
          `  ⚠ ${ruleId}: ${before} → ${after} (+${after - before}) — ` +
            `fires more on real code than the baseline. Possible new FP; ` +
            `review the finding, then --update once it's confirmed legitimate.`,
        );
        repoRegressed = true;
      } else if (after < before) {
        console.log(`  ${ruleId}: ${before} → ${after} (quieter, fine)`);
      }
    }
    if (!repoRegressed) console.log("  no FP-count regressions");
    regressed ||= repoRegressed;

    if (update) writeBaseline(repo.name, current);
  }

  rmSync(CACHE_DIR, { recursive: true, force: true });

  if (update) {
    console.log("\nBaseline updated.");
    return 0;
  }
  if (regressed) {
    console.error(
      "\nFAIL: one or more rules fire more often on real code than the " +
        "recorded baseline. Not a crash — a signal to go read the actual " +
        "findings before this ships.",
    );
    return 1;
  }
  console.log("\nOK: no FP-count regressions against the corpus baseline.");
  return 0;
}

process.exitCode = main();
