/**
 * Corpus regression guard (formerly "FP corpus audit").
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
 * "Check" mode fails (exit 1) if a rule's finding count moves in EITHER
 * direction vs the committed baseline: MORE fires is a false-positive
 * regression signal; FEWER fires is a detection regression (masked rule,
 * broken regex, dead pattern) — Bug-audit G2 made the lock bidirectional.
 * Either way: review the delta, and if it's a deliberate change re-run
 * with --update and commit the refreshed baseline in the same change.
 * New repos or new rules with no baseline entry are reported but don't
 * fail the run — add them via --update once you've manually reviewed
 * the findings as legitimate.
 *
 * This is a COUNT LOCK, not an audit. It detects regressions in finding
 * counts but never classifies whether findings are TP or FP. That
 * classification lives in tests/corpus/verdicts/ (Phase 3).
 *
 * Not part of `npm test` — this clones real repos over the network and
 * is meant to run as its own (nightly) CI job, not on every PR.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScan } from "../../src/cli.js";
import {
  checkUnclassifiedCompleteness,
  collectUnclassified,
} from "../../scripts/generate-fp-audit-table.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(HERE, ".cache");
export const BASELINE_DIR = join(HERE, "baseline");

export interface CorpusRepo {
  /** Baseline filename stem — keep stable, renaming loses history. */
  name: string;
  /**
   * Git clone URL, or a `local:` URL relative to the repo root for
   * committed corpora (plan §08 classes B/C positive/negative fixtures —
   * they are versioned alongside the verdicts that classify them, so a
   * remote clone can never drift from the classification criteria).
   */
  url: string;
  /** What this repo is meant to exercise. */
  note: string;
}

// Small, real, actively-maintained repos chosen for size (fast shallow
// clone) and genuine coverage of an adapter's rule families. Add more
// here as adapters grow — one entry, one `--update` run.
export const CORPUS: CorpusRepo[] = [
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
  {
    name: "microsoft-playwright-java",
    url: "https://github.com/microsoft/playwright-java.git",
    note: "real Playwright Java test suite — Java adapter FP surface (QA-JV-101..111). Library-suite caveat: this repo tests the Playwright Java bindings themselves, not a consumer app — swap for a better candidate if one emerges (Sprint 8 Task 37's own acknowledged tradeoff).",
  },
  {
    name: "microsoft-playwright-dotnet",
    url: "https://github.com/microsoft/playwright-dotnet.git",
    note: "real Playwright .NET test suite — C# adapter FP surface (QA-CS-101..111). Same library-suite caveat as microsoft-playwright-java above.",
  },

  // ── 2026-08-29 expansion — chosen so the previously-silent rule
  //    families (QA-TEST, QA-TQUAL, most QA-PW, QA-CI-001) fire on real
  //    consumer code, not just on Microsoft's own binding suites.
  {
    name: "nextauthjs-next-auth",
    url: "https://github.com/nextauthjs/next-auth.git",
    note: "real TS monorepo with Playwright e2e + substantial GitHub Actions — first non-trivial QA-CI-001 surface (masked verification gate), plus QA-PW-101/103/123 and QA-ENV-001.",
  },
  {
    name: "vitejs-vite",
    url: "https://github.com/vitejs/vite.git",
    note: "large real Playwright/Vitest suite — broad QA-PW surface (QA-PW-004/102/105/114/120/145) and QA-TQUAL-009 (unawaited promise assertion).",
  },
  {
    name: "sveltejs-kit",
    url: "https://github.com/sveltejs/kit.git",
    note: "large real Playwright suite — QA-PW-002/005/101/102/108/117/118 plus QA-TEST-004 at scale (a good stress test for the hard-sleep masking).",
  },
  {
    name: "withastro-astro",
    url: "https://github.com/withastro/astro.git",
    note: "large real Playwright suite — QA-PW-107/108/115/118/120 and QA-TEST-010 (empty test body).",
  },
  {
    name: "tanstack-query",
    url: "https://github.com/TanStack/query.git",
    note: "real TS monorepo — QA-PW-112 sample growth (a measured 0%-FP rule) and a deliberate red flag: QA-TEST-004 fires >1600 times here. Classify that rule against this repo carefully — it is either a real hard-sleep habit or a masking gap.",
  },
  {
    name: "playwright-community-eslint-plugin-playwright",
    url: "https://github.com/playwright-community/eslint-plugin-playwright.git",
    note: "small real Playwright-rules repo — compact QA-PW-102/103/107/112/118/120 and QA-TQUAL-001/011 surface; fast clone.",
  },
  {
    name: "microsoft-playwright-pytest",
    url: "https://github.com/microsoft/playwright-pytest.git",
    note: "tiny real pytest-playwright repo — QA-PY-104 (brittle selectors) and QA-PW-103 on the Python adapter; the only Playwright-Python corpus source so far.",
  },

  // ── 2026-08-31 expansion — chosen so the still-silent rule families
  //    fire: QA-CI-002/007/008/009/010 (job-level CI hygiene), QA-PW-141
  //    ..145 (playwright.config.ts hygiene), QA-PY-101..108 (Python+
  //    Playwright consumers), QA-TEST-001 (focused test committed),
  //    QA-TEST-004/010 at scale, QA-ENV-001, QA-TQUAL-002/009/011.
  {
    name: "grafana-grafana",
    url: "https://github.com/grafana/grafana.git",
    note: "large real TS monorepo with Playwright e2e and many GitHub Actions workflows — QA-PW-141..145 (retries/trace config) plus a broad QA-PW/QA-TEST/QA-TQUAL consumer surface.",
  },
  {
    name: "shadcn-ui-taxonomy",
    url: "https://github.com/shadcn-ui/taxonomy.git",
    note: "tiny real next.js app with a minimal single-project Playwright config and a bare CI e2e workflow — the sharpest QA-PW-143/144 surface (no artifacts, no matrix).",
  },
  {
    name: "reflex-dev-reflex",
    url: "https://github.com/reflex-dev/reflex.git",
    note: "mid-size real Python framework with pytest-playwright e2e tests — QA-PY-101..108 (Python Playwright adapter) consumer surface.",
  },
  {
    name: "calcom-cal",
    url: "https://github.com/calcom/cal.com.git",
    note: "large real next.js app with Playwright e2e (retries, trace, CI artifact upload) — QA-PW-141..145 plus a broad QA-PW/QA-TEST/QA-TQUAL consumer surface.",
  },
  {
    name: "puppeteer-puppeteer",
    url: "https://github.com/puppeteer/puppeteer.git",
    note: "real TS monorepo with mocha tests and multi-job GitHub Actions — QA-CI-002/005/007/008/009/010 surface plus QA-TEST/TQUAL growth; sibling to Playwright for engine balance.",
  },

  // ── 2026-09-01 expansion — Verification Trust Evolution Plan §11.5:
  //    the dedicated corpora that close the D5 starvation. The CI rules
  //    (QA-CI-*) were starved at n=3–5 and the JV/CS rules were measured
  //    on the Playwright bindings themselves; these additions add
  //    application corpora on both axes plus CI-workflow density. Chosen
  //    by evaluating each candidate's unmeasured-rule fire count at HEAD
  //    before committing (scripts/lib/eval-repo.ts); repos whose scan
  //    truncated against the 60s budget (n8n, posthog, vscode) were
  //    rejected — a partial scan can never be count-locked.
  {
    name: "vitest-dev-vitest",
    url: "https://github.com/vitest-dev/vitest.git",
    note: "real TS monorepo with a large vitest suite of its own — QA-TEST-001 (focused) / QA-TEST-010 (empty body) / QA-TQUAL-002 (tautological) at scale, plus CI and QA-PW config surfaces.",
  },
  {
    name: "streamlit-streamlit",
    url: "https://github.com/streamlit/streamlit.git",
    note: "real Python app with pytest-playwright e2e and many GitHub Actions — QA-PY-103/105 (Python Playwright consumers) plus QA-CI-005 and QA-PY-012.",
  },
  {
    name: "apache-airflow",
    url: "https://github.com/apache/airflow.git",
    note: "huge real pytest suite — QA-PY-011 (mutable session fixtures) and QA-PY-012 at scale plus QA-TEST-006.",
  },
  {
    name: "iluwatar-java-design-patterns",
    url: "https://github.com/iluwatar/java-design-patterns.git",
    note: "real Java application repo with extensive JUnit tests — QA-JV-102 (Thread.sleep) and QA-JV-101 (disabled tests) on consumer code, plus QA-CI-005; first non-binding Java corpus entry (D5).",
  },
  {
    name: "spectreconsole-spectre-console",
    url: "https://github.com/spectreconsole/spectre.console.git",
    note: "real C# application repo with a large NUnit suite — QA-CS-103 (tests without assertions) at consumer scale (D5).",
  },
  {
    name: "Humanizr-Humanizer",
    url: "https://github.com/Humanizr/Humanizer.git",
    note: "real C# library repo with xUnit tests and a retry-wrapped CI step — QA-CS-103 and QA-CI-007 surface.",
  },
  {
    name: "cypress-realworld-app",
    url: "https://github.com/cypress-io/cypress-realworld-app.git",
    note: "real TS consumer app with heavy e2e — QA-TQUAL-009 (unawaited promise assertion) at scale on application code.",
  },
  {
    name: "keycloak-keycloak",
    url: "https://github.com/keycloak/keycloak.git",
    note: "large real Java monorepo whose UI suite is Playwright TypeScript — QA-PW-117 (describe.serial) at scale plus QA-JV-101/102 on JUnit code and QA-CI-007.",
  },
  {
    name: "appsmithorg-appsmith",
    url: "https://github.com/appsmithorg/appsmith.git",
    note: "real Java+TS monorepo with JUnit tests and CI workflows — QA-JV-101/102 on consumer code plus QA-CI-008 and QA-TQUAL-011.",
  },
  {
    name: "getsentry-sentry",
    url: "https://github.com/getsentry/sentry.git",
    note: "huge real Python monorepo — QA-PY-009 (commented-out tests) and QA-PY-012 at scale plus QA-TQUAL-002.",
  },
  {
    name: "github-docs",
    url: "https://github.com/github/docs.git",
    note: "workflow-dense docs repo (small code footprint) — QA-CI-001 (continue-on-error gates) and QA-CI-007 surface on real Actions files.",
  },
  {
    name: "vercel-next-js",
    url: "https://github.com/vercel/next.js.git",
    note: "large real TS monorepo with its own e2e suite — QA-TEST-010 and QA-TQUAL-002 at scale plus QA-PW-141/144 and QA-CI-008.",
  },
  {
    name: "hashicorp-vault",
    url: "https://github.com/hashicorp/vault.git",
    note: "real monorepo with UI tests and mature CI — QA-PW-004 (brittle selectors), QA-CI-001/008 and QA-PW-141 surface.",
  },
  {
    name: "nocodb-nocodb",
    url: "https://github.com/nocodb/nocodb.git",
    note: "real TS app with e2e and CI — QA-CI-010 (PR-skipped test jobs) and QA-PW-115 surface.",
  },

  // ── 2026-09-04 expansion — Stable 1.0 plan M2 (CI-family trust
  //    repair): the dedicated GitHub-Actions workflow lane. Chosen so the
  //    QA-CI-* rules are measured on DIVERSE real workflows (JVM, Yarn,
  //    Python/multi-language CI), not starved samples: junit5 fires
  //    QA-CI-005/008 on Maven-centric CI, yarn berry is the first real
  //    QA-CI-009 surface (piped/sequenced test commands), pyca adds a
  //    Python+Rust+OpenSSL CI surface. Scan durations verified non-
  //    truncating against the 120s budget before adoption.
  {
    name: "junit-team-junit5",
    url: "https://github.com/junit-team/junit5.git",
    note: "real Java framework repo with Maven+Gradle CI workflows — QA-CI-005/008 on JVM CI plus a large QA-JV-103 consumer surface.",
  },
  {
    name: "yarnpkg-berry",
    url: "https://github.com/yarnpkg/berry.git",
    note: "real Yarn monorepo with its own CI — the first real QA-CI-009 surface (piped/sequenced test commands in workflow run blocks) plus QA-TEST-003 at scale.",
  },
  {
    name: "pyca-cryptography",
    url: "https://github.com/pyca/cryptography.git",
    note: "real Python+Rust crypto library with multi-language CI — QA-CI-005 surface plus QA-PY-007 at scale.",
  },

  // ── §08 classes B/C — committed positive/negative fixture corpora.
  //    Class A (real OSS repos) is the preferred FP surface, but rules
  //    whose patterns are rare in the wild (deep frameLocator chains,
  //    trial clicks, TestNG retry analyzers) can never reach the n ≥ 10
  //    quota from real repos alone. The fixture corpora give every rule
  //    a measurement-grade verdict surface: positives classify TP
  //    (recall evidence), negatives classify FP when they fire (real
  //    precision evidence). Local URLs — versioned with the verdicts.
  {
    name: "positive-fixtures",
    url: "local:tests/corpus/positive-fixtures",
    note: "committed class-B positive corpus — realistic anti-pattern variants per rule that MUST fire; every fire classifies TP.",
  },
  {
    name: "negative-fixtures",
    url: "local:tests/corpus/negative-fixtures",
    note: "committed class-C negative corpus — realistic legitimate code per rule that must NOT fire; any fire classifies FP (real precision evidence).",
  },
];

interface BaselineEntry {
  countsByRule: Record<string, number>;
  totalFindings: number;
  /**
   * Set by scanRepo from runScan's result — NOT persisted to the
   * baseline JSON (a partial scan never gets recorded; see the
   * FAIL branch in main). Present on the in-memory current entry only.
   */
  partial: boolean;
}

function cloneRepo(repo: CorpusRepo): string {
  const dest = join(CACHE_DIR, repo.name);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(CACHE_DIR, { recursive: true });
  // `local:` URLs point at corpora committed inside this repo (§08
  // classes B/C) — copy instead of clone; the copy still drops .git so
  // scan scoping treats it as a foreign tree exactly like a clone.
  if (repo.url.startsWith("local:")) {
    const src = join(HERE, "..", "..", repo.url.slice("local:".length));
    if (!existsSync(src)) {
      throw new Error(`local corpus missing: ${src}`);
    }
    cpSync(src, dest, { recursive: true });
    return dest;
  }
  execFileSync(
    "git",
    // core.longpaths: several corpus repos (keycloak, streamlit, sentry)
    // contain checkout paths past the classic Windows MAX_PATH limit —
    // scoped to this clone only, never a global config change.
    ["-c", "core.longpaths=true", "clone", "--depth", "1", repo.url, dest],
    {
      stdio: "pipe",
    },
  );
  // The corpus is someone else's live git history — never let our own
  // git-aware code (--scope changed, discovery) treat it as part of
  // mjolnir's own repo.
  rmSync(join(dest, ".git"), { recursive: true, force: true });
  return dest;
}

async function scanRepo(dir: string): Promise<BaselineEntry> {
  const result = await runScan({
    target: dir,
    json: true,
    verbose: true,
    maxDurationMs: 120_000,
    scopeChanged: false,
    format: "json",
    // Include quarantine-tier rules — they are exactly the ones whose
    // real-world FP rate matters most, and the count-lock should notice
    // if one starts firing even harder.
    strict: true,
  });
  const countsByRule: Record<string, number> = {};
  for (const f of result.findings) {
    countsByRule[f.ruleId] = (countsByRule[f.ruleId] ?? 0) + 1;
  }
  // Canonical key order: insertion order follows finding iteration, so
  // an unsorted record re-orders every baseline file whenever rule or
  // discovery order shifts — pure diff noise for the git history. Sort
  // so a baseline diff only ever shows REAL count changes.
  const sortedCounts = Object.fromEntries(
    Object.entries(countsByRule).sort(([a], [b]) => a.localeCompare(b)),
  );
  // TODO: Record testDeclarationCount in the baseline so that
  // NORMALIZATION_K can be calibrated against real corpus data.
  // Currently runScan returns this value but we don't persist it.
  return {
    countsByRule: sortedCounts,
    totalFindings: result.findings.length,
    partial: result.partial,
  };
}

function loadBaseline(name: string): BaselineEntry | undefined {
  const p = join(BASELINE_DIR, `${name}.json`);
  if (!existsSync(p)) return undefined;
  return JSON.parse(readFileSync(p, "utf8")) as BaselineEntry;
}

function writeBaseline(name: string, entry: BaselineEntry): void {
  mkdirSync(BASELINE_DIR, { recursive: true });
  writeFileSync(
    join(BASELINE_DIR, `${name}.json`),
    JSON.stringify(entry, null, 2) + "\n",
  );
}

async function main(): Promise<number> {
  const update = process.argv.includes("--update");
  // --only <name>[,<name>]: re-check or re-record a subset (used to
  // re-verify a repo after a transient truncation without re-scanning
  // the whole corpus). Never narrows the failure threshold: a filtered
  // run that scans every requested repo is complete for THOSE repos.
  const onlyFlag = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyFlag
    ? new Set(onlyFlag.slice("--only=".length).split(","))
    : null;
  let regressed = false;

  // Bug-audit G1: a failed clone used to SKIP the repo with `continue`;
  // if ALL repos failed (network outage), the run printed
  // "OK: no FP-count regressions" and exited 0 — a meaningless green for
  // days on a nightly-only job. Clone failures now count against a
  // completeness threshold instead of silently shrinking the audit.
  const failedClones: string[] = [];
  const scanned: string[] = [];
  const requested = only ? CORPUS.filter((r) => only.has(r.name)) : CORPUS;
  const MIN_SCANNED = Math.ceil(requested.length * 0.9);

  for (const repo of CORPUS) {
    if (only && !only.has(repo.name)) continue;
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
      failedClones.push(repo.name);
      continue;
    }
    scanned.push(repo.name);

    const current = await scanRepo(dir);
    const baseline = loadBaseline(repo.name);

    // Review fix (baseline refresh, 2026-09-01): a deadline-truncated
    // scan used to be written to the baseline as if it were ground
    // truth — grafana/grafana scans run ~50s against the 60s budget, so
    // ANY CPU contention during the nightly job truncated discovery
    // mid-way and recorded machine-speed-contaminated counts (QA-CI-*
    // vanished, TEST-003 dropped 418 → 177 in one run). `runScan`
    // reports truncation via `result.partial`; refusing to trust a
    // partial scan turns that silent poisoning into a loud failure.
    // Re-run on a quiet machine; if truncation is chronic for a repo,
    // raise the budget rather than record a partial baseline.
    if (current.partial) {
      console.error(
        `  FAIL: scan of ${repo.name} was PARTIAL (deadline/budget ` +
          `truncation) — the counts would be garbage. Re-run on a quiet ` +
          `machine; do NOT --update from a partial scan.`,
      );
      regressed = true;
      continue;
    }

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
        // Bug-audit G2: the lock used to be one-directional — a rule
        // going SILENT on real code passed as "quieter, fine". A rule
        // that stops firing on code it used to flag is a detection
        // regression (masked rule, broken regex, dead pattern); it gets
        // the same treatment as an FP regression unless --update was
        // passed after a deliberate review.
        if (update) {
          console.log(
            `  ${ruleId}: ${before} → ${after} (quieter — accepted via --update)`,
          );
        } else {
          console.error(
            `  ⚠ ${ruleId}: ${before} → ${after} (-${before - after}) — a rule went ` +
              `silent on real code. If this is a deliberate detection change, ` +
              `review and re-run with --update; otherwise investigate.`,
          );
          repoRegressed = true;
        }
      }
    }
    if (!repoRegressed) console.log("  no FP-count regressions");
    regressed ||= repoRegressed;

    if (update) writeBaseline(repo.name, current);
  }

  // Best-effort — .cache is gitignored, and on Windows a just-cloned pack
  // file can stay locked for a moment after git exits.
  try {
    rmSync(CACHE_DIR, { recursive: true, force: true });
  } catch {
    /* stale .cache is harmless */
  }

  if (update) {
    console.log("\nBaseline updated.");
    return 0;
  }

  // Bug-audit L13 / B4.29: verdict files with blank `"verdict": ""` rows
  // made the measured-FP rates silently under-report (unclassified
  // findings were dropped by the fp-table generator). The committed
  // ceiling ratchet (see scripts/generate-fp-audit-table.ts) fails when
  // the backlog grows — shared here so the nightly cannot bless a
  // shrinking classified base either.
  try {
    checkUnclassifiedCompleteness(collectUnclassified(), false);
  } catch {
    return 1;
  }

  // Bug-audit G1: a corpus that mostly failed to clone proves nothing —
  // the audit fails loudly instead of blessing a hollow run.
  if (failedClones.length > 0) {
    console.error(
      `\n${failedClones.length}/${CORPUS.length} repos failed to clone: ` +
        `${failedClones.join(", ")}`,
    );
  }
  if (scanned.length < MIN_SCANNED) {
    console.error(
      `\nFAIL: only ${scanned.length}/${requested.length} repos could be scanned ` +
        `(minimum ${MIN_SCANNED}). A corpus this hollow cannot support an ` +
        `"OK" verdict — check network/registry access and re-run.`,
    );
    return 1;
  }
  if (regressed) {
    console.error(
      "\nFAIL: finding-count regressions against the corpus baseline (both " +
        "directions count — more findings suggest new FPs; a rule going silent " +
        "suggests a detection regression). Not a crash — a signal to go read " +
        "the actual findings before this ships.",
    );
    return 1;
  }
  console.log("\nOK: no FP-count regressions against the corpus baseline.");
  return 0;
}

// Guard so this module's exports (CORPUS, BASELINE_DIR) can be imported
// by other scripts (e.g. the FP-table generator) without triggering a
// full networked audit as a side effect of the import.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await main();
}
