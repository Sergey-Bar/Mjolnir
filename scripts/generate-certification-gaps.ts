/**
 * `generate-certification-gaps.ts` — §5.5, the ACTIONABLE half.
 *
 * The matrix answers "where are we"; this answers "what does the next person
 * write". Each entry names the ecosystem, the concept, the language and
 * framework, the gate that fails, the ARITHMETIC of why, and the floor that
 * closes it — which is the difference between an issue a contributor can
 * accept and a number they cannot act on.
 *
 * ## Every entry is ready to become a GitHub issue
 *
 * One block per cell, with a stable `ecosystem|concept|framework` key so two
 * reports of the same gap are one gap. A gap list that grows a duplicate for
 * every run is a list nobody reads.
 *
 * ## The gap is derived, never written
 *
 * The gates come from `validateCell` on the cell's own evidence. A gap entry
 * that says "n too small" without the `n` is a task description; one that says
 * `precision.n=12 is below 35` is a specification, because the reader knows
 * what the floor is and roughly how many fixtures it takes to reach it.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { CONCEPTS } from "../src/certification/concepts.js";
import {
  validateCell,
  type CellEvidence,
  type GateVerdict,
} from "../src/certification/validate.js";
import { EXPECTED_CERTIFICATION_SURFACE } from "../src/certification/surface-manifest.js";

const ROOT = process.cwd();
const RECORDS_DIR = join(ROOT, "docs", "certification");
const OUT = join(ROOT, "docs", "CERTIFICATION-GAPS.md");

/**
 * Narrow an unknown to a string for use in a KEY.
 *
 * `String(unknown)` falls back to the object's default stringification, so a
 * record with a malformed field produces the key `[object Object]` — which
 * counts as evidence for a cell nobody declared. An explicit narrowing turns
 * that into a readable problem.
 */
function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** An empty cell: every gate open, with the arithmetic of a zero-evidence cell. */
function emptyEvidence(
  ecosystem: string,
  concept: string,
  framework: string,
): CellEvidence {
  const language = languageOf(ecosystem);
  return {
    concept,
    language,
    framework,
    detectorHash: `sha256:${"0".repeat(64)}`,
    precision: { tp: 0, fp: 0, n: 0 },
    sensitivity: { tp: 0, fn: 0, n: 0 },
    regressionFixtures: 0,
    corpusDiversity: { uniqueRepos: 0, maxSingleRepoShare: 1 },
    distinctShapes: 0,
  };
}

/** Which language an ecosystem's cells are written in. */
function languageOf(ecosystem: string): string {
  switch (ecosystem) {
    case "typescript":
      return "typescript";
    case "python":
      return "python";
    case "java":
      return "java";
    case "csharp":
      return "csharp";
    case "playwright":
    case "cypress":
    case "selenium":
    case "github-actions":
    case "gitlab-ci":
    case "jenkins":
    case "azure-pipelines":
      return "javascript";
    default:
      return ecosystem;
  }
}

export interface Gap {
  readonly key: string;
  readonly ecosystem: string;
  readonly displayName: string;
  readonly wave: string;
  readonly concept: string;
  readonly conceptTitle: string;
  readonly framework: string;
  readonly language: string;
  /** The gates that fail, with their arithmetic. */
  readonly failing: ReadonlyArray<{
    gate: string;
    dimension: string;
    reasons: readonly string[];
  }>;
  /** What closing it needs, derived from the same thresholds. */
  readonly closesWhen: string;
  readonly hasEvidence: boolean;
}

function closesWhenFor(
  key: string,
  failing: ReadonlyArray<Pick<GateVerdict, "gate" | "dimension">>,
  hasEvidence: boolean,
): string {
  void key;
  const gates = failing.map((g) => g.gate);
  const parts: string[] = [];
  if (gates.includes("A")) {
    parts.push(
      "precision: a corpus of ≥3 real repositories with ≤40% from any one, and a false-positive rate whose 95% upper bound is ≤0.10 at n≥35",
    );
  }
  if (gates.includes("B")) {
    parts.push(
      "sensitivity: ≥20 hand-built positives that the detector finds (cell tier), pooled to ≥35 for the concept tier, with the 95% lower bound on recall ≥0.80",
    );
  }
  if (gates.includes("C")) {
    parts.push(
      "one regression fixture per historical defect that caused a fix",
    );
  }
  if (gates.includes("D")) {
    parts.push("a cell for each other language this concept is bound to");
  }
  if (gates.includes("E")) {
    parts.push("a cell per framework whose semantics genuinely differ");
  }
  if (gates.includes("F")) {
    parts.push("precision evidence from ≥3 distinct repositories");
  }
  if (parts.length === 0) {
    return "no gate is failing — this cell has no recorded evidence at all";
  }
  return `${parts.join("; ")}. Open gate(s): ${gates.join(", ")}.${
    hasEvidence ? "" : " No evidence has been recorded for this cell yet."
  }`;
}

/** Read `docs/certification/*.json` into evidence, keyed by cell. */
function readRecords(): Map<string, CellEvidence> {
  const out = new Map<string, CellEvidence>();
  let names: string[];
  try {
    names = readdirSync(RECORDS_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return out;
  }
  for (const name of names) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(
        readFileSync(join(RECORDS_DIR, name), "utf8"),
      ) as Record<string, unknown>;
    } catch {
      continue;
    }
    const key = `${String(parsed["ecosystem"])}|${String(parsed["concept"])}|${String(parsed["framework"])}`;
    const precision = parsed["precision"] as CellEvidence["precision"];
    const sensitivity = parsed["sensitivity"] as CellEvidence["sensitivity"];
    const diversity = parsed["corpusDiversity"] as
      CellEvidence["corpusDiversity"] | undefined;
    out.set(key, {
      concept: asString(parsed["concept"]),
      language: asString(
        parsed["language"],
        languageOf(asString(key.split("|")[0])),
      ),
      framework: asString(parsed["framework"]),
      detectorHash: asString(parsed["detectorHash"]),
      precision,
      sensitivity,
      regressionFixtures: Number(parsed["regressionFixtures"] ?? 0),
      ...(diversity === undefined ? {} : { corpusDiversity: diversity }),
      ...(parsed["distinctShapes"] === undefined
        ? {}
        : { distinctShapes: Number(parsed["distinctShapes"]) }),
    });
  }
  return out;
}

export function buildGaps(): Gap[] {
  const records = readRecords();
  const gaps: Gap[] = [];

  for (const eco of EXPECTED_CERTIFICATION_SURFACE) {
    for (const cell of eco.cells) {
      if (cell.requirement !== "REQUIRED") continue;
      const key = `${eco.ecosystem}|${cell.concept}|${cell.framework}`;
      const evidence =
        records.get(key) ??
        emptyEvidence(eco.ecosystem, cell.concept, cell.framework);
      const verdict = validateCell(evidence);
      if (verdict.passed) continue;

      const failing = verdict.gates
        .filter((g) => !g.passed)
        .map((g) => ({
          gate: g.gate,
          dimension: g.dimension,
          reasons: g.reasons,
        }));

      gaps.push({
        key,
        ecosystem: eco.ecosystem,
        displayName: eco.displayName,
        wave: eco.wave,
        concept: cell.concept,
        conceptTitle: CONCEPTS[cell.concept]?.title ?? cell.concept,
        framework: cell.framework,
        language: evidence.language,
        failing,
        closesWhen: closesWhenFor(key, failing, records.has(key)),
        hasEvidence: records.has(key),
      });
    }
  }

  return gaps.sort((a, b) => a.key.localeCompare(b.key));
}

export function renderGaps(gaps: readonly Gap[]): string {
  const lines: string[] = [];
  lines.push("<!-- GENERATED by scripts/generate-certification-gaps.ts. -->");
  lines.push(
    "<!-- Do not edit. `npm run docs:certification-gaps:check` fails on drift. -->",
  );
  lines.push("");
  lines.push("## Certification gaps");
  lines.push("");
  lines.push(
    `${gaps.length} required cell(s) are not certified. Each is a task with a`,
    "stated floor, generated from the same thresholds the validator uses — so a",
    "contributor can read what closing it needs without reading the code.",
  );
  lines.push("");
  lines.push("| Cell | Concept | Open gates |");
  lines.push("| --- | --- | --- |");
  for (const gap of gaps) {
    lines.push(
      `| \`${gap.key}\` | ${gap.conceptTitle} | ${gap.failing
        .map((f) => `**${f.gate}** ${f.dimension}`)
        .join("<br>")} |`,
    );
  }
  lines.push("");
  lines.push("### Each gap, in full");
  lines.push("");
  for (const gap of gaps) {
    lines.push(`#### \`${gap.key}\``);
    lines.push("");
    lines.push(
      `- **Ecosystem** ${gap.displayName} (wave ${gap.wave})`,
      `- **Language / framework** ${gap.language} / ${gap.framework}`,
      `- **Concept** ${gap.conceptTitle} (\`${gap.concept}\`)`,
      `- **Evidence** ${
        gap.hasEvidence ? "partial — see the open gates" : "none recorded yet"
      }`,
      "",
      "**What closing it needs**",
      "",
      gap.closesWhen,
      "",
    );
    for (const f of gap.failing) {
      lines.push(`**${f.gate} — ${f.dimension}**`, "");
      for (const reason of f.reasons) lines.push(`- ${reason}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}

/**
 * Format through the repository's own prettier.
 *
 * The generator's raw output and the committed file must not differ by
 * formatting: a check that fails on prettier's opinion is a check people stop
 * running. Formatting here means the written file is already prettier-clean and
 * `--check` compares content.
 */
function format(markdown: string): string {
  return execFileSync(
    process.execPath,
    [
      join(ROOT, "node_modules", "prettier", "bin", "prettier.cjs"),
      "--parser",
      "markdown",
    ],
    { input: markdown, encoding: "utf8" },
  );
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    "generate-certification-gaps — writes docs/CERTIFICATION-GAPS.md\n" +
      "\n" +
      "  (no flags)   write the gap report\n" +
      "  --check      fail if the committed report differs from a fresh render\n" +
      "  --json       print the gaps as JSON\n",
  );
  process.exit(0);
}
if (args.some((a) => a !== "--check" && a !== "--json")) {
  console.error(`generate-certification-gaps: unknown argument ${args[0]}`);
  process.exit(10);
}

const gaps = buildGaps();

if (args.includes("--json")) {
  console.log(JSON.stringify(gaps, null, 2));
  process.exit(0);
}

const rendered = format(`${renderGaps(gaps)}\n`);

if (args.includes("--check")) {
  let current: string | null = null;
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    /* written below */
  }
  if (current === rendered) {
    console.log(
      `generate-certification-gaps: PASS — ${gaps.length} open cell(s).`,
    );
    process.exit(0);
  }
  console.error(
    "generate-certification-gaps: docs/CERTIFICATION-GAPS.md is stale.\n" +
      "Regenerate with `npm run docs:certification-gaps`.",
  );
  process.exit(1);
}

mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(OUT, rendered, "utf8");
console.log(
  `generate-certification-gaps: wrote docs/CERTIFICATION-GAPS.md — ${gaps.length} open cell(s).`,
);
