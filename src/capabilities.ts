/**
 * Playwright Capability Matrix — the product-depth surface (growth
 * roadmap §12; remediation plan §9 R7 / WI-20).
 *
 * Rule counts are marketing; THIS table is the claim surface: 12
 * Playwright capabilities × 8 depth columns, every cell explicitly
 * classed (zero UNCLASSIFIED, plan §9 R7), every claim backed by a
 * resolvable evidence pointer — a registered rule ID or an in-repo
 * artifact path. `validateCapabilityMatrix()` is FAIL-CLOSED: the
 * generator refuses to render (and CI refuses the drift-lock) if any
 * "yes" cell names a pointer that does not resolve. Claims never exceed
 * proven capability.
 *
 * Agents column: every row is "no" until R8 ships the Agent Skill — said
 * plainly rather than implied by silence.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { getRule } from "./rules/index.js";

export const CAPABILITIES = [
  "selectors",
  "assertions-waits",
  "retries",
  "config-projects-isolation",
  "fixtures",
  "network-mocking",
  "auth-state",
  "artifacts-forensics",
  "flake-analysis",
  "a11y-visual",
  "browser-lifecycle",
  "runtime-correlation",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const DEPTH_COLUMNS = [
  "detect",
  "explain",
  "produceEvidence",
  "correlateRuntime",
  "trustVerdict",
  "cli",
  "mcp",
  "agents",
] as const;
export type DepthColumn = (typeof DEPTH_COLUMNS)[number];

export type CellState = "yes" | "no" | "unsupported";

/** A capability × column cell. "yes" REQUIRES ≥1 resolvable pointer. */
export interface MatrixCell {
  state: CellState;
  /** Rule IDs (QA-*) or repo-relative artifact paths. */
  evidence?: string[];
  /** Why for "no"/"unsupported" rows worth stating. */
  note?: string;
}

export interface CapabilityRow {
  capability: Capability;
  cols: Record<DepthColumn, MatrixCell>;
}

/** Column that is uniformly "no" until its shipping increment. */
const noAgents = (why = "Agent Skill ships with R8 (1.3.0)"): MatrixCell => ({
  state: "no",
  note: why,
});

const yes = (evidence: string[]): MatrixCell => ({
  state: "yes",
  evidence,
});

const no = (note?: string): MatrixCell => ({
  state: "no",
  ...(note !== undefined ? { note } : {}),
});

export const CAPABILITY_MATRIX: readonly CapabilityRow[] = [
  {
    capability: "selectors",
    cols: {
      detect: yes(["QA-PW-004", "src/playwright/selector-health.ts"]),
      explain: yes(["QA-PW-004"]),
      produceEvidence: yes(["playwright-json", "src/forensics/trace.ts"]),
      correlateRuntime: yes(["correlateSelectorHealth"]),
      trustVerdict: yes(["classifyForensicVerdict"]),
      cli: yes(["src/playwright/selector-health.ts"]),
      mcp: yes(["src/mcp/server.ts"]),
      agents: noAgents(),
    },
  },
  {
    capability: "assertions-waits",
    cols: {
      detect: yes([
        "QA-PW-002",
        "QA-JV-102",
        "QA-CS-102",
        "QA-JV-107",
        "QA-CS-107",
        "QA-PY-107",
      ]),
      explain: yes(["QA-PW-002", "QA-JV-102"]),
      produceEvidence: yes(["playwright-json"]),
      correlateRuntime: yes(["correlateSelectorHealth"]),
      trustVerdict: yes(["classifyForensicVerdict"]),
      cli: yes(["src/forensics/run.ts"]),
      mcp: yes(["src/mcp/server.ts"]),
      agents: noAgents(),
    },
  },
  {
    capability: "retries",
    cols: {
      detect: yes(["QA-JV-109", "QA-CS-109", "QA-CI-007"]),
      explain: yes(["QA-CI-007"]),
      produceEvidence: yes(["playwright-json"]),
      correlateRuntime: yes(["correlateSelectorHealth"]),
      trustVerdict: yes(["classifyForensicVerdict"]),
      cli: yes(["src/forensics/run.ts"]),
      mcp: yes(["src/mcp/server.ts"]),
      agents: noAgents(),
    },
  },
  {
    capability: "config-projects-isolation",
    cols: {
      detect: yes(["QA-CI-005", "QA-CS-104", "QA-JV-104"]),
      explain: yes(["QA-CI-005"]),
      produceEvidence: no("run reports do not carry project/config facts"),
      correlateRuntime: no(),
      trustVerdict: no(),
      cli: yes(["src/commands/trust-report.ts"]),
      mcp: yes(["src/mcp/server.ts"]),
      agents: noAgents(),
    },
  },
  {
    capability: "fixtures",
    cols: {
      detect: no("fixture-shape analysis is not a shipped detector"),
      explain: no(),
      produceEvidence: no(),
      correlateRuntime: no(),
      trustVerdict: no(),
      cli: no(),
      mcp: no(),
      agents: noAgents(),
    },
  },
  {
    capability: "network-mocking",
    cols: {
      detect: no(
        "no rule detects mock-config defects (network-idle rules cover waits, not mocks)",
      ),
      explain: no(),
      produceEvidence: yes(["src/forensics/trace.ts"]),
      correlateRuntime: no(),
      trustVerdict: yes(["classifyForensicVerdict"]),
      cli: yes(["src/forensics/run.ts"]),
      mcp: yes(["src/mcp/server.ts"]),
      agents: noAgents(),
    },
  },
  {
    capability: "auth-state",
    cols: {
      detect: no("no shipped detector for storage/auth-state reuse"),
      explain: no(),
      produceEvidence: no(),
      correlateRuntime: no(),
      trustVerdict: no(),
      cli: no(),
      mcp: no(),
      agents: noAgents(),
    },
  },
  {
    capability: "artifacts-forensics",
    cols: {
      detect: yes(["QA-PW-003"]),
      explain: yes(["QA-PW-003"]),
      produceEvidence: yes([
        "src/forensics/run.ts",
        "src/engine/evidence-core.ts",
      ]),
      correlateRuntime: yes(["correlateSelectorHealth"]),
      trustVerdict: yes(["classifyForensicVerdict"]),
      cli: yes(["src/forensics/run.ts"]),
      mcp: yes(["src/mcp/server.ts"]),
      agents: noAgents(),
    },
  },
  {
    capability: "flake-analysis",
    cols: {
      detect: yes(["src/forensics/analyze.ts"]),
      explain: yes(["src/forensics/classify.ts"]),
      produceEvidence: yes(["src/forensics/classify.ts"]),
      correlateRuntime: yes([
        "src/forensics/classify.ts",
        "correlateSelectorHealth",
      ]),
      trustVerdict: yes(["classifyForensicVerdict"]),
      cli: yes(["src/forensics/run.ts", "src/forensics/triage.ts"]),
      mcp: yes(["src/mcp/server.ts"]),
      agents: noAgents(),
    },
  },
  {
    capability: "a11y-visual",
    cols: {
      detect: no("no accessibility/snapshot-depth detectors shipped"),
      explain: no(),
      produceEvidence: no(),
      correlateRuntime: no(),
      trustVerdict: no(),
      cli: no(),
      mcp: no(),
      agents: noAgents(),
    },
  },
  {
    capability: "browser-lifecycle",
    cols: {
      detect: yes(["QA-CS-104", "QA-JV-104", "QA-PY-106"]),
      explain: yes(["QA-CS-104"]),
      produceEvidence: no(),
      correlateRuntime: no(),
      trustVerdict: no(),
      cli: yes(["src/forensics/run.ts"]),
      mcp: yes(["src/mcp/server.ts"]),
      agents: noAgents(),
    },
  },
  {
    capability: "runtime-correlation",
    cols: {
      detect: no("correlation is the analysis surface, not a detector"),
      explain: no(),
      produceEvidence: yes(["src/engine/evidence-core.ts"]),
      correlateRuntime: yes([
        "src/engine/runtime-corroboration.ts",
        "correlateSelectorHealth",
      ]),
      trustVerdict: yes(["src/commands/release-trust.ts"]),
      cli: yes(["src/commands/verify.ts"]),
      mcp: yes(["src/mcp/server.ts"]),
      agents: noAgents(),
    },
  },
];

/**
 * Pointer resolution rules (fail-closed): `QA-*` ids must be registered
 * live rules; bare paths must exist in the repo; bare symbol names must
 * resolve inside a module that exists in the compiled surface (checked as
 * substrings of their known homes). Anything unresolvable is an ERROR —
 * a claim is never rendered on a dangling pointer.
 */
export interface PointerValidation {
  ok: boolean;
  failures: string[];
}

const SYMBOL_HOMES: Record<string, string> = {
  correlateSelectorHealth: "src/playwright/selector-health.ts",
  classifyForensicVerdict: "src/forensics/classify.ts",
  parseTraceArtifact: "src/forensics/trace.ts",
  "playwright-json": "src/forensics/parse-playwright-json.ts",
};

export function resolvePointer(pointer: string, root: string): boolean {
  if (/^QA-[A-Z]+-\d{3}$/.test(pointer)) {
    return getRule(pointer) !== undefined;
  }
  const rel = symbolHome(pointer);
  return existsSync(join(root, rel ?? pointer));
}

export function symbolHome(pointer: string): string | undefined {
  return SYMBOL_HOMES[pointer];
}

/** Validate the whole matrix against a repo root (the real filesystem). */
export function validateCapabilityMatrix(root: string): PointerValidation {
  const failures: string[] = [];
  for (const row of CAPABILITY_MATRIX) {
    for (const col of DEPTH_COLUMNS) {
      const cell = row.cols[col];
      // Every cell is classed by construction (CellState is a closed set);
      // the law under test is the POINTER side: "yes" ⇒ resolvable proof.
      if (cell.state === "yes") {
        if (cell.evidence === undefined || cell.evidence.length === 0) {
          failures.push(
            `${row.capability}.${col}: "yes" with no evidence pointer`,
          );
          continue;
        }
        for (const p of cell.evidence) {
          if (!resolvePointer(p, root)) {
            failures.push(
              `${row.capability}.${col}: unresolvable pointer "${p}"`,
            );
          }
        }
      }
    }
  }
  return { ok: failures.length === 0, failures };
}
