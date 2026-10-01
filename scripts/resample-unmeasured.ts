/**
 * Re-measure the UNMEASURED detectors over the corpus the verdicts already
 * came from.
 *
 * §07's answer to "a rework bumped `detectorRevision`" is re-measure, and the
 * repository has no tool for the narrow case. `corpus:sample` clones all 35
 * pinned repositories, which is the right tool for building a measurement
 * from scratch — and the wrong one for asking the question that is actually
 * open when a rework lands: **what does the current detector still find in
 * the code the previous measurement was taken from?**
 *
 * Same files, same pinned SHA, new detector. That makes the comparison
 * like-for-like, and it is the only form in which "the rework moved the false
 * positive rate from 66% to 0" is a claim rather than a hope.
 *
 * It does NOT write a verdict. A finding is not a false positive until a
 * human with the code in front of them says so, and
 * `tests/corpus/verdicts/README.md` makes a committed verdict IMMUTABLE —
 * which is exactly right, and exactly why this script stops at candidates.
 *
 *   node scripts/resample-unmeasured.ts                 # every unmeasured rule
 *   node scripts/resample-unmeasured.ts QA-PY-004       # one rule
 *   node scripts/resample-unmeasured.ts --concurrency=12
 *
 * The verdict files double as the file manifest: a rule's sample is exactly
 * the files its verdicts reference, which is what makes the re-measure
 * comparable to the measurement it replaces.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { computeCodeText } from "../src/engine/code-text.js";
import { parsePythonAst } from "../src/engine/tree-sitter-ast.js";
import { RULES } from "../src/rules/index.js";
import {
  effectiveTier,
  hasValidMeasurement,
} from "../src/rules/measurement.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const VERDICTS_DIR = join(ROOT, "tests", "corpus", "verdicts");
const REGISTRY = join(ROOT, "tests", "corpus", "audit.ts");

/** repo name -> { slug, ref } from the committed corpus registry. */
function corpusRefs(): Map<string, { slug: string; ref: string }> {
  const text = readFileSync(REGISTRY, "utf8");
  const refs = new Map<string, { slug: string; ref: string }>();
  for (const m of text.matchAll(
    /name:\s*"([^"]+)",\s*url:\s*"https:\/\/github\.com\/([^"]+?)\.git",\s*ref:\s*"([0-9a-f]{7,40})"/g,
  )) {
    const name = m[1];
    const slug = m[2];
    const ref = m[3];
    if (name !== undefined && slug !== undefined && ref !== undefined) {
      refs.set(name, { slug, ref });
    }
  }
  return refs;
}

/** Every rule with no CURRENT measurement — the ones this tool is for. */
export function unmeasuredRuleIds(): string[] {
  return RULES.filter((rule) => !hasValidMeasurement(rule)).map(
    (rule) => rule.id,
  );
}

/** The sample for a rule: the files its own verdicts reference. */
/**
 * The sample for a rule: the files its own verdicts reference.
 *
 * DISTINCT files, not one entry per verdict row. The first version returned a
 * row per verdict, so a file carrying five verdicts was fetched and scanned
 * five times and every finding on it was reported five times — which made
 * QA-PY-007 look like it emitted five findings for one
 * `with pytest.raises` when the detector emits one. I chased that as a
 * detector double-fire for several minutes before a probe with a corrected
 * line calculation showed all 35 offsets were distinct.
 *
 * That is the defect this whole measurement is about, committed into the
 * tool that measures it: a count inflated by the shape of the bookkeeping
 * rather than by the code under test.
 */
function sampleFor(ruleId: string): Array<{ repo: string; file: string }> {
  const seen = new Set<string>();
  const out: Array<{ repo: string; file: string }> = [];
  for (const name of readdirSync(VERDICTS_DIR).filter((f) =>
    f.endsWith(".jsonl"),
  )) {
    const repo = name.replace(".jsonl", "");
    for (const line of readFileSync(join(VERDICTS_DIR, name), "utf8")
      .split("\n")
      .filter(Boolean)) {
      const row = JSON.parse(line) as { ruleId: string; file: string };
      if (row.ruleId !== ruleId) continue;
      const key = `${repo}|${row.file}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ repo, file: row.file });
    }
  }
  return out;
}

const langOf = (p: string) =>
  p.endsWith(".py")
    ? "python"
    : p.endsWith(".java")
      ? "java"
      : p.endsWith(".cs")
        ? "csharp"
        : "typescript";

interface Fetched {
  path: string;
  body: string;
}

async function loadOne(
  repo: string,
  file: string,
  refs: Map<string, { slug: string; ref: string }>,
): Promise<Fetched | null> {
  // A local corpus (the committed fixtures) needs no ref and no network.
  const local = [
    join(ROOT, "tests", "corpus", file),
    join(ROOT, "tests", file),
    join(ROOT, file),
  ].find((p) => existsSync(p));
  if (local !== undefined) {
    return { path: file, body: readFileSync(local, "utf8") };
  }
  const ref = refs.get(repo);
  if (ref === undefined) return null;
  const url = `https://raw.githubusercontent.com/${ref.slug}/${ref.ref}/${file}`;
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    return { path: `${repo}/${file}`, body: await res.text() };
  } catch {
    return null;
  }
}

export async function main() {
  const args = process.argv.slice(2);
  const only = args.find((a) => !a.startsWith("--")) ?? null;
  const conc = Number(
    args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] ?? "8",
  );

  const refs = corpusRefs();
  const targets = only === null ? unmeasuredRuleIds() : [only];
  if (targets.length === 0) {
    console.log(
      "Every rule carries a current measurement. Nothing to re-sample.",
    );
    return;
  }

  console.log(
    `Re-sampling ${targets.length} unmeasured rule(s) over the corpus their\n` +
      "verdicts came from. CANDIDATES, not verdicts — each needs adjudication.\n",
  );

  for (const ruleId of targets) {
    const rule = RULES.find((r) => r.id === ruleId);
    if (rule === undefined) {
      console.log(`${ruleId}: not in the registry\n`);
      continue;
    }
    const sample = sampleFor(ruleId);
    if (sample.length === 0) {
      console.log(
        `${ruleId.padEnd(13)} no verdicts yet — use \`npm run corpus:sample\` to build a measurement from scratch\n`,
      );
      continue;
    }

    const fetched: Fetched[] = [];
    for (let i = 0; i < sample.length; i += conc) {
      const batch = sample.slice(i, i + conc);
      const results = await Promise.all(
        batch.map((s) => loadOne(s.repo, s.file, refs)),
      );
      for (const r of results) if (r !== null) fetched.push(r);
    }

    const findings: string[] = [];
    for (const item of fetched) {
      const path = item.path;
      const ast = await parsePythonAst(item.body);
      const produced = rule.run({
        path,
        text: item.body,
        codeText: computeCodeText({ path, text: item.body }, langOf(path)),
        ast,
      });
      for (const f of produced) findings.push(`${path}:${f.line}`);
    }

    const tier = effectiveTier(rule);
    console.log(
      `${ruleId.padEnd(13)} tier=${tier.padEnd(10)} sample=${fetched.length}/${sample.length} files -> ${findings.length} finding(s)`,
    );
    for (const f of findings.slice(0, 12)) console.log(`               ${f}`);
    if (findings.length > 12)
      console.log(`               ... and ${findings.length - 12} more`);
    console.log("");
  }
}

// Guarded for the same reason `tests/corpus/audit.ts` is: the re-measure
// pass is a MODE of `corpus:audit --resample`, so the audit imports and calls
// `main()` rather than spawning a second process. Without the guard, that
// import would fire a networked re-measure as a side effect of loading the
// module.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
