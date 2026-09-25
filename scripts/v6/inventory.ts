import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RULES, RETIRED_RULE_IDS } from "../../src/rules/index.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import {
  declaredDetectorRevision,
  effectiveTier,
} from "../../src/rules/measurement.js";
import { FRAMEWORK_INVENTORY } from "../../src/frameworks/framework-inventory.js";
import { EXIT_USAGE, EXIT_INTERNAL } from "../../src/exit-codes.js";
import type {
  RequirementClassification,
  V6Gap,
} from "../../src/v6/capability-types.js";
import { MATURITY_SHORT } from "../../src/v6/maturity.js";
import { buildCensus, validateCensus } from "../../src/v6/ecosystem-census.js";
import {
  buildRepoEvidenceIndex,
  createEvidenceResolver,
} from "../../src/v6/ecosystem-probe.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");

// ─── Repository facts ────────────────────────────────────────────────

export interface RepoFacts {
  version: string;
  publishedStable: string;
  srcFiles: number;
  testFiles: number;
  srcByArea: Record<string, number>;
  rulesLive: number;
  rulesRetired: number;
  rulesMeasured: number;
  rulesByTier: Record<string, number>;
  adapters: string[];
  commands: number;
  frameworks: number;
  frameworkMaturity: Record<string, number>;
  ciProviders: number;
  qaDomains: number;
  /**
   * Domain coverage, counted from the support matrix's `MATRIX-DOMAIN-*`
   * cells and their dispositions — the ledger of record — rather than from
   * the module that declares the domain records. See the note in
   * `collectRepoFacts`: importing that module would give a
   * `CONTRACT_ONLY`-classified file a production importer.
   */
  qaDomainCoverage: Record<string, number>;
  gapLedger: {
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    openReleaseBlockers: string[];
  };
  supportMatrix: {
    total: number;
    byDisposition: Record<string, number>;
    blockedCells: string[];
  };
  issueDispositions: {
    total: number;
    byDisposition: Record<string, number>;
    openIssues: number;
  };
  externalValidation: string;
  exitCodes: { frozen: number[]; usage: number; internal: number };
  census: {
    entries: number;
    byState: Record<string, number>;
    byMaturity: Record<string, number>;
    demotedByStaleness: string[];
    unrecognized: number;
  };
  surfaces: Record<string, "PRESENT" | "ABSENT" | "PROVISIONAL">;
}

function countFiles(dir: string, test = false): number {
  if (!existsSync(dir)) return 0;
  let total = 0;
  const walk = (current: string, depth: number): void => {
    if (depth > 6) return;
    let entries: Array<{ name: string; isDirectory(): boolean }>;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
        continue;
      }
      if (test ? entry.name.endsWith(".spec.ts") : entry.name.endsWith(".ts")) {
        total += 1;
      }
    }
  };
  walk(dir, 0);
  return total;
}

function tally<T extends string>(values: readonly T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) out[value] = (out[value] ?? 0) + 1;
  return out;
}

export function collectRepoFacts(root = ROOT): RepoFacts {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    version: string;
    publishedStable?: string;
  };

  const srcByArea: Record<string, number> = {};
  for (const entry of readdirSync(join(root, "src"), { withFileTypes: true })) {
    if (entry.isDirectory()) {
      srcByArea[entry.name] = countFiles(join(root, "src", entry.name));
    }
  }
  const srcFiles = Object.values(srcByArea).reduce((a, b) => a + b, 0);

  const rulesByTier = tally(RULES.map((rule) => effectiveTier(rule)));
  const rulesMeasured = RULES.filter((rule) => {
    const measurement = MEASURED_FP[rule.id];
    return (
      measurement !== undefined &&
      measurement.detectorRevision === declaredDetectorRevision(rule)
    );
  }).length;

  const gapLedger = readJsonl<GapLedgerRow>(
    join(root, "docs", "M26-GAP-LEDGER.jsonl"),
  );
  const supportMatrix = JSON.parse(
    readFileSync(join(root, "docs", "M26-SUPPORT-MATRIX.json"), "utf8"),
  ) as { cells: Array<{ cell_id: string; disposition: string }> };
  const issueDispositions = readJsonl<DispositionRow>(
    join(root, "docs", "M26-ISSUE-DISPOSITIONS.jsonl"),
  );
  const externalValidation = (
    JSON.parse(
      readFileSync(join(root, "docs", "M26-EXTERNAL-VALIDATION.json"), "utf8"),
    ) as { status: string }
  ).status;

  const resolver = createEvidenceResolver(buildRepoEvidenceIndex(root), root);
  const census = buildCensus({ resolver, observedAt: "1970-01-01" });
  const censusDiagnostics = validateCensus(census, resolver);

  return {
    version: pkg.version,
    publishedStable: pkg.publishedStable ?? "UNKNOWN",
    srcFiles,
    testFiles: countFiles(join(root, "tests"), true),
    srcByArea,
    rulesLive: RULES.length,
    rulesRetired: RETIRED_RULE_IDS.length,
    rulesMeasured,
    rulesByTier,
    adapters: existsSync(join(root, "src", "adapters"))
      ? readdirSync(join(root, "src", "adapters"))
          .filter((f) => f.endsWith(".ts"))
          .map((f) => f.replace(/\.ts$/, ""))
      : [],
    commands: existsSync(join(root, "src", "commands"))
      ? readdirSync(join(root, "src", "commands")).filter((f) =>
          f.endsWith(".ts"),
        ).length
      : 0,
    frameworks: FRAMEWORK_INVENTORY.length,
    frameworkMaturity: tally(FRAMEWORK_INVENTORY.map((f) => f.maturity)),
    // Both of these are counted from the ledgers rather than by importing
    // the modules that declare them. `src/qa/domain-model.ts` is classified
    // `CONTRACT_ONLY` in `docs/COVERAGE-EXEMPTIONS.json` with a removal plan
    // to retire it, so a truth baseline that imports it would couple the
    // baseline to a module scheduled for deletion — and would give a module
    // declared to have no production importer a production importer. The
    // support matrix is the ledger of record for both numbers.
    ciProviders: new Set(
      supportMatrix.cells
        .filter(
          (c) =>
            c.cell_id.startsWith("MATRIX-CAPABILITY-EXTERNAL-CERTIFICATION") ||
            c.cell_id.includes("CI"),
        )
        .map((c) => c.cell_id),
    ).size,
    qaDomains: supportMatrix.cells.filter((c) =>
      c.cell_id.startsWith("MATRIX-DOMAIN-"),
    ).length,
    qaDomainCoverage: tally(
      supportMatrix.cells
        .filter((c) => c.cell_id.startsWith("MATRIX-DOMAIN-"))
        .map((c) => c.disposition),
    ),
    gapLedger: {
      total: gapLedger.length,
      byStatus: tally(gapLedger.map((g) => g.status)),
      bySeverity: tally(gapLedger.map((g) => g.severity)),
      openReleaseBlockers: gapLedger
        .filter((g) => g.status === "open" && g.severity === "release-blocker")
        .map((g) => g.gap_id),
    },
    supportMatrix: {
      total: supportMatrix.cells.length,
      byDisposition: tally(supportMatrix.cells.map((c) => c.disposition)),
      blockedCells: supportMatrix.cells
        .filter((c) => c.disposition === "BLOCKED")
        .map((c) => c.cell_id),
    },
    issueDispositions: {
      total: issueDispositions.length,
      byDisposition: tally(
        issueDispositions.map((d) => d.canonical_disposition),
      ),
      openIssues: issueDispositions.filter((d) => d.state === "open").length,
    },
    externalValidation,
    exitCodes: {
      frozen: [0, 1, 2, 10, 20],
      usage: EXIT_USAGE,
      internal: EXIT_INTERNAL,
    },
    census: {
      entries: census.entries.length,
      byState: tally(census.entries.map((e) => e.state)),
      byMaturity: tally(
        census.entries.map((e) => MATURITY_SHORT[e.maturity] as `M${number}`),
      ),
      demotedByStaleness: census.entries
        .filter((e) =>
          e.nextLevelGap?.missing.some((m) => m.includes("corpus uses major")),
        )
        .map((e) => e.id),
      unrecognized: censusDiagnostics.length,
    },
    surfaces: {
      cli: "PRESENT",
      githubAction: existsSync(join(root, "action.yml")) ? "PRESENT" : "ABSENT",
      mcp: existsSync(join(root, "src", "mcp", "server.ts"))
        ? "PRESENT"
        : "ABSENT",
      vscode: "ABSENT",
      githubApp: "ABSENT",
      dashboard: existsSync(join(root, "src", "commands", "dashboard.ts"))
        ? "PROVISIONAL"
        : "ABSENT",
    },
  };
}

interface GapLedgerRow {
  gap_id: string;
  severity: string;
  status: string;
  owner: string;
  target_train: string;
  category: string;
  [key: string]: unknown;
}

interface DispositionRow {
  issue_number: number;
  state: string;
  canonical_disposition: string;
  target_train: string;
  release_effect: string;
  [key: string]: unknown;
}

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);
}

// ─── Requirement classification (§100) ────────────────────────────────

/**
 * The v6 blueprint's §6.5 classification, transcribed so it can be
 * verified. `evidence` paths are checked on every run; a section whose
 * cited file no longer resolves reports `UNVERIFIED` and is listed in the
 * inventory, because a spec section pointing at a file that moved is a
 * spec defect the plan itself cannot see.
 */
export const REQUIREMENT_CLASSIFICATION: readonly (RequirementClassification & {
  /** Extra evidence paths beyond `evidence` (may be empty). */
  citations?: readonly string[];
})[] = [
  {
    specSection: "§1",
    area: "Maturity model",
    state: "INCORRECT",
    evidence: ["src/types.ts"],
    wave: "1",
    note: "L0–L5 is the finding trust level; the spec reuses it for capability maturity. Amendment A1 / ADR 0001.",
  },
  {
    specSection: "§2",
    area: "Capability registry",
    state: "MISSING",
    evidence: [
      "src/frameworks/framework-inventory.ts",
      "src/rules/registry-census.ts",
    ],
    wave: "1",
    note: "Parallel primitives exist; Amendment A7 / ADR 0007 forbids a second inventory.",
  },
  {
    specSection: "§3",
    area: "Domain coverage model",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/qa/domain-model.ts"],
    wave: "1",
    note: "11 provisional domain records; the security domain is BLOCKED.",
  },
  {
    specSection: "§4",
    area: "QA-IR",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/adapters"],
    wave: "2",
    note: "11 adapter modules, no neutral IR.",
  },
  {
    specSection: "§5",
    area: "CI-IR",
    state: "PARTIALLY_COMPLETE",
    evidence: [
      "src/frameworks/provider-capability-contract.ts",
      "src/adapters/github-actions.ts",
    ],
    wave: "3",
    note: "CI adapters exist; no normalized CI model.",
  },
  {
    specSection: "§6",
    area: "Rule certification factory",
    state: "PARTIALLY_COMPLETE",
    evidence: [
      "docs/FP-AUDIT.md",
      "src/rules/measurement.ts",
      "src/rules/measured-fp.generated.ts",
    ],
    wave: "4",
    note: "Corpus + FP audit exist; no precision/recall gate.",
  },
  {
    specSection: "§7",
    area: "Anti-pattern encyclopedia",
    state: "ALREADY_COMPLETE",
    evidence: ["docs/rules"],
    wave: "4",
    note: "101 rule pages across 12 families.",
  },
  {
    specSection: "§8",
    area: "Proof of absence",
    state: "ALREADY_COMPLETE",
    evidence: ["tests/blast-radius/scope-and-exit.spec.ts"],
    wave: "4",
    note: "Completeness accounting exists.",
  },
  {
    specSection: "§9",
    area: "Evidence graph",
    state: "ALREADY_COMPLETE",
    evidence: ["src/engine/runtime-evidence-graph.ts"],
    wave: "5",
    note: "Provisional but present.",
  },
  {
    specSection: "§10",
    area: "Evidence freshness",
    state: "ALREADY_COMPLETE",
    evidence: ["src/engine/runtime-evidence-graph.ts"],
    wave: "5",
    note: "Freshness binding exists.",
  },
  {
    specSection: "§11",
    area: "Contradiction engine",
    state: "PARTIALLY_COMPLETE",
    evidence: ["tests/commands/artifact-integrity.spec.ts"],
    wave: "5",
    note: "Input-conflict detection exists; no cross-source engine.",
  },
  {
    specSection: "§12",
    area: "Mutation engine",
    state: "MISSING",
    evidence: ["src/mutation/failure-sensitivity.ts"],
    wave: "6",
    note: "Contract only, non-gating.",
  },
  {
    specSection: "§13",
    area: "Failure sensitivity",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/mutation/failure-sensitivity.ts"],
    wave: "6",
    note: "False-green rules exist; no explicit 5-stage model.",
  },
  {
    specSection: "§14",
    area: "Test strength",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/rules/rule-metadata-schema.ts"],
    wave: "7",
    note: "No 22-dimension exposure.",
  },
  {
    specSection: "§15",
    area: "False-green engine",
    state: "ALREADY_COMPLETE",
    evidence: ["tests/false-green"],
    wave: "6",
    note: "Flagship; 4 families already shipping.",
  },
  {
    specSection: "§16",
    area: "Trust diff",
    state: "ALREADY_COMPLETE",
    evidence: ["src/change-intelligence.ts"],
    wave: "7",
    note: "verify/diff/trend exist.",
  },
  {
    specSection: "§17",
    area: "Impact analysis",
    state: "ALREADY_COMPLETE",
    evidence: ["src/commands/impact.ts", "docs/BLAST-RADIUS-AUDIT.md"],
    wave: "7",
    note: "Blast radius is computed and audited; the residual gap is that it is per-rule, not per-capability.",
  },
  {
    specSection: "§18",
    area: "Gap detection",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/gaps/gap-registry.ts"],
    wave: "7",
    note: "Graph-based; anti-1:1 principle already held.",
  },
  {
    specSection: "§19",
    area: "Quality graph",
    state: "MISSING",
    evidence: ["src/traceability"],
    wave: "8",
    note: "Thin: 2 modules.",
  },
  {
    specSection: "§20",
    area: "Requirements traceability",
    state: "MISSING",
    evidence: ["src/traceability"],
    wave: "8",
    note: "No opt-in connectors.",
  },
  {
    specSection: "§21",
    area: "Database QA",
    state: "MISSING",
    evidence: [],
    wave: "8",
    note: "No pack.",
  },
  {
    specSection: "§22",
    area: "API / Contract QA",
    state: "MISSING",
    evidence: [],
    wave: "8",
    note: "No pack.",
  },
  {
    specSection: "§23",
    area: "Mobile QA",
    state: "MISSING",
    evidence: [],
    wave: "8",
    note: "No pack.",
  },
  {
    specSection: "§24",
    area: "Desktop QA",
    state: "MISSING",
    evidence: [],
    wave: "8",
    note: "No pack.",
  },
  {
    specSection: "§25",
    area: "Embedded / IoT",
    state: "MISSING",
    evidence: [],
    wave: "8",
    note: "Extension domain by design.",
  },
  {
    specSection: "§26",
    area: "Accessibility QA",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/qa/domain-model.ts"],
    wave: "8",
    note: "Automation coverage only; human-required axis absent.",
  },
  {
    specSection: "§27",
    area: "Visual regression",
    state: "PARTIALLY_COMPLETE",
    evidence: ["docs/PLAYWRIGHT-CAPABILITIES.md"],
    wave: "8",
    note: "Snapshot rules exist; no baseline-freshness model.",
  },
  {
    specSection: "§28",
    area: "Cross-browser / device",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/rules/index.ts"],
    wave: "8",
    note: "Some rules retired for a false premise.",
  },
  {
    specSection: "§29",
    area: "i18n / RTL",
    state: "MISSING",
    evidence: [],
    wave: "8",
    note: "No pack.",
  },
  {
    specSection: "§30",
    area: "Performance QA",
    state: "MISSING",
    evidence: ["src/bench"],
    wave: "8",
    note: "src/bench measures the tool, not load tests.",
  },
  {
    specSection: "§31",
    area: "Security verification QA",
    state: "BLOCKED",
    evidence: ["docs/M26-SUPPORT-MATRIX.json"],
    wave: "8",
    note: "Requires external scanners; zero-network default.",
  },
  {
    specSection: "§32",
    area: "AI / LLM QA",
    state: "MISSING",
    evidence: ["src/agent"],
    wave: "8",
    note: "src/agent is the agent surface, not LLM-app QA.",
  },
  {
    specSection: "§33",
    area: "Data / ETL QA",
    state: "MISSING",
    evidence: [],
    wave: "8",
    note: "No pack.",
  },
  {
    specSection: "§34",
    area: "Chaos / resilience QA",
    state: "MISSING",
    evidence: [],
    wave: "8",
    note: "No pack.",
  },
  {
    specSection: "§35",
    area: "Network / protocol QA",
    state: "MISSING",
    evidence: [],
    wave: "8",
    note: "No pack.",
  },
  {
    specSection: "§36",
    area: "Test data management",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/forensics/evidence-hygiene.ts"],
    wave: "9",
    note: "Hygiene checks exist; no data-lifecycle model.",
  },
  {
    specSection: "§37",
    area: "Environment integrity",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/config"],
    wave: "9",
    note: "No cross-environment comparison.",
  },
  {
    specSection: "§38",
    area: "Flake intelligence",
    state: "ALREADY_COMPLETE",
    evidence: ["src/forensics"],
    wave: "9",
    note: "17 modules incl. pw-report and trend.",
  },
  {
    specSection: "§39",
    area: "Quarantine governance",
    state: "ALREADY_COMPLETE",
    evidence: ["src/commands/quarantine.ts"],
    wave: "9",
    note: "Quarantine is a first-class governance surface with its own command.",
  },
  {
    specSection: "§40",
    area: "Artifact intelligence",
    state: "ALREADY_COMPLETE",
    evidence: ["src/forensics", "src/reporter/sarif.ts"],
    wave: "9",
    note: "Artifact parsing and SARIF emission exist; the residual gap is report-format coverage, not artifact handling.",
  },
  {
    specSection: "§41",
    area: "Configuration intelligence",
    state: "ALREADY_COMPLETE",
    evidence: ["src/config", "tests/config/config.spec.ts"],
    wave: "9",
    note: "Config rules and a config spec suite exist.",
  },
  {
    specSection: "§42",
    area: "Coverage integrity",
    state: "ALREADY_COMPLETE",
    evidence: [
      "src/engine/coverage-ingestion.ts",
      "src/rules/ci/qa-ci-005-report-never-generated.ts",
    ],
    wave: "9",
    note: "Coverage is evidence, not truth.",
  },
  {
    specSection: "§43",
    area: "Test selection integrity",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/scope"],
    wave: "9",
    note: "Scope and selection logic exist, but selection completeness has no oracle to be verified against.",
  },
  {
    specSection: "§44",
    area: "Health scorecards",
    state: "ALREADY_COMPLETE",
    evidence: ["src/scorer"],
    wave: "7",
    note: "Aggregate conflicts with §94; Amendment A4 / ADR 0004.",
  },
  {
    specSection: "§45",
    area: "Risk-based model",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/commands/impact.ts", "src/traceability"],
    wave: "7",
    note: "Impact-driven ordering exists; the risk model itself is not derived from corpus frequency.",
  },
  {
    specSection: "§46",
    area: "Policy-as-code",
    state: "ALREADY_COMPLETE",
    evidence: ["src/commands/policy.ts"],
    wave: "9",
    note: "Policy evaluation ships as a command.",
  },
  {
    specSection: "§47",
    area: "Baseline governance",
    state: "ALREADY_COMPLETE",
    evidence: ["src/commands/baseline.ts"],
    wave: "9",
    note: "Baseline store, compare and gate exist.",
  },
  {
    specSection: "§48",
    area: "Suppression governance",
    state: "ALREADY_COMPLETE",
    evidence: [
      "src/engine/suppression-governance.ts",
      "src/engine/suppression-integrity.ts",
    ],
    wave: "9",
    note: "Suppression governance and suppression integrity are separate modules and both are gate-covered.",
  },
  {
    specSection: "§49",
    area: "Rule conflict engine",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/rules/index.ts"],
    wave: "4",
    note: "overlapWith survivor logic only.",
  },
  {
    specSection: "§50",
    area: "Autofix safety",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/commands/fix.ts"],
    wave: "9",
    note: "3-tier safety undeclared.",
  },
  {
    specSection: "§51",
    area: "Packs",
    state: "ALREADY_COMPLETE",
    evidence: ["src/frameworks/universal-pack-contract.ts"],
    wave: "4",
    note: "Contracts exist; packs are the Wave 8 work.",
  },
  {
    specSection: "§52",
    area: "Monorepo intelligence",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/discovery/ecosystem-detection.ts"],
    wave: "4",
    note: "Ecosystem and workspace detection exist; the map from workspace to capability coverage is not modelled.",
  },
  {
    specSection: "§53",
    area: "Incremental engine",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/engine/scan-cache.ts"],
    wave: "4",
    note: "Equivalence unproven.",
  },
  {
    specSection: "§54",
    area: "AI challenger",
    state: "MISSING",
    evidence: [],
    wave: "7",
    note: "Advisory only, never a verdict override.",
  },
  {
    specSection: "§55",
    area: "MCP",
    state: "ALREADY_COMPLETE",
    evidence: ["src/mcp/server.ts"],
    wave: "10",
    note: "1:1 rule + catalog digest; Amendment A5 / ADR 0005.",
  },
  {
    specSection: "§56",
    area: "VS Code / LSP",
    state: "MISSING",
    evidence: [],
    wave: "10",
    note: "New surface.",
  },
  {
    specSection: "§57",
    area: "GitHub Action",
    state: "ALREADY_COMPLETE",
    evidence: ["action.yml"],
    wave: "10",
    note: "Advisory-first default.",
  },
  {
    specSection: "§58",
    area: "GitHub App",
    state: "MISSING",
    evidence: [],
    wave: "10",
    note: "New surface.",
  },
  {
    specSection: "§59",
    area: "Dashboard",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/commands/dashboard.ts"],
    wave: "10",
    note: "Local HTML only.",
  },
  {
    specSection: "§60",
    area: "Release readiness",
    state: "ALREADY_COMPLETE",
    evidence: [
      "src/commands/release-report.ts",
      "src/commands/release-trust.ts",
    ],
    wave: "14",
    note: "Release report and release-trust both exist as commands.",
  },
  {
    specSection: "§61",
    area: "Release evidence bundle",
    state: "ALREADY_COMPLETE",
    evidence: ["candidate-trust-manifest.json"],
    wave: "14",
    note: "Not signed / not consumer-verifiable (P3).",
  },
  {
    specSection: "§62",
    area: "Defect learning loop",
    state: "MISSING",
    evidence: [],
    wave: "12",
    note: "Nothing converts an adjudicated verdict into a rule change; the verdict corpus is curated by hand.",
  },
  {
    specSection: "§63",
    area: "Production feedback",
    state: "MISSING",
    evidence: [],
    wave: "12",
    note: "Opt-in evidence, never proof.",
  },
  {
    specSection: "§64",
    area: "Test economics",
    state: "MISSING",
    evidence: ["src/bench"],
    wave: "11",
    note: "src/bench measures the tool's own runtime, not the economics of a test suite.",
  },
  {
    specSection: "§65",
    area: "Historical forensics",
    state: "ALREADY_COMPLETE",
    evidence: ["src/forensics"],
    wave: "11",
    note: "17 modules, including pw-report and trend.",
  },
  {
    specSection: "§66",
    area: "Quality debt",
    state: "ALREADY_COMPLETE",
    evidence: ["src/commands/debt.ts"],
    wave: "9",
    note: "The debt register ships as a command.",
  },
  {
    specSection: "§67",
    area: "Ownership",
    state: "PARTIALLY_COMPLETE",
    evidence: [".github/CODEOWNERS"],
    wave: "9",
    note: "Routing only, not blame.",
  },
  {
    specSection: "§68",
    area: "Dedup / root cause",
    state: "ALREADY_COMPLETE",
    evidence: [
      "src/engine/overlap-dedup.ts",
      "src/engine/cross-file-analysis.ts",
    ],
    wave: "7",
    note: "Overlap dedup and cross-file analysis both exist, so a duplicated finding is reduced to a root cause.",
  },
  {
    specSection: "§69",
    area: "Graph query layer",
    state: "ALREADY_COMPLETE",
    evidence: ["src/engine/evidence-graph.ts"],
    wave: "5",
    note: "The evidence graph and its query path exist; the Wave-8 quality graph is a different graph over different nodes.",
  },
  {
    specSection: "§70",
    area: "Cross-repo enterprise",
    state: "BLOCKED",
    evidence: ["docs/RELEASE-TRAINS.md"],
    wave: "10",
    note: "Previously deferred past 5.0.",
  },
  {
    specSection: "§71",
    area: "Custom rule SDK",
    state: "ALREADY_COMPLETE",
    evidence: ["src/plugins/sdk-contract.ts"],
    wave: "11",
    note: "Custom rules start unproven.",
  },
  {
    specSection: "§72",
    area: "Signed packs",
    state: "MISSING",
    evidence: [],
    wave: "11",
    note: "No pack signature or verification path exists, so a pack cannot be proven unaltered.",
  },
  {
    specSection: "§73",
    area: "Plugin security",
    state: "MISSING",
    evidence: ["docs/VERSIONING.md"],
    wave: "11",
    note: "Full Node privileges, documented only (residual R4).",
  },
  {
    specSection: "§74",
    area: "Privacy / deployment modes",
    state: "PARTIALLY_COMPLETE",
    evidence: ["tests/adversarial"],
    wave: "10",
    note: "Zero-network default exists; mode undeclared (A8 / ADR 0008).",
  },
  {
    specSection: "§75",
    area: "Hosted governance",
    state: "MISSING",
    evidence: [],
    wave: "10",
    note: "No hosted governance surface exists, so no hosted control can be proven.",
  },
  {
    specSection: "§76",
    area: "Security review",
    state: "PARTIALLY_COMPLETE",
    evidence: ["tests/adversarial", "tests/forensics/hostile-repo.spec.ts"],
    wave: "11",
    note: "Local covered; hosted/VS Code/App not.",
  },
  {
    specSection: "§77",
    area: "Versioned contracts",
    state: "ALREADY_COMPLETE",
    evidence: ["docs/VERSIONING.md"],
    wave: "13",
    note: "Additive-only.",
  },
  {
    specSection: "§78",
    area: "Exit codes",
    state: "INCORRECT",
    evidence: ["src/exit-codes.ts"],
    wave: "13",
    note: "Frozen {0,1,2,10,20}; no UNSUPPORTED_ENVIRONMENT / INTERNAL_ERROR (A2 / ADR 0002).",
  },
  {
    specSection: "§79",
    area: "doctor",
    state: "ALREADY_COMPLETE",
    evidence: ["src/commands/doctor.ts"],
    wave: "10",
    note: "doctor ships as a command with eight self-checks.",
  },
  {
    specSection: "§80",
    area: "report",
    state: "ALREADY_COMPLETE",
    evidence: [
      "src/engine/command-registry.ts",
      "src/commands/report-io.ts",
      "src/reporter/terminal.ts",
    ],
    wave: "10",
    note: "The command registry, the report I/O layer and the terminal reporter all exist.",
  },
  {
    specSection: "§81",
    area: "trust-report",
    state: "ALREADY_COMPLETE",
    evidence: ["src/commands/trust-report.ts"],
    wave: "10",
    note: "trust-report ships as a command.",
  },
  {
    specSection: "§82",
    area: "policy",
    state: "ALREADY_COMPLETE",
    evidence: ["src/commands/policy.ts"],
    wave: "10",
    note: "policy ships as a command.",
  },
  {
    specSection: "§83",
    area: "Surface parity",
    state: "PARTIALLY_COMPLETE",
    evidence: ["scripts/check-ci-local-parity.mjs"],
    wave: "10",
    note: "CI↔local only.",
  },
  {
    specSection: "§84",
    area: "Framework matrix",
    state: "PARTIALLY_COMPLETE",
    evidence: ["docs/RULE-CAPABILITY-MATRIX.md"],
    wave: "1",
    note: "Generated; not a census projection yet.",
  },
  {
    specSection: "§85",
    area: "Language matrix",
    state: "PARTIALLY_COMPLETE",
    evidence: ["docs/M26-SUPPORT-MATRIX.json"],
    wave: "1",
    note: "2 cells only.",
  },
  {
    specSection: "§86",
    area: "CI matrix",
    state: "PARTIALLY_COMPLETE",
    evidence: ["docs/M26-SUPPORT-MATRIX.json"],
    wave: "1",
    note: "4 cells only.",
  },
  {
    specSection: "§87",
    area: "Performance / scale proof",
    state: "ALREADY_COMPLETE",
    evidence: ["src/bench", "tests/stress"],
    wave: "11",
    note: "src/bench and tests/stress both cover scale; the gap is scale *proof*, not scale coverage.",
  },
  {
    specSection: "§88",
    area: "Reliability SLOs",
    state: "MISSING",
    evidence: [],
    wave: "11",
    note: "Not a shipped artifact.",
  },
  {
    specSection: "§89",
    area: "Reproducibility",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/engine/scan-cache.ts"],
    wave: "11",
    note: "Digest proven; byte-replay gate absent.",
  },
  {
    specSection: "§90",
    area: "Self-trust",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/commands/doctor.ts"],
    wave: "14",
    note: "8 checks + release-trust.",
  },
  {
    specSection: "§91",
    area: "Documentation architecture",
    state: "ALREADY_COMPLETE",
    evidence: ["docs/rules"],
    wave: "13",
    note: "Large and drift-prone.",
  },
  {
    specSection: "§92",
    area: "Migration",
    state: "MISSING",
    evidence: ["docs/MIGRATION-3.0.0.md"],
    wave: "13",
    note: "No 6.0 path; A6 / ADR 0006 fixes the baseline.",
  },
  {
    specSection: "§93",
    area: "Backward compatibility",
    state: "ALREADY_COMPLETE",
    evidence: ["docs/VERSIONING.md"],
    wave: "13",
    note: "docs/VERSIONING.md publishes the additive-only contract.",
  },
  {
    specSection: "§94",
    area: "No vanity metrics",
    state: "PARTIALLY_COMPLETE",
    evidence: ["docs/claim-registry.json"],
    wave: "13",
    note: "Registry covers 4 claims; prose is unlinted (P4).",
  },
  {
    specSection: "§95",
    area: "Persona UX",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/reporter"],
    wave: "10",
    note: "No view layer.",
  },
  {
    specSection: "§96",
    area: "Onboarding",
    state: "ALREADY_COMPLETE",
    evidence: ["tests/e2e/journey-1-first-run.spec.ts"],
    wave: "10",
    note: "A first-run journey test exists.",
  },
  {
    specSection: "§97",
    area: "Severity model",
    state: "ALREADY_COMPLETE",
    evidence: ["src/rules/rule.ts"],
    wave: "4",
    note: "severity × tier × evidence × qaImpact.",
  },
  {
    specSection: "§98",
    area: "Release proof gate",
    state: "ALREADY_COMPLETE",
    evidence: ["package.json"],
    wave: "14",
    note: "Most gates exist.",
  },
  {
    specSection: "§99",
    area: "Architecture freeze",
    state: "MISSING",
    evidence: [],
    wave: "14",
    note: "Definition only.",
  },
  {
    specSection: "§2.4.1",
    area: "QA Ecosystem Census",
    state: "MISSING",
    evidence: [],
    wave: "0",
    note: "Shipped in this wave: src/v6/ecosystem-census.ts + docs/ECOSYSTEM-CENSUS.json.",
  },
  {
    specSection: "Law 7",
    area: "E-HUMAN evidence class",
    state: "MISSING",
    evidence: ["src/v6/capability-types.ts"],
    wave: "8",
    note: "Class + ceiling declared; the contract is Wave 8/9.",
  },
  {
    specSection: "P1",
    area: "Independent verifier",
    state: "MISSING",
    evidence: [],
    wave: "11",
    note: "Sampled-subset re-derivation.",
  },
  {
    specSection: "P2",
    area: "Nondeterminism manifest",
    state: "MISSING",
    evidence: [],
    wave: "11",
    note: "No manifest exists, so the tool cannot state which of its own outputs are deterministic.",
  },
  {
    specSection: "P3",
    area: "Proof-carrying artifacts",
    state: "PARTIALLY_COMPLETE",
    evidence: ["candidate-trust-manifest.json"],
    wave: "11",
    note: "Unsigned.",
  },
  {
    specSection: "P4",
    area: "Claim budget / prose lint",
    state: "MISSING",
    evidence: [],
    wave: "0",
    note: "Shipped in this wave: scripts/v6/check-claims-prose.mjs + check-claim-budget.mjs.",
  },
  {
    specSection: "P5",
    area: "FP/FN delta gate",
    state: "MISSING",
    evidence: ["docs/FP-AUDIT.md"],
    wave: "4",
    note: "A document, not a release signal.",
  },
  {
    specSection: "P6",
    area: "Degradation ledger",
    state: "MISSING",
    evidence: [],
    wave: "4",
    note: "No ledger records what degrades, so a degraded run is indistinguishable from a clean one.",
  },
  {
    specSection: "U1",
    area: "Single Presentation Model",
    state: "PARTIALLY_COMPLETE",
    evidence: ["src/reporter/score-state.ts", "src/reporter/evidence-tag.ts"],
    wave: "10",
    note: "Two decision sites exist; the model does not.",
  },
  {
    specSection: "U4",
    area: "No naked numbers",
    state: "MISSING",
    evidence: ["src/reporter/evidence-tag.ts"],
    wave: "5",
    note: "4 coarse values, no maturity/n/interval.",
  },
  {
    specSection: "E6",
    area: "Parse-once fact store",
    state: "MISSING",
    evidence: ["src/types.ts"],
    wave: "11",
    note: "Rules re-parse.",
  },
  {
    specSection: "L4",
    area: "Threshold registry",
    state: "MISSING",
    evidence: ["src/reporter/score-state.ts"],
    wave: "4",
    note: "Documented 3× cross-surface drift, class not closed.",
  },
  {
    specSection: "R1",
    area: "Self-falsification suite",
    state: "MISSING",
    evidence: ["tests/fuzz", "tests/stress"],
    wave: "11",
    note: "Fuzz/stress exist; targeted self-harm does not.",
  },
  {
    specSection: "R2",
    area: "Golden-output corpus",
    state: "PARTIALLY_COMPLETE",
    evidence: ["tests/golden"],
    wave: "14",
    note: "Does not lock render + exit code + digest per scenario.",
  },
];

export interface VerifiedRequirement extends RequirementClassification {
  /** `evidence` paths that do not resolve in this checkout. */
  unverified: readonly string[];
}

/** Verify every cited path; a missing path is reported, never ignored. */
export function verifyRequirements(
  root = ROOT,
): readonly VerifiedRequirement[] {
  return REQUIREMENT_CLASSIFICATION.map((entry) => {
    const unverified = entry.evidence.filter(
      (path) => !existsSync(join(root, path)),
    );
    return { ...entry, unverified };
  });
}

// ─── Archive reconciliation ──────────────────────────────────────────

export interface ArchiveRecordReconciliation {
  logicalMilestone: string;
  githubRange: [number, number];
  designRecords: number;
  disposition: string;
  /** Issues in the range still open — why the record cannot reconcile. */
  openIssues: number[];
  state: "RECONCILED" | "PARTIALLY_RECONCILED" | "UNRECONCILED";
}

export interface ArchiveReconciliation {
  status: "RECONCILED" | "UNRECONCILED";
  expectedDesignRecordCount: number;
  observedDesignRecordCount: number;
  openIssuesInArchive: number[];
  records: readonly ArchiveRecordReconciliation[];
  /** What would close the block. */
  closureCommand: string;
}

/**
 * Reconcile the `archive` block of `docs/ROADMAP.yaml` against the
 * GitHub snapshot — deterministically, from data.
 *
 * The block declares `status: UNRECONCILED` for the M18–M25 historical
 * design records. The honest question is not "can this flag be flipped"
 * but "do the 108 issues in those ranges actually have a recorded
 * outcome". This function answers exactly that, and the answer is
 * currently **no**: 14 issues inside the historical ranges are still
 * open, so 7 of the 8 records can only be *partially* reconciled.
 *
 * That is recorded rather than papered over. Flipping the flag while 14
 * issues are open would be a false proof produced by the very
 * reconciliation meant to establish the truth.
 */
export function reconcileArchive(root = ROOT): ArchiveReconciliation {
  const roadmapText = readFileSync(join(root, "docs", "ROADMAP.yaml"), "utf8");
  const snapshot = JSON.parse(
    readFileSync(join(root, "docs", "M26-GITHUB-SNAPSHOT.json"), "utf8"),
  ) as {
    issues: Array<{
      number: number;
      state: string;
      state_reason: string | null;
    }>;
  };
  const byNumber = new Map(snapshot.issues.map((i) => [i.number, i]));

  const records: ArchiveRecordReconciliation[] = [];
  // The block is a flat list of `logicalMilestone` / `githubRange` pairs;
  // parse them positionally rather than pulling in a YAML dependency.
  const recordPattern =
    /- logicalMilestone:\s*"([^"]+)"\s*\n\s*githubRange:\s*\[(\d+),\s*(\d+)\]\s*\n\s*designRecords:\s*(\d+)\s*\n\s*disposition:\s*"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = recordPattern.exec(roadmapText)) !== null) {
    const [, milestone, fromRaw, toRaw, countRaw, disposition] = match;
    const from = Number(fromRaw);
    const to = Number(toRaw);
    const openIssues: number[] = [];
    for (let number = from; number <= to; number += 1) {
      const issue = byNumber.get(number);
      if (issue === undefined || issue.state !== "closed")
        openIssues.push(number);
    }
    records.push({
      logicalMilestone: milestone ?? "UNKNOWN",
      githubRange: [from, to],
      designRecords: Number(countRaw),
      disposition: disposition ?? "UNKNOWN",
      openIssues,
      state:
        openIssues.length === 0
          ? "RECONCILED"
          : openIssues.length === Number(countRaw)
            ? "UNRECONCILED"
            : "PARTIALLY_RECONCILED",
    });
  }

  const openIssuesInArchive = records.flatMap((record) => record.openIssues);
  return {
    status: openIssuesInArchive.length === 0 ? "RECONCILED" : "UNRECONCILED",
    expectedDesignRecordCount: 108,
    observedDesignRecordCount: records.reduce(
      (total, record) => total + record.designRecords,
      0,
    ),
    openIssuesInArchive,
    records,
    closureCommand: "npm run m26:github:sync",
  };
}

// ─── v6 gaps discovered by Wave 0 ────────────────────────────────────

/**
 * Gaps Wave 0 found that no existing ledger carried. Each is a real,
 * evidenced finding — not a task list. `severity` follows the M26
 * vocabulary so the two ledgers read as one.
 */
export const WAVE0_GAPS: readonly V6Gap[] = [
  {
    gap_id: "GAP-V6-001",
    severity: "high",
    status: "open",
    category: "vocabulary-collision",
    summary:
      "A third maturity ladder exists: FRAMEWORK_INVENTORY declares F0–F5 alongside the finding trust level L0–L5, and the v6 ladder is M0–M5. Three ladders for two axes is the collision Amendment A1 was written to prevent, and the blueprint only knew about L.",
    owner: "framework-inventory",
    targetWave: "1",
    maturityImpact: [
      "M3 for every framework capability is unstateable until F is mapped or migrated",
    ],
    revalidationCommand: "npx tsx scripts/v6/check-ecosystem.ts census",
    revisitTrigger: "ADR 0001 amendment: F0–F5 is mapped to M0–M5 or removed",
    closureEvidence: null,
  },
  {
    gap_id: "GAP-V6-002",
    severity: "high",
    status: "open",
    category: "vocabulary-collision",
    summary:
      "Three overlapping 'how well do we support this' vocabularies coexist: census states (SUPPORTED/TARGET/DEPRECATED/NOT_APPLICABLE/UNRECOGNIZED), framework supportStatus (OFFICIAL_FULL/OFFICIAL_PARTIAL/EXPERIMENTAL/DISCOVERED/UNSUPPORTED/DEGRADED/DEPRECATED), and rule status (MEASURED-CORE/MEASURED-EXTENDED/MEASURED-QUARANTINE/UNMEASURED).",
    owner: "ecosystem-census",
    targetWave: "1",
    maturityImpact: [
      "no capability can advertise a single support level until one vocabulary is authoritative",
    ],
    revalidationCommand: "npx tsx scripts/v6/check-ecosystem.ts census",
    revisitTrigger:
      "ADR 0007 names the census state as the single support vocabulary",
    closureEvidence: null,
  },
  {
    gap_id: "GAP-V6-003",
    severity: "high",
    status: "open",
    category: "ecosystem-staleness",
    summary:
      "The framework inventory's validated versions no longer cover what the corpus uses: the cypress adapter is validated against 13 while a corpus repository uses 16, and the vitest adapter against 1.6/2.0/2.1 while corpus repositories use 3.2.4, 3.2.6, 4.x and 5.0.0. Found by the census staleness trigger on its first run.",
    owner: "ecosystem-census",
    targetWave: "4",
    maturityImpact: [
      "cypress and vitest are demoted SUPPORTED → TARGET by the census",
    ],
    revalidationCommand: "npx tsx scripts/v6/ecosystem-census.ts",
    revisitTrigger:
      "both entries re-validated against the observed majors with a fixture quad",
    closureEvidence: null,
  },
  {
    gap_id: "GAP-V6-004",
    severity: "medium",
    status: "open",
    category: "proof-infrastructure",
    summary:
      "No machine gate verifies a positive/negative/boundary/adversarial fixture quad per capability, so no framework or adapter can be promoted past M2. M3 is currently unreachable for every ecosystem entry.",
    owner: "rules-quality",
    targetWave: "4",
    maturityImpact: [
      "census: 0 entries above M2",
      "capability: M3 unattainable for all frameworks and adapters",
    ],
    revalidationCommand: "npx tsx scripts/v6/check-ecosystem.ts census",
    revisitTrigger:
      "rules:quality:check ships a per-capability fixture-quad gate",
    closureEvidence: null,
  },
  {
    gap_id: "GAP-V6-005",
    severity: "medium",
    status: "open",
    category: "roadmap-reconciliation",
    summary:
      "The ROADMAP.yaml archive block cannot honestly reconcile: 14 of the 108 historical design-record issues (539–646) are still open, so 7 of 8 records are only partially reconciled and the block status must stay UNRECONCILED.",
    owner: "roadmap",
    targetWave: "0",
    maturityImpact: [
      "migration model proof (§1.4) cannot claim the archive is reconciled",
    ],
    revalidationCommand: "npx tsx scripts/v6/reconcile-archive.ts --check",
    revisitTrigger:
      "all 108 archive-range issues are closed in the GitHub snapshot",
    closureEvidence: null,
  },
  {
    gap_id: "GAP-V6-006",
    severity: "medium",
    status: "open",
    category: "claim-integrity",
    summary:
      "Four claims are registered in docs/claim-registry.json and all four are proof.status BLOCKED because candidate-trust-manifest.json carries candidateSha: null. No public claim currently has bound proof, so §94's de-metrics is enforced by nothing.",
    owner: "claim-registry",
    targetWave: "1",
    maturityImpact: ["P4 claim:budget: every public claim is unbound"],
    revalidationCommand:
      "node scripts/check-claim-registry.mjs && node scripts/v6/check-claim-budget.mjs",
    revisitTrigger: "a candidate SHA is bound in the trust manifest",
    closureEvidence: null,
  },
  {
    gap_id: "GAP-V6-007",
    severity: "low",
    status: "open",
    category: "documentation-drift",
    summary:
      "PRODUCT-ENHANCEMENT-ANALYSIS.md (637 lines, repo root) self-reports all Wave 1/2/3 features as shipped and is referenced by no ledger, schema, script or CI gate, while the analysis that would verify it is itself deferred. A second, ungated source of truth.",
    owner: "docs",
    targetWave: "0",
    maturityImpact: [
      "claims:prose scope; a reader cannot tell it from an authority",
    ],
    revalidationCommand: "node scripts/v6/check-claims-prose.mjs",
    revisitTrigger:
      "the file is marked DEFERRED in its own header and excluded from claim lint",
    closureEvidence: null,
  },
  {
    gap_id: "GAP-V6-008",
    severity: "low",
    status: "open",
    category: "stale-audit",
    summary:
      "QA/FINAL-RELEASE/ is a 10-file Cycle-0 audit pinned to RC 151186b (tag v0.5.18, 2026-09-07) and gated by nothing. Its verdict is NOT RELEASE READY for a 1.0.0 cut that no longer exists, and its findings F1–F4 are still open.",
    owner: "docs",
    targetWave: "0",
    maturityImpact: ["nothing; it is history, but an ungated one"],
    revalidationCommand: "npx tsx scripts/v6/reconcile-archive.ts --check",
    revisitTrigger:
      "the directory carries a SUPERSEDED marker naming the current release line",
    closureEvidence: null,
  },
];
