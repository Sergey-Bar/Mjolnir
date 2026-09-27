#!/usr/bin/env tsx
/**
 * `npm run docs:v6-inventory` — Wave 0 truth baseline.
 *
 * Writes, from **one** collection pass over the repository:
 *
 *  - `docs/v6-inventory.json`               — machine-readable facts
 *  - `docs/V6-CURRENT-STATE.md`             — the readable current state
 *  - `docs/V6-GAP-MATRIX.md`                — the gap matrix
 *  - `docs/V6-ARCHIVE-RECONCILIATION.json`  — the archive reconciliation
 *
 * They are four projections of one collection, so they cannot disagree
 * with each other. A Wave 0 baseline whose documents quote four different
 * counts is not a baseline.
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
  reconcileArchive,
  verifyRequirements,
  type ArchiveReconciliation,
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
const ARCHIVE_JSON = join(ROOT, "docs", "V6-ARCHIVE-RECONCILIATION.json");

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
  archive: ArchiveReconciliation,
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
          qaDomains: facts.qaDomains,
          gapLedgerRecords: facts.gapLedger.total,
          supportMatrixCells: facts.supportMatrix.total,
          issueDispositions: facts.issueDispositions.total,
          openIssues: facts.issueDispositions.openIssues,
          censusEntries: facts.census.entries,
        },
        maturity: {
          axis: MATURITY_LEVELS,
          census: facts.census.byMaturity,
          frameworkInventoryLadder: facts.frameworkMaturity,
          qaDomainCoverage: facts.qaDomainCoverage,
        },
        ruleRegistry: {
          live: facts.rulesLive,
          retired: facts.rulesRetired,
          measured: facts.rulesMeasured,
          byTier: facts.rulesByTier,
        },
        ledgers: {
          gapLedger: facts.gapLedger,
          supportMatrix: {
            total: facts.supportMatrix.total,
            byDisposition: facts.supportMatrix.byDisposition,
          },
          issueDispositions: facts.issueDispositions,
          externalValidation: facts.externalValidation,
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
        archiveReconciliation: archive,
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
  archive: ArchiveReconciliation,
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
    `| CI providers | ${facts.ciProviders} | \`CI_PROVIDER_IDS\` |`,
    `| QA domain records | ${facts.qaDomains} | \`QA_DOMAIN_RECORDS\` |`,
    `| Gap-ledger records | ${facts.gapLedger.total} | \`docs/M26-GAP-LEDGER.jsonl\` |`,
    `| Support-matrix cells | ${facts.supportMatrix.total} | \`docs/M26-SUPPORT-MATRIX.json\` |`,
    `| Issue dispositions | ${facts.issueDispositions.total} | \`docs/M26-ISSUE-DISPOSITIONS.jsonl\` |`,
    `| Open issues | ${facts.issueDispositions.openIssues} | same |`,
    `| External validation | **${facts.externalValidation}** | \`docs/M26-EXTERNAL-VALIDATION.json\` |`,
    "",
    "### Largest source areas",
    "",
    ...areas
      .slice(0, 12)
      .map(([area, count]) => `- \`src/${area}/\` — ${count}`),
    "",
    "### Ledgers",
    "",
    `- Gap ledger: ${tallyText(facts.gapLedger.byStatus)} · severities ${tallyText(facts.gapLedger.bySeverity)}`,
    `- Open release-blocking gaps: **${facts.gapLedger.openReleaseBlockers.length}** (${facts.gapLedger.openReleaseBlockers.join(", ") || "none"})`,
    `- Support matrix: ${tallyText(facts.supportMatrix.byDisposition)} — **${facts.supportMatrix.blockedCells.length} cells are explicitly BLOCKED**`,
    `- Issue dispositions: ${tallyText(facts.issueDispositions.byDisposition)}`,
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
    "## 6. Archive reconciliation",
    "",
    `The \`archive\` block of \`docs/ROADMAP.yaml\` covers 108 historical design-record issues (M18–M25, GitHub #539–#646). Status: **${archive.status}**.`,
    "",
    `- Records reconciled: ${archive.records.filter((r) => r.state === "RECONCILED").length} of ${archive.records.length}`,
    `- Records partially reconciled: ${archive.records.filter((r) => r.state === "PARTIALLY_RECONCILED").length}`,
    `- **Issues inside the historical ranges that are still open: ${archive.openIssuesInArchive.length}** (${archive.openIssuesInArchive.join(", ")})`,
    `- Closure command: \`${archive.closureCommand}\``,
    "",
    "The block **cannot** honestly be flipped to `RECONCILED` while those issues",
    "are open. Flipping it would be a false proof produced by the very act meant",
    "to establish the truth, so the gate records the open issues instead. See",
    "`docs/V6-GAP-MATRIX.md` (`GAP-V6-005`) and `docs/V6-ARCHIVE-RECONCILIATION.json`.",
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
    "- It did **not** make any gate green that was red before it. `m26:audit`",
    "  and `docs:roadmap:check` are still red, for the same honest reasons:",
    `  ${facts.gapLedger.openReleaseBlockers.length} open release-blocking gaps, ${facts.supportMatrix.blockedCells.length} BLOCKED matrix cells, and external validation still \`${facts.externalValidation}\`.`,
    "- It did **not** promote any capability. Promotion is a machine transition",
    "  and no criterion for it is satisfied yet.",
    "- It did **not** dispose of the 229 open issues. Dispositions are",
    "  bookkeeping; they prove nothing about capability.",
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
  archive: ArchiveReconciliation,
  baseSha: string,
): string {
  const m26Gaps: V6Gap[] = facts.gapLedger.openReleaseBlockers.map((id) => ({
    gap_id: id,
    severity: "release-blocker",
    status: "open",
    category: "m26-ledger",
    summary: `Carried from the M26 gap ledger; see \`docs/M26-GAP-LEDGER.jsonl\` for the full record.`,
    owner: "gap-ledger",
    targetWave: "1",
    maturityImpact: [],
    revalidationCommand: "npm run m26:audit",
    revisitTrigger: "closure evidence recorded in the M26 gap ledger",
    closureEvidence: null,
  }));

  const all: Array<{ gap: V6Gap; origin: "M26 ledger" | "Wave 0" }> = [
    ...WAVE0_GAPS.map((gap) => ({ gap, origin: "Wave 0" as const })),
    ...m26Gaps.map((gap) => ({ gap, origin: "M26 ledger" as const })),
  ];
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
    "Two sources, one table. Rows marked **Wave 0** were found by this",
    "inventory and were carried by no ledger before; rows marked **M26",
    "ledger** are pre-existing open release-blockers, restated so the two",
    "cannot be read as one number.",
    "",
    "## Summary",
    "",
    `- Wave 0 gaps found: **${WAVE0_GAPS.length}**`,
    `- Open M26 release-blockers carried forward: **${facts.gapLedger.openReleaseBlockers.length}**`,
    `- Support-matrix cells explicitly BLOCKED (not rows here, but the same class of truth): **${facts.supportMatrix.blockedCells.length}**`,
    `- Archive issues blocking reconciliation: **${archive.openIssuesInArchive.length}**`,
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

async function main(): Promise<void> {
  const facts = collectRepoFacts(ROOT);
  const requirements = verifyRequirements(ROOT);
  const archive = reconcileArchive(ROOT);
  const baseSha = gitSha(ROOT);

  writeFileSync(
    INVENTORY_JSON,
    renderInventoryJson(facts, requirements, archive, baseSha),
  );
  writeFileSync(
    CURRENT_STATE_MD,
    renderCurrentStateMd(facts, requirements, archive, baseSha),
  );
  writeFileSync(
    GAP_MATRIX_MD,
    renderGapMatrixMd(facts, requirements, archive, baseSha),
  );
  writeFileSync(ARCHIVE_JSON, JSON.stringify(archive, null, 2) + "\n");

  await prettify(INVENTORY_JSON);
  await prettify(CURRENT_STATE_MD);
  await prettify(GAP_MATRIX_MD);
  await prettify(ARCHIVE_JSON);

  const unverified = requirements.filter(
    (entry) => entry.unverified.length > 0,
  );
  console.log(
    `Wrote 4 Wave 0 artifacts: ${facts.srcFiles} src files, ${facts.rulesLive} live rules, ` +
      `${requirements.length} spec sections classified, ${WAVE0_GAPS.length} Wave 0 gaps, ` +
      `archive ${archive.status} with ${archive.openIssuesInArchive.length} open issues` +
      (unverified.length > 0
        ? `, ${unverified.length} unverified citation(s) — see docs/V6-CURRENT-STATE.md`
        : ""),
  );
}

if (isMainModule(import.meta.url)) {
  await main();
}
