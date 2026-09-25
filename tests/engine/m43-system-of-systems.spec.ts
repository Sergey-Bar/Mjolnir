import { describe, expect, it } from "vitest";

import {
  M43_AUTHORITY,
  M43_NODE_KINDS,
  analyzeM43SystemOfSystems,
  digestM43Graph,
  serializeM43Graph,
  type M43EdgeKind,
  type M43EvaluationContext,
  type M43GraphEdge,
  type M43Node,
  type M43RepositoryGraph,
  type M43RepositoryNode,
} from "../../src/engine/m43-system-of-systems.js";

const CONTEXT: M43EvaluationContext = {
  candidateId: "candidate-m43",
  expectedRepositoryIds: ["repo:a", "repo:b"],
  evaluatedAt: "2026-09-25T00:00:00.000Z",
  maxAgeMs: 3_600_000,
};

const CAPTURED_AT = "2026-09-24T23:59:00.000Z";

function repository(repositoryId: string): M43RepositoryNode {
  return {
    kind: "repository",
    id: `repository:${repositoryId}`,
    repositoryId,
    revision: `revision-${repositoryId}`,
    ...(repositoryId === "repo:a"
      ? {
          ownership: {
            value: "team-a",
            state: "UNVERIFIED" as const,
          },
        }
      : {}),
  };
}

function graph(
  repositoryId: string,
  options: {
    readonly candidateId?: string;
    readonly capturedAt?: string;
    readonly availability?: M43RepositoryGraph["availability"];
    readonly nodes?: readonly M43Node[];
    readonly edges?: readonly M43GraphEdge[];
  } = {},
): M43RepositoryGraph {
  return {
    schema: "m43.system-of-systems@1",
    repositoryId,
    candidateId: options.candidateId ?? CONTEXT.candidateId,
    capturedAt: options.capturedAt ?? CAPTURED_AT,
    availability: options.availability ?? "AVAILABLE",
    nodes: options.nodes ?? [repository(repositoryId)],
    edges: options.edges ?? [],
  };
}

function edge(kind: M43EdgeKind, source: string, target: string): M43GraphEdge {
  return { kind, source, target };
}

function completeGraphs(): [M43RepositoryGraph, M43RepositoryGraph] {
  return [
    graph("repo:a", {
      nodes: [
        repository("repo:a"),
        {
          kind: "service",
          id: "service:a",
          repositoryId: "repo:a",
        },
        {
          kind: "contract",
          id: "contract:events",
          version: "1.0.0",
        },
        {
          kind: "change",
          id: "change:events",
          repositoryId: "repo:a",
          fromRevision: "revision-a-old",
          toRevision: "revision-repo:a",
        },
      ],
      edges: [
        edge("DEPENDS_ON", "service:a", "service:b"),
        edge("PRODUCES", "contract:events", "service:a"),
        edge("AFFECTS", "change:events", "contract:events"),
      ],
    }),
    graph("repo:b", {
      nodes: [
        repository("repo:b"),
        {
          kind: "service",
          id: "service:b",
          repositoryId: "repo:b",
        },
        {
          kind: "product",
          id: "product:checkout",
        },
        {
          kind: "release",
          id: "release:checkout",
          version: "4.2.0",
        },
      ],
      edges: [
        edge("PRODUCES", "service:b", "product:checkout"),
        edge("RELEASES", "release:checkout", "product:checkout"),
      ],
    }),
  ];
}

describe("M43 cross-repository system-of-systems contract", () => {
  it("defines the six bounded node types and local-only authority", () => {
    const [a, b] = completeGraphs();
    const result = analyzeM43SystemOfSystems([a, b], CONTEXT);

    expect(M43_NODE_KINDS).toEqual([
      "repository",
      "service",
      "product",
      "contract",
      "change",
      "release",
    ]);
    expect([...new Set(result.nodes.map((node) => node.kind))].sort()).toEqual([
      "change",
      "contract",
      "product",
      "release",
      "repository",
      "service",
    ]);
    expect(result.authority).toEqual(M43_AUTHORITY);
    expect(result.authority).toEqual({
      localScope: "LOCAL_INPUTS_ONLY",
      organization: "NOT_MODELED",
      enterprise: "NOT_MODELED",
      ownership: "OPTIONAL_UNVERIFIED",
    });
    expect(result.ownershipStates).toEqual({
      assignedUnverified: 1,
      unassigned: 7,
    });
    expect(JSON.stringify(result)).not.toMatch(/AUTHORIZED|CERTIFIED/);
  });

  it("derives a deterministic dependency-first deployment order", () => {
    const [a, b] = completeGraphs();
    const result = analyzeM43SystemOfSystems([a, b], CONTEXT);
    const order = result.deploymentOrder;
    const position = new Map(order.map((id, index) => [id, index]));

    expect(result.state).toBe("CURRENT");
    expect(result.localFallback).toBe("AVAILABLE");
    expect(result.cycles).toEqual([]);
    expect(position.get("service:b")).toBeLessThan(
      position.get("service:a") ?? -1,
    );
    expect(position.get("contract:events")).toBeLessThan(
      position.get("service:a") ?? -1,
    );
    expect(position.get("release:checkout")).toBeLessThan(
      position.get("product:checkout") ?? -1,
    );
    expect(position.get("service:b")).toBeLessThan(
      position.get("product:checkout") ?? -1,
    );
  });

  it("reports dependency cycles and withholds a complete deployment order", () => {
    const a = graph("repo:a", {
      nodes: [
        repository("repo:a"),
        { kind: "service", id: "service:a", repositoryId: "repo:a" },
      ],
      edges: [edge("DEPENDS_ON", "service:a", "service:b")],
    });
    const b = graph("repo:b", {
      nodes: [
        repository("repo:b"),
        { kind: "service", id: "service:b", repositoryId: "repo:b" },
      ],
      edges: [edge("DEPENDS_ON", "service:b", "service:a")],
    });

    const result = analyzeM43SystemOfSystems([a, b], CONTEXT);

    expect(result.state).toBe("PARTIAL");
    expect(result.localFallback).toBe("PARTIAL");
    expect(result.cycles).toEqual([["service:a", "service:b"]]);
    expect(result.deploymentOrder).not.toContain("service:a");
    expect(result.deploymentOrder).not.toContain("service:b");
    expect(result.issues.map((issue) => issue.code)).toContain("CYCLE");
  });

  it("keeps partial and missing repositories explicit", () => {
    const partial = graph("repo:a", {
      availability: "PARTIAL",
      nodes: [
        repository("repo:a"),
        { kind: "service", id: "service:a", repositoryId: "repo:a" },
      ],
    });

    const result = analyzeM43SystemOfSystems([partial], CONTEXT);

    expect(result.state).toBe("PARTIAL");
    expect(result.localFallback).toBe("PARTIAL");
    expect(result.missingRepositoryIds).toEqual(["repo:b"]);
    expect(result.unavailableRepositoryIds).toEqual(["repo:b"]);
    expect(result.inputs).toHaveLength(1);
    expect(result.inputs[0]).toMatchObject({
      repositoryId: "repo:a",
      candidateId: CONTEXT.candidateId,
      capturedAt: CAPTURED_AT,
      availability: "PARTIAL",
      state: "PARTIAL",
      nodeCount: 2,
      edgeCount: 0,
    });
    expect(result.inputs[0]?.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.nodes.map((node) => node.id)).toContain("service:a");
  });

  it("rejects stale and foreign graph inputs from the merged graph", () => {
    const good = graph("repo:a", {
      nodes: [
        repository("repo:a"),
        { kind: "service", id: "service:a", repositoryId: "repo:a" },
      ],
    });
    const foreign = graph("repo:b", {
      candidateId: "candidate-other",
      nodes: [
        repository("repo:b"),
        { kind: "service", id: "service:b", repositoryId: "repo:b" },
      ],
    });
    const stale = graph("repo:c", {
      capturedAt: "2020-01-01T00:00:00.000Z",
      nodes: [
        repository("repo:c"),
        { kind: "service", id: "service:c", repositoryId: "repo:c" },
      ],
    });
    const context: M43EvaluationContext = {
      ...CONTEXT,
      expectedRepositoryIds: ["repo:a", "repo:b", "repo:c"],
    };

    const result = analyzeM43SystemOfSystems([good, foreign, stale], context);
    const byRepository = new Map(
      result.inputs.map((input) => [input.repositoryId, input]),
    );

    expect(byRepository.get("repo:a")?.state).toBe("CURRENT");
    expect(byRepository.get("repo:b")?.state).toBe("FOREIGN");
    expect(byRepository.get("repo:c")?.state).toBe("STALE");
    expect(result.nodes.map((node) => node.id)).not.toContain("service:b");
    expect(result.nodes.map((node) => node.id)).not.toContain("service:c");
    expect(result.unavailableRepositoryIds).toEqual(["repo:b", "repo:c"]);
    expect(result.state).toBe("PARTIAL");
    expect(result.localFallback).toBe("PARTIAL");
  });

  it("serializes and hashes graphs independently of input ordering", () => {
    const [a, b] = completeGraphs();
    const forward = analyzeM43SystemOfSystems([a, b], CONTEXT);
    const reversedA: M43RepositoryGraph = {
      ...a,
      nodes: [...a.nodes].reverse(),
      edges: [...a.edges].reverse(),
    };
    const reversedB: M43RepositoryGraph = {
      ...b,
      nodes: [...b.nodes].reverse(),
      edges: [...b.edges].reverse(),
    };
    const reverse = analyzeM43SystemOfSystems([reversedB, reversedA], CONTEXT);

    expect(
      serializeM43Graph(CONTEXT.candidateId, forward.nodes, forward.edges),
    ).toBe(
      serializeM43Graph(CONTEXT.candidateId, reverse.nodes, reverse.edges),
    );
    expect(
      digestM43Graph(CONTEXT.candidateId, forward.nodes, forward.edges),
    ).toBe(digestM43Graph(CONTEXT.candidateId, reverse.nodes, reverse.edges));
    expect(JSON.stringify(forward)).toBe(JSON.stringify(reverse));
    expect(forward.graphDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("rejects organization nodes and verified ownership claims", () => {
    const invalid = graph("repo:a", {
      nodes: [
        repository("repo:a"),
        {
          kind: "organization",
          id: "organization:acme",
          authority: "enterprise",
        } as unknown as M43Node,
      ],
    });
    const verified = graph("repo:b", {
      nodes: [
        repository("repo:b"),
        {
          kind: "service",
          id: "service:b",
          repositoryId: "repo:b",
          ownership: { value: "team-b", state: "VERIFIED" },
        } as unknown as M43Node,
      ],
    });

    const result = analyzeM43SystemOfSystems([invalid, verified], CONTEXT);

    expect(result.state).toBe("UNKNOWN");
    expect(result.localFallback).toBe("UNAVAILABLE");
    expect(result.nodes).toEqual([]);
    expect(result.inputs.every((input) => input.state === "MALFORMED")).toBe(
      true,
    );
    expect(result.authority).toEqual(M43_AUTHORITY);
  });
});
