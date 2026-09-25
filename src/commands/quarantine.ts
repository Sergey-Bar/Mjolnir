/**
 * `mjolnir quarantine` — quarantined-test workflow.
 *
 * What changed, and why: this command derived a quarantine "proposal" from a
 * STATIC scan by inventing an attempt count from severity (`attempts: 3` for an
 * error, `2` for a warning), then printed "Quarantines updated." after an
 * action that changed nothing, and printed hardcoded zeros as if they were
 * measured statistics. A quarantine decision is a claim about a flaky test's
 * runtime behaviour; a static scan has no runtime behaviour to claim, so it
 * cannot produce one.
 *
 * It now refuses to invent. Proposals require runtime evidence (attempts and
 * an observed failure) from a saved forensics report; without one it says so
 * and points at `mjolnir forensics`. There is no quarantine store yet — the
 * ledger this belongs in is the suppression ledger (see
 * docs/RELEASE-TRAINS.md, V5-090) — so nothing claims to be updated.
 *
 * Scheduled for removal in 5.0.
 */

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import { sectionHeader, plainContext } from "../reporter/ui.js";
import type { Finding } from "../types.js";
import type { Output } from "../cli-io.js";
import { unmeasuredClaim } from "../claim-evidence.js";
import { EXIT_USAGE } from "../exit-codes.js";

const ui = plainContext();

export interface QuarantineProposal {
  id: string;
  ruleId: string;
  file: string;
  line: number;
  message: string;
  /**
   * Observed attempts from a RUNTIME report. Never derived from severity —
   * a static finding has no attempts, and inventing them made every proposal
   * look equally flaky.
   */
  attempts: number;
  everFailed: boolean;
  status: "proposed" | "accepted" | "deferred" | "rejected";
  reason: string;
}

/** The runtime evidence a proposal requires, and cannot be faked from. */
export interface RuntimeFailureEvidence {
  ruleId: string;
  file: string;
  line: number;
  message: string;
  attempts: number;
  everFailed: boolean;
}

interface ForensicsFlakyRecord {
  [key: string]: unknown;
  title?: unknown;
  file?: unknown;
  line?: unknown;
  message?: unknown;
  attempts?: unknown;
  everFailed?: unknown;
  failureCount?: unknown;
}

const CANDIDATE_KEYS = [
  "flaky",
  "flakyTests",
  "tests",
  "retries",
  "failures",
  "results",
] as const;

function asRecord(value: unknown): ForensicsFlakyRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  return value as ForensicsFlakyRecord;
}

/**
 * Extract runtime failure evidence from a saved forensics report. A record
 * without an observed attempt count is not evidence and is dropped rather than
 * defaulted.
 */
export function runtimeFailuresFromReport(
  parsed: unknown,
): RuntimeFailureEvidence[] {
  const root = asRecord(parsed);
  if (!root) return [];
  const candidates: unknown[] = [];
  for (const key of CANDIDATE_KEYS) {
    const value = root[key];
    if (Array.isArray(value)) candidates.push(...(value as unknown[]));
  }

  const evidence: RuntimeFailureEvidence[] = [];
  for (const candidate of candidates) {
    const record = asRecord(candidate);
    if (!record) continue;
    const attempts =
      typeof record.attempts === "number"
        ? record.attempts
        : typeof record.failureCount === "number"
          ? record.failureCount
          : undefined;
    if (attempts === undefined) continue;
    const file = typeof record.file === "string" ? record.file : undefined;
    if (!file) continue;
    evidence.push({
      ruleId: typeof record.title === "string" ? record.title : "UNKNOWN",
      file,
      line: typeof record.line === "number" ? record.line : 0,
      message:
        typeof record.message === "string"
          ? record.message
          : "no message recorded",
      attempts,
      everFailed: record.everFailed === true || attempts > 0,
    });
  }
  return evidence;
}

export function buildQuarantineProposals(
  evidence: RuntimeFailureEvidence[],
): QuarantineProposal[] {
  return evidence
    .filter((item) => item.attempts >= 2 && item.everFailed)
    .sort(
      (a, b) =>
        b.attempts - a.attempts ||
        a.file.localeCompare(b.file) ||
        a.line - b.line,
    )
    .map((item, index) => ({
      id: `Q-${String(index + 1).padStart(3, "0")}`,
      ruleId: item.ruleId,
      file: item.file,
      line: item.line,
      message: item.message,
      attempts: item.attempts,
      everFailed: item.everFailed,
      status: "proposed" as const,
      reason: `${item.attempts} observed attempt(s) with a recorded failure — runtime evidence, not inferred from severity`,
    }));
}

export function filterByStatus(
  proposals: QuarantineProposal[],
  status: QuarantineProposal["status"],
): QuarantineProposal[] {
  return proposals.filter((p) => p.status === status);
}

/** Static findings carry no runtime evidence and must never become proposals. */
export function proposalsFromStaticFindings(
  _findings: Finding[],
): QuarantineProposal[] {
  return [];
}

function readReport(
  path: string,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  const root = resolve(path);
  if (!existsSync(root)) return { ok: false, reason: `no such file: ${path}` };
  try {
    return {
      ok: true,
      value: JSON.parse(readFileSync(root, "utf8")) as unknown,
    };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "unreadable report",
    };
  }
}

export function runQuarantineCommand(
  argv: string[],
  io: { out: Output; err: Output },
): number {
  const subcommand = argv[0] ?? "list";
  const rest = argv.slice(1);
  const target = rest.find((a) => !a.startsWith("-")) ?? ".";
  const reportIdx = rest.indexOf("--from");

  if (subcommand === "list") {
    if (reportIdx === -1 || !rest[reportIdx + 1]) {
      io.out(sectionHeader("QUARANTINE PROPOSALS", ui));
      io.out("");
      io.out("No runtime report supplied, so no proposals can be produced.");
      io.out(
        "A quarantine proposal asserts that a test actually failed more than once. A static scan has no runtime behaviour to observe, so Mjölnir will not invent one.",
      );
      io.out("");
      io.out(
        "Produce one: mjolnir forensics <results-dir> && mjolnir quarantine list --from <report.json>",
      );
      return unmeasuredClaim(
        "quarantine list",
        "proposals require observed runtime failures, and no forensics report was supplied.",
      ).exitCode;
    }

    const reportPath = rest[reportIdx + 1] as string;
    const reportRoot = resolve(target);
    const requested = resolve(reportPath);
    const rel = relative(reportRoot, requested);
    if (isAbsolute(rel) || rel.startsWith("..")) {
      io.err(
        "mjolnir quarantine: --from report must stay within the target root",
      );
      return EXIT_USAGE;
    }
    const report = readReport(reportPath);
    if (!report.ok) {
      io.err(`mjolnir quarantine: cannot read report: ${report.reason}`);
      return EXIT_USAGE;
    }
    const evidence = runtimeFailuresFromReport(report.value);
    const proposals = buildQuarantineProposals(evidence);

    io.out(sectionHeader("QUARANTINE PROPOSALS", ui));
    io.out("");
    if (proposals.length === 0) {
      io.out(
        `0 proposal(s) from ${evidence.length} runtime record(s). Nothing in this report shows a test failing more than once.`,
      );
      return unmeasuredClaim(
        "quarantine list",
        "no runtime record met the observed-failure threshold; an empty proposal list is not a clean test suite.",
      ).exitCode;
    }
    io.out("| ID | Attempts | Test | File | Status |");
    io.out("| -- | -------- | ---- | ---- | ------ |");
    for (const p of proposals) {
      io.out(
        `| ${p.id} | ${p.attempts} | ${p.ruleId} | ${p.file}:${p.line} | ${p.status} |`,
      );
    }
    io.out("");
    io.out(
      `${proposals.length} proposal(s) from observed runtime failures. Accepting one is a human decision this command does not make.`,
    );
    return unmeasuredClaim(
      "quarantine list",
      "proposals are a human decision queue, not an enforced gate.",
    ).exitCode;
  }

  if (subcommand === "review") {
    // There is no quarantine store. The old implementation printed an empty
    // "Pending reviews" list and then claimed "Quarantines updated."
    io.out(sectionHeader("QUARANTINE REVIEW", ui));
    io.out("");
    io.out(
      "No quarantine store exists, so there is nothing to review and nothing was changed.",
    );
    io.out(
      "Quarantine state lives in the suppression ledger: edit .mjolnir/suppressions.json, where every entry is versioned, justified, and subject to expiry.",
    );
    return unmeasuredClaim(
      "quarantine review",
      "the command is a placeholder; the ledger is the source of truth.",
    ).exitCode;
  }

  if (subcommand === "stats") {
    io.out(sectionHeader("QUARANTINE STATS", ui));
    io.out("");
    io.out("No quarantine store exists, so no statistics can be reported.");
    io.out(
      "Printing zeros here would look like a measured absence of flakiness. It is not one.",
    );
    io.out("");
    io.out(
      "Run `mjolnir trust-trend` for measured history, or read .mjolnir/suppressions.json for the current suppression ledger.",
    );
    return unmeasuredClaim(
      "quarantine stats",
      "no store exists to measure; zeros would be a fabricated statistic.",
    ).exitCode;
  }

  io.err(`Unknown quarantine subcommand: ${subcommand}`);
  return EXIT_USAGE;
}
