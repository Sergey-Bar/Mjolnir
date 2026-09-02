#!/usr/bin/env tsx
/**
 * Generates two documents:
 *
 * 1. `docs/COUNT-LOCK.md` — per-rule finding counts from baseline JSONs
 *    (the regression guard, formerly called "FP-AUDIT.md")
 *
 * 2. `docs/FP-AUDIT.md` — measured false-positive rates from
 *    human-classified verdicts in tests/corpus/verdicts/*.jsonl
 *    (Phase 3 — Tempering Plan)
 *
 * Usage: npm run fp-audit:generate
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { prettify } from "./lib/prettify.js";
import { isMainModule } from "./lib/is-main-module.js";
import { compareFpMeasurements, wilsonInterval } from "./lib/wilson.js";

import { RULES } from "../src/rules/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const BASELINE_DIR = join(ROOT, "tests", "corpus", "baseline");
const VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");
const COUNT_LOCK_PATH = join(ROOT, "docs", "COUNT-LOCK.md");
const FP_AUDIT_PATH = join(ROOT, "docs", "FP-AUDIT.md");
const MEASURED_FP_PATH = join(ROOT, "src", "rules", "measured-fp.generated.ts");
/**
 * Hand-maintained detectorRevision sidecar (plan §07/§11.3): one entry
 * per measured rule, bumped on any detection-logic change so a
 * measurement can never silently cross an implementation change.
 * Consumed here to stamp revisions into measured-fp.generated.ts and
 * FP-AUDIT.md; the drift lock in tests/measured-fp-generated.spec.ts is
 * extended (never bypassed) to keep the sidecar and the generated map
 * covering exactly the same measured set.
 */
export const DETECTOR_REVISIONS_PATH = join(
  ROOT,
  "tests",
  "corpus",
  "detector-revisions.json",
);
/** Committed ceiling for unclassified verdict rows (bug-audit B4.29/L13). */
export const UNCLASSIFIED_CEILING_PATH = join(
  VERDICTS_DIR,
  "unclassified-ceiling.json",
);
/**
 * Committed ceiling for UNSURE verdict rows (plan §11.5 — the UNSURE
 * adjudication workflow). An UNSURE row is an open question, not a
 * settled one: it never counts into `n` (§08) but it always triggers
 * review. This ceiling records today's open questions; adjudication
 * lowers it, growth beyond it fails the generator.
 */
export const UNSURE_CEILING_PATH = join(VERDICTS_DIR, "unsure-ceiling.json");

// Kept in sync by hand with tests/corpus/audit.ts's CORPUS list (the repo
// name is the join key and is asserted to exist by
// tests/fp-audit-table.spec.ts).
const CORPUS_NOTES: Record<string, { url: string; note: string }> = {
  "pallets-click": {
    url: "https://github.com/pallets/click.git",
    note: "real pytest suite — Python adapter FP surface",
  },
  "microsoft-playwright-mcp": {
    url: "https://github.com/microsoft/playwright-mcp.git",
    note: "real Playwright + GitHub Actions — TS/PW/CI adapter FP surface",
  },
  "pytest-dev-pytest": {
    url: "https://github.com/pytest-dev/pytest.git",
    note: "large real pytest suite — Python adapter FP surface (QA-PY-001..012)",
  },
  "psf-requests": {
    url: "https://github.com/psf/requests.git",
    note: "small real pytest suite — Python adapter FP surface",
  },
  "microsoft-playwright-java": {
    url: "https://github.com/microsoft/playwright-java.git",
    note: "real Playwright Java test suite — Java adapter FP surface (library-suite caveat: tests the bindings themselves, not a consumer app)",
  },
  "microsoft-playwright-dotnet": {
    url: "https://github.com/microsoft/playwright-dotnet.git",
    note: "real Playwright .NET test suite — C# adapter FP surface (same library-suite caveat)",
  },
  "nextauthjs-next-auth": {
    url: "https://github.com/nextauthjs/next-auth.git",
    note: "real TS app with Playwright e2e + substantial GitHub Actions — first non-trivial QA-CI-001 surface",
  },
  "vitejs-vite": {
    url: "https://github.com/vitejs/vite.git",
    note: "large real Playwright/Vitest suite — broad QA-PW + QA-TQUAL surface",
  },
  "sveltejs-kit": {
    url: "https://github.com/sveltejs/kit.git",
    note: "large real Playwright suite — QA-PW isolation/timing rules at scale",
  },
  "withastro-astro": {
    url: "https://github.com/withastro/astro.git",
    note: "large real Playwright suite — QA-PW text-coupling / viewport / empty-body",
  },
  "tanstack-query": {
    url: "https://github.com/TanStack/query.git",
    note: "real TS monorepo — QA-PW-112 sample growth; QA-TEST-004 fires >1600× here (classify carefully)",
  },
  "playwright-community-eslint-plugin-playwright": {
    url: "https://github.com/playwright-community/eslint-plugin-playwright.git",
    note: "small real Playwright-rules repo — compact QA-PW / QA-TQUAL surface, fast clone",
  },
  "microsoft-playwright-pytest": {
    url: "https://github.com/microsoft/playwright-pytest.git",
    note: "tiny real pytest-playwright repo — QA-PY-104 and QA-PW-103 on the Python adapter",
  },

  // ── 2026-08-31 expansion (corpus wave 4) — see tests/corpus/audit.ts
  //    for the fuller notes; kept in sync via fp-audit-table.spec.ts.
  "n8n-io-n8n": {
    url: "https://github.com/n8n-io/n8n.git",
    note: "large TS monorepo with Playwright e2e + heavy Actions — QA-PW-141..145/CI surface (consistently fails to clone in the CI environment; kept for local runs)",
  },
  "grafana-grafana": {
    url: "https://github.com/grafana/grafana.git",
    note: "large real TS monorepo with Playwright e2e + many Actions workflows — QA-PW-141..145, QA-CI-001..010, broad QA-PW/QA-TEST/QA-TQUAL consumer surface",
  },
  "calcom-cal": {
    url: "https://github.com/calcom/cal.com.git",
    note: "large real next.js app with Playwright e2e — QA-PW-141..145 and a broad consumer surface",
  },
  "dubinc-dub": {
    url: "https://github.com/dubinc/dub.git",
    note: "mid-size real next.js app with a plain Playwright e2e config — QA-PW-141..144 consumer surface",
  },
  "shadcn-ui-taxonomy": {
    url: "https://github.com/shadcn-ui/taxonomy.git",
    note: "tiny real next.js app with a minimal Playwright config — the sharpest QA-PW-143/144 surface",
  },
  "reflex-dev-reflex": {
    url: "https://github.com/reflex-dev/reflex.git",
    note: "mid-size real Python framework with pytest-playwright e2e — QA-PY-101..108 consumer surface",
  },
  "puppeteer-puppeteer": {
    url: "https://github.com/puppeteer/puppeteer.git",
    note: "real TS monorepo with mocha tests and multi-job Actions — QA-CI surface plus QA-PW/QA-TEST growth",
  },
  "vitest-dev-vitest": {
    url: "https://github.com/vitest-dev/vitest.git",
    note: "real TS monorepo with a large vitest suite of its own — QA-TEST-001/010, QA-TQUAL-002 at scale, plus CI and QA-PW config surfaces",
  },
  "streamlit-streamlit": {
    url: "https://github.com/streamlit/streamlit.git",
    note: "real Python app with pytest-playwright e2e and many GitHub Actions — QA-PY-103/105 plus QA-CI-005 and QA-PY-012",
  },
  "apache-airflow": {
    url: "https://github.com/apache/airflow.git",
    note: "huge real pytest suite — QA-PY-011/012 at scale plus QA-TEST-006",
  },
  "iluwatar-java-design-patterns": {
    url: "https://github.com/iluwatar/java-design-patterns.git",
    note: "real Java application repo with extensive JUnit tests — QA-JV-102/101 on consumer code, plus QA-CI-005 (D5)",
  },
  "spectreconsole-spectre-console": {
    url: "https://github.com/spectreconsole/spectre.console.git",
    note: "real C# application repo with a large NUnit suite — QA-CS-103 at consumer scale (D5)",
  },
  "Humanizr-Humanizer": {
    url: "https://github.com/Humanizr/Humanizer.git",
    note: "real C# library repo with xUnit tests and a retry-wrapped CI step — QA-CS-103 and QA-CI-007 surface",
  },
  "cypress-realworld-app": {
    url: "https://github.com/cypress-io/cypress-realworld-app.git",
    note: "real TS consumer app with heavy e2e — QA-TQUAL-009 at scale on application code",
  },
  "keycloak-keycloak": {
    url: "https://github.com/keycloak/keycloak.git",
    note: "large real Java monorepo whose UI suite is Playwright TypeScript — QA-PW-117 at scale plus QA-JV-101/102 and QA-CI-007",
  },
  "appsmithorg-appsmith": {
    url: "https://github.com/appsmithorg/appsmith.git",
    note: "real Java+TS monorepo with JUnit tests and CI workflows — QA-JV-101/102 plus QA-CI-008 and QA-TQUAL-011",
  },
  "getsentry-sentry": {
    url: "https://github.com/getsentry/sentry.git",
    note: "huge real Python monorepo — QA-PY-009/012 at scale plus QA-TQUAL-002",
  },
  "github-docs": {
    url: "https://github.com/github/docs.git",
    note: "workflow-dense docs repo (small code footprint) — QA-CI-001 and QA-CI-007 surface on real Actions files",
  },
  "vercel-next-js": {
    url: "https://github.com/vercel/next.js.git",
    note: "large real TS monorepo with its own e2e suite — QA-TEST-010, QA-TQUAL-002 at scale, plus QA-PW-141/144 and QA-CI-008",
  },
  "hashicorp-vault": {
    url: "https://github.com/hashicorp/vault.git",
    note: "real monorepo with UI tests and mature CI — QA-PW-004, QA-CI-001/008 and QA-PW-141 surface",
  },
  "nocodb-nocodb": {
    url: "https://github.com/nocodb/nocodb.git",
    note: "real TS app with e2e and CI — QA-CI-010 and QA-PW-115 surface",
  },
  "positive-fixtures": {
    url: "local:tests/corpus/positive-fixtures",
    note: "committed §08 class-B positive corpus — realistic anti-pattern variants per rule that MUST fire; every fire classifies TP",
  },
  "negative-fixtures": {
    url: "local:tests/corpus/negative-fixtures",
    note: "committed §08 class-C negative corpus — realistic legitimate code per rule that must NOT fire; any fire classifies FP",
  },
};

export interface FpAuditBaseline {
  name: string;
  countsByRule: Record<string, number>;
  totalFindings: number;
}

export interface Verdict {
  ruleId: string;
  verdict: "TP" | "FP" | "UNSURE" | "";
  file?: string;
  line?: number;
  note?: string;
}

// ─── Count-Lock (regression guard) ──────────────────────────────────

function loadBaselines(): FpAuditBaseline[] {
  const files = readdirSync(BASELINE_DIR).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      const name = f.replace(/\.json$/, "");
      const entry = JSON.parse(
        readFileSync(join(BASELINE_DIR, f), "utf8"),
      ) as Omit<FpAuditBaseline, "name">;
      return { name, ...entry };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function renderFpAuditMd(baselines: FpAuditBaseline[]): string {
  const lines = [
    "# Corpus Count Lock (Regression Guard)",
    "",
    "**Generated from `tests/corpus/baseline/*.json` — do not edit by hand.**",
    "Regenerate with `npm run fp-audit:generate` after a reviewed",
    "`npm run corpus:regression:update` run.",
    "",
    "This is a **count lock**, not a false-positive audit. It records how many",
    "times each rule fires on real-world repos and fails CI if that number",
    "increases. Classification of findings as TP/FP lives in `docs/FP-AUDIT.md`.",
    "",
    "Reproduce:",
    "",
    "```bash",
    "npm run corpus:regression",
    "```",
    "",
    "This clones the real repos below over the network, runs the same",
    "`runScan` the CLI uses, and fails if any rule fires *more* on real",
    "code than the committed baseline recorded (a false-positive",
    "regression signal).",
    "",
    "",
  ];

  for (const b of baselines) {
    const meta = CORPUS_NOTES[b.name];
    lines.push(`## ${b.name}`);
    lines.push("");
    if (meta) {
      lines.push(`${meta.note}`);
      lines.push("");
      lines.push(
        `Source: [\`${meta.url.replace(/\.git$/, "")}\`](${meta.url.replace(/\.git$/, "")})`,
      );
      lines.push("");
    }
    lines.push(`Total findings: **${b.totalFindings}**`);
    lines.push("");
    const ruleIds = Object.keys(b.countsByRule).sort();
    if (ruleIds.length === 0) {
      lines.push("_No findings recorded for this repo._");
      lines.push("");
      continue;
    }
    lines.push("| Rule ID | Findings |");
    lines.push("|---|---|");
    for (const ruleId of ruleIds) {
      lines.push(`| ${ruleId} | ${b.countsByRule[ruleId]} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── FP Audit (measured rates from verdicts) ─────────────────────────

/**
 * Every rule ID in the shipped registry.
 *
 * Read from `RULES` itself, never by grepping source for `id: "QA-…"`.
 * That textual approach was silently wrong: the Phase 6 rule families
 * (`brittle-selectors`, `no-a11y`, `blanket-route`) declare their IDs as
 * positional factory arguments, so seven real rules — QA-CS-106/110/111,
 * QA-JV-106/110/111 and QA-PY-104, every one of them Java/C#/Python —
 * were invisible to the coverage denominator, understating the rule base
 * as 84 when it is 91 and quietly shrinking the newest adapters' share.
 *
 * The count matters: coverage must be reported against the whole rule
 * base, not against the rules that happen to have verdicts. Importing the
 * registry makes that structurally true instead of regex-dependent.
 */
export function registryRuleIds(): string[] {
  return RULES.map((r) => r.id).sort();
}

function loadVerdicts(): Verdict[] {
  if (!existsSync(VERDICTS_DIR)) return [];
  const files = readdirSync(VERDICTS_DIR).filter((f) => f.endsWith(".jsonl"));
  const all: Verdict[] = [];
  for (const f of files) {
    const lines = readFileSync(join(VERDICTS_DIR, f), "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as Verdict;
        if (entry.verdict) all.push(entry);
      } catch {
        // skip malformed lines
      }
    }
  }
  return all;
}

// ─── Unclassified-verdict completeness (bug-audit B4.29, L13) ────────

export interface UnclassifiedReport {
  total: number;
  byFile: Record<string, number>;
}

/**
 * Counts the verdict rows whose `"verdict"` is blank. Blank rows are
 * silently DROPPED from the measured-FP rates (see loadVerdicts), so a
 * growing unclassified backlog makes the shipped rates quietly
 * under-report — exactly the L13 failure mode.
 */
export function collectUnclassified(): UnclassifiedReport {
  const report: UnclassifiedReport = { total: 0, byFile: {} };
  if (!existsSync(VERDICTS_DIR)) return report;
  for (const f of readdirSync(VERDICTS_DIR)) {
    if (!f.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(VERDICTS_DIR, f), "utf8").split(
      "\n",
    )) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed) as Verdict;
        if (!entry.verdict) {
          report.total++;
          report.byFile[f] = (report.byFile[f] ?? 0) + 1;
        }
      } catch {
        report.total++;
        report.byFile[f] = (report.byFile[f] ?? 0) + 1;
      }
    }
  }
  return report;
}

export interface UnclassifiedCeiling {
  total: number;
  byFile: Record<string, number>;
  recordedAt: string;
  note: string;
}

/**
 * Reads the committed ceiling (absence = 0 — a repo with no committed
 * ceiling must have no unclassified rows at all).
 */
export function loadUnclassifiedCeiling(): UnclassifiedCeiling {
  if (!existsSync(UNCLASSIFIED_CEILING_PATH)) {
    return {
      total: 0,
      byFile: {},
      recordedAt: "",
      note: "no committed ceiling — any unclassified row fails",
    };
  }
  return JSON.parse(
    readFileSync(UNCLASSIFIED_CEILING_PATH, "utf8"),
  ) as UnclassifiedCeiling;
}

/**
 * The completeness gate. A hard "zero unclassified" rule is the goal,
 * but the classification backlog is human work that cannot be faked —
 * so the gate is a RATCHET: the committed ceiling records today's
 * backlog; ANY growth beyond it (a new unclassified row in any file)
 * fails the generator immediately. The ceiling only moves DOWN via
 * classification work, and upward movement requires an explicit
 * `--update` whose diff names every file that grew. Nothing is silent.
 */
export function checkUnclassifiedCompleteness(
  report: UnclassifiedReport,
  update: boolean,
): void {
  // --update is the explicit "re-record after review" path: it never
  // fails on the backlog itself, it records the reviewed ceiling (the
  // diff then shows exactly which files grew).
  if (update) {
    const next: UnclassifiedCeiling = {
      total: report.total,
      byFile: report.byFile,
      recordedAt: new Date().toISOString(),
      note: "Committed ratchet ceiling (bug-audit B4.29/L13): the generator fails when unclassified verdict rows exceed these counts. Classification work lowers them; --update re-records.",
    };
    writeFileSync(
      UNCLASSIFIED_CEILING_PATH,
      JSON.stringify(next, null, 2) + "\n",
    );
    console.log(
      `Unclassified-verdict ceiling recorded: ${next.total} row(s) across ${Object.keys(next.byFile).length} file(s).`,
    );
    return;
  }

  const ceiling = loadUnclassifiedCeiling();
  const regressions: string[] = [];
  for (const [file, count] of Object.entries(report.byFile)) {
    const allowed = ceiling.byFile[file] ?? 0;
    if (count > allowed) {
      regressions.push(
        `  ${file}: ${count} unclassified (ceiling ${allowed}, +${count - allowed})`,
      );
    }
  }
  if (report.total > ceiling.total || regressions.length > 0) {
    console.error(
      `\nFAIL: ${report.total} unclassified verdict row(s) exceed the committed ` +
        `ceiling of ${ceiling.total} (tests/corpus/verdicts/unclassified-ceiling.json). ` +
        `Blank "verdict" rows silently under-report the measured FP rates — ` +
        `classify the new findings (TP/FP) before regenerating, or, if the ` +
        `growth is deliberate corpus expansion awaiting review, re-record the ` +
        `ceiling with \`npm run fp-audit:generate -- --update\` after review.`,
    );
    for (const r of regressions) console.error(r);
    throw new Error(
      `unclassified-verdict completeness gate failed (${report.total} > ${ceiling.total})`,
    );
  }
  if (report.total < ceiling.total) {
    console.log(
      `Unclassified verdict rows: ${report.total} (below the committed ceiling of ${ceiling.total} — re-record with --update to lower it).`,
    );
  }
}

// ─── UNSURE adjudication (Verification Trust Evolution Plan §11.5) ───

export interface UnsureReport {
  /** UNSURE row count per rule — the review unit (§08: "always triggers review"). */
  byRule: Record<string, number>;
  total: number;
}

/**
 * Counts the verdict rows whose `"verdict"` is `"UNSURE"`. UNSURE rows
 * are excluded from every measured rate (they never count into `n`,
 * plan §05/§08) — which means an UNSURE row that is never revisited is
 * an evidence gap that no number ever surfaces. This report makes the
 * gap machine-visible so the ceiling below can pin it.
 */
export function collectUnsure(): UnsureReport {
  const report: UnsureReport = { byRule: {}, total: 0 };
  if (!existsSync(VERDICTS_DIR)) return report;
  for (const f of readdirSync(VERDICTS_DIR)) {
    if (!f.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(VERDICTS_DIR, f), "utf8").split(
      "\n",
    )) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const entry = JSON.parse(trimmed) as Verdict;
        if (entry.verdict === "UNSURE" && entry.ruleId) {
          report.byRule[entry.ruleId] = (report.byRule[entry.ruleId] ?? 0) + 1;
          report.total++;
        }
      } catch {
        // malformed rows are the unclassified gate's problem, not ours
      }
    }
  }
  return report;
}

export interface UnsureCeiling {
  total: number;
  byRule: Record<string, number>;
  recordedAt: string;
  note: string;
}

/** Reads the committed UNSURE ceiling (absence = 0 — fail on any UNSURE row). */
export function loadUnsureCeiling(): UnsureCeiling {
  if (!existsSync(UNSURE_CEILING_PATH)) {
    return {
      total: 0,
      byRule: {},
      recordedAt: "",
      note: "no committed ceiling — any UNSURE row fails",
    };
  }
  return JSON.parse(readFileSync(UNSURE_CEILING_PATH, "utf8")) as UnsureCeiling;
}

/**
 * The UNSURE adjudication gate (plan §11.5): UNSURE never counts into
 * `n` but always triggers review. Mechanically: the committed ceiling
 * pins today's open UNSURE questions; any growth fails the generator,
 * and the ceiling only moves DOWN via documented adjudication (a
 * re-read of the cited source that resolves the row to TP/FP — the
 * criteria live in tests/corpus/verdicts/README.md). A rule parked on
 * ≥ 10 UNSURE rows (the QA-PW-101 failure the plan names) is exactly
 * what this gate exists to prevent from recurring silently.
 */
export function checkUnsureAdjudication(
  report: UnsureReport,
  update: boolean,
): void {
  if (update) {
    const next: UnsureCeiling = {
      total: report.total,
      byRule: report.byRule,
      recordedAt: new Date().toISOString(),
      note: "Committed ratchet ceiling (plan §11.5): the generator fails when UNSURE verdict rows exceed these counts. Documented adjudication (tests/corpus/verdicts/README.md) lowers them; --update re-records after review.",
    };
    writeFileSync(UNSURE_CEILING_PATH, JSON.stringify(next, null, 2) + "\n");
    console.log(
      `UNSURE ceiling recorded: ${next.total} row(s) across ${Object.keys(next.byRule).length} rule(s).`,
    );
    return;
  }

  const ceiling = loadUnsureCeiling();
  const regressions: string[] = [];
  for (const [ruleId, count] of Object.entries(report.byRule)) {
    const allowed = ceiling.byRule[ruleId] ?? 0;
    if (count > allowed) {
      regressions.push(
        `  ${ruleId}: ${count} UNSURE (ceiling ${allowed}, +${count - allowed})`,
      );
    }
  }
  if (report.total > ceiling.total || regressions.length > 0) {
    console.error(
      `\nFAIL: ${report.total} UNSURE verdict row(s) exceed the committed ` +
        `ceiling of ${ceiling.total} (tests/corpus/verdicts/unsure-ceiling.json). ` +
        `UNSURE rows never count into n (plan §08) — an UNSURE row that is ` +
        `never revisited is an unmeasured rule wearing a measurement's name. ` +
        `Adjudicate per tests/corpus/verdicts/README.md (re-read the cited ` +
        `source, resolve to TP/FP, or keep UNSURE with a sharper note), or, ` +
        `if the growth is deliberate corpus expansion awaiting review, ` +
        `re-record the ceiling with \`npm run fp-audit:generate -- --update\`.`,
    );
    for (const r of regressions) console.error(r);
    throw new Error(
      `UNSURE adjudication gate failed (${report.total} > ${ceiling.total})`,
    );
  }
  if (report.total < ceiling.total) {
    console.log(
      `UNSURE verdict rows: ${report.total} (below the committed ceiling of ${ceiling.total} — re-record with --update to lower it).`,
    );
  }
}

/**
 * Reads the hand-maintained detector-revision sidecar. Absence of the
 * file (or of a rule's entry) yields revision 1 — the documented default
 * for the current, first-generation detectors.
 */
export function loadDetectorRevisions(): Record<string, number> {
  if (!existsSync(DETECTOR_REVISIONS_PATH)) return {};
  const parsed = JSON.parse(
    readFileSync(DETECTOR_REVISIONS_PATH, "utf8"),
  ) as Record<string, unknown>;
  const revisions: Record<string, number> = {};
  for (const [id, v] of Object.entries(parsed)) {
    if (typeof v === "number" && Number.isInteger(v) && v >= 1) {
      revisions[id] = v;
    }
  }
  return revisions;
}

export interface RuleStats {
  ruleId: string;
  tp: number;
  fp: number;
  unsure: number;
  classified: number;
  fpRate: number | null;
  total: number;
}

/**
 * Per-rule TP/FP tallies from the hand-classified corpus verdicts.
 * The single source of truth for "how measured is this rule" — used by
 * the FP-audit page, the shipped `src/rules/measured-fp.generated.ts`,
 * and (via that file) the scan footer, `mjolnir rules`, `explain`, and
 * `doctor`'s tier-enforcement check.
 */
export function computeRuleStats(verdicts: Verdict[]): RuleStats[] {
  const byRule = new Map<string, Verdict[]>();
  for (const v of verdicts) {
    const arr = byRule.get(v.ruleId) ?? [];
    arr.push(v);
    byRule.set(v.ruleId, arr);
  }

  const stats: RuleStats[] = [];
  for (const [ruleId, entries] of [...byRule.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const tp = entries.filter((e) => e.verdict === "TP").length;
    const fp = entries.filter((e) => e.verdict === "FP").length;
    const unsure = entries.filter((e) => e.verdict === "UNSURE").length;
    const classified = tp + fp;
    const fpRate = classified > 0 ? fp / classified : null;
    stats.push({
      ruleId,
      tp,
      fp,
      unsure,
      classified,
      fpRate,
      total: entries.length,
    });
  }
  return stats;
}

/**
 * Renders `src/rules/measured-fp.generated.ts` — the measured FP rates
 * baked into the shipped package (tests/corpus/verdicts/ is not in the
 * npm tarball, so the installed CLI cannot read the raw verdicts).
 * Only rules with at least one classified (TP or FP) verdict appear.
 */
/** Minimum classified verdicts for a rule to count as "measured". */
export const MEASURED_THRESHOLD = 10;

export function renderMeasuredFpModule(verdicts: Verdict[]): string {
  const revisions = loadDetectorRevisions();
  const entries = computeRuleStats(verdicts)
    .filter((s) => s.classified >= MEASURED_THRESHOLD && s.fpRate !== null)
    .map((s) => {
      // 3 dp is plenty for a rate over ≤20 samples; Number() drops
      // trailing zeros so the literal matches what prettier would keep.
      const rate = Number((s.fpRate as number).toFixed(3));
      // detectorRevision (plan §07): the implementation revision the
      // measurement was taken against, from the hand-maintained sidecar.
      // Default 1 = the current first-generation detector. The Phase 1
      // ratchet treats a mismatch as stale → provisional → re-measure.
      const rev = revisions[s.ruleId] ?? 1;
      // §20.2: the 95% Wilson interval ships with every measurement so
      // regression governance compares intervals, not raw point estimates.
      const ci = wilsonInterval(
        (s.fpRate as number) * s.classified,
        s.classified,
      );
      return `  "${s.ruleId}": { fpRate: ${rate}, n: ${s.classified}, detectorRevision: ${rev}, ciLow: ${ci.ciLow}, ciHigh: ${ci.ciHigh} },`;
    });

  return [
    "// GENERATED by `npm run fp-audit:generate` from tests/corpus/verdicts/*.jsonl.",
    "// Do not edit by hand. tests/measured-fp-generated.spec.ts locks this to the verdicts.",
    "//",
    "// `fpRate` = FP / (TP + FP); `n` = classified (TP + FP) verdicts. A rule",
    "// absent from this map has zero classified verdicts — it ships on assumption.",
    "// `detectorRevision` = detector implementation revision the measurement was",
    "// taken against (sidecar: tests/corpus/detector-revisions.json, plan §07).",
    "",
    "export interface MeasuredFp {",
    "  /** FP / (TP + FP), 0..1. */",
    "  fpRate: number;",
    "  /** Number of hand-classified TP/FP verdicts behind the rate. */",
    "  n: number;",
    "  /**",
    "   * Detector implementation revision the measurement was taken against.",
    "   * Bumped on any detection-logic change (pattern, scoping, AST adoption);",
    "   * a mismatch vs the sidecar marks the measurement stale → provisional.",
    "   */",
    "  detectorRevision: number;",
    "  /** 95% Wilson interval lower bound on the FP rate (plan §20.2). */",
    "  ciLow: number;",
    "  /** 95% Wilson interval upper bound on the FP rate (plan §20.2). */",
    "  ciHigh: number;",
    "}",
    "",
    "export const MEASURED_FP: Readonly<Record<string, MeasuredFp>> = {",
    ...entries,
    "};",
    "",
  ].join("\n");
}

export function renderMeasuredFpAudit(
  verdicts: Verdict[],
  registryIds: string[] = [],
): string {
  const stats = computeRuleStats(verdicts);
  const revisions = loadDetectorRevisions();

  const lines = [
    "# False-Positive Audit — Measured Rates",
    "",
    "**Generated from `tests/corpus/verdicts/*.jsonl` — do not edit by hand.**",
    "",
    "Each finding below was hand-classified by reading its source context.",
    "The FP rate is `FP / (TP + FP)` — UNSURE verdicts are excluded from the",
    "denominator (they add sample size but not confidence in either direction).",
    "",
    "`detectorRev` is the detector implementation revision the measurement was",
    "taken against (sidecar: `tests/corpus/detector-revisions.json`). A rule",
    "whose detection logic changes without a revision bump has its measurement",
    "treated as stale → provisional (Verification Trust Evolution Plan §07).",
    "",
    "The 95% Wilson CI column is the interval regression governance compares",
    "(plan §20.2): an FP-rate regression is flagged only when the intervals",
    "are disjoint in the bad direction with a worse point estimate, at",
    "n ≥ 10 on both sides. Noise within the interval overlap is never a",
    "CI failure — comparisons below n = 10 are informational only.",
    "",
    "A rule with fewer than 10 classified verdicts is **unmeasured**. Coverage",
    "below is stated against the full rule registry, not against the rules that",
    "happen to have been sampled.",
    "",
    "",
    "## Summary",
    "",
  ];

  if (stats.length > 0) {
    lines.push(
      "| Rule ID | FP Rate | 95% Wilson CI | Sample (n) | TP | FP | UNSURE | detectorRev | Status |",
      "|---|---|---|---|---|---|---|---|---|",
    );
  }

  for (const s of stats) {
    const rate = s.fpRate !== null ? `${(s.fpRate * 100).toFixed(0)}%` : "—";
    const rev = s.classified >= 10 ? String(revisions[s.ruleId] ?? 1) : "—";
    // §20.2: intervals ship with the rates so regressions compare
    // distributions, not raw point estimates.
    const ci =
      s.classified >= 10 && s.fpRate !== null
        ? (() => {
            const w = wilsonInterval(s.fpRate * s.classified, s.classified);
            return `[${w.ciLow}, ${w.ciHigh}]`;
          })()
        : "—";
    const status =
      s.classified >= 10
        ? s.fpRate !== null && s.fpRate <= 0.1
          ? "✅ core"
          : s.fpRate !== null && s.fpRate <= 0.3
            ? "⚠️ extended"
            : "🔴 quarantine"
        : "❓ unmeasured";
    lines.push(
      `| ${s.ruleId} | ${rate} | ${ci} | ${s.classified} | ${s.tp} | ${s.fp} | ${s.unsure} | ${rev} | ${status} |`,
    );
  }

  if (stats.length === 0) {
    lines.push(
      "_No verdicts recorded. Every rule in the registry is unmeasured._",
      "",
      "Run `npm run corpus:sample` to generate review sheets, classify them by",
      "reading the cited source, then record verdicts in",
      "`tests/corpus/verdicts/<repo>.jsonl`.",
    );
  }

  lines.push("");
  lines.push("## Tier Assignment Criteria");
  lines.push("");
  lines.push("| Tier | FP Rate | Meaning |");
  lines.push("|---|---|---|");
  lines.push("| ✅ core | ≤ 10% | Ships in the default report |");
  lines.push("| ⚠️ extended | ≤ 30% | Included by default, lower confidence |");
  lines.push("| 🔴 quarantine | > 30% | Opt-in only (`--strict`) |");
  lines.push("| ❓ unmeasured | n < 10 | Cannot ship in core until measured |");
  lines.push("");

  const measured = stats.filter((s) => s.classified >= 10).length;
  // The denominator is the REGISTRY, not the set of rules that happen to have
  // verdicts. Reporting "3/6 measured" when 6 was the sampled count while the
  // registry holds 91 rules overstated coverage by more than an order of
  // magnitude — it made a 3-rule sample look like half the rule base.
  if (registryIds.length > 0) {
    const total = registryIds.length;
    const pct = ((measured / total) * 100).toFixed(0);
    lines.push(
      `## Coverage: ${measured}/${total} rules measured (${pct}%) at n ≥ 10`,
    );
    lines.push("");
    const unmeasured = total - measured;
    if (unmeasured > 0) {
      lines.push(
        `**${unmeasured} rules carry no measured FP rate.** Any of them in the`,
        "core tier is shipping on an unverified assumption.",
        "",
      );
    }
  } else {
    lines.push(
      `## Coverage: ${measured} rules measured at n ≥ 10 (registry size unknown)`,
    );
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────

// Bug-audit 2026-09-01: main() lost its wrapper — the whole "Last
// generated" stamp machinery (dataVintage/stampDate) was removed after
// the git-log date proved non-deterministic on CI shallow clones (git
// log -- <path> reports HEAD on a depth-1 clone even when HEAD never
// touched the path), so the stamp rolled over at every midnight. The
// data's vintage lives in git history (git blame), not in the artifact.

/**
 * §20.2 regression governance: compare the freshly computed measurements
 * against the COMMITTED measured-fp module. A regression is flagged only
 * when both sides have n ≥ 10, the 95% Wilson intervals are disjoint in
 * the bad direction (new ciLow > old ciHigh), and the point estimate is
 * worse — noise within tolerance must not fail the generator. A flagged
 * regression stops the write: the PR must discuss it explicitly (or
 * invalidate the measurement per §07 with a detectorRevision bump).
 */
export function checkFpRegression(
  committedPath: string,
  verdicts: Verdict[],
): void {
  if (!existsSync(committedPath)) return;
  const committed = readFileSync(committedPath, "utf8");
  const prior: Record<string, { fpRate: number; n: number; rev: number }> = {};
  for (const match of committed.matchAll(
    /"(QA-[A-Z]+-\d+)":\s*\{\s*fpRate:\s*([\d.]+),\s*n:\s*(\d+)(?:,\s*detectorRevision:\s*(\d+))?/g,
  )) {
    prior[match[1] ?? ""] = {
      fpRate: Number(match[2]),
      n: Number(match[3]),
      rev: Number(match[4] ?? 1),
    };
  }
  // §07 comparability: measurements taken against different detector
  // revisions are not comparable — a revision mismatch means the
  // detector changed, which is exactly when the old rate stops
  // describing the current behavior. Comparing across revisions would
  // flag (or bless) rates for detectors that no longer exist.
  const revisions = loadDetectorRevisions();
  const regressions: string[] = [];
  for (const s of computeRuleStats(verdicts)) {
    if (s.classified < MEASURED_THRESHOLD || s.fpRate === null) continue;
    const p = prior[s.ruleId];
    if (p === undefined) continue;
    if (p.rev !== (revisions[s.ruleId] ?? 1)) continue;
    const r = compareFpMeasurements(p, {
      fpRate: s.fpRate,
      n: s.classified,
    });
    if (r.regressed) {
      regressions.push(`  ${s.ruleId}: ${r.detail}`);
    }
  }
  if (regressions.length > 0) {
    console.error(
      `\nFAIL: statistically significant FP regression(s) vs the committed ` +
        `measurements (plan §20.2 — 95% Wilson intervals disjoint in the bad ` +
        `direction with a worse point estimate, n ≥ 10 both sides):\n` +
        regressions.join("\n") +
        `\nDiscuss the regression explicitly in the PR, or, if the detector ` +
        `implementation changed, bump the rule's detectorRevision in ` +
        `tests/corpus/detector-revisions.json so the old measurement is ` +
        `invalidated (stale → provisional, plan §07) instead of compared.`,
    );
    throw new Error(
      `FP regression governance failed (${regressions.length} rule(s))`,
    );
  }
}

async function main(update: boolean): Promise<void> {
  // Bug-audit B4.29/L13: fail BEFORE writing any artifact when the
  // unclassified-verdict backlog grew beyond its committed ceiling —
  // an audit page built on a shrinking classified base is fiction.
  checkUnclassifiedCompleteness(collectUnclassified(), update);

  // Plan §11.5: fail BEFORE writing when the UNSURE backlog grew beyond
  // its committed ceiling — UNSURE never counts into n, so unresolved
  // rows are invisible evidence gaps unless a gate pins them.
  checkUnsureAdjudication(collectUnsure(), update);

  const verdicts = loadVerdicts();

  // §20.2: fail BEFORE writing when a measurement regressed beyond its
  // statistical tolerance against the committed artifact.
  checkFpRegression(MEASURED_FP_PATH, verdicts);

  // Generate COUNT-LOCK.md (regression guard)
  const baselines = loadBaselines();
  const countLockMd = renderFpAuditMd(baselines);
  writeFileSync(COUNT_LOCK_PATH, countLockMd);
  console.log(`Wrote ${COUNT_LOCK_PATH} from ${baselines.length} baseline(s).`);

  // Generate FP-AUDIT.md (measured rates)
  const fpAuditMd = renderMeasuredFpAudit(verdicts, registryRuleIds());
  writeFileSync(FP_AUDIT_PATH, fpAuditMd);
  console.log(
    `Wrote ${FP_AUDIT_PATH} from ${verdicts.length} classified verdict(s).`,
  );

  // Bake the measured FP rates into shipped code (verdicts/ is not packed).
  writeFileSync(MEASURED_FP_PATH, renderMeasuredFpModule(verdicts));
  console.log(`Wrote ${MEASURED_FP_PATH}.`);

  // Format all three (Bug Map M-07) via the shared Prettier Node API
  // helper (scripts/lib/prettify.ts) — no try/catch: a formatting failure
  // propagates and the process exits non-zero.
  await prettify(COUNT_LOCK_PATH);
  await prettify(FP_AUDIT_PATH);
  await prettify(MEASURED_FP_PATH);
}

// The npm script is a straight tsx invocation, so the write path runs
// only when this module IS the process entry point; spec imports
// (measured-fp-generated.spec.ts, fp-audit-table.spec.ts) stay pure —
// importing this module used to rewrite the artifacts as a side effect
// of running tests. Same guard discipline as generate-capability-matrix.
if (isMainModule(import.meta.url)) {
  await main(process.argv.includes("--update"));
}
