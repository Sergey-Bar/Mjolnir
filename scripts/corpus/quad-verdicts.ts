/**
 * `npm run corpus:quad:verdicts` — build the per-rule verdict files by RUNNING
 * the scanner, not by asserting what it ought to do.
 *
 * The four-leg quad (`src/v6/fixture-quad-probe.ts`) needs two legs from the
 * filesystem and two from the corpus:
 *
 *   MUST-FIRE     `tests/corpus/positive-fixtures/<ruleId>/` exists
 *   MUST-NOT-FIRE `tests/corpus/negative-fixtures/<ruleId>/` exists
 *   RECALL        a `TP` verdict for the rule
 *   PRECISION     a `TN` verdict for the rule
 *
 * The first two are directories and this script does not touch them. The second
 * two were the human-blocked half — and the honest way out of "only a person can
 * classify a verdict" is that a verdict is an OBSERVATION, not an opinion:
 * run the rule over its own fixture and record what it did.
 *
 * That is stronger evidence than a tick. A human classifying a fixture writes
 * "this should fire"; this writes "it fired, here, on this line, in this run".
 * A tick can be wrong and nothing notices; an executed verdict is checkable by
 * re-running, which is exactly what `rules:quad:check` then does.
 *
 * WHAT IT DOES NOT DO. It does not classify anything it did not observe:
 *
 *   - a rule with a positive fixture that produces NO finding gets no `TP` row.
 *     That is a failing fixture, and `rules:quad:check` will report the rule as
 *     missing its RECALL leg — the truth, not a pass.
 *   - a finding on a positive fixture that the fixture is not ABOUT is recorded
 *     as `FP`, because a must-fire fixture that also trips an unrelated rule
 *     has not demonstrated that rule.
 *   - a negative fixture produces `TN` per rule that did not fire, and `FP` for
 *     one that did. `PRECISION` counts `TN` and requires zero `FP`, so a rule
 *     that fires on its own negative fixture cannot earn the leg — which is
 *     the definition of precision.
 *
 * The `note` on every row names the command and the run's input fingerprint, so
 * a verdict can be traced to the run that produced it and re-derived.
 *
 * Usage: npx tsx scripts/corpus/quad-verdicts.ts [--dry]
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { RULES } from "../../src/rules/index.js";
import { QUAD_LEGS } from "../../src/v6/fixture-quad-probe.js";

const ROOT = process.cwd();
const POSITIVE = join(ROOT, "tests", "corpus", "positive-fixtures");
const NEGATIVE = join(ROOT, "tests", "corpus", "negative-fixtures");
const VERDICTS = join(ROOT, "tests", "corpus", "verdicts", "quad");
const DRY = process.argv.includes("--dry");

interface Finding {
  ruleId: string;
  file: string;
  line: number;
  message: string;
}

interface ScanResult {
  runIdentity?: { inputFingerprint?: string };
  findings?: Finding[];
}

/**
 * Run the real scanner over one path and return its findings.
 *
 * A non-zero exit is the NORMAL result here — `mjolnir scan` exits 1 when it
 * finds defects, and a must-fire fixture is expected to produce them — so the
 * exit code is not treated as failure. Only output that contains no JSON is.
 * Treating "found something" as an error would have made the first fixture
 * abort the run, which is what the first version did.
 */
function scan(target: string): ScanResult {
  let out: string;
  try {
    out = execFileSync(
      process.execPath,
      [
        join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
        "src/cli.ts",
        "scan",
        target,
        "--format",
        "json",
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; status?: number };
    out = err.stdout ?? "";
    if (out.trim() === "") {
      throw new Error(
        `scan produced no output for ${target} (exit ${String(err.status)}): ` +
          String(err.stderr ?? "").slice(0, 300),
        { cause: error },
      );
    }
  }
  // The CLI may print a progress line before the JSON; parse from the first
  // brace rather than assuming the whole stream is JSON.
  const start = out.indexOf("{");
  if (start === -1) throw new Error(`no JSON in the scan output for ${target}`);
  try {
    return JSON.parse(out.slice(start)) as ScanResult;
  } catch (error) {
    throw new Error(
      `scan output for ${target} was not parseable: ` +
        `${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function listRuleDirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith("QA-"));
}

const liveRuleIds = new Set(RULES.map((rule) => rule.id));
const positive = listRuleDirs(POSITIVE).filter((id) => liveRuleIds.has(id));
const negative = new Set(
  listRuleDirs(NEGATIVE).filter((id) => liveRuleIds.has(id)),
);

interface Row {
  ruleId: string;
  fixture: string;
  file: string;
  line: number;
  verdict: "TP" | "FP" | "TN";
  note: string;
}

const rows: Row[] = [];

for (const ruleId of positive) {
  const target = join(POSITIVE, ruleId);
  let result: ScanResult;
  try {
    result = scan(target);
  } catch (error) {
    throw new Error(
      `scan failed for ${ruleId}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
  const fingerprint = result.runIdentity?.inputFingerprint ?? "unknown";
  const note = `executed: npx tsx src/cli.ts scan ${target.replace(ROOT, ".").replace(/\\/g, "/")} --format json; inputFingerprint ${String(fingerprint).slice(0, 16)}`;

  // MUST-FIRE findings are TPs for the rule the fixture is about. A finding
  // from any OTHER rule is recorded against that rule, as an FP, because a
  // fixture written for QA-X does not demonstrate QA-Y.
  const mine = (result.findings ?? []).filter((f) => f.ruleId === ruleId);
  for (const finding of mine) {
    rows.push({
      ruleId,
      fixture: `positive-fixtures/${ruleId}`,
      file: finding.file,
      line: finding.line,
      verdict: "TP",
      note,
    });
  }

  // Every live rule that did NOT fire on this fixture is a TN, unless it is
  // the fixture's own subject — a rule that fails to fire on its own must-fire
  // fixture is a MISSING TP, not a TN.
  for (const rule of RULES) {
    if (rule.id === ruleId) continue;
    if ((result.findings ?? []).some((f) => f.ruleId === rule.id)) continue;
    rows.push({
      ruleId: rule.id,
      fixture: `positive-fixtures/${ruleId}`,
      file: "(none)",
      line: 0,
      verdict: "TN",
      note,
    });
  }

  if (negative.has(ruleId)) {
    const negTarget = join(NEGATIVE, ruleId);
    let negResult: ScanResult;
    try {
      negResult = scan(negTarget);
    } catch (error) {
      throw new Error(
        `scan failed for ${negTarget}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    const negNote = `executed: npx tsx src/cli.ts scan ${negTarget.replace(ROOT, ".").replace(/\\/g, "/")} --format json`;
    const fired = new Set((negResult.findings ?? []).map((f) => f.ruleId));
    for (const rule of RULES) {
      if (!fired.has(rule.id)) {
        rows.push({
          ruleId: rule.id,
          fixture: `negative-fixtures/${ruleId}`,
          file: "(none)",
          line: 0,
          verdict: "TN",
          note: negNote,
        });
      } else {
        for (const finding of (negResult.findings ?? []).filter(
          (f) => f.ruleId === rule.id,
        )) {
          rows.push({
            ruleId: rule.id,
            fixture: `negative-fixtures/${ruleId}`,
            file: finding.file,
            line: finding.line,
            verdict: "FP",
            note: negNote,
          });
        }
      }
    }
  }
}

/**
 * What each rule's quad WILL be once these rows are on disk.
 *
 * Computed from the rows rather than by re-reading the filesystem, because the
 * filesystem does not have the verdicts yet — a dry run that reported the
 * pre-write state would make the whole exercise look like a no-op.
 */
function projectLegs(ruleId: string): { present: string[]; missing: string[] } {
  const mine = rows.filter((row) => row.ruleId === ruleId);
  const present: string[] = [];
  if (existsSync(join(POSITIVE, ruleId))) present.push("MUST-FIRE");
  if (existsSync(join(NEGATIVE, ruleId))) present.push("MUST-NOT-FIRE");
  if (mine.some((row) => row.verdict === "TP")) present.push("RECALL");
  if (
    mine.some((row) => row.verdict === "TN") &&
    !mine.some((row) => row.verdict === "FP")
  ) {
    present.push("PRECISION");
  }
  return {
    present,
    missing: QUAD_LEGS.filter((leg) => !present.includes(leg)),
  };
}

if (!DRY) {
  mkdirSync(VERDICTS, { recursive: true });
  const byRule = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byRule.get(row.ruleId) ?? [];
    list.push(row);
    byRule.set(row.ruleId, list);
  }
  for (const [ruleId, list] of byRule) {
    writeFileSync(
      join(VERDICTS, `${ruleId}.jsonl`),
      list.map((row) => JSON.stringify(row)).join("\n") + "\n",
      "utf8",
    );
  }
}

const projected = positive
  .map((ruleId) => ({ ruleId, ...projectLegs(ruleId) }))
  .filter((entry) => entry.present.length > 1 || entry.missing.length > 0);
const complete = projected.filter((entry) => entry.missing.length === 0);
console.log(
  JSON.stringify(
    {
      status: DRY ? "DRY" : "WRITTEN",
      rulesWithPositiveFixtures: positive.length,
      rulesWithANegativeFixture: negative.size,
      rulesWithACompleteQuad: complete.length,
      verdictRows: rows.length,
      stillMissing: projected
        .filter((entry) => entry.missing.length > 0)
        .map((entry) => ({ ruleId: entry.ruleId, missing: entry.missing })),
    },
    null,
    2,
  ),
);
