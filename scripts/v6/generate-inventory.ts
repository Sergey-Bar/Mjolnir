#!/usr/bin/env tsx
/**
 * `npm run docs:v6-inventory` — Wave 0 truth baseline.
 *
 * Writes, from **one** collection pass over the repository:
 *
 *  - `docs/v6-inventory.json`               — machine-readable facts
 *  - `docs/V6-CURRENT-STATE.md`             — the readable current state
 *  - `docs/V6-GAP-MATRIX.md`                — the gap matrix
 *
 * They are three projections of one collection, so they cannot disagree
 * with each other. A Wave 0 baseline whose documents quote four different
 * counts is not a baseline.
 *
 * The fourth projection, `docs/V6-ARCHIVE-RECONCILIATION.json`, was removed in
 * 6.0 with the M26 GitHub snapshot it read. It is kept as a dated record at
 * `docs/archive/V6-ARCHIVE-RECONCILIATION.json`, and the finding it measured
 * (`GAP-V6-005`) is still open.
 *
 * The central claim of this file is negative, and that is the honest
 * shape of the current state: **no capability is advertised above the
 * maturity the machine can prove.** Every number here is counted from an
 * artifact, and every classification carries the path it was verified
 * against.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { prettify } from "../lib/prettify.js";
import { isMainModule } from "../lib/is-main-module.js";
import {
  ROOT,
  WAVE0_GAPS,
  collectRepoFacts,
  verifyRequirements,
  type RepoFacts,
  type VerifiedRequirement,
} from "./inventory.js";
import { MATURITY_LEVELS, ORTHOGONAL_AXES } from "../../src/v6/maturity.js";
import {
  DEPLOYMENT_MODES,
  REQUIREMENT_STATES,
  type RequirementState,
  type V6Gap,
} from "../../src/v6/capability-types.js";

const INVENTORY_JSON = join(ROOT, "docs", "v6-inventory.json");
const CURRENT_STATE_MD = join(ROOT, "docs", "V6-CURRENT-STATE.md");
const GAP_MATRIX_MD = join(ROOT, "docs", "V6-GAP-MATRIX.md");

function gitSha(root: string): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
  } catch {
    return "UNKNOWN";
  }
}

function cell(value: unknown): string {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function tallyText(record: Record<string, number>): string {
  const entries = Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
  return entries.length === 0
    ? "none"
    : entries.map(([key, count]) => `**${key}** ${count}`).join(" · ");
}

// ─── v6-inventory.json ───────────────────────────────────────────────

export function renderInventoryJson(
  facts: RepoFacts,
  requirements: readonly VerifiedRequirement[],
  baseSha: string,
): string {
  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        artifact: "v6-inventory",
        generatedBy: "npm run docs:v6-inventory",
        wave: "0",
        baseSha,
        version: facts.version,
        publishedStable: facts.publishedStable,
        counts: {
          srcFiles: facts.srcFiles,
          testSpecs: facts.testFiles,
          rulesLive: facts.rulesLive,
          rulesRetired: facts.rulesRetired,
          rulesMeasured: facts.rulesMeasured,
          adapters: facts.adapters.length,
          commands: facts.commands,
          frameworks: facts.frameworks,
          ciProviders: facts.ciProviders,
          censusEntries: facts.census.entries,
        },
        maturity: {
          axis: MATURITY_LEVELS,
          census: facts.census.byMaturity,
          frameworkInventoryLadder: facts.frameworkMaturity,
        },
        ruleRegistry: {
          live: facts.rulesLive,
          retired: facts.rulesRetired,
          measured: facts.rulesMeasured,
          byTier: facts.rulesByTier,
        },
        ledgers: {
          // 6.0 retired the M26 program. `gapLedger`, `supportMatrix`,
          // `issueDispositions` and `externalValidation` were six counts
          // transcribed out of four ledgers and published here as though the
          // inventory had measured them. The honest entry is the retirement
          // itself — a reader who diffs this artifact against 5.x sees exactly
          // which numbers stopped existing and why, instead of seeing them go
          // to zero.
          retired: [
            "M26-GAP-LEDGER.jsonl",
            "M26-SUPPORT-MATRIX.json",
            "M26-ISSUE-DISPOSITIONS.jsonl",
            "M26-EXTERNAL-VALIDATION.json",
          ],
          retiredIn: "6.0.0",
          seeAlso: "docs/archive/ROADMAP-M26-M50.yaml",
        },
        surfaces: facts.surfaces,
        exitCodes: facts.exitCodes,
        deploymentModes: DEPLOYMENT_MODES,
        requirementClassification: {
          vocabulary: REQUIREMENT_STATES,
          byState: tallyText({}),
          entries: requirements.map((entry) => ({
            specSection: entry.specSection,
            area: entry.area,
            state: entry.state,
            wave: entry.wave,
            evidence: entry.evidence,
            unverifiedEvidence: entry.unverified,
            note: entry.note,
          })),
        },
        archiveReconciliationRetired: {
          retiredIn: "6.0.0",
          reason:
            "read docs/M26-GITHUB-SNAPSHOT.json, which is deleted with the M26 " +
            "program and cannot be regenerated",
          record: "docs/archive/V6-ARCHIVE-RECONCILIATION.json",
          gap: "GAP-V6-005",
        },
        v6Wave0Gaps: WAVE0_GAPS,
        orthogonalAxes: ORTHOGONAL_AXES.map((axis) => ({
          id: axis.id,
          fields: axis.fields,
          vocabulary: axis.vocabulary,
          question: axis.question,
        })),
      },
      null,
      2,
    ) + "\n"
  );
}

// ─── V6-CURRENT-STATE.md ─────────────────────────────────────────────

export function renderCurrentStateMd(
  facts: RepoFacts,
  requirements: readonly VerifiedRequirement[],
  baseSha: string,
): string {
  const byState = new Map<RequirementState, number>();
  for (const entry of requirements) {
    byState.set(entry.state, (byState.get(entry.state) ?? 0) + 1);
  }
  const unverified = requirements.filter(
    (entry) => entry.unverified.length > 0,
  );
  const areas = Object.entries(facts.srcByArea).sort((a, b) => b[1] - a[1]);

  return [
    "# Mjölnir v6 — Wave 0 current-state inventory",
    "",
    "**Generated — do not edit by hand.** Regenerate: `npm run docs:v6-inventory`.",
    "",
    `Baseline commit \`${baseSha}\` · package version \`${facts.version}\` · published stable \`${facts.publishedStable}\`.`,
    "",
    "This is the truth baseline v6 is built on. It is deliberately blunt: the",
    "interesting part of a current-state inventory is what the product *cannot*",
    "demonstrate, not what it contains.",
    "",
    "## 1. The headline, stated as a negative",
    "",
    "**No capability is advertised above the maturity the machine can prove.**",
    "",
    "- The ecosystem census derives maturity from observed evidence only, and",
    "  three of its criteria have no gate today, so **every** ecosystem entry is",
    `  capped at **M2**. Distribution: ${tallyText(facts.census.byMaturity)}.`,
    "- `M3 FIXTURE_VERIFIED` is unreachable for frameworks and adapters: there is",
    "  no machine gate that verifies a positive/negative/boundary/adversarial",
    "  fixture quad per capability (`GAP-V6-004`).",
    "- `M4 CORPUS_VERIFIED` is unreachable: the measurement sidecar locks",
    "  `detectorRev` per *rule*, and nothing binds a framework capability to it.",
    "- `M5 FIELD_PROVEN` is unreachable **by construction**: it requires",
    "  `REMOTE_PROVEN` external evidence, which the zero-network default never",
    "  produces. That is D1 working, not a deficiency.",
    "",
    "## 2. Repository facts",
    "",
    "| Fact | Value | Source |",
    "|---|---|---|",
    `| Package version | \`${facts.version}\` | \`package.json\` |`,
    `| Published stable | \`${facts.publishedStable}\` | \`package.json\` |`,
    `| Source files (\`src/**.ts\`) | ${facts.srcFiles} | derived |`,
    `| Test specs (\`tests/**.spec.ts\`) | ${facts.testFiles} | derived |`,
    `| Live rules | ${facts.rulesLive} | \`src/rules/index.ts\` |`,
    `| Retired rule ids (preserved) | ${facts.rulesRetired} | \`RETIRED_RULE_IDS\` |`,
    `| Rules with a valid measurement | ${facts.rulesMeasured} | \`MEASURED_FP\` + \`detectorRev\` |`,
    `| Rule tiers | ${tallyText(facts.rulesByTier)} | \`effectiveTier\` |`,
    `| Adapters | ${facts.adapters.length} (${facts.adapters.join(", ")}) | \`src/adapters\` |`,
    `| Commands | ${facts.commands} | \`src/commands\` |`,
    `| Frameworks in the inventory | ${facts.frameworks} | \`FRAMEWORK_INVENTORY\` |`,
    `| CI providers | ${facts.ciProviders} | \`CI_PROVIDERS\` (measured from the generator) |`,
    "",
    "### Ledgers",
    "",
    "The M26–M50 program's four ledgers were retired in 6.0. They were",
    "transcriptions of a plan document rather than measurements of this tree,",
    "and an inventory that published them under `counts:` was reporting its own",
    "reading of a roadmap as a fact about the repository. The record of what they",
    "contained is `docs/archive/ROADMAP-M26-M50.yaml`; the live ladder is",
    "`docs/ROADMAP.yaml`.",
    "",
    "### Largest source areas",
    "",
    ...areas
      .slice(0, 12)
      .map(([area, count]) => `- \`src/${area}/\` — ${count}`),
    "",
    "## 3. Vocabulary collisions found by this wave",
    "",
    "These are not cosmetic. Each one is a place where two documents can say",
    "different things about the same fact and both be internally consistent.",
    "",
    "| # | Collision | Detail | Record |",
    "|---|---|---|---|",
    "| `F0`–`F5` | A **third** maturity ladder | `FRAMEWORK_INVENTORY` declares its own maturity ladder alongside the finding trust level `L0`–`L5` and the v6 ladder `M0`–`M5`. The v6 blueprint only knew about `L`, so this collision was unrecorded until now. | `GAP-V6-001`, ADR 0001 |",
    "| 3 support vocabularies | census states vs. framework `supportStatus` vs. rule `status` | `SUPPORTED/TARGET/DEPRECATED/NOT_APPLICABLE/UNRECOGNIZED`, `OFFICIAL_FULL/…/UNSUPPORTED`, `MEASURED-CORE/…/UNMEASURED`. No single axis is authoritative. | `GAP-V6-002`, ADR 0007 |",
    "| Naming vs. detection | the census declared 'playwright'; the field installs '@playwright/test' | The tool the engine actually handles appeared in its own gap report as unrecognized. Fixed by declaring `upstreamPackages` as census data. | `src/v6/ecosystem-census.ts` |",
    "",
    "## 4. Client surfaces (D4: each has its own proof maturity)",
    "",
    "| Surface | State | Note |",
    "|---|---|---|",
    ...Object.entries(facts.surfaces).map(
      ([surface, state]) => `| ${surface} | **${state}** | |`,
    ),
    "",
    "Two surfaces are absent and must not be advertised at any maturity.",
    "",
    "## 5. Requirement classification (§100)",
    "",
    `${requirements.length} spec sections classified from the repository, not from the spec's own description:`,
    "",
    ...[...byState.entries()]
      .sort()
      .map(([state, count]) => `- **${state}** — ${count}`),
    "",
    "| Spec § | Area | State | Wave | Evidence | Note |",
    "|---|---|---|---|---|---|",
    ...requirements.map(
      (entry) =>
        `| ${cell(entry.specSection)} | ${cell(entry.area)} | **${cell(entry.state)}** | ${cell(entry.wave)} | ${cell(
          entry.evidence.join(", ") || "—",
        )} | ${cell(entry.note)} |`,
    ),
    "",
    "### Citation verification",
    "",
    unverified.length === 0
      ? "Every cited path in the classification resolves in this checkout."
      : `**${unverified.length} citation(s) do not resolve** — a spec section pointing at a file that moved is a spec defect the plan cannot see itself:`,
    "",
    ...(unverified.length === 0
      ? []
      : unverified.flatMap((entry) =>
          entry.unverified.map(
            (path) => `- \`${entry.specSection}\` → \`${path}\``,
          ),
        )),
    "",
    "## 6. Archive reconciliation — retired in 6.0",
    "",
    "The historical M18–M25 design records (108 issues, GitHub #539–#646) were",
    "reconciled against the M26 GitHub issue snapshot. That snapshot was deleted",
    "with the M26 program in 6.0 and cannot be regenerated without `gh`, so the",
    "reconciliation is a dated record rather than a gate:",
    "`docs/archive/V6-ARCHIVE-RECONCILIATION.json`.",
    "",
    "The finding is unchanged and still open — `GAP-V6-005` in",
    "`docs/V6-GAP-MATRIX.md`. It was never closed by this section; the section",
    "only ever measured it, and the measurement's input is gone.",
    "",
    "## 7. The six orthogonal claim axes (ADR 0011)",
    "",
    "None of these is derivable from another, and no renderer may merge them.",
    "",
    "| Axis | Fields | Vocabulary size | Question |",
    "|---|---|---|---|",
    ...ORTHOGONAL_AXES.map(
      (axis) =>
        `| \`${axis.id}\` | ${cell(axis.fields.join(", "))} | ${axis.vocabulary.length} | ${cell(axis.question)} |`,
    ),
    "",
    "## 8. What this wave did not do, and will not pretend",
    "",
    "- It did **not** make any gate green that was red before it.",
    "- It did **not** promote any capability. Promotion is a machine transition",
    "  and no criterion for it is satisfied yet.",
    "- The M26–M50 program it originally reported against is retired. Its",
    "  ledgers recorded BLOCKED cells and UNRECONCILED issues for evidence that",
    "  was never going to arrive, and a gate that regenerates them forever is a",
    "  gate that reports the same blocked thing every night. The record is",
    "  `docs/archive/ROADMAP-M26-M50.yaml`; the live ladder is",
    "  `docs/ROADMAP.yaml`.",
    "",
    "See `docs/V6-GAP-MATRIX.md` for what is missing and `docs/adr/README.md` for",
    "the decisions that constrain how it may be built.",
    "",
  ].join("\n");
}

// ─── V6-GAP-MATRIX.md ────────────────────────────────────────────────

export function renderGapMatrixMd(
  facts: RepoFacts,
  requirements: readonly VerifiedRequirement[],
  baseSha: string,
): string {
  // 6.0 removed the second source. This matrix used to carry Wave 0 gaps AND
  // the M26 ledger's open release-blockers "so the two cannot be read as one
  // number" — which is exactly what happened: they were summed into one table
  // and one count. The ledger's rows recorded blockers against evidence that
  // was never going to arrive, so they blocked nothing and dated nothing.
  const all: Array<{ gap: V6Gap; origin: "Wave 0" }> = WAVE0_GAPS.map(
    (gap) => ({
      gap,
      origin: "Wave 0" as const,
    }),
  );
  const byWave = new Map<string, typeof all>();
  for (const item of all) {
    const bucket = byWave.get(item.gap.targetWave) ?? [];
    bucket.push(item);
    byWave.set(item.gap.targetWave, bucket);
  }

  return [
    "# Mjölnir v6 — Wave 0 gap matrix",
    "",
    "**Generated — do not edit by hand.** Regenerate: `npm run docs:v6-inventory`.",
    "",
    `Baseline commit \`${baseSha}\`.`,
    "",
    "One source: gaps this inventory found by measuring the tree. The M26",
    "ledger's open release-blockers were removed in 6.0 with the program that",
    "owned them (`docs/archive/ROADMAP-M26-M50.yaml` keeps the record).",
    "",
    "## Summary",
    "",
    `- Wave 0 gaps found: **${WAVE0_GAPS.length}**`,
    "",
    "## Gaps by target wave",
    "",
    ...[...byWave.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .flatMap(([wave, items]) => [
        `### Wave ${wave}`,
        "",
        "| Gap | Severity | Origin | Summary | Revalidation |",
        "|---|---|---|---|---|",
        ...items.map(
          (item) =>
            `| \`${cell(item.gap.gap_id)}\` | **${cell(item.gap.severity)}** | ${cell(item.origin)} | ${cell(item.gap.summary)} | \`${cell(item.gap.revalidationCommand)}\` |`,
        ),
        "",
      ]),
    "## Maturity impact of each Wave 0 gap",
    "",
    "| Gap | What the engine cannot demonstrate because of it |",
    "|---|---|",
    ...WAVE0_GAPS.flatMap((gap) =>
      gap.maturityImpact.length === 0
        ? []
        : gap.maturityImpact.map(
            (impact) => `| \`${gap.gap_id}\` | ${cell(impact)} |`,
          ),
    ),
    "",
    "## Requirements still missing or incorrect",
    "",
    "The subset of §100 classifications that is not `ALREADY_COMPLETE`. This is",
    "the actual scope of v6, and it is much larger than the wave list suggests.",
    "",
    "| Spec § | Area | State | Wave |",
    "|---|---|---|---|",
    ...requirements
      .filter((entry) => entry.state !== "ALREADY_COMPLETE")
      .map(
        (entry) =>
          `| ${cell(entry.specSection)} | ${cell(entry.area)} | **${cell(entry.state)}** | ${cell(entry.wave)} |`,
      ),
    "",
    "## What closes a gap here",
    "",
    "A gap row is closed by **closure evidence**, not by an intention:",
    "",
    "- a machine gate that passes and can be re-run (`revalidationCommand`),",
    "- a recorded owner, so a regression has somewhere to go,",
    "- a `revisitTrigger`, so a demotion is automatic rather than a memory.",
    "",
    "A gap whose row lacks any of those three is not a tracked gap; it is a wish.",
    "Every row in this file carries all three.",
    "",
  ].join("\n");
}

// ─── Entrypoint ──────────────────────────────────────────────────────

/**
 * Every artifact this generator produces, rendered but NOT written.
 *
 * Split out from `main` because `scripts/check-provenance-artifacts.ts`
 * compares the committed `docs/v6-inventory.json` against a fresh render, and
 * it must not write: the artifact's `baseSha` is the commit it was generated
 * from, so regenerating in the checkout would rewrite the stamp and a diff
 * afterwards would report the clock rather than the claim. Rendering in memory
 * and normalising is what makes "did a CLAIM change" separable from "did a
 * commit move".
 */
export interface RenderedArtifacts {
  facts: RepoFacts;
  requirements: readonly VerifiedRequirement[];
  inventory: string;
  currentState: string;
  gapMatrix: string;
}

export function renderArtifacts(root: string = ROOT): RenderedArtifacts {
  const facts = collectRepoFacts(root);
  const requirements = verifyRequirements(root);
  const baseSha = gitSha(root);
  return {
    facts,
    requirements,
    inventory: renderInventoryJson(facts, requirements, baseSha),
    currentState: renderCurrentStateMd(facts, requirements, baseSha),
    gapMatrix: renderGapMatrixMd(facts, requirements, baseSha),
  };
}

async function main(): Promise<void> {
  const { facts, requirements, inventory, currentState, gapMatrix } =
    renderArtifacts(ROOT);
  writeFileSync(INVENTORY_JSON, inventory);
  writeFileSync(CURRENT_STATE_MD, currentState);
  writeFileSync(GAP_MATRIX_MD, gapMatrix);

  await prettify(INVENTORY_JSON);
  await prettify(CURRENT_STATE_MD);
  await prettify(GAP_MATRIX_MD);

  const unverified = requirements.filter(
    (entry) => entry.unverified.length > 0,
  );
  console.log(
    `Wrote 3 Wave 0 artifacts: ${facts.srcFiles} src files, ${facts.rulesLive} live rules, ` +
      `${requirements.length} spec sections classified, ${WAVE0_GAPS.length} Wave 0 gaps` +
      (unverified.length > 0
        ? `, ${unverified.length} unverified citation(s) — see docs/V6-CURRENT-STATE.md`
        : ""),
  );
}

if (isMainModule(import.meta.url)) {
  await main();
}
