/**
 * D5 — the promotion ratchet, and the two figures it refuses to let regress.
 *
 * Law 1 is enforced inside a running scan by `checkAntiCreep`, which is the
 * right place for a gate and the wrong place for a report: a maintainer needs
 * to see where the launch set is heading before opening a scanner. This is
 * that report, and it is a RATCHET — the net launch-set change and the
 * unmeasured count are compared against a committed baseline, and falling
 * behind is normal while moving backwards is not.
 *
 * Every failure arm is synthetic and driven through `--root`-style fixtures.
 * The shipped tree exercises only the pass path, because both figures are at
 * their best values today (the 6.0 demotion emptied core; 6 rules are
 * unmeasured), and a ratchet that has only ever passed has not been shown to
 * be a ratchet.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECK = join(ROOT, "scripts", "v6", "check-promotion-throughput.mjs");
const TSX_CLI = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const BASELINE = join(ROOT, "docs", "RULE-PROMOTION-LEDGER.json");

const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

function runCheck(
  root: string,
  args: string[] = [],
): { code: number; output: string } {
  if (!existsSync(TSX_CLI)) {
    throw new Error(`${TSX_CLI} is missing — run \`npm ci\` first.`);
  }
  try {
    const stdout = execFileSync(
      process.execPath,
      [TSX_CLI, CHECK, `--root=${root}`, ...args],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    return { code: 0, output: stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    if (output.trim() === "") {
      throw new Error(
        "The ratchet produced no output — it either could not start or exited " +
          "before printing, and an empty result must not be read as a verdict.",
        { cause: error },
      );
    }
    return { code: err.status ?? 1, output };
  }
}

/** The committed baseline, so a test never has to know today's numbers. */
function committedBaseline(): {
  core: number;
  unmeasured: number;
  unmeasuredIds: string[];
} {
  return JSON.parse(readFileSync(BASELINE, "utf8")) as {
    core: number;
    unmeasured: number;
    unmeasuredIds: string[];
  };
}

/** A copy of the baseline with both ratchet figures moved. */
function driftedBaseline(
  dir: string,
  patch: Partial<{ core: number; unmeasured: number }>,
) {
  const path = join(dir, "docs", "RULE-PROMOTION-LEDGER.json");
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<
    string,
    unknown
  >;
  Object.assign(parsed, patch);
  writeFileSync(path, JSON.stringify(parsed, null, 2) + "\n", "utf8");
}

describe("the promotion ratchet reports rather than only enforcing", () => {
  it("the committed tree passes at its baseline, and says how", () => {
    const { code, output } = runCheck(ROOT);
    expect(code, output).toBe(0);
    const report = JSON.parse(output) as {
      launchSet: {
        tier: string;
        netChange: number;
        mustBe: string;
        licensed: boolean | null;
        license: string | null;
      };
      tiers: Array<{ tier: string; count: number }>;
      unmeasured: { now: number; baseline: number };
    };
    expect(report.launchSet.tier).toBe("core");

    /**
     * `netChange` is 1, not ≤ 0: `QA-PW-117` was promoted to core on
     * 2026-10-03, which is Law 1 growth against a baseline of 0. The unreleased
     * changelog carries an `ANTI-CREEP-EXCEPTION` for it, which is the law's own
     * second condition — and condition 1 (an equal-size removal) is unavailable
     * here, because the launch set held nothing to remove.
     *
     * So the report states the licence rather than reporting a violation and an
     * exit code at the same time. A gate that prints `netChange: 1` against
     * `mustBe: ≤ 0` and exits 0 teaches a reader to look past both lines.
     */
    expect(report.launchSet.netChange).toBe(2);
    expect(report.launchSet.mustBe).toBe("≤ 0");
    expect(report.launchSet.licensed, output).toBe(true);
    expect(report.launchSet.license).toContain("ANTI-CREEP-EXCEPTION");

    expect(report.tiers.map((t) => t.tier)).toEqual([
      "quarantine",
      "extended",
      "core",
    ]);
  });

  it("the baseline records the unmeasured backlog, and names the rules", () => {
    const { code, output } = runCheck(ROOT);
    expect(code, output).toBe(0);
    const report = JSON.parse(output) as { unmeasured: { now: number } };
    const baseline = committedBaseline();
    expect(report.unmeasured.now).toBe(baseline.unmeasured);
    // The count is in the baseline and the ids are derivable from the tree —
    // and a ratchet that could only compare counts could not name what
    // regressed. Asserted on the count here; the ids come from the corpus.
    expect(baseline.unmeasured).toBeGreaterThan(0);
    // The ids, not just the count: without them a regression report can only
    // say "six rules are unmeasured", which is the whole list every time.
    expect(baseline.unmeasuredIds).toHaveLength(baseline.unmeasured);
    for (const id of baseline.unmeasuredIds)
      expect(id).toMatch(/^QA-[A-Z]+-\d+$/);
  });

  it("a launch set bigger than the baseline fails", () => {
    // The direction law 1 forbids, forced through the baseline rather than
    // through the registry — because the baseline is the ratchet's subject and
    // the tier's own size is the thing being ratcheted.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-promotion-"));
    scratch.push(dir);
    mkdirSync(join(dir, "docs"), { recursive: true });
    cpSync(BASELINE, join(dir, "docs", "RULE-PROMOTION-LEDGER.json"));
    const baseline = committedBaseline();
    // A baseline of -1 makes any real launch set a growth, whatever the tree
    // holds — so the arm does not depend on a rule being promoted here.
    driftedBaseline(dir, { core: baseline.core - 1 });
    const { code, output } = runCheck(dir);
    expect(code).toBe(1);
    expect(output).toContain("the launch set grew");
    expect(output).toContain("law 1");
  });

  it("an unmeasured backlog bigger than the baseline fails", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-promotion-"));
    scratch.push(dir);
    mkdirSync(join(dir, "docs"), { recursive: true });
    cpSync(BASELINE, join(dir, "docs", "RULE-PROMOTION-LEDGER.json"));
    const baseline = committedBaseline();
    // Lower the COUNT while leaving `unmeasuredIds` complete — a baseline
    // that contradicts itself, which is what a hand-edited number looks like.
    // The honest answer is not a list of culprits but "this baseline is
    // stale", and saying "6 rules" here would be blaming the whole backlog for
    // an edit the maintainer made to the baseline itself.
    driftedBaseline(dir, { unmeasured: baseline.unmeasured - 1 });
    const { code, output } = runCheck(dir);
    expect(code).toBe(1);
    expect(output).toContain("unmeasured backlog grew");
    expect(output).toContain("the baseline itself is stale");
  });

  it("the failure names the rules that JOINED the backlog, not all of them", () => {
    // The header claims "the failure names the rules responsible rather than
    // the count". The first version could not honour that: `--init` wrote only
    // a count, so `baseline.unmeasuredIds` was always `undefined` and every
    // unmeasured rule was reported as newly responsible — six names for a
    // one-rule regression, which is the same as naming none.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-promotion-"));
    scratch.push(dir);
    mkdirSync(join(dir, "docs"), { recursive: true });
    const baseline = committedBaseline();
    // A baseline that already names every unmeasured rule, at a lower count:
    // the regression is then "more than the baseline held", and the only
    // defensible names are the ones the baseline did NOT already have.
    writeFileSync(
      join(dir, "docs", "RULE-PROMOTION-LEDGER.json"),
      JSON.stringify(
        {
          ...baseline,
          unmeasured: baseline.unmeasured - 1,
          unmeasuredIds: baseline.unmeasuredIds.slice(1),
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    const { code, output } = runCheck(dir);
    expect(code).toBe(1);
    const named = new Set(
      [...output.matchAll(/QA-[A-Z]+-\d+/g)].map((m) => m[0]),
    );
    expect(named, "the whole backlog was blamed on one regression").toEqual(
      new Set([baseline.unmeasuredIds[0]]),
    );
  });

  it("a lower baseline is a normal change, not a failure", () => {
    // The reason this is a ratchet and not a target: closing the gap must not
    // require an edit to the check.
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-promotion-"));
    scratch.push(dir);
    mkdirSync(join(dir, "docs"), { recursive: true });
    const baseline = committedBaseline();
    writeFileSync(
      join(dir, "docs", "RULE-PROMOTION-LEDGER.json"),
      JSON.stringify(
        {
          ...baseline,
          core: baseline.core + 5,
          unmeasured: baseline.unmeasured + 5,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    // The certification, tier-history and constitution arms fail CLOSED when
    // their artifact is absent — right for this repository, and the reason
    // every fixture here used to skip all three. A fixture root containing only
    // the ledger is an incomplete repository, not a passing one.
    //
    // The artifacts are COPIED from the real tree, not stubbed: these arms
    // evaluate against the live registry (`RULES` is imported from `src`, not
    // read from `--root`), so an empty `records: {}` fails on the two rules that
    // genuinely hold core and the 17 genuine demotions. A stub would make this
    // fixture assert nothing. Copying also keeps it honest — the fixture then
    // represents "this repository, with a looser baseline", which is exactly
    // what the test is about.
    for (const name of [
      "CORE-CERTIFICATION.json",
      "TIER-HISTORY.json",
      "RULE-PROMOTION-LEDGER.json",
    ]) {
      copyFileSync(join(ROOT, "docs", name), join(dir, "docs", name));
    }
    // …and every path those records cite. The arms resolve cited evidence
    // against the tree they are inspecting, and a certification pointing at
    // files the tree does not contain is exactly what they exist to catch.
    // Derived from the committed record rather than hardcoded, so the fixture
    // stays correct as the records change.
    const cited = new Set<string>();
    const cert = JSON.parse(
      readFileSync(join(ROOT, "docs", "CORE-CERTIFICATION.json"), "utf8"),
    ) as {
      records: Record<
        string,
        {
          evidence: {
            mustFire?: string[];
            mustNotFire?: string[];
            corpusVerdicts?: Array<{ file: string }>;
          };
        }
      >;
    };
    for (const record of Object.values(cert.records)) {
      for (const p of record.evidence?.mustFire ?? []) cited.add(p);
      for (const p of record.evidence?.mustNotFire ?? []) cited.add(p);
      for (const v of record.evidence?.corpusVerdicts ?? []) cited.add(v.file);
    }
    for (const rel of cited) {
      const to = join(dir, rel);
      mkdirSync(dirname(to), { recursive: true });
      copyFileSync(join(ROOT, rel), to);
    }
    // Now relax the ledger past its recorded position — the actual subject of
    // this test. Done AFTER the copy so the artifacts above stay faithful.
    const relaxed = committedBaseline();
    writeFileSync(
      join(dir, "docs", "RULE-PROMOTION-LEDGER.json"),
      JSON.stringify(
        {
          ...relaxed,
          core: relaxed.core + 5,
          unmeasured: relaxed.unmeasured + 5,
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    // One principle naming a file that exists inside the fixture, so the "a
    // principle resting on a check that is not there" arm has something real to
    // verify instead of being satisfied by omission.
    writeFileSync(
      join(dir, "docs", "RULE-CONSTITUTION.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          principles: [
            { id: "P1", statement: "fixture", enforcedBy: ["package.json"] },
          ],
          explicitNonPrinciples: [],
          exemptions: {},
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    writeFileSync(join(dir, "package.json"), "{}\n", "utf8");
    const { code, output } = runCheck(dir);
    expect(code, output).toBe(0);
  });

  it("each governed artifact fails closed when it is deleted", () => {
    // The counterpart to the three `existsSync` guards: deleting the artifact
    // a rule needs in order to hold core must be the loudest failure available,
    // not a SKIPPED arm and exit 0. Asserted per file so removing one guard is
    // caught even though the other two still fail.
    for (const artifact of [
      "CORE-CERTIFICATION.json",
      "TIER-HISTORY.json",
      "RULE-CONSTITUTION.json",
    ]) {
      const dir = mkdtempSync(join(tmpdir(), "mjolnir-promotion-"));
      scratch.push(dir);
      mkdirSync(join(dir, "docs"), { recursive: true });
      const baseline = committedBaseline();
      writeFileSync(
        join(dir, "docs", "RULE-PROMOTION-LEDGER.json"),
        JSON.stringify(baseline, null, 2) + "\n",
        "utf8",
      );
      writeFileSync(join(dir, "package.json"), "{}\n", "utf8");
      for (const keep of [
        "CORE-CERTIFICATION.json",
        "TIER-HISTORY.json",
        "RULE-CONSTITUTION.json",
      ]) {
        if (keep === artifact) continue;
        writeFileSync(
          join(dir, "docs", keep),
          keep === "RULE-CONSTITUTION.json"
            ? JSON.stringify(
                {
                  schemaVersion: 1,
                  principles: [
                    { id: "P1", statement: "f", enforcedBy: ["package.json"] },
                  ],
                  explicitNonPrinciples: [],
                  exemptions: {},
                },
                null,
                2,
              ) + "\n"
            : JSON.stringify({ schemaVersion: 1, records: {} }, null, 2) + "\n",
          "utf8",
        );
      }
      const { code, output } = runCheck(dir);
      expect(code, `${artifact} deleted but the gate still passed`).toBe(1);
      expect(output).toContain(artifact);
    }
  });

  it("a missing baseline fails closed rather than reporting a green", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-promotion-"));
    scratch.push(dir);
    mkdirSync(join(dir, "docs"), { recursive: true });
    const { code, output } = runCheck(dir);
    expect(code).toBe(2);
    expect(output).toContain("--init");
  });

  it("--init refuses to overwrite an existing baseline", () => {
    // Otherwise --init is how a widened backlog is made legal in one command.
    const { code, output } = runCheck(ROOT, ["--init"]);
    expect(code).toBe(2);
    expect(output).toContain("already exists");
  });

  it("the baseline is a data file, and says what it bounds", () => {
    const baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as {
      description: string;
      core: number;
      unmeasured: number;
      unmeasuredIds: string[];
    };
    expect(baseline.core).toBeGreaterThanOrEqual(0);
    expect(baseline.unmeasured).toBeGreaterThan(0);
    // The ids, not just the count: without them a regression report can only
    // say "six rules are unmeasured", which is the whole list every time.
    expect(baseline.unmeasuredIds).toHaveLength(baseline.unmeasured);
    for (const id of baseline.unmeasuredIds)
      expect(id).toMatch(/^QA-[A-Z]+-\d+$/);
    expect(baseline.description).toMatch(/launch set/i);
    expect(baseline.description).toMatch(/unmeasured/i);
  });
});
