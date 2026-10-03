/**
 * Corpus sample generator (Phase 3 — Tempering Plan).
 *
 * Draws up to 20 findings per rule from the corpus baselines, reads the
 * source context (5 lines around each finding), and emits:
 *
 * 1. tests/corpus/review/<RULE-ID>.md — human-readable review sheets
 *    with file, line, context, and an empty `verdict:` field.
 *
 * 2. tests/corpus/verdicts/<repo>.jsonl — machine-readable verdict
 *    storage (one JSON object per line) for hand-classified findings.
 *
 * Usage:
 *   npx tsx scripts/corpus-sample.ts           # generate review sheets
 *   npx tsx scripts/corpus-sample.ts --update  # re-scan and regenerate
 *   npx tsx scripts/corpus-sample.ts --update --repo <name> [--repo <n>…]
 *                                              # resumable: named repos only
 *   npx tsx scripts/corpus-sample.ts --core-candidates --core-target QA-PW-117
 *                                              # targeted: only the named rules,
 *                                              # and only they may exceed the cap
 *   … --budget 300000                          # raise per-repo scan budget
 *                                              # (chronic truncation remedy)
 *
 * The review sheets are the INPUT to the manual classification process.
 * Once classified, verdicts go into the .jsonl files. The FP-rate
 * generator reads the verdicts, not the review sheets.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { prettify } from "./lib/prettify.js";

import { runScan } from "../src/cli.js";
import { RULES } from "../src/rules/index.js";
// Single source of truth for the corpus — do NOT redefine it here.
import { CORPUS, type CorpusRepo } from "../tests/corpus/audit.js";
import { MEASURED_FP } from "../src/rules/measured-fp.generated.js";
import {
  CORE_CANDIDATE_CAP,
  coreCandidateRuleIds,
  isCoreCandidate,
  selectCoreCandidates,
} from "./lib/core-candidates.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const CACHE_DIR = join(ROOT, "tests", "corpus", ".cache");
const REVIEW_DIR = join(ROOT, "tests", "corpus", "review");
const VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");

/**
 * How many samples a rule may contribute to one measurement pass.
 *
 * 6.0 raised this 20 → 60, on arithmetic that was correct: since
 * `effectiveTier` promotes a rule to core on `ciHigh <= 0.10`, a rule observing
 * ZERO false positives needs about n = 35 for its Wilson upper bound to fall
 * under that ceiling, and at a cap of 20 no rule could ever reach core on a
 * clean measurement.
 *
 * **The raise was reverted on the same day.** The arithmetic bounds what a
 * measurement can PROVE; it does not bound what it costs to OBTAIN. A sample
 * is not a verdict: every one needs a human judgement with the code in front
 * of them, and `tests/corpus/verdicts/README.md` makes a committed verdict
 * immutable. Re-sampling at the raised cap produced **1,121 unadjudicated
 * rows across 42 rules**, and the committed ceiling refused outright:
 *
 *   FAIL: 1121 unclassified verdict row(s) exceed the committed ceiling of 31
 *   Blank "verdict" rows silently under-report the measured FP rates.
 *
 * That refusal is the gate working. Blank rows are DROPPED rather than
 * counted, so a corpus where most rows are blank does not report a low false
 * positive rate — it reports a rate measured on whatever subset happened to be
 * adjudicated, which is a different and much more flattering number.
 *
 * So the cap is bounded by the ADJUDICATION BUDGET, and the budget is
 * whatever `tests/corpus/verdicts/unclassified-ceiling.json` can honestly
 * hold. Raising the cap and the ceiling together would be a way of making the
 * gate stop complaining without adding evidence, which is the one thing this
 * repository exists not to do.
 *
 * What the interval criterion actually needs is a decision about the CORE
 * CEILING, not about the sample: 10% is unreachable below n ≈ 35 for a
 * clean rule, so either the ceiling moves or core stays unearned. Both are
 * product calls, and neither is made by a constant in this file.
 *
 * ## What `--core-candidates` changes, and what it deliberately does not
 *
 * The constant below stays 20. It was never the thing that was wrong — the
 * ALLOCATION was. Raising it globally spends 35+ samples on rules that cannot
 * use them: a rule already observed wrong, or one whose interval already
 * excludes 10% from below, gets the same budget and buys nothing with it,
 * while the adjudication budget is finite and belongs to a person.
 *
 * So the raise is kept for the rules that CAN spend it and withdrawn from the
 * rest. `--core-candidates` emits rows ONLY for a rule that observes zero
 * false positives and whose `straddleDetail` says more clean samples would
 * settle it, and only those rules get `CORE_CANDIDATE_CAP` instead of this
 * constant. The predicate, the arithmetic behind it and the reason it is
 * re-derived per run rather than committed live in `scripts/lib/core-candidates.ts`.
 *
 * The filter is on EMISSION, not only on the cap, and the difference is the
 * whole design. A per-rule-cap-only change would let every rule below n=20 emit
 * rows, which is the 1,121-row failure above reproduced with a different
 * number — and it would break the arithmetic that makes this affordable: the
 * ceiling moves by the number of rows a person is asked to classify, so the
 * mode has to be able to say exactly how many that is before anyone is asked.
 */
const MAX_SAMPLES_PER_RULE = 20;
const CONTEXT_LINES = 5; // lines above and below the finding

/**
 * `--unmeasured-only` (plan §11.1 verdict-harvesting loop): sample ONLY
 * rules without a valid measurement so classification effort goes to the
 * Phase 1 exit gate (unmeasured ≤ 20) instead of re-sampling rules that
 * are already measured at their quota.
 *
 * `--core-candidates`: sample ONLY rules that can still earn the core tier
 * by sampling more, and let those — and only those — exceed the global cap.
 * See `scripts/lib/core-candidates.ts` for the predicate and the arithmetic.
 *
 * `--core-target <RULE-ID>` (repeatable, requires `--core-candidates`):
 * fund only the named candidates in this pass. The predicate says who CAN earn
 * a tier — 26 rules today; the target says who gets FUNDED, which is a person's
 * budget decision and the one that keeps the ceiling arithmetic knowable before
 * the run instead of after it. Naming a rule that is not a candidate is an
 * error, not a silent skip.
 *
 * The modes compose predictably: `--unmeasured-only --core-candidates` is empty
 * by construction, because a rule with no measurement is not a candidate (there
 * is no observed FP count to be zero).
 *
 * `--repo <name>` (repeatable): sample only the named corpus repos —
 * resumability. The full-corpus run in one process hits V8 heap limits
 * on the large monorepos (observed: OOM at sveltejs-kit / withastro-astro
 * even at 12 GB); running repo-by-repo keeps each process small, and the
 * append-only verdict writer makes partial runs safe to accumulate.
 *
 * `--budget <ms>`: override the per-repo scan budget (default 120_000).
 * audit.ts's own guidance: if truncation is chronic for a repo, raise
 * the budget rather than record a partial scan.
 */
const UNMEASURED_ONLY = process.argv.includes("--unmeasured-only");
const CORE_CANDIDATES = process.argv.includes("--core-candidates");
const CORE_TARGETS = process.argv.flatMap((a, i) =>
  a === "--core-target" ? [process.argv[i + 1] ?? ""] : [],
);
if (CORE_TARGETS.length > 0 && !CORE_CANDIDATES) {
  console.error(
    "--core-target is a filter on --core-candidates, not a mode of its own: " +
      "without it every rule still draws up to the global cap and the targets " +
      "would never be funded.",
  );
  process.exit(2);
}
/** The rules this run may emit rows for. Empty means "no filter". */
const FUNDED_CANDIDATES = CORE_CANDIDATES
  ? selectCoreCandidates(CORE_TARGETS)
  : undefined;

const ONLY_REPOS = process.argv
  .flatMap((a, i) => (a === "--repo" ? [process.argv[i + 1] ?? ""] : []))
  .filter((n) => n.length > 0);
const BUDGET_MS = (() => {
  const idx = process.argv.indexOf("--budget");
  const v = idx !== -1 ? Number(process.argv[idx + 1]) : NaN;
  return Number.isFinite(v) && v > 0 ? v : 120_000;
})();

function ruleIsUnmeasured(ruleId: string): boolean {
  return MEASURED_FP[ruleId] === undefined;
}

/**
 * The per-rule cap THIS run applies to `ruleId`.
 *
 * One function so the finding loop and the review-sheet header cannot disagree
 * about the number — a sheet that prints the cap the run did not apply tells
 * the classifier something false about why there are that many rows in front of
 * them.
 *
 * The candidate arm asks `isCoreCandidate` rather than reading the funded list,
 * because the funded list may be a subset: a named target is always a candidate
 * (`selectCoreCandidates` refuses anything else), and the cap follows the
 * rule's shape rather than the operator's flag list.
 */
function capFor(ruleId: string): number {
  return CORE_CANDIDATES && isCoreCandidate(ruleId)
    ? CORE_CANDIDATE_CAP
    : MAX_SAMPLES_PER_RULE;
}

/**
 * How many NEW blank rows this run may still add for `ruleId`.
 *
 * The cap in `capFor` limits SAMPLES collected, which is the wrong quantity to
 * stop on once the mode is scoped. Measured on the first real
 * `--core-target` run: it collected 35 samples for each funded rule and
 * appended 46 new rows, because dedupe is per verdict FILE and keycloak's file
 * already held 19 QA-PW-117 and 10 QA-JV-101 rows — 35 − 18 found again left 17
 * new for one rule and 35 − 6 left 29 for the other, against 11 and 12 needed.
 *
 * That is not a rounding detail. The whole reason the mode is affordable is
 * that the ceiling moves by a number a person was shown BEFORE they were asked
 * to classify anything, and a run that emits 46 when it printed 23 makes the
 * printed projection a lie and the ceiling bump a guess.
 *
 * So the budget is on rows, not samples: `cap - n - pending`, where `n` is the
 * classified count `MEASURED_FP` already carries and `pending` is the blank
 * rows an earlier pass left un-adjudicated. Counting pending is what makes the
 * mode re-runnable — without it, a second run over the same repository would
 * size its budget from `n` alone, which does not move until a person classifies,
 * and would add the same rows again.
 */
function rowsStillNeeded(ruleId: string): number {
  // No budget outside `--core-candidates`, on purpose. The default mode's cap is
  // "20 samples per rule", and `20 - n - pending` is a different question — for
  // a rule already measured at n=20 it is zero, which would mean a plain
  // `npm run corpus:sample` could never add new evidence to a rule that already
  // has 20 verdicts. That was not a change this edit is for.
  if (!CORE_CANDIDATES) return Number.POSITIVE_INFINITY;
  const n = MEASURED_FP[ruleId]?.n ?? 0;
  return Math.max(0, capFor(ruleId) - n - (pendingByRule.get(ruleId) ?? 0));
}

/**
 * Blank verdict rows per rule, read from the committed corpus.
 *
 * Only top-level `*.jsonl` files, matching `loadVerdicts()` in
 * `scripts/generate-fp-audit-table.ts` — the same set the FP rate and the
 * unclassified ceiling are computed from. `quad/` and `archive/` are
 * subdirectories of the same directory and are deliberately NOT counted here:
 * counting rows the ratchet cannot see would size the budget from evidence
 * that does not count.
 */
function readPendingVerdictRows(): Map<string, number> {
  const pending = new Map<string, number>();
  if (!existsSync(VERDICTS_DIR)) return pending;
  for (const file of readdirSync(VERDICTS_DIR)) {
    if (!file.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(VERDICTS_DIR, file), "utf8").split(
      "\n",
    )) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let entry: { ruleId?: string; verdict?: string };
      try {
        entry = JSON.parse(trimmed) as { ruleId?: string; verdict?: string };
      } catch {
        continue;
      }
      if (entry.verdict || entry.ruleId === undefined) continue;
      pending.set(entry.ruleId, (pending.get(entry.ruleId) ?? 0) + 1);
    }
  }
  return pending;
}

const pendingByRule = readPendingVerdictRows();

/**
 * The `ruleId|file|line` keys already recorded in one repository's verdict file.
 *
 * ONE definition, used by the finding loop and by the writer, because the
 * budget the loop enforces is only meaningful if it is computed against the
 * same key set the writer de-dupes with. Two parsers would be two chances for
 * the projected row count and the appended row count to disagree, and the whole
 * reason this exists is that they disagreed once.
 */
function recordedVerdictKeys(repo: string): Set<string> {
  const keys = new Set<string>();
  const path = join(VERDICTS_DIR, `${repo}.jsonl`);
  if (existsSync(path)) {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const o = JSON.parse(line) as {
          ruleId: string;
          file: string;
          line: number;
        };
        keys.add(`${o.ruleId}|${o.file}|${o.line}`);
      } catch {
        /* preserve malformed rows as-is — never overwrite verdicts */
      }
    }
  }
  // Retracted rows join the same key set, from `tests/corpus/verdicts/retracted.jsonl`.
  //
  // Without this, a retraction is undone by the next sampling pass: the row is
  // gone from the `.jsonl`, so its key is no longer recorded, so the very same
  // finding is sampled again and re-appended as a fresh unclassified row. That
  // is not hypothetical — `QA-JV-101`'s `JWETest.java:74` was retracted on
  // 2026-10-03 and the next sweep put it straight back, because the annotation
  // one line up was already adjudicated and the citation was not.
  //
  // An orphan rule that regenerates its own evidence is not an orphan rule, so
  // the tombstone is read here rather than only recorded by the applier.
  for (const key of retractedVerdictKeys()) keys.add(key);
  return keys;
}

/** Every `ruleId|file|line` that has been retracted, across all repositories. */
function retractedVerdictKeys(): Set<string> {
  const keys = new Set<string>();
  const path = join(VERDICTS_DIR, "retracted.jsonl");
  if (!existsSync(path)) return keys;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as { key?: unknown };
      if (typeof o.key === "string") keys.add(o.key);
    } catch {
      /* a malformed tombstone must not resurrect a retracted row silently */
    }
  }
  return keys;
}

interface SampledFinding {
  repo: string;
  ruleId: string;
  file: string;
  line: number;
  message: string;
  context: string[];
}

function cloneRepo(repo: CorpusRepo): string {
  const dest = join(CACHE_DIR, repo.name);
  // `local:` URLs (SS08 classes B/C) - copy the committed corpus instead
  // of cloning; .git never exists for in-repo fixtures.
  if (repo.url.startsWith("local:")) {
    const src = join(HERE, "..", repo.url.slice("local:".length));
    if (!existsSync(src)) {
      throw new Error(`local corpus missing: ${src}`);
    }
    mkdirSync(CACHE_DIR, { recursive: true });
    cpSync(src, dest, { recursive: true });
    return dest;
  }

  /**
   * THE PIN, OR THE SAMPLE IS UNJUDGEABLE.
   *
   * This used to `git clone --depth 1 <url>` - the HEAD of the default branch -
   * and then `rm -rf .git`, so nothing downstream could tell. Every verdict is
   * adjudicated against `repo.ref` via `npm run corpus:verdict-context`, which
   * reads the PINNED commit. Those are two different trees, and they drift.
   *
   * What that produced, on keycloak: the pinned `JWETest.java` has exactly three
   * `@Ignore`, on lines 73, 113 and 202, all three already adjudicated `TP`. The
   * sweep kept emitting rows citing 74, then 114, then 203 - the same three
   * annotations, cited one line late, each arriving as a fresh unclassified row
   * that looked like new evidence. Four of those were caught by hand as orphans
   * during the first adjudication pass, which is luck, not a control: any row
   * whose line happened to still land on a trigger would have been judged
   * against source the verdict claims to describe and does not.
   *
   * So the clone fetches `repo.ref`, the way `tests/corpus/audit.ts` already
   * did, and a cached clone is VERIFIED against it rather than trusted by
   * existence. A cache hit at the wrong ref is a stale tree wearing a fresh
   * clone's name.
   */
  if (existsSync(join(dest, ".git"))) {
    const head = execFileSync("git", ["-C", dest, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (head === repo.ref) return dest;
    rmSync(dest, { recursive: true, force: true });
  } else if (existsSync(dest)) {
    // A cache entry with no .git cannot be verified, so it cannot be trusted.
    rmSync(dest, { recursive: true, force: true });
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(dest, { recursive: true });
  execFileSync("git", ["init", "--quiet", dest], { stdio: "pipe" });
  execFileSync("git", ["-C", dest, "remote", "add", "origin", repo.url], {
    stdio: "pipe",
  });
  execFileSync(
    "git",
    [
      "-c",
      "core.longpaths=true",
      "-C",
      dest,
      "fetch",
      "--depth",
      "1",
      "--no-tags",
      "origin",
      repo.ref,
    ],
    { stdio: "pipe" },
  );
  execFileSync("git", ["-C", dest, "checkout", "--quiet", "FETCH_HEAD"], {
    stdio: "pipe",
  });

  const checkedOut = execFileSync("git", ["-C", dest, "rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  if (checkedOut !== repo.ref) {
    throw new Error(
      `corpus ${repo.name}: checked out ${checkedOut}, expected the pinned ${repo.ref}. ` +
        "A verdict read at the pin must describe the tree that was scanned, so this " +
        "is a hard stop rather than a warning.",
    );
  }
  return dest;
}

function getContext(filePath: string, line: number): string[] {
  try {
    const content = readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const start = Math.max(0, line - CONTEXT_LINES - 1);
    const end = Math.min(lines.length, line + CONTEXT_LINES);
    const result: string[] = [];
    for (let i = start; i < end; i++) {
      const marker = i === line - 1 ? ">>>" : "   ";
      result.push(`${marker} ${String(i + 1).padStart(4)}| ${lines[i]}`);
    }
    return result;
  } catch {
    return ["    (file not readable)"];
  }
}

async function scanAndSample(): Promise<Map<string, SampledFinding[]>> {
  const byRule = new Map<string, SampledFinding[]>();
  // Per-repo de-dupe state and per-rule NEW-row counters. See
  // `recordedVerdictKeys` and `rowsStillNeeded` for why the budget is counted
  // here rather than left to the writer.
  const repoKeys = new Map<string, Set<string>>();
  const freshByRule = new Map<string, number>();

  for (const repo of CORPUS) {
    if (ONLY_REPOS.length > 0 && !ONLY_REPOS.includes(repo.name)) continue;
    console.log(`\n=== Scanning ${repo.name} ===`);
    let dir: string;
    try {
      dir = cloneRepo(repo);
    } catch (err) {
      console.error(
        `  SKIP: could not clone (${err instanceof Error ? err.message : String(err)})`,
      );
      continue;
    }

    const result = await runScan({
      target: dir,
      json: true,
      verbose: true,
      maxDurationMs: BUDGET_MS,
      scopeChanged: false,
      format: "json",
      // --strict: sample quarantine-tier rules too. Without this, every
      // re-run silently deletes the review sheets for the ~12 quarantined
      // rules — the ones we most need to keep watching.
      strict: true,
    });

    // D14/§19 discipline (same refusal as tests/corpus/audit.ts): a
    // deadline-truncated scan is NOT evidence — sampling from it would
    // record machine-speed-contaminated counts as review material. Fail
    // the run loudly; re-run on a quiet machine, never classify from a
    // partial scan.
    if (result.partial) {
      console.error(
        `  FAIL: scan of ${repo.name} was PARTIAL (deadline/budget ` +
          `truncation) — findings from a partial scan are not evidence. ` +
          `Re-run on a quiet machine; do NOT classify from a partial scan.`,
      );
      process.exitCode = 1;
      continue;
    }

    for (const finding of result.findings) {
      if (UNMEASURED_ONLY && !ruleIsUnmeasured(finding.ruleId)) continue;
      // Emission is filtered here, at the same point as `--unmeasured-only`, so
      // a non-funded rule contributes no rows AT ALL in this mode. Filtering
      // only the cap below would still emit rows for every rule under n=20,
      // which is the 1,121-row failure with a different number on it.
      if (CORE_CANDIDATES && !FUNDED_CANDIDATES?.includes(finding.ruleId))
        continue;
      const samples = byRule.get(finding.ruleId) ?? [];
      const cap = capFor(finding.ruleId);
      if (samples.length >= cap) continue;
      // Two budgets, both deliberate, and they count different things.
      //
      // `cap` bounds what one rule may be READ for. `rowsStillNeeded` bounds
      // what one rule may ADD to the adjudication queue, and it is the number a
      // person is asked to classify — so it has to be exact, and it has to
      // exclude findings this file already records. Skipping an already-recorded
      // finding here rather than in the writer also means the review sheet lists
      // work that does not exist yet, which is the only kind of sheet a sheet is
      // for.
      const keys = repoKeys.get(repo.name) ?? recordedVerdictKeys(repo.name);
      repoKeys.set(repo.name, keys);
      const key = `${finding.ruleId}|${finding.file}|${finding.line}`;
      if (keys.has(key)) continue;
      if (
        (freshByRule.get(finding.ruleId) ?? 0) >=
        rowsStillNeeded(finding.ruleId)
      )
        continue;
      keys.add(key);
      freshByRule.set(
        finding.ruleId,
        (freshByRule.get(finding.ruleId) ?? 0) + 1,
      );

      const filePath = join(dir, finding.file);
      const context = getContext(filePath, finding.line);

      samples.push({
        repo: repo.name,
        ruleId: finding.ruleId,
        file: finding.file,
        line: finding.line,
        message: finding.message,
        context,
      });
      byRule.set(finding.ruleId, samples);
    }
  }

  return byRule;
}

function writeReviewSheets(byRule: Map<string, SampledFinding[]>): void {
  mkdirSync(REVIEW_DIR, { recursive: true });

  // Clear old review sheets for rules that are NO LONGER LIVE.
  //
  // What this loop must NOT do is delete a sheet whose rule this run did not
  // visit. §19 review material is owner work-in-progress — pending verdict
  // classifications — and `--repo`/`--core-candidates` runs are scoped by
  // design, so "not visited" is the normal case rather than the exception. The
  // previous wording of this block described that protection in a comment
  // while the condition underneath did the opposite: `!sampledRules.has(id)`
  // is true for every rule a scoped run did not visit, so the run deleted
  // exactly the sheets it claimed to be keeping. A `--core-target` run over one
  // repository wiped 8 committed sheets (QA-PY-002/003/004/007/009/011/012 and
  // one more) before the condition was read.
  //
  // Sheets for a VISITED rule are handled below, where a rule that sampled
  // nothing removes its own sheet — that is "the queue is genuinely empty",
  // which is a different statement from "nobody looked".
  const liveRules = new Set(RULES.map((rule) => rule.id));
  for (const f of readdirSync(REVIEW_DIR)) {
    if (f.endsWith(".md") && !liveRules.has(f.replace(/\.md$/, ""))) {
      rmSync(join(REVIEW_DIR, f));
    }
  }

  for (const [ruleId, samples] of [...byRule.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    // A rule that sampled ZERO findings gets no sheet at all.
    //
    // The loop below ran anyway and wrote a sheet whose entire content was a
    // heading, the verdict legend, and "Total sampled: 0" — a review task with
    // nothing to review. Worse, it OVERWROTE any sheet the rule had from an
    // earlier run that did have samples, destroying owner classifications that
    // were still pending adjudication.
    //
    // So a zero-sample rule removes its sheet rather than replacing it. That is
    // distinct from the cleanup above, which preserves a sheet for a rule this
    // run did not visit: not-visited is owner work-in-progress, whereas
    // visited-and-found-nothing means the queue is genuinely empty.
    if (samples.length === 0) {
      rmSync(join(REVIEW_DIR, `${ruleId}.md`), { force: true });
      console.log(`  ${ruleId}: sampled nothing, removed any review sheet`);
      continue;
    }
    const lines: string[] = [
      `# ${ruleId} — Sample Findings for Classification`,
      "",
      // The cap printed is the one THIS run applied. A sheet that says 20 while
      // the run stopped at 35 tells the classifier a number that is not why
      // there are 35 rows in front of it.
      `Total sampled: ${samples.length} (max ${capFor(ruleId)} per rule)`,
      "",
      "Classify each finding as:",
      "- **TP** (True Positive) — the finding is correct, this IS the anti-pattern",
      "- **FP** (False Positive) — the finding is wrong, this is legitimate code",
      "- **UNSURE** — cannot determine without more context",
      "",
      "---",
      "",
    ];

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (!s) continue;
      lines.push(`## ${i + 1}. ${s.repo} — ${s.file}:${s.line}`);
      lines.push("");
      lines.push(`**Message:** ${s.message}`);
      lines.push("");
      lines.push("```");
      lines.push(...s.context);
      lines.push("```");
      lines.push("");
      lines.push("**verdict:** ");
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    writeFileSync(join(REVIEW_DIR, `${ruleId}.md`), lines.join("\n"));
    console.log(`  Wrote ${ruleId}.md (${samples.length} samples)`);
  }
}

function initVerdictFiles(byRule: Map<string, SampledFinding[]>): void {
  mkdirSync(VERDICTS_DIR, { recursive: true });

  // For each repo, create (or extend) a .jsonl file with empty verdicts.
  // Appending (bug-audit 2026-08-31): a repo file is created once and the
  // sampler used to refuse every later run — rules whose samples were not
  // drawn in the FIRST pass (new rules, raised caps, expanded corpus) then
  // never produced verdict rows anywhere, no matter how many times they
  // fired. New findings are appended; rows already present are skipped so
  // classified verdicts are never duplicated or overwritten.
  const byRepo = new Map<string, SampledFinding[]>();
  for (const samples of byRule.values()) {
    for (const s of samples) {
      const repoSamples = byRepo.get(s.repo) ?? [];
      repoSamples.push(s);
      byRepo.set(s.repo, repoSamples);
    }
  }

  for (const [repo, samples] of byRepo.entries()) {
    const verdictPath = join(VERDICTS_DIR, `${repo}.jsonl`);
    // The same key set the finding loop budgeted against — see
    // `recordedVerdictKeys`. It is re-read here rather than threaded through,
    // because the loop has since added this run's own keys to its copy and this
    // one must reflect the file as it was BEFORE the run.
    const existing = recordedVerdictKeys(repo);
    const fresh = samples.filter(
      (s) => !existing.has(`${s.ruleId}|${s.file}|${s.line}`),
    );
    if (fresh.length === 0) {
      console.log(`  ${repo}.jsonl already complete — no new findings to add`);
      continue;
    }
    const lines = fresh.map((s) =>
      JSON.stringify({
        ruleId: s.ruleId,
        file: s.file,
        line: s.line,
        verdict: "",
        note: "",
      }),
    );
    if (existsSync(verdictPath)) {
      const prev = readFileSync(verdictPath, "utf8");
      writeFileSync(
        verdictPath,
        prev.replace(/\n*$/, "\n") + lines.join("\n") + "\n",
      );
    } else {
      writeFileSync(verdictPath, lines.join("\n") + "\n");
    }
    console.log(`  Appended ${fresh.length} new entries to ${repo}.jsonl`);
  }
}

async function main(): Promise<void> {
  console.log("Corpus sample generator — Phase 3 (Tempering Plan)");
  if (UNMEASURED_ONLY) {
    console.log("Mode: --unmeasured-only — sampling unmeasured rules only.");
  }
  if (CORE_CANDIDATES) {
    const funded = FUNDED_CANDIDATES ?? [];
    console.log(
      `Mode: --core-candidates — ${funded.length} of ${coreCandidateRuleIds().length} ` +
        `candidate rule(s) funded this pass, each drawing up to ${CORE_CANDIDATE_CAP}. ` +
        `Every other rule emits nothing in this mode.`,
    );
    console.log(`  funded: ${funded.join(", ") || "(none)"}`);
    // Printed because the ceiling bump and this number have to agree, and the
    // person approving the bump is not the person reading this output. It is
    // `rowsStillNeeded`, the same function the finding loop stops on, so the
    // projection cannot drift from the run — the first version of this printed
    // `cap - n` while the loop stopped on samples collected, and the two
    // disagreed by 23 rows on the run that found it.
    const projected = funded
      .map((id) => ({ id, rows: rowsStillNeeded(id) }))
      .filter((r) => r.rows > 0);
    console.log(
      `  new rows this pass may add (cap − classified − already pending): ` +
        `${projected.map((r) => `${r.id} +${r.rows}`).join(", ") || "(none)"} = ` +
        `${projected.reduce((sum, r) => sum + r.rows, 0)}`,
    );
  }
  console.log(
    `Drawing up to ${CORE_CANDIDATES ? CORE_CANDIDATE_CAP : MAX_SAMPLES_PER_RULE} findings per rule from ${CORPUS.length} corpus repos...\n`,
  );

  const byRule = await scanAndSample();

  console.log(`\n=== Writing review sheets ===`);
  writeReviewSheets(byRule);

  console.log(`\n=== Initializing verdict files ===`);
  initVerdictFiles(byRule);

  // Keep the generated review sheets prettier-clean so `npm run lint`
  // (prettier --check) passes — same discipline as the other generators.
  // Bug Map M-07, shared helper (scripts/lib/prettify.ts): Prettier Node
  // API, per output file, no silent skip — a formatting failure
  // propagates and the process exits non-zero.
  for (const entry of readdirSync(REVIEW_DIR)) {
    await prettify(join(REVIEW_DIR, entry));
  }

  // Cleanup cache — best-effort. On Windows a git pack file can stay
  // locked briefly after the clone process exits; the dir is gitignored,
  // so a stale .cache is harmless, not worth crashing a completed run.
  try {
    rmSync(CACHE_DIR, { recursive: true, force: true });
  } catch {
    console.warn(`(could not remove ${CACHE_DIR} — safe to delete manually)`);
  }

  const totalRules = byRule.size;
  const totalSamples = [...byRule.values()].reduce(
    (sum, s) => sum + s.length,
    0,
  );
  console.log(`\nDone. ${totalSamples} samples across ${totalRules} rules.`);
  console.log("Next: classify verdicts in tests/corpus/verdicts/*.jsonl, then");
  console.log("run `npm run generate-fp-audit-table` to compute FP rates.");
}

await main();
