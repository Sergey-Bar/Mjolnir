import { describe, expect, it, vi } from "vitest";
import {
  applyM39SimulationReport,
  createM39CopyOnWriteWorkspace,
  evaluateM39Simulation,
  hashM39Workspace,
  M39_FORBIDDEN_SIDE_EFFECTS,
  M39_SIMULATION_LIMITS,
  M39_SIMULATION_OUTCOMES,
  M39_SIMULATION_SCHEMA,
  M39_SIMULATION_TRUST_POLICY,
  replayM39Simulation,
  runM39Simulation,
  type CopyOnWriteWorkspaceManifest,
  type M39SimulationEvidence,
  type M39SimulationOperationResult,
  type SimulationExecution,
  type SimulationPlan,
} from "../../src/engine/m39-simulation-contract";

const HASH_A = `sha256:${"a".repeat(64)}`;
const HASH_B = `sha256:${"b".repeat(64)}`;
const CAPTURED_AT = "2026-01-01T00:00:00.000Z";
const EVALUATED_AT = "2026-01-01T00:00:01.000Z";

const candidate = {
  candidateId: "candidate-1",
  repositoryId: "repository-1",
  headSha: "head-1",
  graphDigest: "graph-1",
} as const;

const baseWorkspace = {
  schemaVersion: 1 as const,
  rootId: "workspace-1",
  files: [{ path: "src/app.ts", sha256: HASH_A, bytes: 12 }],
};

const manifest: CopyOnWriteWorkspaceManifest = {
  schemaVersion: 1,
  base: baseWorkspace,
  overlay: { upserts: [], deletes: [] },
};

const operation = {
  id: "remove-test-1",
  kind: "REMOVE_TEST" as const,
  path: "src/app.ts",
  testId: "test-1",
};

function makePlan(overrides: Partial<SimulationPlan> = {}): SimulationPlan {
  return {
    schemaVersion: 1,
    planId: "plan-1",
    candidate,
    workspace: manifest,
    operations: [operation],
    ...overrides,
  };
}

function completeExecution(
  overlay: SimulationExecution["overlay"] = {
    upserts: [],
    deletes: [],
  },
): SimulationExecution {
  return {
    status: "COMPLETE",
    durationMs: 2,
    outputBytes: 4,
    overlay,
    effects: [],
  };
}

function evidenceFor(
  plan: SimulationPlan,
  report: {
    readonly planHash: string | null;
    readonly beforeHash: string | null;
    readonly afterHash: string | null;
    readonly operations: readonly M39SimulationOperationResult[];
  },
  overrides: Partial<M39SimulationEvidence> = {},
): M39SimulationEvidence {
  const durationMs = report.operations.reduce(
    (sum, item) => sum + item.durationMs,
    0,
  );
  const outputBytes = report.operations.reduce(
    (sum, item) => sum + item.outputBytes,
    0,
  );
  return {
    schemaVersion: M39_SIMULATION_SCHEMA,
    id: "evidence-1",
    planId: plan.planId,
    planHash: report.planHash ?? "",
    candidate: plan.candidate,
    capturedAt: CAPTURED_AT,
    beforeHash: report.beforeHash ?? "",
    afterHash: report.afterHash ?? "",
    completeness: "COMPLETE",
    execution: "COMPLETE",
    operationIds: report.operations.map((item) => item.operationId ?? ""),
    observations: report.operations,
    durationMs,
    outputBytes,
    effects: [],
    ...overrides,
  };
}

describe("M39 side-effect-free simulation contract", () => {
  it("defines bounded outcomes, forbidden effects, and no trust promotion", () => {
    expect(M39_SIMULATION_OUTCOMES).toEqual([
      "UNKNOWN",
      "PARTIAL",
      "INCONCLUSIVE",
      "REPRODUCIBLE",
    ]);
    expect(Object.isFrozen(M39_SIMULATION_LIMITS)).toBe(true);
    expect(M39_SIMULATION_LIMITS.maxOperations).toBeGreaterThan(0);
    expect(M39_SIMULATION_LIMITS.maxOperationDurationMs).toBeGreaterThan(0);
    expect(M39_FORBIDDEN_SIDE_EFFECTS).toContain("WRITE_WORKSPACE");
    expect(M39_FORBIDDEN_SIDE_EFFECTS).toContain("NETWORK");
    expect(M39_SIMULATION_TRUST_POLICY.canPromoteTrust).toBe(false);
    expect(M39_SIMULATION_TRUST_POLICY.canCertifyRelease).toBe(false);
  });

  it("keeps a copy-on-write manifest and deterministic workspace hashes", () => {
    const created = createM39CopyOnWriteWorkspace(baseWorkspace);
    expect(created).not.toBeNull();
    expect(created?.base.files).toEqual(baseWorkspace.files);
    expect(created?.overlay).toEqual({ upserts: [], deletes: [] });
    expect(baseWorkspace.files).toHaveLength(1);
    expect(hashM39Workspace(created)).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(hashM39Workspace(created)).toBe(hashM39Workspace(baseWorkspace));
  });

  it("replays deterministically with stable before and after hashes", async () => {
    const plan = makePlan();
    const executor = vi.fn(() =>
      completeExecution({
        upserts: [{ path: "src/new.ts", sha256: HASH_B, bytes: 8 }],
        deletes: [],
      }),
    );
    const options = {
      capturedAt: CAPTURED_AT,
      evaluatedAt: EVALUATED_AT,
    } as const;
    const first = await runM39Simulation(plan, executor, options);
    const second = await runM39Simulation(plan, executor, options);
    const replayed = await replayM39Simulation(plan, executor, options);

    expect(first).toEqual(second);
    expect(first.outcome).toBe("REPRODUCIBLE");
    expect(first.beforeHash).not.toBe(first.afterHash);
    expect(first.hostWorkspaceMutated).toBe(false);
    expect(replayed.outcome).toBe("REPRODUCIBLE");
    expect(replayed.beforeHash).toBe(first.beforeHash);
    expect(replayed.afterHash).toBe(first.afterHash);
    expect(executor).toHaveBeenCalledTimes(4);
  });

  it("bounds an operation by timeout and preserves the pre-run hash", async () => {
    const plan = makePlan({
      operations: [{ ...operation, timeoutMs: 5 }],
    });
    const report = await runM39Simulation(
      plan,
      () => new Promise<SimulationExecution>(() => undefined),
      { capturedAt: CAPTURED_AT, evaluatedAt: EVALUATED_AT },
    );

    expect(report.outcome).toBe("PARTIAL");
    expect(report.reason).toBe("TIMEOUT");
    expect(report.afterHash).toBe(report.beforeHash);
    expect(report.hostWorkspaceMutated).toBe(false);
  });

  it("cancels a pending simulation without mutating the host workspace", async () => {
    const plan = makePlan({
      operations: [{ ...operation, timeoutMs: 1_000 }],
    });
    const controller = new AbortController();
    const pending = runM39Simulation(
      plan,
      () => new Promise<SimulationExecution>(() => undefined),
      {
        signal: controller.signal,
        capturedAt: CAPTURED_AT,
        evaluatedAt: EVALUATED_AT,
      },
    );
    controller.abort();
    const report = await pending;

    expect(report.outcome).toBe("PARTIAL");
    expect(report.reason).toBe("CANCELLED");
    expect(report.afterHash).toBe(report.beforeHash);
    expect(report.hostWorkspaceMutated).toBe(false);
  });

  it("classifies unsupported operations without invoking the executor", async () => {
    const unsupportedPlan = makePlan({
      operations: [
        { id: "unsupported-1", kind: "EXECUTE_COMMAND" },
      ] as unknown as SimulationPlan["operations"],
    });
    const executor = vi.fn(() => completeExecution());
    const report = await runM39Simulation(unsupportedPlan, executor, {
      capturedAt: CAPTURED_AT,
      evaluatedAt: EVALUATED_AT,
    });

    expect(report.outcome).toBe("INCONCLUSIVE");
    expect(report.reason).toBe("UNSUPPORTED_OPERATION");
    expect(report.operations[0]?.outcome).toBe("UNSUPPORTED");
    expect(executor).not.toHaveBeenCalled();
    expect(report.afterHash).toBe(report.beforeHash);
  });

  it("blocks declared writes and network access", async () => {
    for (const kind of ["WRITE_WORKSPACE", "NETWORK"] as const) {
      const report = await runM39Simulation(
        makePlan(),
        (_operation, context) => ({
          status: "COMPLETE",
          durationMs: 1,
          outputBytes: 1,
          effects: [
            kind === "NETWORK"
              ? context.attemptNetwork("remote-service")
              : context.attemptWrite("src/app.ts"),
          ],
        }),
        { capturedAt: CAPTURED_AT, evaluatedAt: EVALUATED_AT },
      );

      expect(report.outcome).toBe("INCONCLUSIVE");
      expect(report.reason).toBe("FORBIDDEN_SIDE_EFFECT");
      expect(report.forbiddenEffects).toEqual([kind]);
      expect(report.afterHash).toBe(report.beforeHash);
      expect(report.hostWorkspaceMutated).toBe(false);
    }
  });

  it("records forbidden effects even when an executor ignores the marker", async () => {
    const report = await runM39Simulation(
      makePlan(),
      (_operation, context) => {
        context.attemptWrite("src/app.ts");
        return completeExecution();
      },
      { capturedAt: CAPTURED_AT, evaluatedAt: EVALUATED_AT },
    );

    expect(report.outcome).toBe("INCONCLUSIVE");
    expect(report.forbiddenEffects).toEqual(["WRITE_WORKSPACE"]);
  });

  it("recovers by retrying against the unchanged manifest", async () => {
    const plan = makePlan();
    const original = structuredClone(plan.workspace);
    const failed = await runM39Simulation(
      plan,
      () => Promise.reject(new Error("transient executor failure")),
      { capturedAt: CAPTURED_AT, evaluatedAt: EVALUATED_AT },
    );
    const recovered = await runM39Simulation(plan, () => completeExecution(), {
      capturedAt: CAPTURED_AT,
      evaluatedAt: EVALUATED_AT,
    });

    expect(failed.outcome).toBe("UNKNOWN");
    expect(failed.recovery).toBe("RETRYABLE");
    expect(failed.afterHash).toBe(failed.beforeHash);
    expect(recovered.outcome).toBe("REPRODUCIBLE");
    expect(recovered.beforeHash).toBe(failed.beforeHash);
    expect(plan.workspace).toEqual(original);
  });

  it("rejects malformed, stale, and foreign evidence", async () => {
    const plan = makePlan();
    const report = await runM39Simulation(plan, () => completeExecution(), {
      capturedAt: CAPTURED_AT,
      evaluatedAt: EVALUATED_AT,
    });
    const evidence = evidenceFor(plan, report);

    expect(evaluateM39Simulation(plan, evidence, EVALUATED_AT).outcome).toBe(
      "REPRODUCIBLE",
    );
    expect(
      evaluateM39Simulation(
        plan,
        { ...evidence, candidate: null },
        EVALUATED_AT,
      ),
    ).toMatchObject({
      outcome: "UNKNOWN",
      reason: "EVIDENCE_MALFORMED",
      evidenceState: "MALFORMED",
    });
    expect(
      evaluateM39Simulation(
        plan,
        { ...evidence, capturedAt: "2025-12-30T00:00:00.000Z" },
        EVALUATED_AT,
      ),
    ).toMatchObject({
      outcome: "UNKNOWN",
      reason: "EVIDENCE_STALE",
      evidenceState: "STALE",
    });
    expect(
      evaluateM39Simulation(
        plan,
        {
          ...evidence,
          candidate: { ...candidate, headSha: "foreign-head" },
        },
        EVALUATED_AT,
      ),
    ).toMatchObject({
      outcome: "UNKNOWN",
      reason: "EVIDENCE_FOREIGN",
      evidenceState: "FOREIGN",
    });
  });

  it("returns partial for an exceeded operation budget", async () => {
    const plan = makePlan({
      limits: { maxOperations: 1 },
      operations: [operation, { ...operation, id: "remove-test-2" }],
    });
    const report = await runM39Simulation(plan, () => completeExecution(), {
      capturedAt: CAPTURED_AT,
      evaluatedAt: EVALUATED_AT,
    });

    expect(report.outcome).toBe("PARTIAL");
    expect(report.reason).toBe("RESOURCE_LIMIT");
    expect(report.resourceState).toBe("EXCEEDED");
    expect(report.unprocessedOperationCount).toBe(1);
    expect(report.afterHash).toBe(report.beforeHash);
  });

  it("never promotes a previous trust state", async () => {
    const plan = makePlan();
    const successful = await runM39Simulation(plan, () => completeExecution(), {
      capturedAt: CAPTURED_AT,
      evaluatedAt: EVALUATED_AT,
    });
    const partial = await runM39Simulation(
      plan,
      () => ({ status: "PARTIAL", durationMs: 1, outputBytes: 1 }),
      { capturedAt: CAPTURED_AT, evaluatedAt: EVALUATED_AT },
    );

    expect(applyM39SimulationReport("PASS", successful)).toBe("PASS");
    expect(applyM39SimulationReport("PASS", partial)).toBe("PARTIAL");
    expect(applyM39SimulationReport("PASS", { outcome: "INCONCLUSIVE" })).toBe(
      "UNKNOWN",
    );
    expect(applyM39SimulationReport("PARTIAL", { outcome: "UNKNOWN" })).toBe(
      "UNKNOWN",
    );
  });
});
