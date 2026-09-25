/**
 * `mjolnir maturity` — organizational QA-maturity signals.
 *
 * What changed, and why: this command used to emit an "Overall: Optimizing
 * (87/100)" style assessment derived from whether three files happened to
 * exist, with hardcoded dimension scores (75/70/65/30) and a `ruleCount = 79`
 * fallback invented when a catalog could not be read. A file-existence proxy
 * is not a maturity measurement, and a number with no provenance is worse than
 * no number: it is a decision someone else will make on.
 *
 * It now reports what it can actually observe — the presence of specific,
 * named QA artifacts — and states that the artifact is a signal, not a score.
 * There is no overall score, because Mjölnir cannot measure organizational
 * maturity. Scheduled for removal in 5.0; see docs/RELEASE-TRAINS.md.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { sectionHeader, plainContext } from "../reporter/ui.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import { unmeasuredClaim } from "../claim-evidence.js";
import { EXIT_INTERNAL, EXIT_USAGE } from "../exit-codes.js";

const ui = plainContext();

/** A named, checkable artifact. Presence is the observation; nothing more. */
interface MaturitySignal {
  id: string;
  question: string;
  /** The path whose existence is the observation. */
  path: string;
  /** What its presence does and does not tell you. */
  says: string;
  doesNotSay: string;
}

const SIGNALS: readonly MaturitySignal[] = [
  {
    id: "policy",
    question: "Is a Mjölnir policy file committed?",
    path: ".mjolnir/mjolnir.policy.json",
    says: "a policy file exists in this checkout",
    doesNotSay: "that the policy is enforced, current, or correct",
  },
  {
    id: "suppressions",
    question: "Is a suppression ledger committed?",
    path: ".mjolnir/suppressions.json",
    says: "suppressions are tracked as data",
    doesNotSay: "that the suppressions are justified or still needed",
  },
  {
    id: "history",
    question: "Are previous runs recorded?",
    path: ".mjolnir/stats.json",
    says: "run history exists in this checkout",
    doesNotSay: "that the history is complete, or that anyone reviewed it",
  },
  {
    id: "baseline",
    question: "Is a scan baseline committed?",
    path: ".mjolnir/baseline.json",
    says: "a baseline exists to diff against",
    doesNotSay: "that the baseline was taken from a clean, complete scan",
  },
  {
    id: "rule-catalog",
    question: "Is the generated rule catalog committed?",
    path: "docs/rules/catalog.md",
    says: "generated rule documentation is in the repository",
    doesNotSay: "how many rules are enabled, measured, or certified",
  },
] as const;

export interface MaturitySignalResult {
  id: string;
  question: string;
  path: string;
  present: boolean;
  says: string;
  doesNotSay: string;
}

export function assessMaturitySignals(root: string): MaturitySignalResult[] {
  return SIGNALS.map((signal) => ({
    id: signal.id,
    question: signal.question,
    path: signal.path,
    present: existsSync(join(root, signal.path)),
    says: signal.says,
    doesNotSay: signal.doesNotSay,
  }));
}

const MATURITY_LEVELS = [
  "Initial",
  "Managed",
  "Defined",
  "Quantitatively Managed",
  "Optimizing",
] as const;

export function runMaturityCommand(
  argv: string[],
  io: { out: Output; err: Output },
): number {
  const subcommand = argv[0] ?? "assess";
  const target = argv.slice(1).find((a) => !a.startsWith("-")) ?? ".";

  if (subcommand === "levels") {
    io.out(sectionHeader("MATURITY LEVELS", ui));
    io.out("");
    for (let i = 0; i < MATURITY_LEVELS.length; i++) {
      io.out(`${i + 1}. ${MATURITY_LEVELS[i]}`);
    }
    io.out("");
    io.out(
      "These are vocabulary only. Mjölnir does not place a repository on this scale: it observes named artifacts and reports which are present.",
    );
    return unmeasuredClaim(
      "maturity levels",
      "A maturity level is a judgement, not a measurement.",
    ).exitCode;
  }

  if (subcommand === "assess") {
    if (!existsSync(target)) {
      io.err(`Maturity target does not exist: ${target}`);
      return EXIT_USAGE;
    }

    try {
      const signals = assessMaturitySignals(target);
      const present = signals.filter((signal) => signal.present).length;

      io.out(sectionHeader("QA ARTIFACT SIGNALS", ui));
      io.out(
        `Target: ${target} · ${present}/${signals.length} named artifacts present`,
      );
      io.out(
        "No overall score: Mjölnir cannot measure organizational maturity.",
      );
      io.out("");

      for (const signal of signals) {
        io.out(
          `${signal.present ? "[present]" : "[absent]"}  ${signal.question}`,
        );
        io.out(`    path: ${signal.path}`);
        io.out(`    presence says: ${signal.says}`);
        io.out(`    presence does NOT say: ${signal.doesNotSay}`);
      }

      return unmeasuredClaim(
        "maturity",
        "These are artifact-presence signals, not a maturity assessment, so no clean result is reported.",
      ).exitCode;
    } catch (e) {
      internalErrorMessage(e, io.err, false);
      return EXIT_INTERNAL;
    }
  }

  io.err(`Unknown maturity subcommand: ${subcommand}`);
  return EXIT_USAGE;
}
