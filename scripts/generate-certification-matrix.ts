/**
 * `generate-certification-matrix.ts` — §5.4's table, generated.
 *
 * ## Why a generator
 *
 * The README's certification table is a CLAIM about three artifacts — the
 * language manifest, the declared surface, and the cell records. Written by
 * hand it is wrong the moment any of the three moves, and wrong in the way
 * that matters: a stale `CERTIFIED` is a claim the code no longer supports,
 * which is the failure this product exists to catch.
 *
 * So the table is generated, committed, and its generator is a gate. A
 * regeneration that changes a number is a diff a reviewer reads; a number that
 * changes without a regeneration is a gate failure.
 *
 * ## What the percentage MEANS
 *
 * `certified ÷ required` over `EXPECTED_CERTIFICATION_SURFACE` — "the fraction
 * of this ecosystem's required detection surface backed by certified
 * evidence". It is NOT "how trustworthy is Python", and the header says so on
 * every rendering, because a bare percentage beside a language name is
 * exactly the misreading the plan warns about.
 *
 * ## `0/107 · v6-PENDING` is the honest first output
 *
 * Nothing is certified yet, so the first matrix reads `0/107`. That is not a
 * failing state and the generator does not exit non-zero for it — a gate that
 * blocks on progress reports nothing else. What it DOES refuse is a cell record
 * that fails `validateCellRecord`, a surface cell naming no concept, and a
 * certified count the records do not support.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { CONCEPTS } from "../src/certification/concepts.js";
import {
  ALL_ECOSYSTEMS,
  supportClaim,
  type LanguageCapability,
} from "../src/certification/language-manifest.js";
import {
  validateCellRecord,
  type CellState,
} from "../src/certification/record.schema.js";
import {
  EXPECTED_CERTIFICATION_SURFACE,
  notApplicableCells,
  unknownConcepts,
  type EcosystemSurface,
} from "../src/certification/surface-manifest.js";
import {
  validateCell,
  type CellEvidence,
  type CorpusDiversity,
} from "../src/certification/validate.js";

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

const ROOT = process.cwd();
const RECORDS_DIR = join(ROOT, "docs", "certification");
const OUT = join(ROOT, "docs", "CERTIFICATION-MATRIX.md");

/** `docs/certification/*.json` → records. A missing directory is zero cells. */
function loadRecords(): {
  records: Array<Record<string, unknown>>;
  problems: string[];
} {
  const problems: string[] = [];
  const records: Array<Record<string, unknown>> = [];
  let entries: string[];
  try {
    entries = readdirSync(RECORDS_DIR).filter((f) => f.endsWith(".json"));
  } catch {
    return { records, problems };
  }
  for (const file of entries.sort()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(join(RECORDS_DIR, file), "utf8"));
    } catch (error) {
      problems.push(
        `docs/certification/${file} is not valid JSON: ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    const result = validateCellRecord(parsed);
    if (!result.valid) {
      problems.push(
        `docs/certification/${file} fails the §6 record schema:\n  - ` +
          result.problems.join("\n  - "),
      );
      continue;
    }
    records.push(parsed as Record<string, unknown>);
  }
  return { records, problems };
}

/** The matrix, as rows. Exported so the spec can assert on it directly. */
export interface MatrixRow {
  readonly ecosystem: string;
  readonly displayName: string;
  readonly wave: string;
  readonly corpusRepos: number;
  /** `CERTIFIED (manifest-v5, n=240)` — the ENGINE claim, from the manifest. */
  readonly supportClaim: string;
  /** `0/9 · v6-PENDING` — the §6 claim, from the records over the surface. */
  readonly detection: string;
  readonly required: number;
  readonly certified: number;
  readonly nextGap: string;
}

export interface Matrix {
  readonly rows: readonly MatrixRow[];
  readonly totalRequired: number;
  readonly totalCertified: number;
  readonly excluded: ReadonlyArray<{
    ecosystem: string;
    concept: string;
    framework: string;
    reason: string;
  }>;
  readonly problems: readonly string[];
}

function cellKey(eco: string, concept: string, framework: string): string {
  return `${eco}|${concept}|${framework}`;
}

export function buildMatrix(): Matrix {
  const problems: string[] = [];
  const { records, problems: recordProblems } = loadRecords();
  problems.push(...recordProblems);

  for (const concept of unknownConcepts()) {
    problems.push(
      `the declared surface names the concept "${concept}", which the ` +
        "vocabulary does not define — that cell can never be closed",
    );
  }

  // Which cells are certified, and do the RECORDS agree with their own
  // evidence? A record claiming `v6-CERTIFIED` whose gates fail is the
  // defect this generator exists to refuse: it is a state asserting something
  // the counts beside it do not support.
  const certified = new Set<string>();
  const claimed = new Set<string>();
  for (const record of records) {
    const key = cellKey(
      asString(record["ecosystem"]),
      asString(record["concept"]),
      asString(record["framework"]),
    );
    claimed.add(key);
    if (record["state"] !== "v6-CERTIFIED") continue;

    const verdict = validateCell(recordToEvidence(record));
    if (!verdict.passed) {
      const failed = verdict.gates
        .filter((g) => !g.passed)
        .map((g) => `${g.gate} ${g.dimension}`)
        .join(", ");
      problems.push(
        `docs/certification claims ${key} is v6-CERTIFIED but gate(s) ` +
          `${failed} fail on its own evidence. A state that asserts something ` +
          "the counts beside it do not support is the defect this table exists " +
          "to make visible.",
      );
      continue;
    }
    certified.add(key);
  }

  const manifest = new Map<string, LanguageCapability>(
    ALL_ECOSYSTEMS.map((entry) => [entry.id, entry]),
  );

  const rows: MatrixRow[] = EXPECTED_CERTIFICATION_SURFACE.map(
    (eco: EcosystemSurface) => {
      const required = eco.cells.filter(
        (cell) => cell.requirement === "REQUIRED",
      ).length;
      const done = eco.cells.filter(
        (cell) =>
          cell.requirement === "REQUIRED" &&
          certified.has(cellKey(eco.ecosystem, cell.concept, cell.framework)),
      ).length;
      const entry = manifest.get(eco.ecosystem);
      if (entry === undefined) {
        problems.push(
          `the declared surface lists ${eco.ecosystem}, which has no manifest ` +
            "row. §5.1's table needs both columns for every ecosystem, and a " +
            "row missing from one is a row a reader will not find.",
        );
      }
      return {
        ecosystem: eco.ecosystem,
        displayName: eco.displayName,
        wave: eco.wave,
        corpusRepos: eco.corpusRepos,
        supportClaim:
          entry === undefined ? "no manifest row" : supportClaim(entry),
        detection: `${done}/${required} · ${bestState(eco, certified)}`,
        required,
        certified: done,
        nextGap: nextGapOf(entry),
      };
    },
  );

  // A cell in the records that the SURFACE does not declare is evidence for
  // something nobody is counting.
  for (const key of claimed) {
    const declared = EXPECTED_CERTIFICATION_SURFACE.some((eco) =>
      eco.cells.some(
        (cell) => cellKey(eco.ecosystem, cell.concept, cell.framework) === key,
      ),
    );
    if (!declared) {
      problems.push(
        `docs/certification holds evidence for ${key}, which the declared ` +
          "surface does not list. Evidence for a cell nobody counts is " +
          "invisible work, and a percentage that excludes it is flattering.",
      );
    }
  }

  return {
    rows,
    totalRequired: rows.reduce((sum, r) => sum + r.required, 0),
    totalCertified: rows.reduce((sum, r) => sum + r.certified, 0),
    excluded: notApplicableCells(),
    problems,
  };
}

/**
 * The "next gap" column.
 *
 * Three DISTINCT states, and the first version collapsed the first two into
 * one message — so TypeScript, whose manifest row has no `nextLevelGap`
 * because it is at the ceiling, printed "no manifest row" while sitting in the
 * same table as nine ecosystems that HAVE rows. A column that reports a missing
 * row where the row exists is worse than an empty column: a reader stops
 * trusting the column for the rows that are correct.
 */
function nextGapOf(entry: LanguageCapability | undefined): string {
  if (entry === undefined) {
    return "no manifest row — add one or drop the ecosystem from the surface";
  }
  if (entry.nextLevelGap !== undefined) return entry.nextLevelGap;
  return "at the ceiling on manifest-v5; §6 detection is not started";
}

/** The strongest state any REQUIRED cell of this ecosystem currently holds. */
function bestState(
  eco: EcosystemSurface,
  certified: ReadonlySet<string>,
): CellState {
  let best: CellState = "v6-PENDING";
  const ORDER: readonly CellState[] = [
    "v6-PENDING",
    "v6-PARSEABLE",
    "v6-MEASURED",
    "v6-CANDIDATE",
    "v6-CERTIFIED",
    "v6-TRUST-COMPLETE",
  ];
  const index = new Map(ORDER.map((state, i) => [state, i]));
  for (const cell of eco.cells) {
    if (cell.requirement !== "REQUIRED") continue;
    if (!certified.has(cellKey(eco.ecosystem, cell.concept, cell.framework))) {
      continue;
    }
    if ((index.get("v6-CERTIFIED") ?? 0) > (index.get(best) ?? 0)) {
      best = "v6-CERTIFIED";
    }
  }
  return best;
}

/** A validated record, as the validator's input shape. */
function recordToEvidence(record: Record<string, unknown>): CellEvidence {
  const precision = record["precision"] as {
    tp: number;
    fp: number;
    n: number;
  };
  const sensitivity = record["sensitivity"] as {
    tp: number;
    fn: number;
    n: number;
  };
  // Cast to the validator's own type and pass the record's fields through
  // UNALTERED — no defaults filled in. A record is JSON, so it can carry fewer
  // axes than the interface declares, and filling them in here would convert
  // "this cell was never measured across framework versions" into "this cell
  // measured one framework version". Those are different findings and gate F
  // reports them differently, so the omission has to survive to it.
  const diversity = record["corpusDiversity"] as CorpusDiversity | undefined;
  return {
    concept: asString(record["concept"]),
    language: asString(record["language"]),
    framework: asString(record["framework"]),
    detectorHash: asString(record["detectorHash"]),
    precision,
    sensitivity,
    regressionFixtures: Number(record["regressionFixtures"] ?? 0),
    ...(diversity === undefined ? {} : { corpusDiversity: diversity }),
    ...(record["distinctShapes"] === undefined
      ? {}
      : { distinctShapes: Number(record["distinctShapes"]) }),
  };
}

/** The Markdown, from the matrix. */
export function renderMatrix(matrix: Matrix): string {
  const lines: string[] = [];
  const pct =
    matrix.totalRequired === 0
      ? "n/a"
      : `${Math.round((matrix.totalCertified / matrix.totalRequired) * 1000) / 10}%`;

  lines.push("<!-- GENERATED by scripts/generate-certification-matrix.ts. -->");
  lines.push(
    "<!-- Do not edit: `npm run docs:certification-matrix:check` fails on drift. -->",
  );
  lines.push("");
  lines.push("## Certification matrix");
  lines.push("");
  lines.push(
    `**${matrix.totalCertified}/${matrix.totalRequired} required cells certified (${pct}).** The`,
    "percentage means *the fraction of each ecosystem's required detection",
    "surface backed by certified evidence* — it is **not** how trustworthy a",
    "language is. The two columns are different claims on different ladders:",
    "",
    "- **Language support** is `manifest-v5`: can the engine ANALYSE this?",
    "- **Detection certification** is `v6-abcdef`: did the §6 contract pass",
    "  for each `concept × language × framework` cell?",
    "",
    "A cell is one concept, in one language, on one framework. §6's gates are",
    "independent: precision, sensitivity, regression resistance, language",
    "parity, framework parity, corpus diversity.",
  );
  lines.push("");
  lines.push(
    "| Ecosystem | Language support (manifest-v5) | Detection certification (v6) | Next gap |",
    "| --- | --- | --- | --- |",
  );
  for (const row of matrix.rows) {
    lines.push(
      `| ${row.displayName} | ${row.supportClaim} | ${row.detection} | ${row.nextGap} |`,
    );
  }
  lines.push("");
  lines.push(
    `**${EXPECTED_CERTIFICATION_SURFACE.length} ecosystems, ALL RETAINED, none deleted.** A wave is a`,
    "ranking by `corpusRepos × concepts`, not a deletion. Wave C ecosystems with",
    'no corpus repository STAY in the denominator so that "we support Jenkins"',
    "is a claim somebody eventually has to earn.",
  );

  if (matrix.excluded.length > 0) {
    lines.push("");
    lines.push(
      `### Not applicable (${matrix.excluded.length} cells excluded from the denominator)`,
    );
    lines.push("");
    lines.push(
      "Every exclusion is named, because an exclusion nobody prints is an exclusion nobody reviews.",
    );
    lines.push("");
    lines.push("| Ecosystem | Concept | Framework | Why |");
    lines.push("| --- | --- | --- | --- |");
    for (const cell of matrix.excluded) {
      lines.push(
        `| ${cell.ecosystem} | \`${cell.concept}\` | ${cell.framework} | ${cell.reason} |`,
      );
    }
  }

  lines.push("");
  lines.push("### Concepts");
  lines.push("");
  lines.push(
    `${Object.keys(CONCEPTS).length} concepts cover ${
      new Set(Object.values(CONCEPTS).flatMap((c) => c.rules)).size
    } live rules. A concept is a failure MODE; a rule is that mode in one language.`,
  );
  lines.push("");

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

// ── the CLI ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    "generate-certification-matrix — writes docs/CERTIFICATION-MATRIX.md\n" +
      "\n" +
      "  (no flags)   write the matrix\n" +
      "  --check      fail if the committed matrix differs from a fresh render\n" +
      "  --json       print the matrix as JSON\n" +
      "\n" +
      "Exit codes: 0 = the matrix is written or current, 1 = a problem with the\n" +
      "records or the surface, 10 = usage error.",
  );
  process.exit(0);
}
if (args.some((a) => a !== "--check" && a !== "--json")) {
  console.error(`generate-certification-matrix: unknown argument ${args[0]}`);
  process.exit(10);
}

const matrix = buildMatrix();

if (args.includes("--json")) {
  console.log(JSON.stringify(matrix, null, 2));
  process.exit(matrix.problems.length === 0 ? 0 : 1);
}

if (matrix.problems.length > 0) {
  console.error("Certification matrix problems:");
  for (const problem of matrix.problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const rendered = format(`${renderMatrix(matrix)}\n`);

if (args.includes("--check")) {
  let current: string | null = null;
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    /* written below */
  }
  if (current !== rendered) {
    console.error(
      "generate-certification-matrix: docs/CERTIFICATION-MATRIX.md is stale.\n" +
        "Regenerate with `npm run docs:certification-matrix`. A committed " +
        "table that disagrees with the manifest, the surface and the records " +
        "is a claim the code no longer supports.",
    );
    process.exit(1);
  }

  // NOTE on what is and is not checked here. `validateCell` IS enforced: the
  // `matrix.problems` block above runs before this branch, in both modes, and
  // rejects a record whose state asserts more than its own evidence supports
  // ("claims |x| is v6-CERTIFIED but gate(s) D, F fail on its own evidence").
  // An earlier draft of this check ran the validator a SECOND time here to
  // report per-cell verdicts, which was a duplicate of a check that already
  // existed — and src/rules/conformity.ts states the rule this repo works by: a
  // second copy of one check is a second thing to keep in sync.

  // What was genuinely missing is below: with zero recorded cells, this printed
  // "PASS — 0/100 cells certified", which reads as an achievement. It is the
  // absence of evidence, and an absence that prints PASS is how a coverage
  // ladder gets treated as covered.
  if (matrix.totalCertified === 0) {
    console.log(
      `generate-certification-matrix: UNEVALUATED — 0 of ${matrix.totalRequired} ` +
        `cells recorded, so no cell verdict was computed and none was earned. ` +
        `This is not a pass. \`npm run docs:certification-gaps\` lists what is ` +
        `open. A matrix at zero certifies nothing.`,
    );
    process.exit(0);
  }

  console.log(
    `generate-certification-matrix: PASS — ${matrix.totalCertified}/${matrix.totalRequired} ` +
      `cells certified across ${matrix.rows.length} ecosystems, every recorded ` +
      `cell's state cleared against its own evidence.`,
  );
  process.exit(0);
}

mkdirSync(join(ROOT, "docs"), { recursive: true });
writeFileSync(OUT, format(rendered), "utf8");
console.log(
  `generate-certification-matrix: wrote docs/CERTIFICATION-MATRIX.md — ` +
    `${matrix.totalCertified}/${matrix.totalRequired} cells across ` +
    `${matrix.rows.length} ecosystems, ${matrix.excluded.length} excluded.`,
);
