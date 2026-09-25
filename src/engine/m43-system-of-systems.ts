import { createHash } from "node:crypto";

export const M43_SYSTEM_OF_SYSTEMS_SCHEMA = "m43.system-of-systems@1" as const;

export const M43_NODE_KINDS = Object.freeze([
  "repository",
  "service",
  "product",
  "contract",
  "change",
  "release",
] as const);

export const M43_EDGE_KINDS = Object.freeze([
  "DEPENDS_ON",
  "PRODUCES",
  "CONSUMES",
  "AFFECTS",
  "CONTAINS",
  "RELEASES",
] as const);

export const M43_REPOSITORY_AVAILABILITIES = Object.freeze([
  "AVAILABLE",
  "PARTIAL",
  "UNAVAILABLE",
] as const);

export const M43_AUTHORITY = Object.freeze({
  localScope: "LOCAL_INPUTS_ONLY",
  organization: "NOT_MODELED",
  enterprise: "NOT_MODELED",
  ownership: "OPTIONAL_UNVERIFIED",
} as const);

export const M43_LIMITS = Object.freeze({
  maxRepositories: 32,
  maxNodes: 4_096,
  maxEdges: 8_192,
  maxIdLength: 256,
  maxTextLength: 1_024,
} as const);

export type M43NodeKind = (typeof M43_NODE_KINDS)[number];
export type M43EdgeKind = (typeof M43_EDGE_KINDS)[number];
export type M43RepositoryAvailability =
  (typeof M43_REPOSITORY_AVAILABILITIES)[number];
export type M43SystemState = "CURRENT" | "PARTIAL" | "UNAVAILABLE" | "UNKNOWN";
export type M43LocalFallbackState = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
export type M43InputState =
  | "CURRENT"
  | "PARTIAL"
  | "UNAVAILABLE"
  | "STALE"
  | "FOREIGN"
  | "FUTURE"
  | "MALFORMED";

export interface M43UnverifiedOwnership {
  readonly value: string;
  readonly state: "UNVERIFIED";
}

interface M43NodeBase {
  readonly id: string;
  readonly ownership?: M43UnverifiedOwnership;
}

export interface M43RepositoryNode extends M43NodeBase {
  readonly kind: "repository";
  readonly repositoryId: string;
  readonly revision: string;
}

export interface M43ServiceNode extends M43NodeBase {
  readonly kind: "service";
  readonly repositoryId: string;
}

export interface M43ProductNode extends M43NodeBase {
  readonly kind: "product";
}

export interface M43ContractNode extends M43NodeBase {
  readonly kind: "contract";
  readonly version: string;
}

export interface M43ChangeNode extends M43NodeBase {
  readonly kind: "change";
  readonly repositoryId: string;
  readonly fromRevision: string;
  readonly toRevision: string;
}

export interface M43ReleaseNode extends M43NodeBase {
  readonly kind: "release";
  readonly version: string;
}

export type M43Node =
  | M43RepositoryNode
  | M43ServiceNode
  | M43ProductNode
  | M43ContractNode
  | M43ChangeNode
  | M43ReleaseNode;

export interface M43GraphEdge {
  readonly kind: M43EdgeKind;
  readonly source: string;
  readonly target: string;
}

export interface M43RepositoryGraph {
  readonly schema: typeof M43_SYSTEM_OF_SYSTEMS_SCHEMA;
  readonly repositoryId: string;
  readonly candidateId: string;
  readonly capturedAt: string;
  readonly availability: M43RepositoryAvailability;
  readonly nodes: readonly M43Node[];
  readonly edges: readonly M43GraphEdge[];
}

export interface M43EvaluationContext {
  readonly candidateId: string;
  readonly expectedRepositoryIds: readonly string[];
  readonly evaluatedAt: string;
  readonly maxAgeMs: number;
}

export type M43IssueCode =
  | "INVALID_CONTEXT"
  | "RESOURCE_LIMIT"
  | "MALFORMED_INPUT"
  | "DUPLICATE_REPOSITORY"
  | "DUPLICATE_NODE"
  | "UNKNOWN_NODE"
  | "MISSING_REPOSITORY"
  | "MISSING_REPOSITORY_NODE"
  | "PARTIAL_INPUT"
  | "UNAVAILABLE_INPUT"
  | "STALE_INPUT"
  | "FOREIGN_INPUT"
  | "FUTURE_INPUT"
  | "CYCLE";

export interface M43Issue {
  readonly code: M43IssueCode;
  readonly repositoryId: string | null;
  readonly nodeIds: readonly string[];
}

export interface M43InputReport {
  readonly repositoryId: string | null;
  readonly candidateId: string | null;
  readonly capturedAt: string | null;
  readonly availability: M43RepositoryAvailability | null;
  readonly state: M43InputState;
  readonly digest: string | null;
  readonly nodeCount: number;
  readonly edgeCount: number;
}

export interface M43SystemAnalysis {
  readonly schema: typeof M43_SYSTEM_OF_SYSTEMS_SCHEMA;
  readonly state: M43SystemState;
  readonly candidateId: string | null;
  readonly graphDigest: string | null;
  readonly authority: typeof M43_AUTHORITY;
  readonly inputs: readonly M43InputReport[];
  readonly nodes: readonly M43Node[];
  readonly edges: readonly M43GraphEdge[];
  readonly missingRepositoryIds: readonly string[];
  readonly unavailableRepositoryIds: readonly string[];
  readonly cycles: readonly (readonly string[])[];
  readonly deploymentOrder: readonly string[];
  readonly localFallback: M43LocalFallbackState;
  readonly ownershipStates: {
    readonly assignedUnverified: number;
    readonly unassigned: number;
  };
  readonly issues: readonly M43Issue[];
}

type UnknownRecord = Record<string, unknown>;
type OwnershipResult =
  | { readonly valid: true; readonly value?: M43UnverifiedOwnership }
  | { readonly valid: false };

interface ParsedContext {
  readonly candidateId: string;
  readonly expectedRepositoryIds: readonly string[];
  readonly evaluatedAtMs: number;
  readonly maxAgeMs: number;
}

interface ParsedInput {
  readonly report: M43InputReport;
  readonly nodes: readonly M43Node[];
  readonly edges: readonly M43GraphEdge[];
  readonly accepted: boolean;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareIds(left: readonly string[], right: readonly string[]): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const compared = compareText(left[index] ?? "", right[index] ?? "");
    if (compared !== 0) return compared;
  }
  return left.length - right.length;
}

function boundedArray(value: unknown, limit: number): unknown[] | null {
  try {
    if (!Array.isArray(value) || value.length > limit) return null;
    const array: unknown[] = value;
    const result: unknown[] = [];
    for (let index = 0; index < array.length; index += 1) {
      result.push(array[index]);
    }
    return result;
  } catch {
    return null;
  }
}

function text(
  value: unknown,
  limit: number = M43_LIMITS.maxTextLength,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= limit
    ? normalized
    : null;
}

function id(value: unknown): string | null {
  return text(value, M43_LIMITS.maxIdLength);
}

function time(value: unknown): number | null {
  const normalized = text(value);
  if (normalized === null) return null;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function nodeKind(value: unknown): value is M43NodeKind {
  return (
    typeof value === "string" &&
    (M43_NODE_KINDS as readonly string[]).includes(value)
  );
}

function edgeKind(value: unknown): value is M43EdgeKind {
  return (
    typeof value === "string" &&
    (M43_EDGE_KINDS as readonly string[]).includes(value)
  );
}

function availability(value: unknown): value is M43RepositoryAvailability {
  return (
    typeof value === "string" &&
    (M43_REPOSITORY_AVAILABILITIES as readonly string[]).includes(value)
  );
}

function ownership(value: unknown): OwnershipResult {
  if (value === undefined) return { valid: true };
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { valid: false };
    }
    const record = value as UnknownRecord;
    const owner = text(record["value"]);
    if (record["state"] !== "UNVERIFIED" || owner === null) {
      return { valid: false };
    }
    return {
      valid: true,
      value: { value: owner, state: "UNVERIFIED" },
    };
  } catch {
    return { valid: false };
  }
}

function normalizeNode(value: unknown, repositoryId: string): M43Node | null {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    const record = value as UnknownRecord;
    if (!nodeKind(record["kind"])) return null;
    const nodeId = id(record["id"]);
    const owner = ownership(record["ownership"]);
    if (
      nodeId === null ||
      !owner.valid ||
      "authority" in record ||
      "organization" in record ||
      "enterprise" in record
    ) {
      return null;
    }
    const common = {
      id: nodeId,
      ...(owner.value === undefined ? {} : { ownership: owner.value }),
    };
    switch (record["kind"]) {
      case "repository": {
        const nodeRepositoryId = text(record["repositoryId"]);
        const revision = text(record["revision"]);
        return nodeRepositoryId === repositoryId && revision !== null
          ? {
              kind: "repository",
              ...common,
              repositoryId: nodeRepositoryId,
              revision,
            }
          : null;
      }
      case "service": {
        const nodeRepositoryId = text(record["repositoryId"]);
        return nodeRepositoryId === repositoryId
          ? { kind: "service", ...common, repositoryId: nodeRepositoryId }
          : null;
      }
      case "product":
        return { kind: "product", ...common };
      case "contract":
      case "release": {
        const version = text(record["version"]);
        return version === null
          ? null
          : { kind: record["kind"], ...common, version };
      }
      case "change": {
        const nodeRepositoryId = text(record["repositoryId"]);
        const fromRevision = text(record["fromRevision"]);
        const toRevision = text(record["toRevision"]);
        return nodeRepositoryId === repositoryId &&
          fromRevision !== null &&
          toRevision !== null
          ? {
              kind: "change",
              ...common,
              repositoryId: nodeRepositoryId,
              fromRevision,
              toRevision,
            }
          : null;
      }
    }
  } catch {
    return null;
  }
}

function normalizeEdge(value: unknown): M43GraphEdge | null {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return null;
    }
    const record = value as UnknownRecord;
    const kind = record["kind"];
    const source = id(record["source"]);
    const target = id(record["target"]);
    return edgeKind(kind) && source !== null && target !== null
      ? { kind, source, target }
      : null;
  } catch {
    return null;
  }
}

function compareNodes(left: M43Node, right: M43Node): number {
  return compareText(left.id, right.id) || compareText(left.kind, right.kind);
}

function compareEdges(left: M43GraphEdge, right: M43GraphEdge): number {
  return (
    compareText(left.kind, right.kind) ||
    compareText(left.source, right.source) ||
    compareText(left.target, right.target)
  );
}

function edgeKey(edge: M43GraphEdge): string {
  return `${edge.kind}\u0000${edge.source}\u0000${edge.target}`;
}

function stableStringify(
  value: unknown,
  ancestors = new Set<object>(),
): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (typeof value !== "object" || ancestors.has(value)) {
    throw new TypeError("M43 graph must contain finite acyclic data");
  }
  ancestors.add(value);
  const serialized = Array.isArray(value)
    ? `[${value.map((item) => stableStringify(item, ancestors)).join(",")}]`
    : `{${Object.keys(value as UnknownRecord)
        .sort(compareText)
        .flatMap((key) => {
          const child = (value as UnknownRecord)[key];
          return child === undefined
            ? []
            : `${JSON.stringify(key)}:${stableStringify(child, ancestors)}`;
        })
        .join(",")}}`;
  ancestors.delete(value);
  return serialized;
}

export function serializeM43Graph(
  candidateId: string,
  nodes: readonly M43Node[],
  edges: readonly M43GraphEdge[],
): string {
  const normalizedCandidateId = id(candidateId);
  if (normalizedCandidateId === null) {
    throw new TypeError("M43 candidateId is invalid");
  }
  if (
    nodes.length > M43_LIMITS.maxNodes ||
    edges.length > M43_LIMITS.maxEdges
  ) {
    throw new RangeError("M43 graph exceeds deterministic bounds");
  }
  return stableStringify({
    schema: M43_SYSTEM_OF_SYSTEMS_SCHEMA,
    candidateId: normalizedCandidateId,
    nodes: [...nodes].sort(compareNodes),
    edges: [...edges].sort(compareEdges),
  });
}

export function digestM43Graph(
  candidateId: string,
  nodes: readonly M43Node[],
  edges: readonly M43GraphEdge[],
): string {
  const canonical = serializeM43Graph(candidateId, nodes, edges);
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

function report(
  repositoryId: string | null,
  candidateId: string | null,
  capturedAt: string | null,
  inputAvailability: M43RepositoryAvailability | null,
  state: M43InputState,
  digest: string | null,
  nodeCount: number,
  edgeCount: number,
): M43InputReport {
  return {
    repositoryId,
    candidateId,
    capturedAt,
    availability: inputAvailability,
    state,
    digest,
    nodeCount,
    edgeCount,
  };
}

function parseContext(value: M43EvaluationContext): ParsedContext | null {
  try {
    const repositoryIds = boundedArray(
      value.expectedRepositoryIds,
      M43_LIMITS.maxRepositories,
    );
    const normalizedRepositoryIds: string[] = [];
    for (const repositoryId of repositoryIds ?? []) {
      const normalized = id(repositoryId);
      if (normalized === null) return null;
      normalizedRepositoryIds.push(normalized);
    }
    const candidateId = id(value.candidateId);
    const evaluatedAtMs = time(value.evaluatedAt);
    if (
      candidateId === null ||
      normalizedRepositoryIds.length === 0 ||
      new Set(normalizedRepositoryIds).size !==
        normalizedRepositoryIds.length ||
      evaluatedAtMs === null ||
      !Number.isSafeInteger(value.maxAgeMs) ||
      value.maxAgeMs <= 0
    ) {
      return null;
    }
    return {
      candidateId,
      expectedRepositoryIds: normalizedRepositoryIds.sort(compareText),
      evaluatedAtMs,
      maxAgeMs: value.maxAgeMs,
    };
  } catch {
    return null;
  }
}

function parseInput(
  value: M43RepositoryGraph,
  context: ParsedContext,
): ParsedInput {
  try {
    const repositoryId = text(value.repositoryId);
    const candidateId = id(value.candidateId);
    const capturedAt = text(value.capturedAt);
    const inputAvailability = availability(value.availability)
      ? value.availability
      : null;
    const capturedAtMs = time(value.capturedAt);
    if (
      value.schema !== M43_SYSTEM_OF_SYSTEMS_SCHEMA ||
      repositoryId === null ||
      candidateId === null ||
      capturedAt === null ||
      capturedAtMs === null ||
      inputAvailability === null
    ) {
      return rejectedInput(
        repositoryId,
        candidateId,
        capturedAt,
        inputAvailability,
        "MALFORMED",
      );
    }
    const base = [
      repositoryId,
      candidateId,
      capturedAt,
      inputAvailability,
    ] as const;
    if (
      !context.expectedRepositoryIds.includes(repositoryId) ||
      candidateId !== context.candidateId
    ) {
      return rejectedInput(...base, "FOREIGN");
    }
    if (capturedAtMs > context.evaluatedAtMs) {
      return rejectedInput(...base, "FUTURE");
    }
    if (context.evaluatedAtMs - capturedAtMs > context.maxAgeMs) {
      return rejectedInput(...base, "STALE");
    }
    if (inputAvailability === "UNAVAILABLE") {
      return rejectedInput(...base, "UNAVAILABLE");
    }
    const rawNodes = boundedArray(value.nodes, M43_LIMITS.maxNodes);
    const rawEdges = boundedArray(value.edges, M43_LIMITS.maxEdges);
    if (rawNodes === null || rawEdges === null) {
      return rejectedInput(...base, "MALFORMED");
    }
    const nodesById = new Map<string, M43Node>();
    for (const rawNode of rawNodes) {
      const node = normalizeNode(rawNode, repositoryId);
      if (node === null) return rejectedInput(...base, "MALFORMED");
      const existing = nodesById.get(node.id);
      if (
        existing !== undefined &&
        stableStringify(existing) !== stableStringify(node)
      ) {
        return rejectedInput(...base, "MALFORMED");
      }
      nodesById.set(node.id, node);
    }
    const edgesByKey = new Map<string, M43GraphEdge>();
    for (const rawEdge of rawEdges) {
      const edge = normalizeEdge(rawEdge);
      if (edge === null) return rejectedInput(...base, "MALFORMED");
      edgesByKey.set(edgeKey(edge), edge);
    }
    const nodes = [...nodesById.values()].sort(compareNodes);
    const edges = [...edgesByKey.values()].sort(compareEdges);
    return {
      report: report(
        ...base,
        inputAvailability === "PARTIAL" ? "PARTIAL" : "CURRENT",
        digestM43Graph(context.candidateId, nodes, edges),
        nodes.length,
        edges.length,
      ),
      nodes,
      edges,
      accepted: true,
    };
  } catch {
    return rejectedInput(null, null, null, null, "MALFORMED");
  }
}

function rejectedInput(
  repositoryId: string | null,
  candidateId: string | null,
  capturedAt: string | null,
  inputAvailability: M43RepositoryAvailability | null,
  state: M43InputState,
): ParsedInput {
  return {
    report: report(
      repositoryId,
      candidateId,
      capturedAt,
      inputAvailability,
      state,
      null,
      0,
      0,
    ),
    nodes: [],
    edges: [],
    accepted: false,
  };
}

function inputIssue(state: M43InputState): M43IssueCode | null {
  switch (state) {
    case "PARTIAL":
      return "PARTIAL_INPUT";
    case "UNAVAILABLE":
      return "UNAVAILABLE_INPUT";
    case "STALE":
      return "STALE_INPUT";
    case "FOREIGN":
      return "FOREIGN_INPUT";
    case "FUTURE":
      return "FUTURE_INPUT";
    case "MALFORMED":
      return "MALFORMED_INPUT";
    case "CURRENT":
      return null;
  }
}

function addIssue(
  issues: M43Issue[],
  code: M43IssueCode,
  repositoryId: string | null,
  nodeIds: readonly string[] = [],
): void {
  issues.push({
    code,
    repositoryId,
    nodeIds: [...nodeIds].sort(compareText),
  });
}

function compareInputs(left: ParsedInput, right: ParsedInput): number {
  return (
    compareText(
      left.report.repositoryId ?? "",
      right.report.repositoryId ?? "",
    ) ||
    compareText(
      left.report.candidateId ?? "",
      right.report.candidateId ?? "",
    ) ||
    compareText(left.report.capturedAt ?? "", right.report.capturedAt ?? "") ||
    compareText(left.report.state, right.report.state) ||
    compareText(left.report.digest ?? "", right.report.digest ?? "")
  );
}

function compareReports(left: M43InputReport, right: M43InputReport): number {
  return (
    compareText(left.repositoryId ?? "", right.repositoryId ?? "") ||
    compareText(left.candidateId ?? "", right.candidateId ?? "") ||
    compareText(left.capturedAt ?? "", right.capturedAt ?? "") ||
    compareText(left.state, right.state) ||
    compareText(left.digest ?? "", right.digest ?? "")
  );
}

function compareIssues(left: M43Issue, right: M43Issue): number {
  return (
    compareText(left.code, right.code) ||
    compareText(left.repositoryId ?? "", right.repositoryId ?? "") ||
    compareIds(left.nodeIds, right.nodeIds)
  );
}

function prerequisitesFor(
  nodes: readonly M43Node[],
  edges: readonly M43GraphEdge[],
): Map<string, Set<string>> {
  const prerequisites = new Map<string, Set<string>>(
    nodes.map((node) => [node.id, new Set<string>()]),
  );
  for (const edge of edges) {
    if (edge.kind === "DEPENDS_ON" || edge.kind === "CONSUMES") {
      prerequisites.get(edge.source)?.add(edge.target);
    } else if (edge.kind === "PRODUCES" || edge.kind === "RELEASES") {
      prerequisites.get(edge.target)?.add(edge.source);
    }
  }
  return prerequisites;
}

function findCycles(
  nodeIds: readonly string[],
  prerequisites: ReadonlyMap<string, ReadonlySet<string>>,
): string[][] {
  let nextIndex = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  const visit = (nodeId: string): void => {
    const index = nextIndex++;
    indices.set(nodeId, index);
    lowLinks.set(nodeId, index);
    stack.push(nodeId);
    onStack.add(nodeId);
    for (const dependency of [...(prerequisites.get(nodeId) ?? [])].sort(
      compareText,
    )) {
      const dependencyIndex = indices.get(dependency);
      if (dependencyIndex === undefined) {
        visit(dependency);
        lowLinks.set(
          nodeId,
          Math.min(
            lowLinks.get(nodeId) ?? index,
            lowLinks.get(dependency) ?? index,
          ),
        );
      } else if (onStack.has(dependency)) {
        lowLinks.set(
          nodeId,
          Math.min(lowLinks.get(nodeId) ?? index, dependencyIndex),
        );
      }
    }
    if (lowLinks.get(nodeId) !== index) return;
    const component: string[] = [];
    let member: string | undefined;
    do {
      member = stack.pop();
      if (member === undefined) return;
      onStack.delete(member);
      component.push(member);
    } while (member !== nodeId);
    components.push(component.sort(compareText));
  };
  for (const nodeId of [...nodeIds].sort(compareText)) {
    if (!indices.has(nodeId)) visit(nodeId);
  }
  return components
    .filter(
      (component) =>
        component.length > 1 ||
        (component[0] !== undefined &&
          (prerequisites.get(component[0])?.has(component[0]) ?? false)),
    )
    .sort(compareIds);
}

function deploymentOrder(
  nodeIds: readonly string[],
  prerequisites: ReadonlyMap<string, ReadonlySet<string>>,
  cyclicNodeIds: ReadonlySet<string>,
): string[] {
  const degrees = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const nodeId of nodeIds) {
    const values = [...(prerequisites.get(nodeId) ?? [])];
    degrees.set(nodeId, values.length);
    for (const prerequisite of values) {
      const valuesForPrerequisite = dependents.get(prerequisite) ?? [];
      valuesForPrerequisite.push(nodeId);
      dependents.set(prerequisite, valuesForPrerequisite);
    }
  }
  const available = nodeIds
    .filter((nodeId) => degrees.get(nodeId) === 0 && !cyclicNodeIds.has(nodeId))
    .sort(compareText);
  const result: string[] = [];
  while (available.length > 0) {
    const nodeId = available.shift();
    if (nodeId === undefined) break;
    result.push(nodeId);
    for (const dependent of [...(dependents.get(nodeId) ?? [])].sort(
      compareText,
    )) {
      const degree = (degrees.get(dependent) ?? 0) - 1;
      degrees.set(dependent, degree);
      if (degree === 0 && !cyclicNodeIds.has(dependent)) {
        available.push(dependent);
        available.sort(compareText);
      }
    }
  }
  return result;
}

function emptyAnalysis(
  candidateId: string | null,
  code: M43IssueCode,
): M43SystemAnalysis {
  return {
    schema: M43_SYSTEM_OF_SYSTEMS_SCHEMA,
    state: "UNKNOWN",
    candidateId,
    graphDigest: null,
    authority: M43_AUTHORITY,
    inputs: [],
    nodes: [],
    edges: [],
    missingRepositoryIds: [],
    unavailableRepositoryIds: [],
    cycles: [],
    deploymentOrder: [],
    localFallback: "UNAVAILABLE",
    ownershipStates: { assignedUnverified: 0, unassigned: 0 },
    issues: [{ code, repositoryId: null, nodeIds: [] }],
  };
}

export function analyzeM43SystemOfSystems(
  inputs: readonly M43RepositoryGraph[],
  context: M43EvaluationContext,
): M43SystemAnalysis {
  const parsedContext = parseContext(context);
  if (parsedContext === null) {
    return emptyAnalysis(null, "INVALID_CONTEXT");
  }
  const inputValues = boundedArray(inputs, M43_LIMITS.maxRepositories);
  if (inputValues === null) {
    return emptyAnalysis(parsedContext.candidateId, "RESOURCE_LIMIT");
  }
  const parsedInputs = inputValues
    .map((value) => parseInput(value as M43RepositoryGraph, parsedContext))
    .sort(compareInputs);
  const issues: M43Issue[] = [];
  const acceptedInputs: ParsedInput[] = [];
  const inputReports: M43InputReport[] = [];
  const seenRepositoryIds = new Set<string>();
  for (let index = 0; index < parsedInputs.length;) {
    const first = parsedInputs[index];
    if (first === undefined) break;
    const repositoryId = first.report.repositoryId;
    const group: ParsedInput[] = [];
    while (
      index < parsedInputs.length &&
      parsedInputs[index]?.report.repositoryId === repositoryId
    ) {
      const current = parsedInputs[index];
      if (current === undefined) break;
      group.push(current);
      index += 1;
    }
    if (repositoryId !== null) seenRepositoryIds.add(repositoryId);
    if (group.length > 1) {
      addIssue(issues, "DUPLICATE_REPOSITORY", repositoryId);
      for (const item of group) {
        inputReports.push({
          ...item.report,
          state: "MALFORMED",
          digest: null,
          nodeCount: 0,
          edgeCount: 0,
        });
      }
      continue;
    }
    const input = group[0];
    if (input === undefined) continue;
    inputReports.push(input.report);
    const code = inputIssue(input.report.state);
    if (code !== null) addIssue(issues, code, repositoryId);
    if (input.accepted) acceptedInputs.push(input);
  }

  const rawNodes = acceptedInputs.flatMap((input) => input.nodes);
  const rawEdges = acceptedInputs.flatMap((input) => input.edges);
  if (
    rawNodes.length > M43_LIMITS.maxNodes ||
    rawEdges.length > M43_LIMITS.maxEdges
  ) {
    addIssue(issues, "RESOURCE_LIMIT", null);
  }
  const nodesById = new Map<string, M43Node[]>();
  for (const node of rawNodes.slice(0, M43_LIMITS.maxNodes)) {
    const values = nodesById.get(node.id) ?? [];
    values.push(node);
    nodesById.set(node.id, values);
  }
  const nodes: M43Node[] = [];
  for (const nodeId of [...nodesById.keys()].sort(compareText)) {
    const values = nodesById.get(nodeId) ?? [];
    const first = values[0];
    if (first === undefined) continue;
    if (
      values.some((node) => stableStringify(node) !== stableStringify(first))
    ) {
      addIssue(issues, "DUPLICATE_NODE", null, [nodeId]);
    } else {
      nodes.push(first);
    }
  }
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edgesByKey = new Map<string, M43GraphEdge>();
  for (const edge of rawEdges.slice(0, M43_LIMITS.maxEdges)) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      addIssue(issues, "UNKNOWN_NODE", null, [edge.source, edge.target]);
    } else {
      edgesByKey.set(edgeKey(edge), edge);
    }
  }
  const edges = [...edgesByKey.values()].sort(compareEdges);
  const acceptedRepositoryIds = new Set(
    acceptedInputs
      .map((input) => input.report.repositoryId)
      .filter((repositoryId): repositoryId is string => repositoryId !== null),
  );
  const missingRepositoryIds = parsedContext.expectedRepositoryIds.filter(
    (repositoryId) => !seenRepositoryIds.has(repositoryId),
  );
  const unavailableRepositoryIds = parsedContext.expectedRepositoryIds.filter(
    (repositoryId) => !acceptedRepositoryIds.has(repositoryId),
  );
  for (const repositoryId of missingRepositoryIds) {
    addIssue(issues, "MISSING_REPOSITORY", repositoryId);
  }
  for (const repositoryId of parsedContext.expectedRepositoryIds) {
    if (
      acceptedRepositoryIds.has(repositoryId) &&
      !nodes.some(
        (node) =>
          node.kind === "repository" && node.repositoryId === repositoryId,
      )
    ) {
      addIssue(issues, "MISSING_REPOSITORY_NODE", repositoryId);
    }
  }

  const prerequisites = prerequisitesFor(nodes, edges);
  const cycles = findCycles(
    nodes.map((node) => node.id),
    prerequisites,
  );
  if (cycles.length > 0) addIssue(issues, "CYCLE", null, cycles.flat());
  const cyclicNodeIds = new Set(cycles.flat());
  const order = deploymentOrder(
    nodes.map((node) => node.id),
    prerequisites,
    cyclicNodeIds,
  );
  const assignedUnverified = nodes.filter(
    (node) => node.ownership !== undefined,
  ).length;
  const allMalformed =
    inputReports.length > 0 &&
    inputReports.every((input) => input.state === "MALFORMED");
  const state: M43SystemState =
    nodes.length === 0
      ? allMalformed
        ? "UNKNOWN"
        : "UNAVAILABLE"
      : inputReports.some((input) => input.state !== "CURRENT") ||
          missingRepositoryIds.length > 0 ||
          unavailableRepositoryIds.length > 0 ||
          issues.length > 0 ||
          cycles.length > 0
        ? "PARTIAL"
        : "CURRENT";
  return {
    schema: M43_SYSTEM_OF_SYSTEMS_SCHEMA,
    state,
    candidateId: parsedContext.candidateId,
    graphDigest:
      nodes.length === 0
        ? null
        : digestM43Graph(parsedContext.candidateId, nodes, edges),
    authority: M43_AUTHORITY,
    inputs: inputReports.sort(compareReports),
    nodes,
    edges,
    missingRepositoryIds,
    unavailableRepositoryIds,
    cycles,
    deploymentOrder: order,
    localFallback:
      state === "CURRENT"
        ? "AVAILABLE"
        : state === "PARTIAL"
          ? "PARTIAL"
          : "UNAVAILABLE",
    ownershipStates: {
      assignedUnverified,
      unassigned: nodes.length - assignedUnverified,
    },
    issues: issues.sort(compareIssues),
  };
}
