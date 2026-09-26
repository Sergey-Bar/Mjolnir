/**
 * Tool coverage — the block a user actually reads.
 *
 * **The question it answers.** Someone runs Mjölnir on a repository that
 * uses `pytest-mock`, `@axe-core/playwright` and `jest-junit`. Three
 * questions follow, and today all three are answered by silence:
 *
 *  1. *Did you see my tooling?* — the engine parses those files, so it
 *     should say so.
 *  2. *What can you do about it?* — almost nothing, and saying so is the
 *     difference between a tool and a rubber stamp.
 *  3. *What are you blind to?* — the part nobody can see is the part that
 *     matters: a mocked assertion, an accessibility gap, a coverage
 *     number treated as proof.
 *
 * **Why this is not more governance.** Every input already exists. The
 * discovery probe (Wave 0) finds the tools; the census (Wave 0) says
 * which ones the engine has entries for; the neutral model (Wave 2) says
 * what an assertion actually proves. This module only *joins* them into
 * one reportable block. No new probe, no new registry, no new gate
 * concept — and the census gap list shrinks by 15 real entries because
 * `NOT_QA_TOOLING` stops Sentry and Octokit from being reported as gaps.
 *
 * **The honesty rule.** A tool the engine cannot act on is reported with
 * what that costs, never omitted. An omitted blind spot is a tool that
 * looks like it has no blind spots, which is the only claim a QA
 * verification tool must never make.
 */

import {
  buildCensus,
  classifyIgnoredTooling,
  classifyName,
  classifyNotQaTooling,
  type Census,
} from "./ecosystem-census.js";
import type { DiscoveryObservation } from "./ecosystem-census.js";
import {
  assessDoubleRisk,
  assessSuite,
  type DoubleFinding,
} from "./test-doubles.js";
import type { NeutralTest } from "./qa-ir.js";

/** What the engine can do with a detected tool. Closed enum, so a
 *  renderer cannot invent a fifth state. */
export const TOOL_COVERAGE_STATES = [
  /** A census entry exists and an adapter handles it. */
  "UNDERSTOOD",
  /** A QA tool by name with no census entry yet: declared, not handled. */
  "DECLARED",
  /** Not QA tooling. Observed, reported, and not a gap. */
  "OUT_OF_SCOPE",
  /** An ordinary application dependency. Not reported at all. */
  "IGNORED",
] as const;

export type ToolCoverageState = (typeof TOOL_COVERAGE_STATES)[number];

export interface ToolCoverageEntry {
  name: string;
  state: ToolCoverageState;
  /** The census category, when one applies. */
  category: string | null;
  /** The census entry id, when the engine has one. */
  censusId: string | null;
  /** What the cost of not handling it is, in one sentence. */
  consequence: string;
}

export interface BlindSpot {
  id: string;
  /** What the engine cannot see. */
  blindTo: string;
  /** Why it matters, in one sentence. */
  consequence: string;
}

export interface ToolCoverage {
  /** Every QA tool the probe saw, with what the engine does about it. */
  tools: readonly ToolCoverageEntry[];
  counts: Readonly<Record<ToolCoverageState, number>>;
  /** Tools the engine sees and cannot act on. */
  unhandled: readonly ToolCoverageEntry[];
  /**
   * What the engine cannot see **through**, whether or not the tool is
   * known. This is the part a user cannot infer, and the part that makes
   * a green run mean something.
   */
  blindSpots: readonly BlindSpot[];
  /** The double-analysis roll-up, when the caller supplied test data. */
  suite: ReturnType<typeof assessSuite> | null;
  /** One line a surface may render verbatim. */
  statement: string;
  /** Never a claim of completeness. */
  complete: false;
}

/** Consequence text per state. A tool reported without a cost is a list. */
const CONSEQUENCES: Readonly<Record<ToolCoverageState, string>> = {
  UNDERSTOOD: "analysed by an adapter; findings are evidence about this code",
  DECLARED:
    "detected but not analysed, so anything wrong here is outside this scan",
  OUT_OF_SCOPE:
    "not a test-quality tool, so it says nothing about whether your tests prove anything",
  IGNORED: "an ordinary dependency; not reported",
};

/**
 * The blind spots, stated as facts about the engine rather than as
 * features of the repository.
 *
 * Each is `M2` or worse by construction, which is why they are listed
 * unconditionally: a blind spot that appears only once the tool is
 * present is a blind spot nobody looks for.
 */
export const BLIND_SPOTS: readonly BlindSpot[] = [
  {
    id: "mocked-assertions",
    blindTo: "an assertion whose only subject is a test double",
    consequence:
      "a test that only checks its own mock passes while the code is broken; that is a false proof, not a weak test",
  },
  {
    id: "accessibility-behaviour",
    blindTo: "whether an accessibility scanner's result is real",
    consequence:
      "a11y tooling is detected but its findings are not adjudicated, so a pass is not a statement about accessibility",
  },
  {
    id: "coverage-as-proof",
    blindTo: "what a coverage number does not cover",
    consequence:
      "coverage is evidence, not truth (§42); a high number says nothing about whether the assertions are real",
  },
  {
    id: "field-proof",
    blindTo: "behaviour outside a repository checkout",
    consequence:
      "no claim here is field-proven; M5 is unreachable without external evidence this scan cannot reach",
  },
];

/** The consequence text for a state. A tool reported without a cost is a list. */
function consequenceFor(state: ToolCoverageState): string {
  return CONSEQUENCES[state];
}

/** Assemble the block from probe observations and, optionally, test data. */
export function assessToolCoverage(
  observations: readonly DiscoveryObservation[],
  options: { census?: Census; doubles?: readonly DoubleFinding[] } = {},
): ToolCoverage {
  const census = options.census ?? buildCensus();
  const seen = new Set<string>();
  const tools: ToolCoverageEntry[] = [];
  for (const observation of observations) {
    if (seen.has(observation.name)) continue;
    seen.add(observation.name);
    const state = stateFor(observation, census);
    if (state === "IGNORED") continue;
    tools.push({
      name: observation.name,
      state,
      category: observation.censusId === null ? null : observation.category,
      censusId: observation.censusId,
      consequence: consequenceFor(state),
    });
  }
  tools.sort(
    (a, b) =>
      TOOL_COVERAGE_STATES.indexOf(a.state) -
        TOOL_COVERAGE_STATES.indexOf(b.state) || a.name.localeCompare(b.name),
  );

  const counts = {
    UNDERSTOOD: 0,
    DECLARED: 0,
    OUT_OF_SCOPE: 0,
    IGNORED: 0,
  } as Record<ToolCoverageState, number>;
  for (const tool of tools) counts[tool.state] += 1;

  const unhandled = tools.filter((tool) => tool.state === "DECLARED");
  const suite =
    options.doubles === undefined ? null : assessSuite(options.doubles);

  return {
    tools,
    counts,
    unhandled,
    blindSpots: BLIND_SPOTS,
    suite,
    statement: statementFor(counts, unhandled.length),
    complete: false,
  };
}

function stateFor(
  observation: DiscoveryObservation,
  census: Census,
): ToolCoverageState {
  if (observation.censusId !== null) {
    return census.entries.some((entry) => entry.id === observation.censusId)
      ? "UNDERSTOOD"
      : "DECLARED";
  }
  // The exemption is checked first, for the same reason the census does it
  // first: `np.observability` matches `@sentry/*`, so a pattern-first order
  // reports an error tracker as an unanalysed QA tool.
  //
  // And the "obviously not QA" tier is checked before both, because a
  // report that opens with `react` buries the four real findings.
  if (classifyIgnoredTooling(observation.name) !== null) return "IGNORED";
  if (classifyNotQaTooling(observation.name) !== null) return "OUT_OF_SCOPE";
  if (classifyName(observation.name) !== null) return "DECLARED";
  return "IGNORED";
}

function statementFor(
  counts: Readonly<Record<ToolCoverageState, number>>,
  unhandled: number,
): string {
  const understood = counts.UNDERSTOOD;
  if (understood === 0 && unhandled === 0) {
    return "no QA tooling was detected, so nothing here was analysed";
  }
  const parts: string[] = [];
  if (understood > 0) parts.push(`${understood} analysed`);
  if (unhandled > 0) {
    parts.push(`${unhandled} detected but not analysed`);
  }
  return `${parts.join(", ")}; ${BLIND_SPOTS.length} standing blind spots`;
}

/**
 * Turn normalized tests into double findings. Kept here so a caller that
 * already has neutral tests does not have to import two modules to
 * produce one report.
 */
export function doublesFromTests(
  tests: readonly NeutralTest[],
): DoubleFinding[] {
  return tests.map((test) => assessDoubleRisk(test));
}
