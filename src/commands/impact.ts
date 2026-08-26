/**
 * `qa-doctor impact` — Sprint 6 Task 23 (Master-Stabilization-Plan.md).
 *
 * Answers "what would have burned you": compares the current scan against
 * an earlier point in this repo's own git history and reports anti-patterns
 * that were actually removed (evidence: findings present at the base ref,
 * absent now, backed by a real file+message match) plus new debt introduced
 * since then. That is the entire honesty-safe surface this command can
 * stand behind with real evidence.
 *
 * HARD CONSTRAINT (Honesty Core, non-negotiable per the plan): every number
 * here is evidence-backed from data actually present on disk, or the field
 * is UNKNOWN. This command never estimates or extrapolates "hours saved" or
 * "CI minutes saved" — inventing such a number would be worse than useless,
 * it would be the exact kind of fake-precision this product exists to
 * catch in *other* tools. Local-only, zero network (verified by
 * tests/privacy-network-isolation.spec.ts, which scans this file too).
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { Finding, ScanResult } from "../types.js";

export interface ImpactFinding {
  ruleId: string;
  file: string;
  message: string;
}

export interface ImpactReport {
  /** True when a comparison could be made at all. */
  hasComparison: boolean;
  /** Why comparison was impossible, when hasComparison is false. */
  unknownReason?: string;
  baseRef?: string;
  headRef?: string;
  /** Anti-patterns present at baseRef, gone now — real, evidence-backed fixes. */
  resolved: ImpactFinding[];
  /** Anti-patterns present now, absent at baseRef — new debt since baseRef. */
  introduced: ImpactFinding[];
  /**
   * CI-artifact-derived facts (hard sleeps removed, tests un-skipped, etc.)
   * that require locally-available run data this command did not find.
   * Always populated — never silently omitted — so the report is explicit
   * about what it does NOT know rather than pretending everything's covered.
   */
  unknownFacts: string[];
}

function git(root: string, args: string[]): string | null {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 30_000,
    });
  } catch {
    return null;
  }
}

/** Fingerprint a finding for cross-commit matching (line numbers shift). */
function fingerprint(f: Pick<Finding, "ruleId" | "file" | "message">): string {
  return `${f.ruleId}\u0000${f.file}\u0000${f.message}`;
}

export interface ComputeImpactOptions {
  /** Defaults to HEAD~1, falling back to the merge-base with baseBranch. */
  since?: string;
  baseBranch?: string;
  /** Injectable for tests — defaults to the real runScan from cli.ts. */
  runScan: (target: string) => ScanResult;
}

export function computeImpact(
  root: string,
  options: ComputeImpactOptions,
): ImpactReport {
  const unknownFacts: string[] = [
    "CI minutes or engineer-hours saved: not computed — this repo does not " +
      "store historical CI run duration locally, and this command never " +
      "estimates a number it cannot prove.",
  ];

  if (!existsSync(join(root, ".git"))) {
    return {
      hasComparison: false,
      unknownReason: "not-a-git-repo",
      resolved: [],
      introduced: [],
      unknownFacts,
    };
  }

  let baseRef = options.since;
  if (!baseRef) {
    baseRef =
      git(root, ["rev-parse", "HEAD~1"])?.trim() ??
      git(root, ["merge-base", "HEAD", options.baseBranch ?? "main"])?.trim() ??
      undefined;
  } else {
    // Resolve whatever ref the caller passed to a concrete commit sha so
    // the report can state exactly what was compared.
    baseRef = git(root, ["rev-parse", baseRef])?.trim() ?? baseRef;
  }
  if (!baseRef) {
    return {
      hasComparison: false,
      unknownReason: "no-prior-commit",
      resolved: [],
      introduced: [],
      unknownFacts,
    };
  }

  const headRef = git(root, ["rev-parse", "HEAD"])?.trim() ?? "HEAD";
  if (baseRef === headRef) {
    return {
      hasComparison: false,
      unknownReason: options.since ? "base-equals-head" : "no-prior-commit",
      baseRef,
      headRef,
      resolved: [],
      introduced: [],
      unknownFacts,
    };
  }

  // Materialize the historical tree into a real temp directory by walking
  // git's own tree listing and writing each blob via `git show <ref>:<path>`
  // — deliberately avoids depending on an external archive/extract tool
  // (tar/unzip) beyond git itself, which --scope changed already requires.
  // Then scan it with the exact same rule engine used for the current
  // scan: the only way to get an honest historical finding set without
  // reimplementing the engine against raw blobs.
  let tmpDir: string | undefined;
  let baseResult: ScanResult;
  try {
    tmpDir = mkdtempSync(join(tmpdir(), "qa-doctor-impact-"));
    const treeListing = git(root, [
      "ls-tree",
      "-r",
      "--name-only",
      "-z",
      baseRef,
    ]);
    if (treeListing === null) {
      return {
        hasComparison: false,
        unknownReason: "tree-listing-failed",
        baseRef,
        headRef,
        resolved: [],
        introduced: [],
        unknownFacts,
      };
    }
    const paths = treeListing.split("\0").filter(Boolean);
    // Bound the amount of work for very large repos — this is a supporting
    // diagnostic command, not the primary scan path.
    const MAX_FILES = 20_000;
    for (const relPath of paths.slice(0, MAX_FILES)) {
      const blob = git(root, ["show", `${baseRef}:${relPath}`]);
      if (blob === null) continue; // binary/undecodable — skip, not fatal
      const dest = join(tmpDir, relPath);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, blob);
    }
    baseResult = options.runScan(tmpDir);
  } catch {
    return {
      hasComparison: false,
      unknownReason: "tree-materialize-failed",
      baseRef,
      headRef,
      resolved: [],
      introduced: [],
      unknownFacts,
    };
  } finally {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* best-effort cleanup */
      }
    }
  }

  const headResult = options.runScan(root);

  const baseSet = new Map<string, Finding>();
  for (const f of baseResult.findings) baseSet.set(fingerprint(f), f);
  const headSet = new Map<string, Finding>();
  for (const f of headResult.findings) headSet.set(fingerprint(f), f);

  const resolved: ImpactFinding[] = [];
  for (const [key, f] of baseSet) {
    if (!headSet.has(key)) {
      resolved.push({ ruleId: f.ruleId, file: f.file, message: f.message });
    }
  }
  const introduced: ImpactFinding[] = [];
  for (const [key, f] of headSet) {
    if (!baseSet.has(key)) {
      introduced.push({ ruleId: f.ruleId, file: f.file, message: f.message });
    }
  }

  return {
    hasComparison: true,
    baseRef,
    headRef,
    resolved: resolved.sort((a, b) => a.file.localeCompare(b.file)),
    introduced: introduced.sort((a, b) => a.file.localeCompare(b.file)),
    unknownFacts,
  };
}

export function renderImpact(report: ImpactReport): string {
  const lines: string[] = [];
  lines.push("▚▞ IMPACT REPORT");
  lines.push("");

  if (!report.hasComparison) {
    lines.push(
      `UNKNOWN — no comparison could be made (${report.unknownReason ?? "unknown reason"}).`,
    );
    lines.push(
      "This is reported as UNKNOWN rather than a fabricated zero: qa-doctor",
    );
    lines.push("never invents a number it cannot prove.");
    lines.push("");
    for (const fact of report.unknownFacts) lines.push(`UNKNOWN: ${fact}`);
    return lines.join("\n");
  }

  lines.push(
    `Comparing ${report.baseRef?.slice(0, 12)} → ${report.headRef?.slice(0, 12)}`,
  );
  lines.push("");

  if (report.resolved.length === 0) {
    lines.push("FIXED SINCE BASE: none found.");
  } else {
    lines.push(
      `FIXED SINCE BASE (${report.resolved.length}) — real, evidence-backed:`,
    );
    for (const f of report.resolved) {
      lines.push(`  ✓ ${f.ruleId} · ${f.file} — ${f.message}`);
    }
  }
  lines.push("");

  if (report.introduced.length === 0) {
    lines.push("NEW DEBT SINCE BASE: none found.");
  } else {
    lines.push(`NEW DEBT SINCE BASE (${report.introduced.length}):`);
    for (const f of report.introduced) {
      lines.push(`  + ${f.ruleId} · ${f.file} — ${f.message}`);
    }
  }
  lines.push("");

  for (const fact of report.unknownFacts) lines.push(`UNKNOWN: ${fact}`);

  return lines.join("\n");
}
