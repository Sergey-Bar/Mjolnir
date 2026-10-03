#!/usr/bin/env tsx
/**
 * Conformity Monkey for the rule registry.
 *
 * Marks every rule that fails a declared check, names the check and the reason,
 * and fails on any nonconformity that is not covered by a LIVE opt-out in
 * `docs/conformity-opt-outs.json`. Four of the rules come from
 * `src/rules/conformity.ts`, which is where the reasoning lives.
 *
 * The shape is Netflix's, deliberately:
 *
 *   - the machine decides, every run, for every rule. Nothing waits for a
 *     person to have an afternoon;
 *   - the response is the human's, and the only way to make this gate green for
 *     a known defect is to record an opt-out with an owner, a checkable reason
 *     and a DATE IT LAPSES;
 *   - `--leashed` runs every check, writes the report, and exits 0. That is the
 *     mode a new check ships in: arming is a separate, deliberate act.
 *
 * WHY NOT A GATE THAT JUST FAILS. Sixty-two of seventy-nine rules fail at least
 * one check today. A gate that went red on all of them would stay red and read
 * as noise — which is how raising `MAX_SAMPLES_PER_RULE` produced 1,121
 * unadjudicated rows nobody looked at. The opt-out registry is the alternative:
 * the debt is enumerated, owned and dated, and the gate then fails on anything
 * new AND on anything whose date has passed. That second failure is the whole
 * mechanism, because it is what stops known debt from persisting by not being
 * looked at.
 *
 * WHY IT IS NOT THE CORPUS FALSE-POSITIVE RATE. That measurement asks a human
 * "is this code legitimate?", which is the one question no tree can answer, and
 * deriving it from the detector's own declaration would be circular: the
 * detector fired, so the detector is right, so every rule's rate is zero. This
 * gate therefore checks what the tree CAN answer, and leaves the opinion to
 * where it already was.
 *
 * Usage: tsx scripts/check-conformity.ts [--leashed] [--write-baseline]
 *                [--opt-outs=<path>] [--today=YYYY-MM-DD]
 * Exit codes: 0 = every nonconformity is covered by a live opt-out, 1 = not.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import {
  CONFORMITY_CHECKS,
  allConformity,
  type RuleConformity,
} from "../src/rules/conformity.js";
import { prettify } from "./lib/prettify.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

/**
 * `--opt-outs=<path>` points the gate at a different registry, and is how the
 * test suite plants a defect.
 *
 * The alternative — copying the source tree into a fixture — was tried and is
 * the wrong shape: the module graph behind `src/rules/index.ts` is deep, so a
 * fixture that copies "the files index.ts names" fails in the ESM resolver
 * before it reads a single rule, which is a test failing for a reason unrelated
 * to the gate. One file, overridden, is the whole requirement.
 */
const OPT_OUTS = flagPath("--opt-outs=", "docs/conformity-opt-outs.json");
const REPORT = flagPath("--report=", "docs/CONFORMITY.md");

function flagPath(prefix: string, fallback: string): string {
  const flag = process.argv.find((a) => a.startsWith(prefix));
  if (flag === undefined) return join(ROOT, fallback);
  const value = flag.slice(prefix.length);
  return isAbsolute(value) ? value : join(ROOT, value);
}

/** `--leashed`: perform every check, write the report, notify nobody. */
const LEASHED = process.argv.includes("--leashed");
/**
 * `--write-baseline`: rewrite the opt-out registry from the current state.
 *
 * The first run of a new check has to produce the baseline, or it ships red on
 * everything at once. It is deliberately not idempotent-safe to leave enabled:
 * it OVERWRITES, including the reasons and the expiry dates a person wrote, so
 * it is an authoring command rather than a repair command.
 */
const WRITE_BASELINE = process.argv.includes("--write-baseline");

/** The shortest reason that could be checked by a reader. */
const MIN_REASON_LENGTH = 40;
/** Words that make a reason unfalsifiable, borrowed from the workflow list. */
const WEAK_REASONS = [
  "not a gate",
  "manual",
  "tbd",
  "todo",
  "temporary",
  "later",
  "known issue",
];

interface OptOut {
  owner: string;
  reason: string;
  grantedAt: string;
  expiresOn: string;
}

interface Registry {
  recordedAt: string;
  note: string;
  entries: Record<string, OptOut>;
}

function loadRegistry(): Registry {
  if (!existsSync(OPT_OUTS)) return { recordedAt: "", note: "", entries: {} };
  return JSON.parse(readFileSync(OPT_OUTS, "utf8")) as Registry;
}

/** Today, as the gate sees it. Overridable so the lapse path is testable. */
function today(): string {
  const flag = process.argv.find((a) => a.startsWith("--today="));
  return flag === undefined
    ? new Date().toISOString().slice(0, 10)
    : flag.slice("--today=".length);
}

function weakReason(reason: string): string | undefined {
  if (reason.trim().length < MIN_REASON_LENGTH) {
    return `the reason is ${reason.trim().length} characters; ${
      MIN_REASON_LENGTH
    } is the floor below which there is no claim in it to disagree with`;
  }
  const lower = reason.toLowerCase();
  return WEAK_REASONS.find((w) => lower.includes(w));
}

/**
 * The gap between what the registry says and what the tree says.
 *
 * Three directions, and all three are failures:
 *
 *   - a nonconformity with NO entry — new debt nobody recorded;
 *   - an entry whose `expiresOn` has passed — debt that outlived its date;
 *   - an entry for a rule that now CONFORMS — a record of a problem that is
 *     fixed, which is how an exemption list becomes a permanent shelf.
 *
 * The third is the ratchet. An entry can only be removed by removing the defect,
 * and the report says so.
 */
interface Gap {
  ruleId: string;
  kind: "UNRECORDED" | "LAPSED" | "STALE" | "UNREADABLE";
  message: string;
}

function gaps(
  states: RuleConformity[],
  registry: Registry,
  now: string,
): Gap[] {
  const out: Gap[] = [];
  const live = new Set(states.map((s) => s.ruleId));

  for (const state of states) {
    const needsCover = state.failed.length > 0;
    const entry = registry.entries[state.ruleId];

    if (needsCover && entry === undefined) {
      out.push({
        ruleId: state.ruleId,
        kind: "UNRECORDED",
        message:
          `fails ${state.failed.join(", ")} and has no entry in ` +
          `docs/conformity-opt-outs.json. Add one with an owner, a reason and ` +
          `an expiry — or fix it, which is a smaller diff than the record.`,
      });
      continue;
    }
    if (entry === undefined) continue;

    if (!needsCover) {
      out.push({
        ruleId: state.ruleId,
        kind: "STALE",
        message:
          "is CONFORMING and still carries an opt-out. Remove the entry: an " +
          "exemption for a problem that is gone is an exemption for whatever " +
          "replaces it.",
      });
      continue;
    }
    if (entry.expiresOn < now) {
      out.push({
        ruleId: state.ruleId,
        kind: "LAPSED",
        message:
          `opt-out expired on ${entry.expiresOn}. The check is still failing ` +
          `(${state.failed.join(", ")}), so the date was a commitment and it has ` +
          "been met. Re-record it with a new reason and date, or fix it.",
      });
      continue;
    }
    if (entry.owner.trim().length < 3) {
      out.push({
        ruleId: state.ruleId,
        kind: "UNREADABLE",
        message:
          "opt-out has no named owner. An unowned exception is a default.",
      });
      continue;
    }
    const weak = weakReason(entry.reason ?? "");
    if (weak !== undefined) {
      out.push({
        ruleId: state.ruleId,
        kind: "UNREADABLE",
        message: `opt-out reason is unfalsifiable — ${weak}.`,
      });
    }
  }

  for (const ruleId of Object.keys(registry.entries)) {
    if (!live.has(ruleId)) {
      out.push({
        ruleId,
        kind: "STALE",
        message:
          "has an opt-out but is not a live rule. A retired rule cannot " +
          "conform and cannot fail, so its entry is a hole with a name on it.",
      });
    }
  }
  return out;
}

const MARK = { ok: "PASS", fail: "FAIL" };

function renderReport(
  states: RuleConformity[],
  registry: Registry,
  found: Gap[],
  now: string,
): string {
  const byState = (s: RuleConformity["state"]) =>
    states.filter((x) => x.state === s);
  const unmeasured = states.filter((x) => x.unmeasured);
  const lines: string[] = [
    "# Rule conformance — a Conformity Monkey for the registry",
    "",
    "<!-- GENERATED by scripts/check-conformity.ts. Do not hand-edit. -->",
    "",
    // NO DATE HERE, deliberately.
    //
    // This line used to read `today: **2026-10-02**`, and it made `certify:ci`
    // unable to pass on any day after the commit that recorded it: the gate
    // rewrites this file, the rewrite is a tracked-file change, and
    // `candidate:manifest:check` — which runs LATER in the same chain —
    // hashes the working tree and fails on it. The failure was reported as
    // `workingTreeSha256 drift`, which points at the candidate and not at the
    // thing that dirtied it.
    //
    // A generated artifact that must match a committed file cannot carry a
    // value that changes daily. When the report was generated belongs to the
    // RUN, and the run already prints it: the JSON summary on stdout carries
    // `checkedAt`, and `--today=YYYY-MM-DD` fixes it for a reproducible run.
    `Checked: **${states.length}** rules · declared checks: **${CONFORMITY_CHECKS.length}**`,
    "",
    "| State | Rules |",
    "| --- | --- |",
    `| CONFORMING | ${byState("CONFORMING").length} |`,
    `| NONCONFORMING | ${byState("NONCONFORMING").length} |`,
    "",
    `**${unmeasured.length} of these rules have never been measured.** Reported`,
    "beside the conformance state rather than inside it, because it is a",
    "separate fact: a rule nobody measured has not been shown wrong, and it has",
    'not been shown right either. Collapsing the two is how "zero false',
    'positives" comes to describe a rule nobody ever ran.',
    "",
    "## What each check asks",
    "",
    "| Check | Question | Answerable by a machine? |",
    "| --- | --- | --- |",
    "| `MEASURED` | does a current measurement exist? | yes |",
    "| `DETECTOR_CURRENT` | was it taken at the detector revision that produced the finding? | yes |",
    "| `CLAIM_OWNED` | does a core/quarantine claim carry an owner and an unexpired date? | yes |",
    "| `QUAD_COMPLETE` | do all four fixture legs exist? | yes — RECALL and PRECISION are generated by running the detector over its own fixtures |",
    "",
    "## The rules",
    "",
    "| Rule | State | Failing checks | Opt-out |",
    "| --- | --- | --- | --- |",
  ];
  for (const state of states) {
    const entry = registry.entries[state.ruleId];
    const cover =
      entry === undefined
        ? "—"
        : entry.expiresOn < now
          ? `**LAPSED ${entry.expiresOn}**`
          : entry.expiresOn;
    lines.push(
      `| \`${state.ruleId}\` | ${state.state}${state.unmeasured ? " · unmeasured" : ""} | ${state.failed.join(", ") || "—"} | ${cover} |`,
    );
  }

  lines.push(
    "",
    "## Gaps",
    "",
    found.length === 0
      ? "None. Every nonconformity is covered by a live opt-out."
      : "",
  );
  for (const gap of found) {
    lines.push(`- \`${gap.ruleId}\` **${gap.kind}** — ${gap.message}`);
  }

  lines.push(
    "",
    "## How to read this",
    "",
    "Adding an opt-out is how this gate goes green, and an added entry is a",
    "smaller diff than the evidence that would retire it. That asymmetry is the",
    "point: the machine decides on every run, and the only human input is a",
    "decision about which debt to carry, with a date.",
    "",
    "`npm run conformity -- --leashed` runs every check, writes this file and",
    "exits 0. That is the mode a NEW check ships in.",
    "",
  );
  return lines.join("\n");
}

function writeBaseline(
  states: RuleConformity[],
  registry: Registry,
  now: string,
): void {
  const entries: Record<string, OptOut> = {};
  for (const state of states) {
    const first = state.failed[0];
    if (first === undefined) continue;
    const claimOnly = state.failed.every((f) => f === "CLAIM_OWNED");
    entries[state.ruleId] = {
      owner: "mjolnir maintainer (docs/MAINTAINERS.md)",
      reason:
        "REPLACE: " +
        (claimOnly
          ? "declares a tier claim with no promotion record, so the claim has no owner and no expiry date"
          : state.checks[first].detail),
      grantedAt: now,
      expiresOn: "REPLACE-WITH-A-DATE",
    };
  }
  const next: Registry = {
    recordedAt: now,
    note: registry.note,
    entries: { ...entries, ...registry.entries },
  };
  writeFileSync(OPT_OUTS, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.error(
    `conformity: wrote a baseline of ${Object.keys(entries).length} entries to ${OPT_OUTS}. ` +
      "Every reason and expiry above is a placeholder to REPLACE before this is committed.",
  );
}

const now = today();
const states = allConformity(ROOT);
const registry = loadRegistry();

if (WRITE_BASELINE) {
  writeBaseline(states, registry, now);
  process.exit(0);
}

const found = gaps(states, registry, now);
// Written through the SAME Prettier helper every generator uses, and for a
// reason beyond tidiness: this gate runs inside `gates:claim-integrity`, which
// is BEFORE `docs:regen`. A gate that writes unformatted bytes leaves the tree
// in a state the next `npm run lint` rejects — a gate that dirties the tree is
// the provenance-stamp shape this repository has already paid for once. Sharing
// the helper also means one set of formatting rules, rather than a gate whose
// output disagrees with every other generated document.
writeFileSync(REPORT, renderReport(states, registry, found, now), "utf8");
await prettify(REPORT);

const byState = {
  conforming: states.filter((s) => s.state === "CONFORMING").length,
  nonconforming: states.filter((s) => s.state === "NONCONFORMING").length,
  unmeasured: states.filter((s) => s.unmeasured).length,
  covered: states.filter(
    (s) => s.failed.length > 0 && registry.entries[s.ruleId] !== undefined,
  ).length,
};

if (found.length > 0) {
  console.error(`Conformity check failed (${found.length} gap(s)):`);
  for (const gap of found) {
    console.error(`  - ${gap.ruleId} ${gap.kind}: ${gap.message}`);
  }
}

console.log(
  JSON.stringify(
    {
      status: found.length === 0 ? MARK.ok : MARK.fail,
      rules: states.length,
      checks: CONFORMITY_CHECKS,
      // The run's date, on the run. It was in the tracked markdown instead,
      // which made the artifact rewrite itself daily and broke
      // `candidate:manifest:check` downstream in the certify chain.
      checkedAt: now,
      ...byState,
      gaps: found.length,
      leashed: LEASHED,
      report: "docs/CONFORMITY.md",
      optOuts: "docs/conformity-opt-outs.json",
    },
    null,
    2,
  ),
);

process.exit(found.length > 0 && !LEASHED ? 1 : 0);
