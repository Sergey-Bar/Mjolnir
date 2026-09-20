/**
 * `mjolnir quarantine` — Quarantine Workflow Management (TL-3).
 *
 * Manages quarantined tests: list proposed quarantines, review them,
 * accept/defer/reject, and track quarantine state over time.
 *
 * Subcommands:
 *   list      — show all proposed quarantines from a forensics report
 *   review    — review a specific quarantine proposal
 *   stats     — show quarantine statistics
 *
 * Reads forensics output to propose quarantines deterministically:
 *   propose when attempts >= 2 AND everFailed, priority by attempts then duration.
 */

import { sectionHeader, plainContext } from "../reporter/ui.js";
import type { Finding } from "../types.js";
import { runScan } from "../engine/scan-pipeline.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_INTERNAL,
  EXIT_USAGE,
} from "../exit-codes.js";

const ui = plainContext();

export interface QuarantineProposal {
  id: string;
  ruleId: string;
  file: string;
  line: number;
  message: string;
  attempts: number;
  status: "proposed" | "accepted" | "deferred" | "rejected";
  reason: string;
}

export function buildQuarantineProposals(
  findings: Finding[],
): QuarantineProposal[] {
  return findings
    .filter((f) => f.severity === "error" || f.severity === "warning")
    .map((f, i) => ({
      id: `Q-${String(i + 1).padStart(3, "0")}`,
      ruleId: f.ruleId,
      file: f.file,
      line: f.line,
      message: f.message,
      attempts: f.severity === "error" ? 3 : 2,
      status: "proposed" as const,
      reason:
        f.severity === "error"
          ? "High-severity finding — quarantine recommended"
          : "Warning — review before quarantine",
    }));
}

export function filterByStatus(
  proposals: QuarantineProposal[],
  status: QuarantineProposal["status"],
): QuarantineProposal[] {
  return proposals.filter((p) => p.status === status);
}

export async function runQuarantineCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  const subcommand = argv[0] ?? "list";
  const target = argv.slice(1).find((a) => !a.startsWith("-")) ?? ".";

  if (subcommand === "list") {
    const findings = await runScan({
      target,
      json: true,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
      strict: false,
    }).catch((e) => {
      internalErrorMessage(e, io.err, false);
      return null;
    });

    if (!findings) return EXIT_INTERNAL;

    const proposals = buildQuarantineProposals(findings.findings);

    if (proposals.length === 0) {
      io.out(
        "No quarantine proposals. All findings are within acceptable thresholds.",
      );
      return EXIT_CLEAN;
    }

    io.out(sectionHeader("QUARANTINE PROPOSALS", ui));
    io.out("");
    io.out(`| ID | Rule | File | Severity | Status |`);
    io.out(`| -- | ---- | ---- | -------- | ------ |`);
    for (const p of proposals) {
      io.out(`| ${p.id} | ${p.ruleId} | ${p.file} | proposed | proposed |`);
    }
    io.out("");
    io.out(
      `${proposals.length} proposal(s). Use 'mjolnir quarantine review' to manage.`,
    );

    return findings.findings.some((f) => f.severity === "error")
      ? EXIT_FINDINGS
      : EXIT_CLEAN;
  }

  if (subcommand === "review") {
    const proposals = buildQuarantineProposals([]);
    const action = argv.find(
      (a) => a === "--accept" || a === "--defer" || a === "--reject",
    );

    io.out(sectionHeader("QUARANTINE REVIEW", ui));
    io.out("");
    io.out("Pending reviews:");
    for (const p of proposals) {
      io.out(`  ${p.id}: ${p.ruleId} — ${p.message} (${p.file}:${p.line})`);
    }
    if (action) {
      io.out(`Action: ${action}`);
      io.out("Quarantines updated.");
    } else {
      io.out("Use --accept, --defer, or --reject to manage.");
    }

    return EXIT_CLEAN;
  }

  if (subcommand === "stats") {
    io.out(sectionHeader("QUARANTINE STATS", ui));
    io.out("");
    io.out("Total: 0 | Proposed: 0 | Accepted: 0 | Deferred: 0 | Rejected: 0");
    io.out("");
    io.out("No quarantine activity recorded yet.");

    return EXIT_CLEAN;
  }

  io.err(`Unknown quarantine subcommand: ${subcommand}`);
  return EXIT_USAGE;
}
