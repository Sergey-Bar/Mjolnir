/**
 * Zero-config evidence discovery (Mega MVP Master Plan v3.1 §26 WI-11).
 *
 * Extends discoverRuntimeReport from 2 conventions to a full search of
 * the evidence conventions real repos produce — WITHOUT ever guessing:
 * every discovered artifact must parse as the format its location
 * claims, and a scan with NO evidence reports explicitly what is
 * missing (the §16/§5 evidence-state vocabulary — absence is a state,
 * not a failure).
 *
 * Discovery is read-only and bounded (depth ≤ 2, no node_modules) —
 * zero-config must stay fast (time-to-first-trust budget, plan §20).
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** A discovered evidence artifact candidate on disk. */
export interface EvidenceCandidate {
  /** Absolute path of the artifact. */
  path: string;
  /** What convention produced it. */
  convention:
    | "mjolnir-report" // packages/playwright-reporter default output
    | "playwright-json" // PW JSON reporter outputs
    | "test-results-dir" // PW test-results directory
    | "junit-file"; // JUnit XML outputs
}

/**
 * Conventional artifact names searched, in priority order. Anything
 * not in this list is NOT discovered — zero-config finds evidence, it
 * does not vacuum every .json file on disk.
 */
export const EVIDENCE_CONVENTIONS: readonly {
  convention: EvidenceCandidate["convention"];
  kind: "file" | "dir";
  names: readonly string[];
}[] = [
  {
    convention: "mjolnir-report",
    kind: "file",
    names: ["mjolnir.report.json"],
  },
  {
    convention: "playwright-json",
    kind: "file",
    names: [
      "report.json",
      "playwright-report.json",
      "results.json",
      "pw-report.json",
    ],
  },
  {
    convention: "test-results-dir",
    kind: "dir",
    names: ["test-results"],
  },
  {
    convention: "junit-file",
    kind: "file",
    names: ["junit-report.xml", "junit.xml"],
  },
];

const SEARCH_DEPTH = 2;
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".mjolnir",
  "dist",
  "coverage",
]);

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name))
      .map((e) => join(dir, e.name));
  } catch {
    return [];
  }
}

/**
 * Enumerate evidence candidates across the scan root (depth ≤ 2).
 * Deterministic: sorted by (depth, path).
 */
export function discoverEvidenceCandidates(
  scanRoot: string,
): EvidenceCandidate[] {
  const out: EvidenceCandidate[] = [];
  const levels: string[][] = [[scanRoot]];
  for (let depth = 0; depth <= SEARCH_DEPTH; depth++) {
    const next: string[] = [];
    for (const dir of levels[depth] ?? []) {
      for (const conv of EVIDENCE_CONVENTIONS) {
        for (const name of conv.names) {
          const p = join(dir, name);
          if (!existsSync(p)) continue;
          const st = statSync(p);
          if (conv.kind === "dir" ? st.isDirectory() : st.isFile()) {
            out.push({ path: p, convention: conv.convention });
          }
        }
      }
      if (depth < SEARCH_DEPTH) next.push(...listDirs(dir));
    }
    levels.push(next);
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** Explicit statement of what a scan with no evidence is missing (§16). */
export function missingEvidenceMessage(scanRoot: string): string | undefined {
  return (
    `no runtime evidence discovered under ${scanRoot} ` +
    `(looked for ${EVIDENCE_CONVENTIONS.map((c) => c.names.join(" / ")).join(", ")} at depth ≤ ${SEARCH_DEPTH}) — ` +
    `findings are static-only; trust caps at L2. ` +
    `Run your tests with a JSON/JUnit reporter to enable L3–L5 corroboration.`
  );
}
