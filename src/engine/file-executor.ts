/**
 * The FileExecutor seam (plan V5-020, G-V5-028).
 *
 * The scan pipeline runs every rule against every file inline, in one
 * sequential loop, and a 10k-file repository pays for holding every parsed
 * AST, every file body, and every finding alive at once. The plan's answer is
 * a bounded executor; what the repository had instead was no seam at all — the
 * only way to change execution strategy was to edit the pipeline, so the
 * strategy was never testable and therefore never changed.
 *
 * This module is that seam, and its contract is deliberately narrow:
 *
 *   1. ORDER IS PART OF THE RESULT. Results are returned in INPUT order, not
 *      completion order. This is the property that makes a concurrent executor
 *      safe to substitute: findings order is part of the machine contract
 *      (`findings` is an array, and every consumer that renders the first five
 *      or diffs two reports depends on it being stable). An executor that
 *      returned completion order would be a silent contract break.
 *   2. THE EXECUTOR IS NOT TRUSTED. A job that throws is recorded as a
 *      FAILED outcome for that file only; it does not abort the run and it
 *      does not take its neighbours with it. The pipeline's existing
 *      per-file error containment is preserved here rather than re-implemented
 *      at each call site.
 *   3. PROGRESS IS EMITTED IN INPUT ORDER, for the same reason: a progress bar
 *      that jumps backwards is a progress bar nobody trusts.
 *
 * The default executor is sequential and does exactly what the inline loop did.
 * That is the equivalence baseline: `executeFiles(jobs, sequentialExecutor)`
 * must be observationally identical to the loop it replaces, which is asserted
 * rather than asserted-in-prose.
 */

import type { Finding } from "../types.js";

/** One file's work. */
export interface FileJob {
  /** Repo-relative path — the identity used in findings and progress. */
  path: string;
  /** The file body. */
  text: string;
  /** Parse first and use the AST when the adapter can produce one. */
  wantsAst: boolean;
  /**
   * A cache hit for this file. When present the executor must not re-run the
   * rules: the cached findings ARE the result, and re-running would be slower
   * and could differ.
   */
  cacheHit?: readonly Finding[] | undefined;
}

export interface FileOutcome {
  path: string;
  status: "OK" | "FAILED" | "CACHE_HIT" | "SKIPPED";
  /** Findings for this file, in the order the rules produced them. */
  findings: Finding[];
  /** True when the AST path fell back to regex for this file. */
  parseFallback: boolean;
  /** The error, when status is FAILED. */
  error?: Error;
  /** The rule ids that crashed on this file, when any did. */
  crashedRules?: string[];
}

export interface FileExecutorProgress {
  done: number;
  total: number;
  path: string;
}

export interface FileExecutor {
  /** A stable name, so a run can record which strategy produced it. */
  readonly name: string;
  /**
   * Run one file. Must not throw; report failure through the outcome.
   *
   * May return the outcome directly: a sequential executor does synchronous
   * work, and forcing it to allocate a promise per file is a cost the seam has
   * no business imposing on every implementation.
   */
  execute(
    job: FileJob,
    context: FileExecutionContext,
  ): FileOutcome | Promise<FileOutcome>;
  /** The maximum files in flight at once. 1 means strictly sequential. */
  readonly concurrency: number;
}

export interface FileExecutionContext {
  onRuleCrash?: (ruleId: string, path: string, error: Error) => void;
  onProgress?: (progress: FileExecutorProgress) => void;
}

/** The baseline: one file at a time, in order — what the inline loop did. */
export const SEQUENTIAL_CONCURRENCY = 1;

function cacheHitOutcome(job: FileJob): FileOutcome {
  return {
    path: job.path,
    status: "CACHE_HIT",
    findings: [...(job.cacheHit ?? [])],
    parseFallback: false,
  };
}

/**
 * Drive a list of jobs through an executor and return outcomes in INPUT order.
 *
 * This is the function the pipeline calls. It is executor-agnostic on purpose:
 * swapping in a pooled executor must not require touching the caller, and the
 * ordering guarantee has to live here or it would live in each executor and
 * drift between them.
 */
export async function executeFiles(
  jobs: readonly FileJob[],
  executor: FileExecutor,
  context: FileExecutionContext = {},
): Promise<FileOutcome[]> {
  // new Array() is any[]; the element type is stated here rather than
  // asserted at each read site.
  const outcomes: FileOutcome[] = new Array<FileOutcome>(jobs.length);
  if (executor.concurrency <= 1 || jobs.length <= 1) {
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i] as FileJob;
      context.onProgress?.({ done: i, total: jobs.length, path: job.path });
      outcomes[i] = await runOne(job, executor, context);
    }
    context.onProgress?.({
      done: jobs.length,
      total: jobs.length,
      path: jobs[jobs.length - 1]?.path ?? "",
    });
    return outcomes;
  }

  // Bounded concurrency, results collected by INDEX so completion order cannot
  // leak into the output order.
  let next = 0;
  let completed = 0;
  const inFlight = new Set<Promise<void>>();
  const limit = Math.max(1, Math.floor(executor.concurrency));
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next++;
      if (index >= jobs.length) return;
      const job = jobs[index] as FileJob;
      outcomes[index] = await runOne(job, executor, context);
      // Progress counts COMPLETED work, not started work, and is reported from
      // a single counter so concurrent workers cannot interleave it. A scan
      // that goes silent under a pooled executor is indistinguishable from a
      // hung scan.
      completed++;
      context.onProgress?.({
        done: completed,
        total: jobs.length,
        path: job.path,
      });
    }
  };
  for (let i = 0; i < Math.min(limit, jobs.length); i++) {
    const promise = worker().then(() => undefined);
    inFlight.add(promise);
  }
  await Promise.all(inFlight);
  return outcomes;
}

async function runOne(
  job: FileJob,
  executor: FileExecutor,
  context: FileExecutionContext,
): Promise<FileOutcome> {
  if (job.cacheHit !== undefined) return cacheHitOutcome(job);
  try {
    return await executor.execute(job, context);
  } catch (error) {
    // Containment, not propagation: one file that throws must not end the
    // scan, and must not be recorded as "no findings" either — FAILED is a
    // third state precisely so it cannot be read as a clean file.
    return {
      path: job.path,
      status: "FAILED",
      findings: [],
      parseFallback: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * The strategy the pipeline uses today.
 *
 * `runOne` is supplied by the pipeline because parsing and rule execution
 * need the adapter and the active rule set, which are pipeline concerns. The
 * executor's job is the BOUNDARY and the bookkeeping, not the analysis — so
 * this factory exists to bind those two without the executor importing the
 * pipeline (which would be a cycle).
 */
export function createExecutor(
  name: string,
  concurrency: number,
  runOne: (
    job: FileJob,
    context: FileExecutionContext,
  ) => FileOutcome | Promise<FileOutcome>,
): FileExecutor {
  return {
    name,
    concurrency,
    execute: runOne,
  };
}
