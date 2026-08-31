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
import { execFileSync, execSync } from "node:child_process";

import { RULES } from "../src/rules/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const BASELINE_DIR = join(ROOT, "tests", "corpus", "baseline");
const VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");
const COUNT_LOCK_PATH = join(ROOT, "docs", "COUNT-LOCK.md");
const FP_AUDIT_PATH = join(ROOT, "docs", "FP-AUDIT.md");
const MEASURED_FP_PATH = join(ROOT, "src", "rules", "measured-fp.generated.ts");
/** Committed ceiling for unclassified verdict rows (bug-audit B4.29/L13). */
export const UNCLASSIFIED_CEILING_PATH = join(
  VERDICTS_DIR,
  "unclassified-ceiling.json",
);

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

export function renderFpAuditMd(
  baselines: FpAuditBaseline[],
  generatedAt: Date = new Date(),
): string {
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
    `Last generated: ${generatedAt.toISOString().slice(0, 10)}.`,
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
  const entries = computeRuleStats(verdicts)
    .filter((s) => s.classified >= MEASURED_THRESHOLD && s.fpRate !== null)
    .map((s) => {
      // 3 dp is plenty for a rate over ≤20 samples; Number() drops
      // trailing zeros so the literal matches what prettier would keep.
      const rate = Number((s.fpRate as number).toFixed(3));
      return `  "${s.ruleId}": { fpRate: ${rate}, n: ${s.classified} },`;
    });

  return [
    "// GENERATED by `npm run fp-audit:generate` from tests/corpus/verdicts/*.jsonl.",
    "// Do not edit by hand. tests/measured-fp-generated.spec.ts locks this to the verdicts.",
    "//",
    "// `fpRate` = FP / (TP + FP); `n` = classified (TP + FP) verdicts. A rule",
    "// absent from this map has zero classified verdicts — it ships on assumption.",
    "",
    "export interface MeasuredFp {",
    "  /** FP / (TP + FP), 0..1. */",
    "  fpRate: number;",
    "  /** Number of hand-classified TP/FP verdicts behind the rate. */",
    "  n: number;",
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
  generatedAt: Date = new Date(),
  registryIds: string[] = [],
): string {
  const stats = computeRuleStats(verdicts);

  const lines = [
    "# False-Positive Audit — Measured Rates",
    "",
    "**Generated from `tests/corpus/verdicts/*.jsonl` — do not edit by hand.**",
    "",
    "Each finding below was hand-classified by reading its source context.",
    "The FP rate is `FP / (TP + FP)` — UNSURE verdicts are excluded from the",
    "denominator (they add sample size but not confidence in either direction).",
    "",
    "A rule with fewer than 10 classified verdicts is **unmeasured**. Coverage",
    "below is stated against the full rule registry, not against the rules that",
    "happen to have been sampled.",
    "",
    `Last generated: ${generatedAt.toISOString().slice(0, 10)}.`,
    "",
    "## Summary",
    "",
  ];

  if (stats.length > 0) {
    lines.push(
      "| Rule ID | FP Rate | Sample (n) | TP | FP | UNSURE | Status |",
      "|---|---|---|---|---|---|---|",
    );
  }

  for (const s of stats) {
    const rate = s.fpRate !== null ? `${(s.fpRate * 100).toFixed(0)}%` : "—";
    const status =
      s.classified >= 10
        ? s.fpRate !== null && s.fpRate <= 0.1
          ? "✅ core"
          : s.fpRate !== null && s.fpRate <= 0.3
            ? "⚠️ extended"
            : "🔴 quarantine"
        : "❓ unmeasured";
    lines.push(
      `| ${s.ruleId} | ${rate} | ${s.classified} | ${s.tp} | ${s.fp} | ${s.unsure} | ${status} |`,
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

/**
 * Deterministic "Last generated" stamp: the date of the latest commit
 * that touched the verdict data. A runtime `new Date()` here made the
 * generated page differ on EVERY later day — which would permanently
 * fail the generated-docs drift gate (bug-audit B4.31) and, worse, the
 * stamp claimed a freshness the committed verdict data does not have.
 * The data's own vintage is the honest stamp.
 */
function dataVintage(): Date {
  try {
    const iso = execFileSync(
      "git",
      ["log", "-1", "--format=%cI", "--", "tests/corpus/verdicts"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
    if (iso) return new Date(iso);
  } catch {
    /* not a git checkout — fall through to epoch-neutral today */
  }
  return new Date();
}

function main(): void {
  const update = process.argv.includes("--update");

  // Bug-audit B4.29/L13: fail BEFORE writing any artifact when the
  // unclassified-verdict backlog grew beyond its committed ceiling —
  // an audit page built on a shrinking classified base is fiction.
  checkUnclassifiedCompleteness(collectUnclassified(), update);

  // Generate COUNT-LOCK.md (regression guard)
  const baselines = loadBaselines();
  const countLockMd = renderFpAuditMd(baselines, dataVintage());
  writeFileSync(COUNT_LOCK_PATH, countLockMd);
  console.log(`Wrote ${COUNT_LOCK_PATH} from ${baselines.length} baseline(s).`);

  // Generate FP-AUDIT.md (measured rates)
  const verdicts = loadVerdicts();
  const fpAuditMd = renderMeasuredFpAudit(
    verdicts,
    dataVintage(),
    registryRuleIds(),
  );
  writeFileSync(FP_AUDIT_PATH, fpAuditMd);
  console.log(
    `Wrote ${FP_AUDIT_PATH} from ${verdicts.length} classified verdict(s).`,
  );

  // Bake the measured FP rates into shipped code (verdicts/ is not packed).
  writeFileSync(MEASURED_FP_PATH, renderMeasuredFpModule(verdicts));
  console.log(`Wrote ${MEASURED_FP_PATH}.`);

  // Format all three
  try {
    execSync(
      `npx prettier --write "${COUNT_LOCK_PATH}" "${FP_AUDIT_PATH}" "${MEASURED_FP_PATH}"`,
      { cwd: ROOT, stdio: "ignore" },
    );
  } catch {
    console.warn("prettier formatting skipped");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
