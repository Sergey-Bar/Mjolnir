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
 * D14 baseline policy (as amended by the owner, 2026-09-08 — two
 * obligations, deliberately separated):
 *   1. Re-baseline after every merged wave — BLOCKING. The committed
 *      baselines must agree with the shipped rules before the wave's
 *      evidence run is accepted.
 *   2. PARTIAL scans are TRACKED DEBT, never baselines, and never an
 *      exemption. A deadline-truncated scan is refused outright (see
 *      the refusal below); the repos that stayed PARTIAL are recorded
 *      as named debt until a quiet-machine re-run completes. Their
 *      existence does NOT block certification — the only invariant
 *      certification depends on is that NO PARTIAL scan was ever
 *      recorded as a baseline. Zero-PARTIAL is the desired end state,
 *      not a gate.
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
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runScan } from "../../src/cli.js";
import type { ScanResult } from "../../src/types.js";
import {
  checkUnclassifiedCompleteness,
  collectUnclassified,
} from "../../scripts/generate-fp-audit-table.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(HERE, ".cache");
export const BASELINE_DIR = join(HERE, "baseline");
const CHILD_TIMEOUT_MS = 5 * 60 * 1000;

export function corpusCompletenessFailures(input: {
  requested: readonly string[];
  complete: readonly string[];
  failedClones: readonly string[];
  failedScans: readonly string[];
  partialScans: readonly string[];
  missingRefs: readonly string[];
  invalidBaselines: readonly string[];
}): string[] {
  const failures: string[] = [];
  if (input.failedClones.length > 0) {
    failures.push(`clone failures: ${input.failedClones.join(", ")}`);
  }
  if (input.failedScans.length > 0) {
    failures.push(`scan failures: ${input.failedScans.join(", ")}`);
  }
  if (input.partialScans.length > 0) {
    failures.push(`partial scans: ${input.partialScans.join(", ")}`);
  }
  if (input.missingRefs.length > 0) {
    failures.push(
      `missing authoritative refs: ${input.missingRefs.join(", ")}`,
    );
  }
  if (input.invalidBaselines.length > 0) {
    failures.push(`invalid baselines: ${input.invalidBaselines.join(", ")}`);
  }
  if (input.complete.length !== input.requested.length) {
    failures.push(
      `complete ${input.complete.length}/${input.requested.length} repositories`,
    );
  }
  const requested = new Set(input.requested);
  const unexpected = input.complete.filter((name) => !requested.has(name));
  if (unexpected.length > 0) {
    failures.push(
      `unexpected completed repositories: ${unexpected.join(", ")}`,
    );
  }
  return failures;
}

export function orphanBaselineNames(
  requested: readonly string[],
  baselineFiles: readonly string[],
): string[] {
  const requestedNames = new Set(requested);
  return baselineFiles
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length))
    .filter((name) => !requestedNames.has(name))
    .sort();
}

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
  /** Authoritative 40-character commit or committed Git tree revision. */
  ref: string;
}

// Small, real, actively-maintained repos chosen for size (fast shallow
// clone) and genuine coverage of an adapter's rule families. Add more
// here as adapters grow — one entry, one `--update` run.
export const CORPUS: CorpusRepo[] = [
  {
    name: "pallets-click",
    url: "https://github.com/pallets/click.git",
    ref: "06b2a678741131fd577ce170e23e5ca0aeba0309",
    note: "real pytest suite — Python adapter FP surface",
  },
  {
    name: "microsoft-playwright-mcp",
    url: "https://github.com/microsoft/playwright-mcp.git",
    ref: "f1257a5a67aff872f947fae274759f7d54853862",
    note: "real Playwright + GitHub Actions — TS/PW/CI adapter FP surface",
  },
  {
    name: "pytest-dev-pytest",
    url: "https://github.com/pytest-dev/pytest.git",
    ref: "f9554ee56d264da285f3951ebfdf6f1d59ba4077",
    note: "large real pytest suite — Python adapter FP surface (QA-PY-001..012)",
  },
  {
    name: "psf-requests",
    url: "https://github.com/psf/requests.git",
    ref: "611c6162cbc4ac2020a2f91c7cfa4f3abf9bbb60",
    note: "small real pytest suite — Python adapter FP surface",
  },
  {
    name: "microsoft-playwright-java",
    url: "https://github.com/microsoft/playwright-java.git",
    ref: "c17b6060bd39eb04fd33dc6c6cf7ddf648fecccb",
    note: "real Playwright Java test suite — Java adapter FP surface (QA-JV-101..111). Library-suite caveat: this repo tests the Playwright Java bindings themselves, not a consumer app — swap for a better candidate if one emerges (Sprint 8 Task 37's own acknowledged tradeoff).",
  },
  {
    name: "microsoft-playwright-dotnet",
    url: "https://github.com/microsoft/playwright-dotnet.git",
    ref: "3a374281a8a8988f1645909b127d6e69e16efbc9",
    note: "real Playwright .NET test suite — C# adapter FP surface (QA-CS-101..111). Same library-suite caveat as microsoft-playwright-java above.",
  },

  // ── 2026-08-29 expansion — chosen so the previously-silent rule
  //    families (QA-TEST, QA-TQUAL, most QA-PW, QA-CI-001) fire on real
  //    consumer code, not just on Microsoft's own binding suites.
  {
    name: "nextauthjs-next-auth",
    url: "https://github.com/nextauthjs/next-auth.git",
    ref: "a1a16a5a7780488c7449feece410033f445d0b31",
    note: "real TS monorepo with Playwright e2e + substantial GitHub Actions — first non-trivial QA-CI-001 surface (masked verification gate), plus QA-PW-101/103/123 and QA-ENV-001.",
  },
  {
    name: "vitejs-vite",
    url: "https://github.com/vitejs/vite.git",
    ref: "f155b62ceabbaaf71abbf59933968787e3961c56",
    note: "large real Playwright/Vitest suite — broad QA-PW surface (QA-PW-004/102/105/114/120/145) and QA-TQUAL-009 (unawaited promise assertion).",
  },
  {
    name: "sveltejs-kit",
    url: "https://github.com/sveltejs/kit.git",
    ref: "bf6833a639c9ca946379a12f832cb8a6c9040a5b",
    note: "large real Playwright suite — QA-PW-002/005/101/102/108/117/118 plus QA-TEST-004 at scale (a good stress test for the hard-sleep masking).",
  },
  {
    name: "withastro-astro",
    url: "https://github.com/withastro/astro.git",
    ref: "2b8b2e80169da0ab19055166438291c46fcfe320",
    note: "large real Playwright suite — QA-PW-107/108/115/118/120 and QA-TEST-010 (empty test body).",
  },
  {
    name: "tanstack-query",
    url: "https://github.com/TanStack/query.git",
    ref: "bf07891f8a97f09b0ea1a42075389c0f1658f6df",
    note: "real TS monorepo — QA-PW-112 sample growth (a measured 0%-FP rule) and a deliberate red flag: QA-TEST-004 fires >1600 times here. Classify that rule against this repo carefully — it is either a real hard-sleep habit or a masking gap.",
  },
  {
    name: "playwright-community-eslint-plugin-playwright",
    url: "https://github.com/playwright-community/eslint-plugin-playwright.git",
    ref: "8db14437ea9f22897d7b604c6a6e4d6e246d25c0",
    note: "small real Playwright-rules repo — compact QA-PW-102/103/107/112/118/120 and QA-TQUAL-001/011 surface; fast clone.",
  },
  {
    name: "microsoft-playwright-pytest",
    url: "https://github.com/microsoft/playwright-pytest.git",
    ref: "d9bdbb39087fb026bf7e4be537008098825585ee",
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
    ref: "4a20de9a9ed6af3317098ad8785e1e1aa5cc933f",
    note: "large real TS monorepo with Playwright e2e and many GitHub Actions workflows — QA-PW-141..145 (retries/trace config) plus a broad QA-PW/QA-TEST/QA-TQUAL consumer surface.",
  },
  {
    name: "shadcn-ui-taxonomy",
    url: "https://github.com/shadcn-ui/taxonomy.git",
    ref: "298a8857c7128a0d121e7f699dfd729f23b3966d",
    note: "tiny real next.js app with a minimal single-project Playwright config and a bare CI e2e workflow — the sharpest QA-PW-143/144 surface (no artifacts, no matrix).",
  },
  {
    name: "reflex-dev-reflex",
    url: "https://github.com/reflex-dev/reflex.git",
    ref: "8aab1cf6b2c3c63529c43bb26dba8f2c34e627ed",
    note: "mid-size real Python framework with pytest-playwright e2e tests — QA-PY-101..108 (Python Playwright adapter) consumer surface.",
  },
  {
    name: "calcom-cal",
    url: "https://github.com/calcom/cal.com.git",
    ref: "54343aa685ae8f33159d2f485ec4a57bad5c574a",
    note: "large real next.js app with Playwright e2e (retries, trace, CI artifact upload) — QA-PW-141..145 plus a broad QA-PW/QA-TEST/QA-TQUAL consumer surface.",
  },
  {
    name: "puppeteer-puppeteer",
    url: "https://github.com/puppeteer/puppeteer.git",
    ref: "15684eb7f1adf98c1c0c4a5d23a154b7995e947e",
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
    ref: "a0a939653bc8441848579bb6ac18706372242cd6",
    note: "real TS monorepo with a large vitest suite of its own — QA-TEST-001 (focused) / QA-TEST-010 (empty body) / QA-TQUAL-002 (tautological) at scale, plus CI and QA-PW config surfaces.",
  },
  {
    name: "streamlit-streamlit",
    url: "https://github.com/streamlit/streamlit.git",
    ref: "5d3346814a337a1118ea6059fd50c06366fa63cb",
    note: "real Python app with pytest-playwright e2e and many GitHub Actions — QA-PY-103/105 (Python Playwright consumers) plus QA-CI-005 and QA-PY-012.",
  },
  {
    name: "apache-airflow",
    url: "https://github.com/apache/airflow.git",
    ref: "74d1a3b0bb386a15191c3a83ba4f83598621fe7c",
    note: "huge real pytest suite — QA-PY-011 (mutable session fixtures) and QA-PY-012 at scale plus QA-TEST-006.",
  },
  {
    name: "iluwatar-java-design-patterns",
    url: "https://github.com/iluwatar/java-design-patterns.git",
    ref: "4cabb204f240240bea319605a5ffa46ded728001",
    note: "real Java application repo with extensive JUnit tests — QA-JV-102 (Thread.sleep) and QA-JV-101 (disabled tests) on consumer code, plus QA-CI-005; first non-binding Java corpus entry (D5).",
  },
  {
    name: "spectreconsole-spectre-console",
    url: "https://github.com/spectreconsole/spectre.console.git",
    ref: "e2cf675ff8ac30db04e8e22a25de4ff27bf79702",
    note: "real C# application repo with a large NUnit suite — QA-CS-103 (tests without assertions) at consumer scale (D5).",
  },
  {
    name: "Humanizr-Humanizer",
    url: "https://github.com/Humanizr/Humanizer.git",
    ref: "ffc2b77c0f30d2fb176875841424379319d0ae9b",
    note: "real C# library repo with xUnit tests and a retry-wrapped CI step — QA-CS-103 and QA-CI-007 surface.",
  },
  {
    name: "cypress-realworld-app",
    url: "https://github.com/cypress-io/cypress-realworld-app.git",
    ref: "79aa5b126fdd951aab2263c8201b52aeb5f2a43c",
    note: "real TS consumer app with heavy e2e — QA-TQUAL-009 (unawaited promise assertion) at scale on application code.",
  },
  {
    name: "keycloak-keycloak",
    url: "https://github.com/keycloak/keycloak.git",
    ref: "421c23f5221daa65bb64675a1475645458544ddf",
    note: "large real Java monorepo whose UI suite is Playwright TypeScript — QA-PW-117 (describe.serial) at scale plus QA-JV-101/102 on JUnit code and QA-CI-007.",
  },
  {
    name: "appsmithorg-appsmith",
    url: "https://github.com/appsmithorg/appsmith.git",
    ref: "bb851c2939cbbfae9cd8927e40f0faf8b91c7c31",
    note: "real Java+TS monorepo with JUnit tests and CI workflows — QA-JV-101/102 on consumer code plus QA-CI-008 and QA-TQUAL-011.",
  },
  {
    name: "getsentry-sentry",
    url: "https://github.com/getsentry/sentry.git",
    ref: "67610b2a57909ca921d6a52dcbf7410bc851b100",
    note: "huge real Python monorepo — QA-PY-009 (commented-out tests) and QA-PY-012 at scale plus QA-TQUAL-002.",
  },
  {
    name: "github-docs",
    url: "https://github.com/github/docs.git",
    ref: "7922319ff793bce556882c90b92191bab0e2aa4e",
    note: "workflow-dense docs repo (small code footprint) — QA-CI-001 (continue-on-error gates) and QA-CI-007 surface on real Actions files.",
  },
  {
    name: "vercel-next-js",
    url: "https://github.com/vercel/next.js.git",
    ref: "e71848173cf199bb56e88c1c04aa977cdb0a84df",
    note: "large real TS monorepo with its own e2e suite — QA-TEST-010 and QA-TQUAL-002 at scale plus QA-PW-141/144 and QA-CI-008.",
  },
  {
    name: "hashicorp-vault",
    url: "https://github.com/hashicorp/vault.git",
    ref: "c4cb28fd7129d663680e6e9973d7ce74d2362092",
    note: "real monorepo with UI tests and mature CI — QA-PW-004 (brittle selectors), QA-CI-001/008 and QA-PW-141 surface.",
  },
  {
    name: "nocodb-nocodb",
    url: "https://github.com/nocodb/nocodb.git",
    ref: "384efa5108ff642db47a85c5397ace6ff87cf84d",
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
    ref: "869b15510fa69f6f4660007202a416027eb7eb5f",
    note: "real Java framework repo with Maven+Gradle CI workflows — QA-CI-005/008 on JVM CI plus a large QA-JV-103 consumer surface.",
  },
  {
    name: "yarnpkg-berry",
    url: "https://github.com/yarnpkg/berry.git",
    ref: "502acfec2f4bf81663d95f3de6a6ae63ec4e344a",
    note: "real Yarn monorepo with its own CI — the first real QA-CI-009 surface (piped/sequenced test commands in workflow run blocks) plus QA-TEST-003 at scale.",
  },
  {
    name: "pyca-cryptography",
    url: "https://github.com/pyca/cryptography.git",
    ref: "f717d797b8ba99da605ad37b2bd0d9d89ab62eab",
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
    ref: "47a4aac2bec15524f9ceafded2dd2012b8aefd68",
    note: "committed class-B positive corpus — realistic anti-pattern variants per rule that MUST fire; every fire classifies TP.",
  },
  {
    name: "negative-fixtures",
    url: "local:tests/corpus/negative-fixtures",
    ref: "de4996258f669b9df715b9cc37fe1a9f5deb662a",
    note: "committed class-C negative corpus — realistic legitimate code per rule that must NOT fire; any fire classifies FP (real precision evidence).",
  },
];

interface BaselineEntry {
  schemaVersion?: number;
  sourceRevision?: string;
  countsByRule: Record<string, number>;
  totalFindings: number;
  /**
   * P2.4 calibration (plan 1788853205786): the normalization denominator
   * runScan measured for this repo. Persisted so NORMALIZATION_K / the
   * deduction-mass ceilings can be calibrated against REAL corpus data
   * (docs/SCORING.md "not fitted" note) instead of the maintainer's
   * intuition. Optional: baselines recorded before this field existed
   * stay valid; the next reviewed --update fills it in. Not compared in
   * the regression check — upstream repos change their suites, so the
   * count is calibration CONTEXT, not a lock.
   */
  testDeclarationCount?: number;
  /**
   * Set by scanRepo from runScan's result — NOT persisted to the
   * baseline JSON (a partial scan never gets recorded; see the
   * FAIL branch in main). Present on the in-memory current entry only.
   */
  partial?: boolean;
}

interface CorpusScanEntry extends BaselineEntry {
  partial: boolean;
  diagnostics: {
    analysisStatus: ScanResult["analysisStatus"];
    scopeIntegrity?: ScanResult["scopeIntegrity"];
    rulesDigest?: string;
    ruleCrashes?: Array<{
      ruleId: string;
      file: string;
      message: string;
      stack?: string;
    }>;
  };
}

function cloneRepo(repo: CorpusRepo): string {
  if (!/^[0-9a-f]{40}$/u.test(repo.ref)) {
    throw new Error("corpus requires a 40-character authoritative ref");
  }
  const dest = join(CACHE_DIR, repo.name);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(CACHE_DIR, { recursive: true });
  if (repo.url.startsWith("local:")) {
    const relative = repo.url.slice("local:".length);
    const src = join(HERE, "..", "..", relative);
    if (!existsSync(src)) {
      throw new Error(`local corpus missing: ${src}`);
    }
    const root = join(HERE, "..", "..");
    const committed = execFileSync(
      "git",
      ["-C", root, "rev-parse", `HEAD:${relative}`],
      { encoding: "utf8", timeout: CHILD_TIMEOUT_MS },
    ).trim();
    if (committed !== repo.ref) {
      throw new Error(`local tree ${committed} does not match ${repo.ref}`);
    }
    const status = execFileSync(
      "git",
      [
        "-C",
        root,
        "status",
        "--porcelain",
        "--untracked-files=all",
        "--ignored=matching",
        "--",
        relative,
      ],
      { encoding: "utf8", timeout: CHILD_TIMEOUT_MS },
    ).trim();
    if (status) {
      throw new Error(`local corpus is not a clean committed tree: ${status}`);
    }
    cpSync(src, dest, { recursive: true });
    return dest;
  }
  mkdirSync(dest, { recursive: true });
  execFileSync("git", ["init", "--quiet", dest], {
    stdio: "pipe",
    timeout: CHILD_TIMEOUT_MS,
  });
  execFileSync("git", ["-C", dest, "remote", "add", "origin", repo.url], {
    stdio: "pipe",
    timeout: CHILD_TIMEOUT_MS,
  });
  execFileSync(
    "git",
    [
      "-c",
      "core.longpaths=true",
      "-C",
      dest,
      "fetch",
      "--filter=blob:none",
      "--depth",
      "1",
      "--no-tags",
      "origin",
      repo.ref,
    ],
    { stdio: "pipe", timeout: CHILD_TIMEOUT_MS },
  );
  execFileSync(
    "git",
    [
      "-c",
      "core.longpaths=true",
      "-C",
      dest,
      "checkout",
      "--detach",
      "FETCH_HEAD",
    ],
    {
      stdio: "pipe",
      timeout: CHILD_TIMEOUT_MS,
    },
  );
  const resolved = execFileSync("git", ["-C", dest, "rev-parse", "HEAD"], {
    encoding: "utf8",
    timeout: CHILD_TIMEOUT_MS,
  }).trim();
  if (resolved !== repo.ref) {
    throw new Error(`resolved ref ${resolved} does not match ${repo.ref}`);
  }
  rmSync(join(dest, ".git"), { recursive: true, force: true });
  return dest;
}

async function scanRepo(dir: string): Promise<CorpusScanEntry> {
  const ruleCrashes: NonNullable<
    CorpusScanEntry["diagnostics"]["ruleCrashes"]
  > = [];
  const result = await runScan(
    {
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
    },
    {
      onRuleCrash: (ruleId, file, error) => {
        const normalized =
          error instanceof Error ? error : new Error(String(error));
        ruleCrashes.push({
          ruleId,
          file,
          message: normalized.message,
          ...(normalized.stack ? { stack: normalized.stack } : {}),
        });
      },
    },
  );
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
  // P2.4 (plan 1788853205786): persist the normalization denominator so
  // NORMALIZATION_K and the deduction-mass ceilings are calibratable
  // against real corpus data (the TODO SCORING.md carried is closed).
  return {
    countsByRule: sortedCounts,
    totalFindings: result.findings.length,
    ...(result.testDeclarationCount !== undefined
      ? { testDeclarationCount: result.testDeclarationCount }
      : {}),
    partial: result.partial,
    diagnostics: {
      analysisStatus: result.analysisStatus,
      ...(result.scopeIntegrity
        ? { scopeIntegrity: result.scopeIntegrity }
        : {}),
      ...(result.runIdentity?.rulesDigest
        ? { rulesDigest: result.runIdentity.rulesDigest }
        : {}),
      ...(ruleCrashes.length > 0 ? { ruleCrashes } : {}),
    },
  };
}

function toBaselineEntry(current: CorpusScanEntry): BaselineEntry {
  return {
    schemaVersion: 1,
    sourceRevision: current.sourceRevision ?? "",
    countsByRule: current.countsByRule,
    totalFindings: current.totalFindings,
    ...(current.testDeclarationCount !== undefined
      ? { testDeclarationCount: current.testDeclarationCount }
      : {}),
  };
}

export function reviewCorpusMeasurement(
  baseline: Pick<
    BaselineEntry,
    "schemaVersion" | "sourceRevision" | "countsByRule"
  >,
  current: Pick<CorpusScanEntry, "sourceRevision" | "countsByRule">,
): {
  provenanceFailure?: string;
  countDrifts: Array<{ ruleId: string; before: number; after: number }>;
} {
  const expectedRevision = current.sourceRevision ?? "";
  const actualSchema = baseline.schemaVersion ?? "missing";
  const actualRevision = baseline.sourceRevision ?? "missing";
  const provenanceFailure =
    baseline.schemaVersion === 1 && baseline.sourceRevision === expectedRevision
      ? undefined
      : `${
          baseline.schemaVersion === undefined ||
          baseline.sourceRevision === undefined
            ? "legacy baseline provenance"
            : "baseline provenance mismatch"
        }: schemaVersion=${actualSchema}, sourceRevision=${actualRevision}; expected schemaVersion=1, sourceRevision=${expectedRevision}`;
  const ruleIds = new Set([
    ...Object.keys(baseline.countsByRule),
    ...Object.keys(current.countsByRule),
  ]);
  const countDrifts = [...ruleIds].sort().flatMap((ruleId) => {
    const before = baseline.countsByRule[ruleId] ?? 0;
    const after = current.countsByRule[ruleId] ?? 0;
    return before === after ? [] : [{ ruleId, before, after }];
  });
  return {
    ...(provenanceFailure ? { provenanceFailure } : {}),
    countDrifts,
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
  const refreshProvenance = process.argv.includes("--refresh-provenance");
  if (update && refreshProvenance) {
    console.error("--update and --refresh-provenance are mutually exclusive");
    return 1;
  }
  // --only <name>[,<name>]: re-check or re-record a subset (used to
  // re-verify a repo after a transient truncation without re-scanning
  // the whole corpus). Never narrows the failure threshold: a filtered
  // run that scans every requested repo is complete for THOSE repos.
  const onlyFlag = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyFlag
    ? new Set(onlyFlag.slice("--only=".length).split(","))
    : null;
  let regressed = false;
  const failedClones: string[] = [];
  const failedScans: string[] = [];
  const partialScans: string[] = [];
  const missingRefs: string[] = [];
  const invalidBaselines: string[] = [];
  const complete: string[] = [];
  const pendingUpdates: Array<{ name: string; entry: BaselineEntry }> = [];
  const requested = only ? CORPUS.filter((r) => only.has(r.name)) : CORPUS;
  if (only && requested.length !== only.size) {
    const unknown = [...only].filter(
      (name) => !CORPUS.some((repo) => repo.name === name),
    );
    console.error(`Unknown --only repositories: ${unknown.join(", ")}`);
    return 1;
  }

  for (const repo of CORPUS) {
    if (only && !only.has(repo.name)) continue;
    console.log(`\n=== ${repo.name} — ${repo.note} ===`);
    if (!repo.ref || !/^[0-9a-f]{40}$/u.test(repo.ref)) {
      console.error(
        `  FAIL: ${repo.name} has no authoritative 40-character ref`,
      );
      missingRefs.push(repo.name);
      regressed = true;
      continue;
    }
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
      regressed = true;
      continue;
    }

    let scan: CorpusScanEntry;
    try {
      scan = await scanRepo(dir);
    } catch (error) {
      console.error(
        `  FAIL: scan of ${repo.name} crashed — ${
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error)
        }`,
      );
      failedScans.push(repo.name);
      regressed = true;
      continue;
    }
    const current: CorpusScanEntry = {
      schemaVersion: 1,
      sourceRevision: repo.ref ?? "",
      ...scan,
    };
    const baseline = loadBaseline(repo.name);

    for (const crash of scan.diagnostics.ruleCrashes ?? []) {
      console.error(
        `  FAIL: ${repo.name} rule crash: ${crash.ruleId} at ${crash.file}: ${crash.message}`,
      );
      if (crash.stack) console.error(crash.stack);
      regressed = true;
    }
    if ((scan.diagnostics.analysisStatus.parseFallbacks ?? 0) > 0) {
      console.error(
        `  FAIL: ${repo.name} used ${scan.diagnostics.analysisStatus.parseFallbacks} parser fallback(s)`,
      );
      regressed = true;
    }

    if (current.partial) {
      console.error(
        `  FAIL: ${repo.name} produced an incomplete corpus measurement: ${JSON.stringify(
          {
            analysisStatus: current.diagnostics.analysisStatus,
            scopeIntegrity: current.diagnostics.scopeIntegrity,
            rulesDigest: current.diagnostics.rulesDigest,
          },
        )}`,
      );
      partialScans.push(repo.name);
      regressed = true;
      continue;
    }

    complete.push(repo.name);

    if (!baseline) {
      console.log(
        `  NO BASELINE — ${current.totalFindings} findings across ${
          Object.keys(current.countsByRule).length
        } rules. Review manually, then run --update to record it.`,
      );
      for (const [ruleId, count] of Object.entries(current.countsByRule)) {
        console.log(`    ${ruleId}: ${count}`);
      }
      if (update) {
        pendingUpdates.push({
          name: repo.name,
          entry: toBaselineEntry(current),
        });
      } else {
        invalidBaselines.push(`${repo.name} (missing)`);
        regressed = true;
      }
      continue;
    }

    const review = reviewCorpusMeasurement(baseline, current);
    if (review.provenanceFailure) {
      console.error(`  FAIL: ${repo.name} ${review.provenanceFailure}`);
      if (!update && !refreshProvenance) {
        invalidBaselines.push(repo.name);
        regressed = true;
      }
    }

    let repoRegressed = false;
    for (const { ruleId, before, after } of review.countDrifts) {
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
    if (!repoRegressed && !review.provenanceFailure) {
      console.log("  no FP-count regressions");
    }
    regressed ||= repoRegressed;

    if (refreshProvenance) {
      if (review.provenanceFailure && review.countDrifts.length === 0) {
        pendingUpdates.push({
          name: repo.name,
          entry: toBaselineEntry(current),
        });
      }
    } else if (update) {
      pendingUpdates.push({ name: repo.name, entry: toBaselineEntry(current) });
    }
  }

  // Best-effort — .cache is gitignored, and on Windows a just-cloned pack
  // file can stay locked for a moment after git exits.
  try {
    rmSync(CACHE_DIR, { recursive: true, force: true });
  } catch {
    /* stale .cache is harmless */
  }

  if (!only) {
    const orphans = orphanBaselineNames(
      requested.map((repo) => repo.name),
      readdirSync(BASELINE_DIR),
    );
    if (orphans.length > 0) {
      console.error(`Orphan baselines: ${orphans.join(", ")}`);
      regressed = true;
    }
  }

  const completenessFailures = corpusCompletenessFailures({
    requested: requested.map((repo) => repo.name),
    complete,
    failedClones,
    failedScans,
    partialScans,
    missingRefs,
    invalidBaselines: update ? [] : invalidBaselines,
  });
  if (completenessFailures.length > 0) {
    console.error(
      `Corpus completeness failed:\n${completenessFailures
        .map((failure) => `  - ${failure}`)
        .join("\n")}`,
    );
    return 1;
  }

  try {
    checkUnclassifiedCompleteness(collectUnclassified(), false);
  } catch (error) {
    console.error(
      `Unclassified verdict ratchet failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return 1;
  }

  if (regressed) {
    if (update || refreshProvenance) {
      console.error("Baseline update rejected; no files were written.");
    } else {
      console.error(
        "FAIL: corpus drift, missing provenance, or invalid baselines require review.",
      );
    }
    return 1;
  }

  if (update || refreshProvenance) {
    for (const pending of pendingUpdates) {
      writeBaseline(pending.name, pending.entry);
    }
    console.log(
      `Baseline updated after review (${pendingUpdates.length} files${refreshProvenance ? "; provenance-only mode" : ""}).`,
    );
    return 0;
  }

  console.log(
    "\nOK: complete corpus matches the reviewed deterministic baselines.",
  );
  return 0;
}

// Guard so this module's exports (CORPUS, BASELINE_DIR) can be imported
// by other scripts (e.g. the FP-table generator) without triggering a
// full networked audit as a side effect of the import.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await main();
}
