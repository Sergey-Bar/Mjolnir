/**
 * Generates docs/QUARANTINE-REMEDIATION.md (product-gap master plan P6 —
 * plan 1789009691197 R3): the ledger-first view of the quarantine tier.
 *
 * One row per LIVE quarantine rule (registry-derived, so it can never
 * drift from the code): failure-mode class, disposition, target
 * detectorRevision, and the re-measure gate state. A historical section
 * records the governed retirements (RETIRED_RULE_IDS). The failure-mode
 * class and disposition for the P6 rework set are evidence-derived from
 * the corpus verdict notes; every other row starts as "re-derive at its
 * wave" — the ledger is the working instrument, not a one-shot report.
 *
 * Drift-locked by tests/contract/quarantine-ledger.spec.ts.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { RULES, RETIRED_RULE_IDS } from "../src/rules/index.js";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import {
  CORE_FP_CEILING,
  QUARANTINE_FP_FLOOR,
  declaredDetectorRevision,
  effectiveTier,
  measurementInterval,
  samplesForZeroFp,
} from "../src/rules/measurement.js";
import type { QADoctorRule } from "../src/rules/rule.js";
import { compareCodePoints } from "../src/lib/compare.js";

const OUT_PATH = join(
  import.meta.dirname,
  "..",
  "docs",
  "QUARANTINE-REMEDIATION.md",
);

/**
 * Failure-mode class + disposition for the rules the corpus evidence
 * already adjudicates. Everything else is an open row — the ledger's
 * purpose is to make that visible, not to hide it behind prose.
 */
const DISPOSITIONS: Record<
  string,
  { failureMode: string; disposition: string; rework: string; target: string }
> = {
  "QA-ENV-001": {
    failureMode:
      "OS-path sub-pattern fired on deliberate path fixtures (unix-socket /tmp is OS-mandated; Windows paths were the SUBJECT of platform-detection tests) — 20/20 FP at n=20",
    disposition: "REWORKED (final attempt shipped)",
    rework:
      "detectorRevision 4: OS-path sub-pattern dropped (same undecidability as the wave-2 host drop); locale + local-time-getter families kept",
    target:
      "re-measure gate: corpus re-run + owner re-adjudication of surviving findings",
  },
  "QA-PW-147": {
    failureMode:
      "default-title regex fired on code-as-data — `test('test', …)` written as synthetic strings inside eslint-plugin unit tests — 20/20 FP at n=20",
    disposition: "REWORKED (final attempt shipped)",
    rework:
      "detectorRevision 2: AST arm fires only on REAL test/it CallExpressions with a default-title StringLiteral; code-as-data never parses as a call",
    target:
      "re-measure gate: corpus re-run + owner re-adjudication of surviving findings",
  },
  "QA-PY-007": {
    failureMode:
      "fired on single-statement raises blocks with specific exception types (the intended line is the only line) — 79.4% FP at n=34",
    disposition: "REWORKED (AST substrate)",
    rework:
      "detectorRevision 4: tree-sitter python gate — fires only on ≥2-statement with-blocks or broad root exception types; single-statement/specific-type suppressed",
    target:
      "re-measure gate: corpus re-run + owner re-adjudication of surviving findings",
  },
  "QA-TEST-003": {
    failureMode:
      "hidden-assertion helpers (`expectSnapshot`, `verify*` wrappers) and deliberate no-throw smoke tests dominate real fire sites; the detector cannot know a codebase's own assertion vocabulary from text alone — 21.8% FP at n=78",
    disposition: "OPEN — the proposed fix was measured and rejected",
    rework:
      "`families/no-assertions.ts` (7 framework vocabularies) was deleted 2026-10-01. Diffed against the rule's own predicate over 15 representative test bodies it changed 2, in BOTH directions: it suppresses `expect.extend(…)` (which defines a matcher rather than asserting) and reintroduces a false positive on `should(x).be.ok`. It is a framework-vocabulary gap, not the named cause, and the named cause is not lexically fixable",
    target:
      "re-measure gate: a corpus re-run + owner re-adjudication of surviving findings, against a fix that addresses hidden helpers rather than framework vocabulary",
  },
  "QA-TQUAL-009": {
    failureMode:
      "Cypress command chains (`cy.request().then()`) are queued and awaited by the Cypress driver; one deliberate `void` discard — 78.6% FP at n=14",
    disposition: "REWORKED (AST substrate)",
    rework:
      "detectorRevision 2: ts-morph arm skips `cy`-rooted chains and VoidExpression-wrapped chains; the plain unawaited-fetch diagnosis unchanged",
    target:
      "re-measure gate: corpus re-run + owner re-adjudication of surviving findings",
  },
};

function pct(id: string): string {
  const m = MEASURED_FP[id];
  if (!m) return "unmeasured";
  const rule = RULES.find((r) => r.id === id);
  const stale = rule
    ? m.detectorRevision !== declaredDetectorRevision(rule)
    : false;
  return `${(m.fpRate * 100).toFixed(1)}% (n=${m.n})${stale ? " — STALE (rev mismatch)" : ""}`;
}

/* ------------------------------------------------------------------ *
 * THE DISPOSITION REGISTRY — `docs/QUARANTINE-OWNERSHIP.json`
 *
 * `checkQuarantineOwnership` reports that N of 34 quarantined rules carry no
 * `quarantinePromotion`, and it says out loud that the count is "reported, not
 * gated: a cap here would have to start at 34 and be lowered as the field is
 * filled". That reasoning is right about a COUNT and wrong about the thing
 * itself: the defect is not that the number is 34, it is that 34 rules are
 * quarantined with no disposition recorded for any of them. A count can only
 * ratchet; a disposition can be decided, and 30 of these 34 are decidable from
 * evidence already committed.
 *
 * So this file records a TYPED disposition per quarantined rule, derived from
 * the measured rate and the ledger's evidence notes rather than asserted:
 *
 *   pending-measurement — no corpus evidence yet. Quarantine is the correct
 *     resting place and the exit is arithmetic: re-sample and the ladder in the
 *     ledger above decides the tier.
 *   pending-rework      — measured, and the measurement names a failure mode a
 *     detector change can address. Exit is a `detectorRevision` bump and a
 *     re-measure.
 *   pending-remeasure   — a rework already shipped; the corpus verdict predates
 *     it, so the measurement is stale by construction and only a re-run can
 *     decide.
 *   structural          — measured, and the evidence says the diagnosis is not
 *     decidable from the signal the rule has. Quarantine is the resting place;
 *     the exit is retiring the rule, not tuning it.
 *
 * The fourth kind is the one worth arguing about, so it is the one that names
 * its evidence: QA-TEST-003's proposed fix was implemented, measured, and
 * rejected — it changed 2 of 15 representative bodies in BOTH directions. A rule
 * whose only remediation has been tried and disproven is not "waiting for
 * someone to look"; it is waiting for a decision, and the decision is recorded.
 *
 * Every entry carries `expiresOn`. A disposition with no date is an open-ended
 * promise, which is the shape this whole file exists to replace.
 * ------------------------------------------------------------------ */

type Disposition =
  | "pending-measurement"
  | "pending-rework"
  | "pending-remeasure"
  | "pending-promotion"
  | "pending-samples"
  | "structural";

const OWNERSHIP_OUT = join(
  import.meta.dirname,
  "..",
  "docs",
  "QUARANTINE-OWNERSHIP.json",
);

/** The rules whose remediation has been tried and disproven. */
const STRUCTURAL: Record<string, string> = {
  "QA-TEST-003":
    "the proposed `families/no-assertions.ts` fix was implemented, measured and DELETED on 2026-10-01: diffed against the rule's own predicate over 15 representative test bodies it changed 2, in BOTH directions (suppressing `expect.extend(...)`, which defines a matcher, and reintroducing a false positive on `should(x).be.ok`). The cause is a framework-vocabulary gap that is not lexically decidable, so no detector revision reaches it. Exit is retire-or-narrow under RULE-LIFECYCLE, not another tuning pass.",
};

/** Rules whose rework has already shipped; the verdict predates it. */
const REWORKED = new Set(
  Object.keys(DISPOSITIONS).filter((id) => {
    const d = DISPOSITIONS[id];
    return d !== undefined && d.disposition.startsWith("REWORKED");
  }),
);

/**
 * The review horizon, named `expiresOn` rather than something disposition-flavoured.
 *
 * It is the same obligation `CorePromotion.expiresOn` is: the date on which this
 * record stops being true unless a person renews it. Using one name for one
 * concept is what lets the doctor's report name `owner`, `rationale` and
 * `expiresOn` as the three things a quarantined rule must supply — and
 * `quarantine-record-honesty.spec.ts` asserts the report names no field the
 * type does not declare. A second name for the same date would have made that
 * report either invent a field or go vague, and both are the failure that spec
 * was written to prevent.
 */
const EXPIRES_ON = "2026-11-01";

/**
 * The disposition, derived from the INTERVAL rather than from the rate.
 *
 * The first version of this branched on "is there a measurement?", which put
 * the twelve rules sitting at 0% FP over n=10..16 into `pending-rework` with the
 * rationale "the interval confidently exceeds the extended ceiling". That
 * rationale was false — at 0/10 the Wilson interval is roughly [0, 28%], which
 * supports NEITHER quarantine nor extended, and quoting a ceiling the interval
 * does not exceed would have been a fabricated argument in a file whose whole
 * purpose is that nobody has to fabricate one.
 *
 * Branching on the interval produces the answer that is actually true, and it
 * is the more useful one: those rules are quarantined while their evidence does
 * not support quarantine, so their exit is not sampling and not a detector
 * change. It is a `quarantinePromotion` — the owner deciding to trust the rule
 * before n reaches 35. That is what `CorePromotion` exists for, and it is the
 * one disposition that is a person's decision rather than a measurement's.
 */
function dispositionFor(rule: QADoctorRule): {
  kind: Disposition;
  rationale: string;
  evidenceRefs: string[];
} {
  const structural = STRUCTURAL[rule.id];
  if (structural !== undefined) {
    return {
      kind: "structural",
      rationale: structural,
      evidenceRefs: ["docs/QUARANTINE-REMEDIATION.md"],
    };
  }
  if (REWORKED.has(rule.id)) {
    return {
      kind: "pending-remeasure",
      rationale:
        "a detector rework has shipped and the committed verdict predates it, so the " +
        "measurement is stale by construction; only a corpus re-run plus owner " +
        "re-adjudication of the surviving findings can decide the tier",
      evidenceRefs: ["docs/QUARANTINE-REMEDIATION.md"],
    };
  }
  const interval = measurementInterval(rule);
  if (interval === undefined) {
    return {
      kind: "pending-measurement",
      rationale:
        "no corpus evidence has been collected for this rule, so quarantine is the " +
        "correct resting place and the exit is arithmetic: re-sample, and the ladder " +
        "in docs/QUARANTINE-REMEDIATION.md decides the tier from the interval",
      evidenceRefs: ["docs/QUARANTINE-REMEDIATION.md"],
    };
  }
  const band = `[${(interval.ciLow * 100).toFixed(1)}%, ${(interval.ciHigh * 100).toFixed(1)}%]`;
  if (interval.ciLow >= QUARANTINE_FP_FLOOR) {
    return {
      kind: "pending-rework",
      rationale:
        `95% interval ${band} sits at or above the ${(QUARANTINE_FP_FLOOR * 100).toFixed(0)}% ` +
        "quarantine floor — the rule is confidently observed wrong, so more samples move " +
        "the interval the wrong way. Exit is a detectorRevision bump and a re-measure",
      evidenceRefs: ["docs/QUARANTINE-REMEDIATION.md"],
    };
  }
  if (interval.ciHigh <= CORE_FP_CEILING) {
    return {
      kind: "pending-promotion",
      rationale:
        `95% interval ${band} is at or below the ${(CORE_FP_CEILING * 100).toFixed(0)}% core ` +
        "ceiling, so the measurement ALREADY supports core and quarantine is not evidence " +
        "against this rule — it is an absent decision. Exit is a `quarantinePromotion` " +
        "grant (owner + rationale + expiry) or, if the structural argument is stronger " +
        "than the sample, the same record with that argument as its basis",
      evidenceRefs: ["docs/QUARANTINE-REMEDIATION.md"],
    };
  }
  return {
    kind: "pending-samples",
    rationale:
      `95% interval ${band} spans the core ceiling, so the measurement neither confirms ` +
      `nor refutes the rule at n=${MEASURED_FP[rule.id]?.n ?? 0}. Exit is more clean ` +
      `samples — about ${samplesForZeroFp(CORE_FP_CEILING) - (MEASURED_FP[rule.id]?.n ?? 0)} ` +
      "of them if the rule is observed clean throughout",
    evidenceRefs: ["docs/QUARANTINE-REMEDIATION.md"],
  };
}

function buildOwnership(): string {
  const live = RULES.filter((r) => effectiveTier(r) === "quarantine").sort(
    (a, b) => compareCodePoints(a.id, b.id),
  );
  const entries = live.map((rule) => {
    const { kind, rationale, evidenceRefs } = dispositionFor(rule);
    return {
      ruleId: rule.id,
      disposition: kind,
      rationale,
      measured: pct(rule.id),
      owner: "mjolnir maintainer (docs/MAINTAINERS.md)",
      expiresOn: EXPIRES_ON,
      evidenceRefs,
    };
  });
  const byKind: Record<string, number> = {};
  for (const e of entries)
    byKind[e.disposition] = (byKind[e.disposition] ?? 0) + 1;

  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        generatedBy:
          "scripts/generate-quarantine-ledger.ts — regenerate with `npm run docs:quarantine-ledger`",
        note: [
          "One entry per LIVE quarantine rule. The point of this file is that a",
          "quarantined rule is never silent: it either carries a `quarantinePromotion`",
          "on the rule itself (the path to a tier) or a typed disposition here (the",
          "record of why it is still held).",
          "",
          "`disposition` is derived from the measured rate and the evidence notes in",
          "docs/QUARANTINE-REMEDIATION.md, not asserted by hand. `rationale` is the",
          "argument; `expiresOn` is the date a person has to renew it by, because a",
          "disposition with no date is the open-ended promise this file replaces.",
          "",
          "`src/commands/doctor.ts::checkQuarantineOwnership` FAILS when a quarantined",
          "rule appears in neither place. That is the difference from the count it used",
          "to report: a count can only ratchet, a disposition can be decided.",
        ].join("\n"),
        count: entries.length,
        byKind,
        entries,
      },
      null,
      2,
    ) + "\n"
  );
}

function escapeCell(s: string): string {
  return s.replaceAll("|", "\\|");
}

function buildLedger(): string {
  const lines: string[] = [];
  lines.push("# Quarantine Remediation Ledger");
  lines.push("");
  lines.push(
    "Generated from the live registry by `scripts/generate-quarantine-ledger.ts` — regenerate",
    "with `npm run docs:quarantine-ledger`. Hand edits to the tables are futile: the",
    "drift-lock test fails them. The failure-mode/disposition PROSE per row is the",
    "working record of each rule's evidence.",
    "",
  );
  lines.push(
    "Ladder (plan §11): a reworked rule re-enters the measured flow when its FP rate",
    "lands ≤ 30% (extended) or ≤ 10% (core) at n ≥ 10; a rule that stays ≥ 75% after",
    "its final attempt is retired under the governed path (RULE-LIFECYCLE).",
    "",
  );

  const live = RULES.filter((r) => r.tier === "quarantine");
  lines.push(`## Live quarantine rules: ${live.length} of ${RULES.length}`, "");
  lines.push(
    "| Rule | Detector | Measured FP | Failure-mode class (evidence) | Disposition |",
  );
  lines.push("| --- | --- | --- | --- | --- |");
  for (const rule of [...live].sort((a, b) => compareCodePoints(a.id, b.id))) {
    const d = DISPOSITIONS[rule.id];
    const measured = pct(rule.id);
    const mode = d
      ? d.failureMode
      : "re-derive at its wave (no corpus evidence yet)";
    const disp = d ? `${d.disposition} — ${d.rework}; ${d.target}` : "open";
    lines.push(
      `| ${rule.id} | ${escapeCell(String(rule.detectionStrategy))} | ${escapeCell(measured)} | ${escapeCell(mode)} | ${escapeCell(disp)} |`,
    );
  }
  lines.push("");

  lines.push("## Historical: governed retirements");
  lines.push("");
  lines.push(
    `${RETIRED_RULE_IDS.length} rules have been retired under the governed path`,
    "(RULE-LIFECYCLE: measured ≥ 75% FP after rework attempts, or superseded).",
    "Retired IDs live in `src/rules/index.ts` (`RETIRED_RULE_IDS`); the full",
    "adjudication history per ID is in `docs/FP-AUDIT.md` and the corpus",
    "verdict archive (`tests/corpus/verdicts/archive/`).",
    "",
  );
  for (const id of RETIRED_RULE_IDS) {
    lines.push(`- ${id}`);
  }
  lines.push("");
  return lines.join("\n");
}

// Drift-lock support: the spec imports the generator's output through
// this pure function; the write runs only when executed directly.
export function renderLedger(): string {
  return buildLedger();
}

/** Prettier-formatted commit render (the docs tree is prettier-gated). */
export async function renderForCommit(): Promise<string> {
  const prettier = await import("prettier");
  return prettier.format(renderLedger(), { parser: "markdown" });
}

/**
 * The disposition registry, for the drift-lock to compare against.
 *
 * Exported rather than only written so `tests/contract/quarantine-ledger.spec.ts`
 * can assert the committed JSON matches a fresh derivation the same way it
 * asserts the markdown does — a registry that is regenerated on a schedule but
 * never checked is a report, not a gate.
 */
export function renderOwnership(): string {
  return buildOwnership();
}

if (process.argv[1]?.endsWith("generate-quarantine-ledger.ts")) {
  renderForCommit()
    .then((md) => {
      writeFileSync(OUT_PATH, md);
      writeFileSync(OWNERSHIP_OUT, buildOwnership());
      console.log(
        "Wrote docs/QUARANTINE-REMEDIATION.md and docs/QUARANTINE-OWNERSHIP.json",
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(20);
    });
}
