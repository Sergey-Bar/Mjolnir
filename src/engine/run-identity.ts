/**
 * Run Identity (product-gap master plan §7, plan 1789009691197 R4c) —
 * the deterministic binding that anchors every trust claim to its
 * execution: `scanId = sha256(input snapshot fingerprint + rulesDigest +
 * config fingerprint + engine version)`.
 *
 * Chain law (the Evidence Graph): VERDICT ← EVIDENCE ← EXECUTION ← SCOPE
 * ← SOURCE ← RULE(rev) ← FIXTURE ← REPRODUCTION. Each link carries its
 * ref; links whose input is unavailable are ABSENT — no fabrication
 * (fields absent when unavailable, the roadmap's evidence-state
 * vocabulary).
 *
 * Determinism: sha256 over canonical JSON (sorted keys, stable line
 * order) — the same inputs produce byte-identical identities. Zero
 * absolute paths: callers pass repo-relative paths.
 */

import { createHash } from "node:crypto";

export interface RunIdentityInput {
  /** The discovered input snapshot: repo-relative path + byte size. */
  files: Array<{ path: string; size: number }>;
  /** The rule set that will run: id + declared detectorRevision. */
  rules: Array<{ id: string; detectorRevision: number }>;
  /** The loaded config (JSON-able) — null when no config was loaded. */
  config: unknown;
  /** The engine version (src/engine/version.ts). */
  engineVersion: string;
}

export interface RunIdentity {
  /** sha256(input fingerprint + rules digest + config + engine version). */
  scanId: string;
  /** sha256 of the sorted "path:size" lines — the input snapshot. */
  inputFingerprint: string;
  /** sha256 of the sorted "id:revision" lines — the rule set. */
  rulesDigest: string;
  /** sha256 of the canonical config JSON (absent → omitted upstream). */
  configFingerprint: string;
  engineVersion: string;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function canonical(value: unknown): string {
  return JSON.stringify(value);
}

export function buildRunIdentity(input: RunIdentityInput): RunIdentity {
  // Sorted, newline-joined line digests: order-insensitive inputs produce
  // order-stable identities (the same SET of files/rules is the same
  // snapshot, whatever readdir returned).
  const inputFingerprint = sha256(
    [...input.files]
      .map((f) => `${f.path}:${f.size}`)
      .sort()
      .join("\n"),
  );
  const rulesDigest = sha256(
    [...input.rules]
      .map((r) => `${r.id}:${r.detectorRevision}`)
      .sort()
      .join("\n"),
  );
  const configFingerprint = sha256(canonical(input.config ?? null));
  const scanId = sha256(
    canonical({
      inputFingerprint,
      rulesDigest,
      configFingerprint,
      engineVersion: input.engineVersion,
    }),
  );
  return {
    scanId,
    inputFingerprint,
    rulesDigest,
    configFingerprint,
    engineVersion: input.engineVersion,
  };
}

/** The Evidence Graph chain links, in chain-law order. */
export type EvidenceGraphLink =
  | "verdict"
  | "evidence"
  | "execution"
  | "scope"
  | "source"
  | "rule"
  | "fixture"
  | "reproduction";

export interface EvidenceGraphNode {
  link: EvidenceGraphLink;
  /** Identity of the link's referent when known — absent otherwise. */
  ref?: string;
}

export interface EvidenceGraph {
  /** The chain-law order, always present in full (the LINKS are the law). */
  chain: EvidenceGraphNode[];
  /** The bound run identity when the execution was machine-anchored. */
  runId?: RunIdentity;
}

/**
 * Builds the Evidence Graph for a run. No fabrication: a link's `ref`
 * appears only when its identity input exists — the CHAIN itself is
 * always emitted so consumers can see which links are unbound.
 */
export function buildEvidenceGraph(parts: {
  runId?: RunIdentity;
  /** Evidence source identity, e.g. "jest-json" — when evidence exists. */
  source?: string;
  /** Fixture/corpus identity, e.g. the verdict-set digest — when known. */
  fixture?: string;
  /** Reproduction pointer, e.g. the baseline commit — when known. */
  reproduction?: string;
}): EvidenceGraph {
  const chain: EvidenceGraphNode[] = [
    { link: "verdict" },
    {
      link: "evidence",
      ...(parts.source !== undefined ? { ref: parts.source } : {}),
    },
    {
      link: "execution",
      ...(parts.runId !== undefined ? { ref: parts.runId.scanId } : {}),
    },
    {
      link: "scope",
      ...(parts.runId !== undefined
        ? { ref: parts.runId.inputFingerprint }
        : {}),
    },
    {
      link: "source",
      ...(parts.source !== undefined ? { ref: parts.source } : {}),
    },
    {
      link: "rule",
      ...(parts.runId !== undefined ? { ref: parts.runId.rulesDigest } : {}),
    },
    {
      link: "fixture",
      ...(parts.fixture !== undefined ? { ref: parts.fixture } : {}),
    },
    {
      link: "reproduction",
      ...(parts.reproduction !== undefined ? { ref: parts.reproduction } : {}),
    },
  ];
  return {
    chain,
    ...(parts.runId !== undefined ? { runId: parts.runId } : {}),
  };
}
