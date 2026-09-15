/**
 * RTM-001 — Requirement Traceability Matrix.
 *
 * Canonical source of truth for all product requirements, their
 * backlog items, priorities, quarters, and dependency edges.
 * CI uses validateRtm() to assert structural invariants on every run.
 */

export type Priority = "P0" | "P1" | "P2";
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
export type Classification =
  | "ENGINE"
  | "CI"
  | "RULE"
  | "ECO"
  | "VERSION"
  | "IDENTITY"
  | "INVARIANT"
  | "GAP"
  | "SCORECARD"
  | "SUPPLY"
  | "INTEL"
  | "ANTI-GAME"
  | "HYGIENE"
  | "COMPAT"
  | "RTM"
  | "PRUX"
  | "GAP-REGISTRY";

export interface Requirement {
  id: string;
  description: string;
  backlogId: string;
  priority: Priority;
  quarter: Quarter;
  classification: Classification;
  dependencies: string[];
}

export const REQUIREMENT_MATRIX: Requirement[] = [
  {
    id: "R-001",
    description: "Trust benchmark",
    backlogId: "ENGINE-011",
    priority: "P0",
    quarter: "Q1",
    classification: "ENGINE",
    dependencies: [],
  },
  {
    id: "R-002",
    description: "Scoring validation",
    backlogId: "ENGINE-001",
    priority: "P0",
    quarter: "Q1",
    classification: "ENGINE",
    dependencies: ["ENGINE-011"],
  },
  {
    id: "R-003",
    description: "Error text extraction",
    backlogId: "ENGINE-012",
    priority: "P0",
    quarter: "Q1",
    classification: "ENGINE",
    dependencies: [],
  },
  {
    id: "R-004",
    description: "Forensics schema",
    backlogId: "CI-010",
    priority: "P0",
    quarter: "Q1",
    classification: "CI",
    dependencies: [],
  },
  {
    id: "R-005",
    description: "Rule metadata",
    backlogId: "ENGINE-008",
    priority: "P0",
    quarter: "Q1",
    classification: "ENGINE",
    dependencies: [],
  },
  {
    id: "R-006",
    description: "Config validation",
    backlogId: "ENGINE-007",
    priority: "P0",
    quarter: "Q1",
    classification: "ENGINE",
    dependencies: [],
  },
  {
    id: "R-007",
    description: "Provisional rules",
    backlogId: "RULE-MEASURE-001",
    priority: "P0",
    quarter: "Q1",
    classification: "RULE",
    dependencies: [],
  },
  {
    id: "R-008",
    description: "Version registry",
    backlogId: "VERSION-001",
    priority: "P0",
    quarter: "Q1",
    classification: "VERSION",
    dependencies: [],
  },
  {
    id: "R-009",
    description: "Run identity",
    backlogId: "IDENTITY-001",
    priority: "P0",
    quarter: "Q1",
    classification: "IDENTITY",
    dependencies: ["VERSION-001"],
  },
  {
    id: "R-010",
    description: "Invariant registry",
    backlogId: "INVARIANT-001",
    priority: "P0",
    quarter: "Q1",
    classification: "INVARIANT",
    dependencies: [],
  },
  {
    id: "R-011",
    description: "Framework inventory",
    backlogId: "GAP-001",
    priority: "P0",
    quarter: "Q1",
    classification: "GAP",
    dependencies: [],
  },
  {
    id: "R-012",
    description: "Scorecards",
    backlogId: "SCORECARD-001",
    priority: "P0",
    quarter: "Q1",
    classification: "SCORECARD",
    dependencies: ["GAP-001"],
  },
  {
    id: "R-013",
    description: "Release integrity",
    backlogId: "SUPPLY-003",
    priority: "P0",
    quarter: "Q1",
    classification: "SUPPLY",
    dependencies: [],
  },
  {
    id: "R-014",
    description: "Semantic model",
    backlogId: "INTEL-001",
    priority: "P1",
    quarter: "Q2",
    classification: "INTEL",
    dependencies: [],
  },
  {
    id: "R-015",
    description: "Correlation",
    backlogId: "INTEL-005",
    priority: "P1",
    quarter: "Q2",
    classification: "INTEL",
    dependencies: [],
  },
  {
    id: "R-016",
    description: "Evidence artifacts",
    backlogId: "CI-001",
    priority: "P1",
    quarter: "Q3",
    classification: "CI",
    dependencies: [],
  },
  {
    id: "R-017",
    description: "Runtime correlation",
    backlogId: "CI-002",
    priority: "P1",
    quarter: "Q3",
    classification: "CI",
    dependencies: [],
  },
  {
    id: "R-018",
    description: "Coverage ingestion",
    backlogId: "CI-007",
    priority: "P1",
    quarter: "Q3",
    classification: "CI",
    dependencies: [],
  },
  {
    id: "R-019",
    description: "GitLab CI",
    backlogId: "CI-008",
    priority: "P1",
    quarter: "Q3",
    classification: "CI",
    dependencies: [],
  },
  {
    id: "R-020",
    description: "Monorepo",
    backlogId: "ECO-003",
    priority: "P1",
    quarter: "Q4",
    classification: "ECO",
    dependencies: [],
  },
  {
    id: "R-021",
    description: "Incremental",
    backlogId: "ECO-004",
    priority: "P1",
    quarter: "Q4",
    classification: "ECO",
    dependencies: [],
  },
  {
    id: "R-022",
    description: "SARIF",
    backlogId: "ECO-008",
    priority: "P1",
    quarter: "Q4",
    classification: "ECO",
    dependencies: [],
  },
  {
    id: "R-023",
    description: "Dep graph",
    backlogId: "ECO-005",
    priority: "P1",
    quarter: "Q4",
    classification: "ECO",
    dependencies: [],
  },
  {
    id: "R-024",
    description: "Anti-gaming",
    backlogId: "ANTI-GAME-001",
    priority: "P0",
    quarter: "Q2",
    classification: "ANTI-GAME",
    dependencies: [],
  },
  {
    id: "R-025",
    description: "Suppression integrity",
    backlogId: "ENGINE-006",
    priority: "P0",
    quarter: "Q1",
    classification: "ENGINE",
    dependencies: [],
  },
  {
    id: "R-026",
    description: "Evidence hygiene",
    backlogId: "HYGIENE-001..004",
    priority: "P0",
    quarter: "Q1",
    classification: "HYGIENE",
    dependencies: [],
  },
  {
    id: "R-027",
    description: "Framework compat CI",
    backlogId: "COMPAT-001",
    priority: "P2",
    quarter: "Q2",
    classification: "COMPAT",
    dependencies: [],
  },
  {
    id: "R-028",
    description: "Gap registry",
    backlogId: "GAP-REGISTRY-001",
    priority: "P0",
    quarter: "Q1",
    classification: "GAP-REGISTRY",
    dependencies: [],
  },
  {
    id: "R-029",
    description: "RTM",
    backlogId: "RTM-001",
    priority: "P0",
    quarter: "Q1",
    classification: "RTM",
    dependencies: [],
  },
  {
    id: "R-030",
    description: "PR Comment contract",
    backlogId: "PRUX-001",
    priority: "P1",
    quarter: "Q2",
    classification: "PRUX",
    dependencies: [],
  },
  {
    id: "R-031",
    description: "PR Renderer",
    backlogId: "PRUX-002",
    priority: "P1",
    quarter: "Q2",
    classification: "PRUX",
    dependencies: [],
  },
  {
    id: "R-032",
    description: "PR Publisher",
    backlogId: "PRUX-003",
    priority: "P1",
    quarter: "Q3",
    classification: "PRUX",
    dependencies: [],
  },
  {
    id: "R-033",
    description: "PR Security",
    backlogId: "PRUX-007",
    priority: "P1",
    quarter: "Q3",
    classification: "PRUX",
    dependencies: [],
  },
  {
    id: "R-034",
    description: "PR Sanitization",
    backlogId: "PRUX-008",
    priority: "P1",
    quarter: "Q2",
    classification: "PRUX",
    dependencies: [],
  },
  {
    id: "R-035",
    description: "PR Concurrency Guard",
    backlogId: "PRUX-011",
    priority: "P1",
    quarter: "Q3",
    classification: "PRUX",
    dependencies: [],
  },
];

export interface RtmValidationResult {
  valid: boolean;
  errors: string[];
}

/** Get a requirement by its R-xxx id. */
export function getRequirementById(id: string): Requirement | undefined {
  return REQUIREMENT_MATRIX.find((r) => r.id === id);
}

/** Get all requirements for a given quarter. */
export function getRequirementsByQuarter(quarter: Quarter): Requirement[] {
  return REQUIREMENT_MATRIX.filter((r) => r.quarter === quarter);
}

/** Get all requirements for a given priority. */
export function getRequirementsByPriority(priority: Priority): Requirement[] {
  return REQUIREMENT_MATRIX.filter((r) => r.priority === priority);
}

/** Get all requirements for a given backlog item id. */
export function getRequirementsByBacklog(backlogId: string): Requirement[] {
  return REQUIREMENT_MATRIX.filter((r) => r.backlogId === backlogId);
}

/**
 * CI invariant: validate structural integrity of the RTM.
 *   1. No duplicate requirement ids.
 *   2. No duplicate backlog ids.
 *   3. All dependency references point to valid backlog ids in the matrix.
 *   4. Every requirement has a non-empty id, description, and backlogId.
 *   5. All ids follow R-NNN format.
 */
export function validateRtm(): RtmValidationResult {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenBacklogIds = new Set<string>();
  const allBacklogIds = new Set(REQUIREMENT_MATRIX.map((r) => r.backlogId));

  for (const r of REQUIREMENT_MATRIX) {
    if (!r.id || !r.description || !r.backlogId) {
      errors.push(
        `${r.id || "(missing id)"}: empty id, description, or backlogId`,
      );
    }

    if (!/^R-\d{3}$/.test(r.id)) {
      errors.push(`${r.id}: id does not match R-NNN format`);
    }

    if (seenIds.has(r.id)) {
      errors.push(`Duplicate requirement id: ${r.id}`);
    }
    seenIds.add(r.id);

    if (seenBacklogIds.has(r.backlogId)) {
      errors.push(`Duplicate backlog id: ${r.backlogId}`);
    }
    seenBacklogIds.add(r.backlogId);

    for (const dep of r.dependencies) {
      if (!allBacklogIds.has(dep)) {
        errors.push(
          `${r.id}: dependency ${dep} not found in matrix backlog ids`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
