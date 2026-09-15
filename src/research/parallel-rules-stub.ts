/**
 * Parallel Rule Execution Stub (RES-002).
 *
 * CONDITIONAL GATE: Gated on profiling evidence.
 * Parallel rule execution research for scaling scan performance
 * across multi-core systems. Begins when profiling evidence from
 * the benchmark harness (ECO-010) demonstrates clear sequential
 * bottleneck in the rule loop.
 *
 * This placeholder documents the planned research direction.
 * Key concerns:
 * - Thread-safe finding collection
 * - Rule isolation (no shared mutable state)
 * - Worker pool sizing vs. memory pressure
 * - Ordered output from unordered execution
 */

export interface ParallelRulesGateStatus {
  readonly featureId: "RES-002";
  readonly gate: "profiling-evidence";
  readonly description: string;
  readonly met: boolean;
}

export const PARALLEL_RULES_GATE: ParallelRulesGateStatus = {
  featureId: "RES-002",
  gate: "profiling-evidence",
  description:
    "Parallel Rule Execution gated on profiling evidence. Requires benchmark data showing rule loop as a clear sequential bottleneck.",
  met: false,
};

export interface ParallelExecutionStub {
  /** Execute rules in parallel across worker threads. */
  executeParallel(
    rules: ParallelRuleSpec[],
    files: ParallelFileSpec[],
    workerCount: number,
  ): Promise<ParallelResult>;
}

export interface ParallelRuleSpec {
  id: string;
  run: (context: unknown) => unknown[];
}

export interface ParallelFileSpec {
  path: string;
  text: string;
}

export interface ParallelResult {
  findings: unknown[];
  executionTimeMs: number;
  workerCount: number;
}
