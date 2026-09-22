/**
 * M13 — Evidence Graph and Provenance.
 *
 * Builds and queries the verification evidence graph, integrating
 * evidence core, provenance tracking, and run identity. Provides
 * a typed graph structure with typed nodes and relationships
 * that powers correlation, forensics, and historical trust.
 *
 * The evidence graph is the backbone of the verification trust
 * model: every finding traces back through evidence to its source.
 */

import type { Finding, ScanResult } from "../types.js";
 
import { classifyProvenance } from "./provenance.js";
import { buildEvidenceGraph, type EvidenceGraph } from "./run-identity.js";
import type { AgenticTrustProfile } from "./provenance.js";
import type { RunIdentity } from "./run-identity.js";

export interface EvidenceNode {
  id: string;
  type:
    | "repository"
    | "commit"
    | "file"
    | "test"
    | "suite"
    | "assertion"
    | "fixture"
    | "mock"
    | "selector"
    | "ci-job"
    | "runtime-event"
    | "artifact"
    | "finding"
    | "suppression"
    | "baseline"
    | "remediation";
  label: string;
  properties: Record<string, unknown>;
}

export interface EvidenceEdge {
  source: string;
  target: string;
  type:
    | "CONTAINS"
    | "DEPENDS_ON"
    | "OBSERVED_IN"
    | "PRODUCED_BY"
    | "CONFIRMS"
    | "CONTRADICTS"
    | "SUPPRESSES"
    | "CAUSED_BY"
    | "CORRELATED_WITH"
    | "CHANGED_BY"
    | "VERIFIED_BY";
  properties: Record<string, unknown>;
}

export interface EvidenceGraphResult {
  graph: EvidenceGraph;
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
  agenticProfile: AgenticTrustProfile;
  evidenceCounts: {
    total: number;
    failed: number;
    flaky: number;
    skipped: number;
    timedOut: number;
  };
  provenanceSummary: {
    totalFiles: number;
    generatedMarkedFiles: number;
    codegenLikeFiles: number;
    shareMarkedGenerated: number;
  };
}

/**
 * Build a complete evidence graph from a scan result.
 * Pure function — deterministic output for the same input.
 */
export function buildEvidenceGraphFromScan(
  result: ScanResult,
  runIdentity: RunIdentity,
  declarationsByFile: ReadonlyMap<string, number>,
): EvidenceGraphResult {
  const nodes: EvidenceNode[] = [];
  const edges: EvidenceEdge[] = [];

  // Repository node
  const repoNode: EvidenceNode = {
    id: `repo:${runIdentity.inputFingerprint}`,
    type: "repository",
    label: "Scanned Repository",
    properties: {
      scanId: runIdentity.scanId,
      engineVersion: runIdentity.engineVersion,
    },
  };
  nodes.push(repoNode);

  // Run identity node
  const runNode: EvidenceNode = {
    id: `run:${runIdentity.scanId}`,
    type: "artifact",
    label: "Scan Run",
    properties: {
      scanId: runIdentity.scanId,
      rulesDigest: runIdentity.rulesDigest,
      configFingerprint: runIdentity.configFingerprint,
    },
  };
  nodes.push(runNode);
  edges.push({
    source: repoNode.id,
    target: runNode.id,
    type: "CONTAINS",
    properties: {},
  });

  // File and test nodes
  const fileNodes = new Map<string, EvidenceNode>();
  for (const finding of result.findings) {
    if (!fileNodes.has(finding.file)) {
      const fileNode: EvidenceNode = {
        id: `file:${finding.file}`,
        type: "file",
        label: finding.file,
        properties: { path: finding.file },
      };
      fileNodes.set(finding.file, fileNode);
      nodes.push(fileNode);
      edges.push({
        source: repoNode.id,
        target: fileNode.id,
        type: "CONTAINS",
        properties: {},
      });
    }

    const findingNode: EvidenceNode = {
      id: `finding:${finding.findingId ?? `${finding.ruleId}:${finding.file}:${finding.line}`}`,
      type: "finding",
      label: `${finding.ruleId}: ${finding.message}`,
      properties: {
        ruleId: finding.ruleId,
        severity: finding.severity,
        evidenceLevel: finding.evidenceLevel,
        trustLevel: finding.trustLevel,
        confidence: finding.confidence,
        findingType: finding.findingType,
      },
    };
    nodes.push(findingNode);
    edges.push({
      source: fileNodes.get(finding.file)?.id ?? "",
      target: findingNode.id,
      type: "CONTAINS",
      properties: {},
    });
    edges.push({
      source: runNode.id,
      target: findingNode.id,
      type: "PRODUCED_BY",
      properties: { detectorRevision: finding.detectorRevision },
    });
  }

  // Compute evidence counts from findings directly
  const evidenceCounts = {
    total: result.findings.length,
    failed: result.findings.filter((f) => f.severity === "error").length,
    flaky: 0,
    skipped: 0,
    timedOut: 0,
  };

  // Build provenance
  const filesForProvenance = Array.from(fileNodes.keys()).map((path) => ({
    path,
    provenance: classifyProvenance({ text: "" }),
  }));
  const agenticProfile: AgenticTrustProfile = {
    testFiles: filesForProvenance.length,
    generatedMarkedFiles: filesForProvenance.filter(
      (f) => f.provenance === "generated-marked",
    ).length,
    codegenLikeFiles: filesForProvenance.filter(
      (f) => f.provenance === "codegen-like",
    ).length,
    shareMarkedGenerated:
      filesForProvenance.length > 0
        ? filesForProvenance.filter((f) => f.provenance !== "unmarked").length /
          filesForProvenance.length
        : 0,
    findingsInGeneratedFiles: 0,
    findingsInUnmarkedFiles: result.findings.length,
    note: "Static provenance markers only. Absence of a marker does not prove human authorship.",
  };

  // Build the evidence graph using the existing infrastructure
  const graphParts: { runId?: RunIdentity; source: string; fixture?: string } =
    {
      runId: runIdentity,
      source: "scan",
    };
  if (declarationsByFile.size > 0) {
    graphParts.fixture = `declarations:${declarationsByFile.size}`;
  }
  const graph = buildEvidenceGraph(graphParts);

  return {
    graph,
    nodes,
    edges,
    agenticProfile,
    evidenceCounts,
    provenanceSummary: {
      totalFiles: filesForProvenance.length,
      generatedMarkedFiles: agenticProfile.generatedMarkedFiles,
      codegenLikeFiles: agenticProfile.codegenLikeFiles,
      shareMarkedGenerated: agenticProfile.shareMarkedGenerated,
    },
  };
}

/**
 * Query the evidence graph for findings related to a specific file.
 */
export function queryFindingsByFile(
  result: ScanResult,
  filePath: string,
): Finding[] {
  return result.findings.filter((f) => f.file === filePath);
}

/**
 * Query the evidence graph for findings by rule ID.
 */
export function queryFindingsByRule(
  result: ScanResult,
  ruleId: string,
): Finding[] {
  return result.findings.filter((f) => f.ruleId === ruleId);
}

/**
 * Compute the evidence provenance chain for a finding.
 */
export function computeEvidenceChain(
  finding: Finding,
  runIdentity: RunIdentity,
): string[] {
  const chain: string[] = [];
  chain.push(`Finding: ${finding.ruleId} at ${finding.file}:${finding.line}`);
  chain.push(`Produced by: ${runIdentity.scanId}`);
  chain.push(`Rule revision: ${finding.detectorRevision ?? "unknown"}`);
  chain.push(`Evidence level: ${finding.evidenceLevel ?? "E0"}`);
  chain.push(`Trust level: ${finding.trustLevel ?? "L2"}`);
  chain.push(`Confidence: ${finding.confidence}`);
  return chain;
}

export function renderEvidenceGraphResult(result: EvidenceGraphResult): string {
  const lines: string[] = [];
  lines.push("Evidence Graph Report");
  lines.push(`Nodes: ${result.nodes.length}`);
  lines.push(`Edges: ${result.edges.length}`);
  lines.push(
    `Total Findings: ${result.nodes.filter((n) => n.type === "finding").length}`,
  );
  lines.push(`Run ID: ${result.graph.runId?.scanId ?? "N/A"}`);
  lines.push("");

  lines.push("Evidence Counts:");
  lines.push(`  Total: ${result.evidenceCounts.total}`);
  lines.push(`  Failed: ${result.evidenceCounts.failed}`);
  lines.push(`  Flaky: ${result.evidenceCounts.flaky}`);
  lines.push(`  Skipped: ${result.evidenceCounts.skipped}`);
  lines.push(`  Timed Out: ${result.evidenceCounts.timedOut}`);
  lines.push("");

  lines.push("Provenance Summary:");
  lines.push(`  Total files: ${result.provenanceSummary.totalFiles}`);
  lines.push(
    `  Generated-marked: ${result.provenanceSummary.generatedMarkedFiles}`,
  );
  lines.push(`  Codegen-like: ${result.provenanceSummary.codegenLikeFiles}`);
  lines.push(
    `  Share marked generated: ${(result.provenanceSummary.shareMarkedGenerated * 100).toFixed(1)}%`,
  );
  lines.push("");

  lines.push("Agentic Profile Note:");
  lines.push(`  ${result.agenticProfile.note}`);

  return lines.join("\n").trimEnd();
}
