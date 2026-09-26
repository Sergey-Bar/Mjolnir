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

import type { CandidateBinding } from "../types.js";

export interface RunIdentityInput {
  /** The discovered input snapshot: repo-relative path + byte size + content hash. */
  files: Array<{ path: string; size: number; hash?: string }>;
  /** The rule set that will run: id + declared detectorRevision. */
  rules: Array<{ id: string; detectorRevision: number }>;
  /** The loaded config (JSON-able) — null when no config was loaded. */
  config: unknown;
  /** The engine version (src/engine/version.ts). */
  engineVersion: string;
  /** The git commit the analysed tree was at, when the run is repo-bound. */
  commit?: string | undefined;
  /** The git tree hash of the analysed worktree, when known. */
  tree?: string | undefined;
  /** sha256 of the lockfile the run resolved against, when known. */
  lockfile?: string | undefined;
  /**
   * The release candidate this run belongs to. Omit for an ordinary scan: a
   * local run is not a candidate, and binding it to one would let a working
   * tree's verdict stand in for authorized evidence.
   */
  candidate?: CandidateBinding | undefined;
  /** Content hash of the discovered runtime report, when present. */
  reportDigest?: string | undefined;
  /** Trust model version (src/engine/contract-versions.ts). */
  trustModelVersion?: string;
  /** Scoring model version (src/engine/contract-versions.ts). */
  scoringModelVersion?: string;
  /** Framework support matrix version (src/engine/contract-versions.ts). */
  frameworkSupportMatrixVersion?: string;
  /** Evidence schema version numbers in play for this run. */
  evidenceSchemaVersions?: number[];
  /** Hash of the active suppression ruleset. */
  suppressionFingerprint?: string;
  /** Hash of the loaded policy configuration. */
  policyFingerprint?: string;
  /** Hash of the historical evidence corpus. */
  historicalEvidenceFingerprint?: string;
}

export interface RunIdentity {
  /** sha256(input fingerprint + rules digest + config + engine version + verdict-affecting inputs). */
  scanId: string;
  /** sha256 of the sorted "path:size" lines — the input snapshot. */
  inputFingerprint: string;
  /** sha256 of the sorted "id:revision" lines — the rule set. */
  rulesDigest: string;
  /** sha256 of the canonical config JSON (absent → omitted upstream). */
  configFingerprint: string;
  engineVersion: string;
  trustModelVersion?: string;
  scoringModelVersion?: string;
  frameworkSupportMatrixVersion?: string;
  /** The analysed commit. Populated since V5-010; previously declared, never set. */
  commit?: string;
  /** The analysed worktree's tree hash. */
  tree?: string;
  /** The lockfile digest the run resolved against. */
  lockfile?: string;
  /** The release candidate this run is bound to, when it is one. */
  candidate?: CandidateBinding;
  /**
   * The chain links this identity actually binds. A claim is only replayable
   * when every link it depends on is present, so this is derived rather than
   * left to each consumer to guess.
   *
   * Optional in the TYPE so that reports written before this field existed
   * still parse (the machine contract is additive-only). `buildRunIdentity`
   * always sets it; absence means "written by an older build".
   */
  boundLinks?: RunIdentityLink[];
}

export type RunIdentityLink =
  | "input"
  | "rules"
  | "config"
  | "engine"
  | "commit"
  | "tree"
  | "lockfile"
  | "candidate";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
    .join(",")}}`;
}

export function buildRunIdentity(input: RunIdentityInput): RunIdentity {
  // Sorted, newline-joined line digests: order-insensitive inputs produce
  // order-stable identities (the same SET of files/rules is the same
  // snapshot, whatever readdir returned). Content hashes (when available)
  // detect edits that don't change file size.
  const inputFingerprint = sha256(
    [...input.files]
      .map((f) => (f.hash ? `${f.path}:${f.hash}` : `${f.path}:${f.size}`))
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
  // Verdict-affecting inputs: every non-undefined field that can change
  // the verdict for the same file set must be included in the scanId.
  // Non-semantic metadata (e.g. timestamps, process PIDs) is excluded.
  const verdictInputs: Record<string, unknown> = {
    inputFingerprint,
    rulesDigest,
    configFingerprint,
    engineVersion: input.engineVersion,
  };
  if (input.reportDigest) verdictInputs.reportDigest = input.reportDigest;
  // The repository binding (V5-010). These are verdict-affecting: the same
  // file contents built from a different commit, or resolved against a
  // different lockfile, are not the same run and must not share an identity.
  // `commit` was declared on RunIdentity for its whole life and never set,
  // which is G-V5-033: the identity claimed a binding it did not carry.
  if (input.commit !== undefined) verdictInputs.commit = input.commit;
  if (input.tree !== undefined) verdictInputs.tree = input.tree;
  if (input.lockfile !== undefined) verdictInputs.lockfile = input.lockfile;
  if (input.candidate !== undefined) {
    verdictInputs.candidate = {
      manifestId: input.candidate.manifestId,
      state: input.candidate.state,
      candidateSha: input.candidate.candidateSha,
      baseSha: input.candidate.baseSha,
      packageSha256: input.candidate.packageSha256,
      lockfileSha256: input.candidate.lockfileSha256,
    };
  }
  if (input.trustModelVersion !== undefined) {
    verdictInputs.trustModelVersion = input.trustModelVersion;
  }
  if (input.scoringModelVersion !== undefined) {
    verdictInputs.scoringModelVersion = input.scoringModelVersion;
  }
  if (input.frameworkSupportMatrixVersion !== undefined) {
    verdictInputs.frameworkSupportMatrixVersion =
      input.frameworkSupportMatrixVersion;
  }
  if (input.evidenceSchemaVersions !== undefined) {
    verdictInputs.evidenceSchemaVersions = [
      ...input.evidenceSchemaVersions,
    ].sort((a, b) => a - b);
  }
  if (input.suppressionFingerprint !== undefined) {
    verdictInputs.suppressionFingerprint = input.suppressionFingerprint;
  }
  if (input.policyFingerprint !== undefined) {
    verdictInputs.policyFingerprint = input.policyFingerprint;
  }
  if (input.historicalEvidenceFingerprint !== undefined) {
    verdictInputs.historicalEvidenceFingerprint =
      input.historicalEvidenceFingerprint;
  }
  const scanId = sha256(canonical(verdictInputs));
  const boundLinks: RunIdentityLink[] = ["input", "rules", "config", "engine"];
  if (input.commit !== undefined) boundLinks.push("commit");
  if (input.tree !== undefined) boundLinks.push("tree");
  if (input.lockfile !== undefined) boundLinks.push("lockfile");
  if (input.candidate !== undefined) boundLinks.push("candidate");

  return {
    scanId,
    inputFingerprint,
    rulesDigest,
    configFingerprint,
    engineVersion: input.engineVersion,
    boundLinks,
    ...(input.trustModelVersion !== undefined
      ? { trustModelVersion: input.trustModelVersion }
      : {}),
    ...(input.scoringModelVersion !== undefined
      ? { scoringModelVersion: input.scoringModelVersion }
      : {}),
    ...(input.frameworkSupportMatrixVersion !== undefined
      ? { frameworkSupportMatrixVersion: input.frameworkSupportMatrixVersion }
      : {}),
    ...(input.commit !== undefined ? { commit: input.commit } : {}),
    ...(input.tree !== undefined ? { tree: input.tree } : {}),
    ...(input.lockfile !== undefined ? { lockfile: input.lockfile } : {}),
    ...(input.candidate !== undefined ? { candidate: input.candidate } : {}),
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
  /**
   * The release candidate the verdict belongs to, when the run is bound to
   * one. Kept OUT of the chain links so the chain-law order stays
   * byte-stable for existing consumers, but present on the graph so a run
   * with no candidate is visible as a local observation rather than
   * release evidence.
   */
  candidate?: { manifestId: string; candidateSha: string | null };
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
  /** The release candidate this run belongs to, when it is one. */
  candidate?: { manifestId: string; candidateSha: string | null };
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
    ...(parts.candidate !== undefined
      ? {
          candidate: {
            manifestId: parts.candidate.manifestId,
            candidateSha: parts.candidate.candidateSha,
          },
        }
      : {}),
  };
}
