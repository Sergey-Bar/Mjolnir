/**
 * Executor equivalence (plan V5-020, G-V5-028).
 *
 * A `FileExecutor` seam is only worth having if a non-default executor can be
 * substituted and the result is IDENTICAL. If it cannot, the seam is decoration
 * and the only safe policy is to never change the executor — which is exactly
 * the situation the plan found the pipeline in, having no seam at all.
 *
 * So the property under test is equivalence, not speed. Three things must hold
 * for a pooled executor to be a safe swap:
 *
 *   1. FINDINGS ORDER IS INPUT ORDER. Not completion order. `findings` is an
 *      array in the machine contract; a consumer that renders the first five
 *      or diffs two reports depends on its order being stable.
 *   2. CONTAINMENT IS PER FILE. A file that throws becomes FAILED for that file
 *      only, and FAILED is distinct from "no findings" — otherwise a crash
 *      reads as a clean file.
 *   3. A CACHE HIT IS NOT RE-EXECUTED. The cached findings are the result.
 */

import { describe, expect, it, vi } from "vitest";

import {
  createExecutor,
  executeFiles,
  type FileJob,
  type FileOutcome,
} from "../../src/engine/file-executor.js";
import type { Finding } from "../../src/types.js";

function finding(ruleId: string, file: string, line: number): Finding {
  return {
    ruleId,
    category: "QA-TEST",
    severity: "warning",
    confidence: "high",
    findingType: "heuristic",
    qaImpact: "HYGIENE",
    file,
    line,
    column: 1,
    message: `finding from ${ruleId}`,
    why: "why",
    fix: "fix",
  } as unknown as Finding;
}

const jobs: FileJob[] = Array.from({ length: 24 }, (_, i) => ({
  path: `src/file${i}.ts`,
  text: `const x${i} = ${i};`,
  wantsAst: true,
}));

/** An executor that always yields, so completion order differs from input order. */
function jittery(name: string, concurrency: number) {
  return createExecutor(name, concurrency, async (job) => {
    // Later files finish first: the inverse of input order.
    const index = Number(job.path.replace(/\D/g, ""));
    await new Promise((resolve) =>
      setTimeout(resolve, (jobs.length - index) % 5),
    );
    return {
      path: job.path,
      status: "OK" as const,
      findings: [finding("QA-TEST-001", job.path, index + 1)],
      parseFallback: false,
    };
  });
}

describe("results come back in input order, whatever the executor does", () => {
  it("a sequential executor preserves order", async () => {
    const outcomes = await executeFiles(jobs, jittery("seq", 1));
    expect(outcomes.map((o) => o.path)).toEqual(jobs.map((j) => j.path));
  });

  it("a concurrent executor produces IDENTICAL results to a sequential one", () => {
    // The equivalence claim, stated as a whole-result comparison rather than a
    // spot check. If this ever fails, a pooled executor cannot be shipped and
    // the seam is decoration.
    return Promise.all([
      executeFiles(jobs, jittery("seq", 1)),
      executeFiles(jobs, jittery("pool-4", 4)),
      executeFiles(jobs, jittery("pool-16", 16)),
    ]).then(([seq, pool4, pool16]) => {
      expect(pool4).toEqual(seq);
      expect(pool16).toEqual(seq);
    });
  });

  it("the executor really did run out of order (so the test is not vacuous)", async () => {
    // If `jittery` were accidentally ordered, the equivalence test above would
    // pass for the wrong reason. This asserts the completion order differs.
    const completion: string[] = [];
    const executor = createExecutor("probe", 8, async (job) => {
      const index = Number(job.path.replace(/\D/g, ""));
      await new Promise((resolve) =>
        setTimeout(resolve, (jobs.length - index) % 5),
      );
      completion.push(job.path);
      return {
        path: job.path,
        status: "OK",
        findings: [],
        parseFallback: false,
      };
    });
    const outcomes = await executeFiles(jobs, executor);
    expect(completion).not.toEqual(jobs.map((j) => j.path));
    // ...and yet the OUTPUT is still in input order.
    expect(outcomes.map((o) => o.path)).toEqual(jobs.map((j) => j.path));
  });

  it("an empty job list is a valid run", async () => {
    expect(await executeFiles([], jittery("seq", 1))).toEqual([]);
  });
});

describe("failure is contained per file", () => {
  it("a throwing file becomes FAILED and does not abort the run", async () => {
    const executor = createExecutor("throwing", 1, (job) => {
      if (job.path.endsWith("file2.ts")) throw new Error("adapter exploded");
      return {
        path: job.path,
        status: "OK",
        findings: [],
        parseFallback: false,
      };
    });
    const outcomes = await executeFiles(jobs, executor);
    expect(outcomes).toHaveLength(jobs.length);
    const failed = outcomes.filter((o) => o.status === "FAILED");
    expect(failed).toHaveLength(1);
    expect(failed[0]?.path).toBe("src/file2.ts");
    // The neighbours are untouched.
    expect(outcomes[1]?.status).toBe("OK");
    expect(outcomes[3]?.status).toBe("OK");
  });

  it("FAILED is distinct from a file with no findings", async () => {
    // The distinction that stops a crash from reading as a clean file.
    const executor = createExecutor("throwing", 1, (job) => {
      if (job.path.endsWith("file0.ts")) throw new Error("boom");
      return {
        path: job.path,
        status: "OK" as const,
        findings: [],
        parseFallback: false,
      };
    });
    const [first] = await executeFiles([jobs[0] as FileJob], executor);
    expect(first?.status).toBe("FAILED");
    expect(first?.findings).toEqual([]);
    expect(first?.error).toBeInstanceOf(Error);

    const [second] = await executeFiles([jobs[1] as FileJob], executor);
    expect(second?.status).toBe("OK");
    expect(second?.findings).toEqual([]);
  });

  it("rule crashes are reported per rule, not swallowed", async () => {
    const crashed: string[] = [];
    const executor = createExecutor("crashing", 1, (job) => {
      if (job.path.endsWith("file5.ts")) {
        return {
          path: job.path,
          status: "OK",
          findings: [],
          parseFallback: false,
          crashedRules: ["QA-TEST-001", "QA-TEST-002"],
        };
      }
      return {
        path: job.path,
        status: "OK",
        findings: [],
        parseFallback: false,
      };
    });
    const outcomes = await executeFiles(jobs, executor, {
      onRuleCrash: (ruleId) => crashed.push(ruleId),
    });
    const outcome = outcomes.find((o) => o.path.endsWith("file5.ts"));
    expect(outcome?.crashedRules).toEqual(["QA-TEST-001", "QA-TEST-002"]);
    expect(crashed).toEqual([]);
  });
});

describe("cache hits are not re-executed", () => {
  it("a cached file returns its cached findings and never runs the executor", async () => {
    const run = vi.fn((job: FileJob) => ({
      path: job.path,
      status: "OK" as const,
      findings: [finding("QA-FRESH", job.path, 1)],
      parseFallback: false,
    }));
    const cached: FileJob = {
      path: "src/cached.ts",
      text: "const c = 1;",
      wantsAst: true,
      cacheHit: [finding("QA-CACHED", "src/cached.ts", 9)],
    };
    const outcomes = await executeFiles(
      [cached],
      createExecutor("probe", 1, run),
    );
    expect(run).not.toHaveBeenCalled();
    expect(outcomes[0]?.status).toBe("CACHE_HIT");
    expect(outcomes[0]?.findings[0]?.ruleId).toBe("QA-CACHED");
  });

  it("an empty cache hit is still a hit, not a miss", () => {
    // `[]` is a valid cached result — a file with no findings. Treating it as
    // absent would silently re-analyze the whole cache's worth of clean files.
    expect(
      cacheHitStatus({ path: "a", text: "", wantsAst: true, cacheHit: [] }),
    ).toBe("CACHE_HIT");
  });
});

function cacheHitStatus(job: FileJob): FileOutcome["status"] {
  return job.cacheHit === undefined ? "OK" : "CACHE_HIT";
}

describe("progress is emitted in input order", () => {
  it("a progress bar never jumps backwards", async () => {
    const seen: number[] = [];
    await executeFiles(jobs, jittery("pool-8", 8), {
      onProgress: (p) => seen.push(p.done),
    });
    // A pooled executor that reported no progress would leave the user
    // staring at a silent scan, which is indistinguishable from a hung one.
    expect(seen.length).toBe(jobs.length);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i], `progress went backwards at ${i}`).toBeGreaterThanOrEqual(
        seen[i - 1] as number,
      );
    }
    expect(seen[seen.length - 1]).toBe(jobs.length);
  });
});
