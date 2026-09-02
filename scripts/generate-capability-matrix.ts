#!/usr/bin/env tsx
/**
 * `npm run docs:capability` — generates docs/RULE-CAPABILITY-MATRIX.md and
 * docs/RULE-CAPABILITY-MATRIX.json (Verification Trust Evolution Plan
 * §04/§09, Phase 0 tasks 1–3).
 *
 * Canonical, GENERATED artifact — never hand-maintained. Produced from the
 * rule registry (`src/rules/index.ts` RULES) joined with `MEASURED_FP`
 * (`src/rules/measured-fp.generated.ts`) and the verdict corpus
 * (`tests/corpus/verdicts/*.jsonl`) for corpus-size/diversity. Enumerates
 * registry OUTPUT (not source files), so family variants declared as
 * positional factory arguments are counted (the defect the FP-audit
 * generator already documented).
 *
 * Unknown fields render as `UNCLASSIFIED` — visible gaps are the
 * deliverable, not failures (plan §04; No False Proof). The
 * detectionStrategy column renders the enforced §09.6 enum declared on
 * each rule (the Phase 2 D6 migration); undeclared values render
 * UNCLASSIFIED.
 *
 * Drift-locked by tests/capability-matrix.spec.ts and the
 * generated-docs-drift CI job (which runs this script and fails on any
 * git diff). No timestamps: the artifact must be byte-stable (see the
 * fp-audit generator's note on the removed non-deterministic stamps).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { prettify } from "./lib/prettify.js";
import { isMainModule } from "./lib/is-main-module.js";
import { wilsonInterval } from "./lib/wilson.js";

// Re-exported for compatibility — tests/capability-matrix.spec.ts (and
// any library consumer) imports the interval math from this module, but
// the single implementation lives in scripts/lib/wilson.ts so the FP
// regression-governance comparison (§20.2) uses the identical math.
export { wilsonInterval };

import { RETIRED_RULE_IDS, RULES } from "../src/rules/index.js";
import {
  MEASURED_FP,
  type MeasuredFp,
} from "../src/rules/measured-fp.generated.js";
import {
  declaredDetectorRevision,
  effectiveTier,
  ruleStatus,
} from "../src/rules/measurement.js";
import type { QADoctorRule } from "../src/rules/rule.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");
const MD_PATH = join(ROOT, "docs", "RULE-CAPABILITY-MATRIX.md");
const JSON_PATH = join(ROOT, "docs", "RULE-CAPABILITY-MATRIX.json");

// ─── Defect ledger (plan §02) — owning phase per defect ─────────────

export interface DefectLedgerEntry {
  id: string;
  defect: string;
  targetPhase: string;
}

export const DEFECT_LEDGER: readonly DefectLedgerEntry[] = [
  {
    id: "D1",
    defect:
      "`src/engine/tree-sitter-ast.ts` is dead code — parse stage is synchronous end-to-end, `parseJavaAst`/`parseCSharpAst` never consumed",
    targetPhase: "0.5",
  },
  {
    id: "D2",
    defect:
      "Packaging: `tree-sitter-wasms` is a devDependency and `files` excludes `*.wasm` — the published CLI cannot load grammars offline",
    targetPhase: "0.5",
  },
  {
    id: "D3",
    defect:
      "Unmeasured rules default to `core` (omitted tier defaults to core in `rule.ts`) — policy hole the docs admit but code enforces",
    targetPhase: "1",
  },
  {
    id: "D4",
    defect:
      'Adapter header claims drift (e.g., `java.ts` claims "Second tree-sitter consumer")',
    targetPhase: "0",
  },
  {
    id: "D5",
    defect:
      "Corpus bias: JV/CS measured on the Playwright libraries themselves; CI rules starved at n=3–5; QA-PW-101 parked on 20 UNSURE verdicts [resolved sub-item, 2026-09-01: the QA-PW-101 park was adjudicated from source per plan §11.5 — 20 TP, rule now measured core]",
    targetPhase: "1",
  },
  {
    id: "D6",
    defect: "`detectionStrategy` is free text, not an enforced enum",
    targetPhase: "0 (contract), 2 (migration)",
  },
  {
    id: "D7",
    defect:
      "`frameworks` metadata declared but unenforced; framework detection is shallow (regex over build files, first `.csproj` only)",
    targetPhase: "2 / 5",
  },
  {
    id: "D8",
    defect:
      "`MEASURED_FP` keyed by rule ID only — no detector revision, so measurements can silently cross implementation changes",
    targetPhase: "1",
  },
];

// ─── Detection-strategy enum (§09.6/§12.1 — enforced contract) ──────

export type DetectionStrategyEnum =
  "LEXICAL" | "AST" | "SEMANTIC" | "FRAMEWORK" | "RUNTIME" | "UNCLASSIFIED";

/**
 * The declared `detectionStrategy` IS the §09.6 enum since the Phase 2
 * D6 migration (src/rules/rule.ts types it, tests/rules.registry.spec.ts
 * ratchets it). This function now exists for the contract surface and for
 * defensive rendering: an undeclared strategy (or an out-of-contract
 * value smuggled in via a synthetic rule object) renders UNCLASSIFIED
 * instead of a fabricated claim. Every registry rule maps to its declared
 * enum value.
 */
export function deriveDetectionStrategyEnum(
  declared: string | undefined,
): DetectionStrategyEnum {
  if (declared === undefined) return "UNCLASSIFIED";
  if (
    declared === "LEXICAL" ||
    declared === "AST" ||
    declared === "SEMANTIC" ||
    declared === "FRAMEWORK" ||
    declared === "RUNTIME"
  ) {
    return declared;
  }
  return "UNCLASSIFIED";
}

/**
 * Semantic depth (§04: Low/Medium/High) derived ONLY from the provisional
 * enum — no invented claims. UNCLASSIFIED enum → UNCLASSIFIED depth.
 */
export function deriveSemanticDepth(
  strategy: DetectionStrategyEnum,
): "Low" | "Medium" | "High" | "UNCLASSIFIED" {
  if (strategy === "LEXICAL") return "Low";
  if (strategy === "AST") return "Medium";
  if (strategy === "SEMANTIC") return "High";
  return "UNCLASSIFIED";
}

// ─── Verdict-derived corpus facts ────────────────────────────────────

export interface RuleVerdictStats {
  /** Classified (TP+FP) verdict rows. */
  classified: number;
  /** UNSURE verdict rows (excluded from rates, never silent — §08). */
  unsure: number;
  /** Distinct corpus repos contributing verdict rows for this rule. */
  repos: Set<string>;
}

function loadVerdictStats(): Map<string, RuleVerdictStats> {
  const stats = new Map<string, RuleVerdictStats>();
  if (!existsSync(VERDICTS_DIR)) return stats;
  for (const f of readdirSync(VERDICTS_DIR)) {
    if (!f.endsWith(".jsonl")) continue;
    const repo = f.replace(/\.jsonl$/, "");
    for (const line of readFileSync(join(VERDICTS_DIR, f), "utf8")
      .split("\n")
      .filter((l) => l.trim())) {
      try {
        const entry = JSON.parse(line) as {
          ruleId?: string;
          verdict?: string;
        };
        if (!entry.ruleId || !entry.verdict) continue;
        const s = stats.get(entry.ruleId) ?? {
          classified: 0,
          unsure: 0,
          repos: new Set<string>(),
        };
        if (entry.verdict === "TP" || entry.verdict === "FP") s.classified++;
        else if (entry.verdict === "UNSURE") s.unsure++;
        else continue;
        s.repos.add(repo);
        stats.set(entry.ruleId, s);
      } catch {
        // skip malformed lines (same policy as the FP-audit generator)
      }
    }
  }
  return stats;
}

// ─── Capability rows ─────────────────────────────────────────────────

export interface CapabilityRow {
  id: string;
  name: string;
  category: string;
  severity: string;
  confidence: string;
  appliesTo: string;
  languages: string[] | "UNCLASSIFIED";
  frameworks: string[] | "UNCLASSIFIED";
  /** Declared §09.6 enum (D6: enforced contract, never free text). */
  detectionStrategy: string | "UNCLASSIFIED";
  /** Same value as `detectionStrategy` when declared; UNCLASSIFIED otherwise. */
  detectionStrategyEnum: DetectionStrategyEnum;
  semanticDepth: "Low" | "Medium" | "High" | "UNCLASSIFIED";
  measured: boolean;
  /** FP / (TP + FP), 0..1 — from MEASURED_FP. UNCLASSIFIED when unmeasured. */
  fpRate: number | "UNCLASSIFIED";
  /** Classified (TP + FP) verdicts behind the rate — the MEASURED_FP n. */
  n: number | "UNCLASSIFIED";
  /** 95% Wilson interval on the FP rate (§20.2). */
  ciLow: number | "UNCLASSIFIED";
  ciHigh: number | "UNCLASSIFIED";
  recall: "UNCLASSIFIED";
  corpusSize: number;
  corpusDiversity: number;
  mutationCoverage: "UNCLASSIFIED";
  /** Effective tier: declared tier, or the omitted-tier default. */
  tier: "core" | "extended" | "quarantine";
  /** false = tier omitted in the registry → measurement-dependent default (§11.2 Step 2). */
  tierDeclared: boolean;
  status: RowStatus;
  suiteInvalidating: boolean;
  knownLimitations: "UNCLASSIFIED";
  evidenceRequirements: "UNCLASSIFIED";
}

/** The row's status vocabulary, shared with src/rules/measurement.ts. */
type RowStatus = ReturnType<typeof ruleStatus>;

function statusFor(rule: QADoctorRule): RowStatus {
  // Single source: src/rules/measurement.ts's ruleStatus. PROVISIONAL is
  // a display status (§11.2 Step 2) covering both not-measured paths —
  // an extended/omitted-tier rule without a valid measurement and a core
  // rule whose measurement went stale (§07 detectorRevision mismatch).
  return ruleStatus(rule);
}

export function buildRows(
  rules: readonly QADoctorRule[] = RULES,
  measured: Readonly<Record<string, MeasuredFp>> = MEASURED_FP,
): CapabilityRow[] {
  const verdicts = loadVerdictStats();
  return [...rules]
    .map((rule): CapabilityRow => {
      const m = measured[rule.id];
      // "Measured" means a VALID measurement: present AND taken against
      // the detector revision the rule declares (plan §07 — a stale
      // measurement counts as unmeasured → provisional).
      const measuredFlag =
        m !== undefined &&
        m.detectorRevision === declaredDetectorRevision(rule);
      const validM = measuredFlag ? m : undefined;
      const strategy = deriveDetectionStrategyEnum(rule.detectionStrategy);
      const verdictStats = verdicts.get(rule.id);
      const ci =
        measuredFlag && validM
          ? wilsonInterval(validM.fpRate * validM.n, validM.n)
          : null;
      const tier = effectiveTier(rule);
      return {
        id: rule.id,
        name: rule.title,
        category: rule.category,
        severity: rule.severity,
        confidence: rule.confidence,
        appliesTo: rule.appliesTo,
        languages: rule.languages ?? "UNCLASSIFIED",
        frameworks: rule.frameworks ?? "UNCLASSIFIED",
        detectionStrategy: rule.detectionStrategy ?? "UNCLASSIFIED",
        detectionStrategyEnum: strategy,
        semanticDepth: deriveSemanticDepth(strategy),
        measured: measuredFlag,
        fpRate: measuredFlag && validM ? validM.fpRate : "UNCLASSIFIED",
        n: measuredFlag && validM ? validM.n : "UNCLASSIFIED",
        ciLow: ci ? ci.ciLow : "UNCLASSIFIED",
        ciHigh: ci ? ci.ciHigh : "UNCLASSIFIED",
        recall: "UNCLASSIFIED",
        corpusSize: verdictStats?.classified ?? 0,
        corpusDiversity: verdictStats?.repos.size ?? 0,
        mutationCoverage: "UNCLASSIFIED",
        tier,
        tierDeclared: rule.tier !== undefined,
        status: statusFor(rule),
        suiteInvalidating: rule.suiteInvalidating === true,
        knownLimitations: "UNCLASSIFIED",
        evidenceRequirements: "UNCLASSIFIED",
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

// ─── Declared-vs-measured cross-check (Phase 0 task 2, D9 class) ─────

export interface TierMismatch {
  ruleId: string;
  declaredTier: string;
  measuredStatus: string;
  problem: string;
}

/**
 * Cross-check declared tier vs measured status (plan §09.2):
 * - every measured rule with fpRate > 30% must declare `quarantine`;
 * - every core-status rule must have fpRate ≤ 10%;
 * - unmeasured rules in effective core are the D3 demotion list (the
 *   Phase 1 exit gate's "exact demotion list produced by the Phase 0
 *   inventory").
 * Phase 0 output is a REPORT — the enforcement lands as the Phase 1
 * registry ratchet. Phase 0 only names the suspects.
 */
export function crossCheckDeclaredVsMeasured(
  rules: readonly QADoctorRule[] = RULES,
  measured: Readonly<Record<string, MeasuredFp>> = MEASURED_FP,
): { d9Suspects: TierMismatch[]; unmeasuredInCore: string[] } {
  const d9Suspects: TierMismatch[] = [];
  const unmeasuredInCore: string[] = [];
  for (const rule of rules) {
    const effectiveTierValue = effectiveTier(rule);
    const m = measured[rule.id];
    const measuredValid =
      m !== undefined && m.detectorRevision === declaredDetectorRevision(rule);
    if (!measuredValid) {
      if (effectiveTierValue === "core") unmeasuredInCore.push(rule.id);
      continue;
    }
    if (effectiveTierValue === "core" && m.fpRate > 0.1) {
      d9Suspects.push({
        ruleId: rule.id,
        declaredTier: effectiveTierValue,
        measuredStatus: `fpRate ${m.fpRate} at n=${m.n}`,
        problem: "core-status rule with measured FP > 10%",
      });
    } else if (effectiveTierValue === "extended" && m.fpRate > 0.3) {
      d9Suspects.push({
        ruleId: rule.id,
        declaredTier: effectiveTierValue,
        measuredStatus: `fpRate ${m.fpRate} at n=${m.n}`,
        problem:
          "extended-tier rule with measured FP > 30% (must declare quarantine)",
      });
    } else if (effectiveTierValue !== "quarantine" && m.fpRate > 0.3) {
      d9Suspects.push({
        ruleId: rule.id,
        declaredTier: effectiveTierValue,
        measuredStatus: `fpRate ${m.fpRate} at n=${m.n}`,
        problem: "measured FP > 30% without a quarantine declaration",
      });
    }
  }
  d9Suspects.sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  unmeasuredInCore.sort((a, b) => a.localeCompare(b));
  return { d9Suspects, unmeasuredInCore };
}

// ─── Renderers ───────────────────────────────────────────────────────

function cell(value: unknown): string {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function pctLabel(row: CapabilityRow): string {
  return typeof row.fpRate === "number"
    ? `${(row.fpRate * 100).toFixed(0)}%`
    : "UNCLASSIFIED";
}

export interface MatrixData {
  rows: CapabilityRow[];
  d9Suspects: TierMismatch[];
  unmeasuredInCore: string[];
}

export function renderMatrixMd(data: MatrixData): string {
  const { rows, d9Suspects, unmeasuredInCore } = data;
  const measuredCount = rows.filter((r) => r.measured).length;
  const declaredCount = rows.filter((r) => r.tierDeclared).length;
  const lines: string[] = [
    "# Rule Capability Matrix (v0)",
    "",
    "**Generated from the rule registry (`src/rules/index.ts` `RULES`) + `MEASURED_FP` + verdict data — do not edit by hand.**",
    "Regenerate: `npm run docs:capability`. Drift-locked by `tests/capability-matrix.spec.ts` and the generated-docs-drift CI job.",
    "",
    "Verification Trust Evolution Plan §04/§09. Unknown fields render as",
    "`UNCLASSIFIED` — visible gaps are the deliverable, not failures.",
    "Sample sizes (n ≥ 10 / 20 / 100) are minimum evidence thresholds for",
    "tier promotion, never statistical proof: a rule that meets its bar is",
    '"measured at the promotion bar", never "proven" (§23).',
    "",
    "## Summary",
    "",
    `- Registry size: **${rows.length} rules**`,
    `- Measured (n ≥ 10 classified verdicts at a matching detectorRevision): **${measuredCount}/${rows.length} (${((measuredCount / rows.length) * 100).toFixed(0)}%)**`,
    `- Explicit tier declarations: **${declaredCount}/${rows.length}** — ${rows.length - declaredCount} rules resolve via the measurement-dependent omitted-tier default (plan §11.2 Step 2: omitted ⇒ extended/PROVISIONAL unless validly measured)`,
    `- Unmeasured rules in effective core: **${unmeasuredInCore.length}** (Phase 1 exit gate: 0)`,
    `- Declared-vs-measured cross-check: **${d9Suspects.length} mismatch(es)** (ledger class D9)`,
    "",
  ];

  lines.push("## Declared-vs-measured cross-check (ledger class D9)");
  lines.push("");
  if (d9Suspects.length === 0) {
    lines.push(
      "No mismatches: every measured rule with fpRate > 30% declares",
      "`quarantine`, and no core-status rule exceeds a 10% measured FP rate.",
    );
  } else {
    lines.push(
      "These are D9-class defects, fixed in Phase 1 with explained diffs:",
    );
    lines.push("");
    lines.push("| Rule ID | Declared tier | Measured status | Problem |");
    lines.push("|---|---|---|---|");
    for (const s of d9Suspects) {
      lines.push(
        `| ${s.ruleId} | ${s.declaredTier} | ${s.measuredStatus} | ${s.problem} |`,
      );
    }
  }
  lines.push("");
  lines.push(
    `Unmeasured rules currently sitting in effective core (D3 — closed in Phase 1: the registry ratchet enforces 0): ${unmeasuredInCore.length === 0 ? "(none)" : unmeasuredInCore.join(", ")}`,
  );
  lines.push("");

  lines.push("## Defect ledger (plan §02)");
  lines.push("");
  lines.push("| ID | Defect | Target phase |");
  lines.push("|---|---|---|");
  for (const d of DEFECT_LEDGER) {
    lines.push(`| ${d.id} | ${cell(d.defect)} | ${cell(d.targetPhase)} |`);
  }
  lines.push("");

  lines.push("## Capability matrix");
  lines.push("");
  lines.push(
    "| Rule ID | Name | Category | Languages | Frameworks | Detection strategy (enum) | Semantic depth | Measured | FP rate | n | Corpus size | Corpus diversity | Mutation coverage | Confidence | Tier | Status | Known limitations | Evidence requirements |",
  );
  lines.push(
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  );
  for (const r of rows) {
    lines.push(
      `| ${[
        r.id,
        r.name,
        r.category,
        Array.isArray(r.languages) ? r.languages.join(", ") : r.languages,
        Array.isArray(r.frameworks) ? r.frameworks.join(", ") : r.frameworks,
        r.detectionStrategy,
        r.semanticDepth,
        r.measured ? "yes" : "no",
        pctLabel(r),
        r.n,
        r.corpusSize,
        r.corpusDiversity,
        r.mutationCoverage,
        r.confidence,
        r.tierDeclared ? r.tier : `${r.tier} (measurement default)`,
        r.status,
        r.knownLimitations,
        r.evidenceRequirements,
      ]
        .map(cell)
        .join(" | ")} |`,
    );
  }
  lines.push("");

  lines.push("## Field glossary");
  lines.push("");
  lines.push(
    "- **Detection strategy**: the enforced §09.6 enum (`LEXICAL | AST | SEMANTIC | FRAMEWORK | RUNTIME`) declared on the rule (D6 closed in Phase 2 — the registry ratchet makes omission or a bad value a CI failure). `UNCLASSIFIED` renders only for an undeclared value.",
    "- **Semantic depth**: derived only from the enum (LEXICAL → Low, AST → Medium, SEMANTIC → High; FRAMEWORK/RUNTIME are decision-source labels, not depth grades).",
    "- **Measured**: a `MEASURED_FP` entry exists — n ≥ 10 hand-classified TP/FP verdicts (`tests/corpus/verdicts/*.jsonl`).",
    "- **Corpus size / diversity**: classified verdict rows / distinct repos behind them, from the verdict corpus.",
    "- **Tier**: effective tier — the declared tier, or the `rule.ts` omitted-tier default (`core`, the D3 policy hole).",
    "- **Status**: measurement-derived band (`MEASURED-CORE` ≤ 10% FP, `MEASURED-EXTENDED` ≤ 30%, `MEASURED-QUARANTINE` > 30%, `UNMEASURED`).",
    "- **Recall / mutation coverage / known limitations / evidence requirements**: `UNCLASSIFIED` across the registry in v0 — the Phase 1/2 measurement infrastructure owns filling them.",
  );
  lines.push("");

  lines.push("## Baseline lock (Phase 0 exit state)");
  lines.push("");
  lines.push("The reference state every ratchet measures against:");
  lines.push("");
  lines.push(
    `- Registry: ${rows.length} rules, ${RETIRED_RULE_IDS.length} retired ID(s) reserved (docs/RULE-LIFECYCLE.md).`,
  );
  lines.push(
    `- Measured coverage: ${measuredCount}/${rows.length} (per-rule detail above; authoritative rates in \`docs/FP-AUDIT.md\`).`,
  );
  lines.push(`- Declared-vs-measured mismatches: ${d9Suspects.length}.`);
  lines.push(
    "- Locked reference artifacts: `tests/golden/golden-expected.json` (golden lock), `docs/COUNT-LOCK.md` (corpus count lock), `docs/FP-AUDIT.md` (measured rates), `assets/readme/*` (demo/docs reproducibility).",
  );
  lines.push("");
  lines.push(
    "*Defect ledger recorded with owning phase per defect (§02); baseline lock commit = this artifact plus the locked artifacts above, all drift-checked in CI.*",
  );
  lines.push("");

  return lines.join("\n");
}

export interface MatrixJson {
  planSection: string;
  generatedBy: string;
  registrySize: number;
  measuredCount: number;
  coverage: string;
  declaredTierCount: number;
  unmeasuredInCore: string[];
  d9Suspects: TierMismatch[];
  defectLedger: readonly DefectLedgerEntry[];
  retiredRuleIds: readonly string[];
  rules: CapabilityRow[];
}

export function buildMatrixJson(data: MatrixData): MatrixJson {
  const { rows, d9Suspects, unmeasuredInCore } = data;
  const measuredCount = rows.filter((r) => r.measured).length;
  return {
    planSection:
      "Verification Trust Evolution Plan §04/§09 — Capability Matrix v0",
    generatedBy: "npm run docs:capability",
    registrySize: rows.length,
    measuredCount,
    coverage: `${measuredCount}/${rows.length}`,
    declaredTierCount: rows.filter((r) => r.tierDeclared).length,
    unmeasuredInCore,
    d9Suspects,
    defectLedger: DEFECT_LEDGER,
    retiredRuleIds: RETIRED_RULE_IDS,
    rules: rows,
  };
}

// ─── Entrypoint ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const data: MatrixData = {
    rows: buildRows(),
    ...crossCheckDeclaredVsMeasured(),
  };

  writeFileSync(MD_PATH, renderMatrixMd(data) + "\n");
  writeFileSync(
    JSON_PATH,
    JSON.stringify(buildMatrixJson(data), null, 2) + "\n",
  );
  await prettify(MD_PATH);
  await prettify(JSON_PATH);

  const measuredCount = data.rows.filter((r) => r.measured).length;
  console.log(
    `Wrote ${MD_PATH} and ${JSON_PATH}: ${data.rows.length} rules, ` +
      `${measuredCount} measured, ${data.d9Suspects.length} D9 mismatch(es), ` +
      `${data.unmeasuredInCore.length} unmeasured-in-core (D3 demotion list).`,
  );
}

// Write path runs only when this module IS the process entry point (the
// npm script). Spec imports stay pure — importing this module used to
// rewrite the generated docs as a side effect of running tests, which
// could leave unformatted bytes on disk mid-run. Phase 0.5 follow-up.
if (isMainModule(import.meta.url)) {
  await main();
}
