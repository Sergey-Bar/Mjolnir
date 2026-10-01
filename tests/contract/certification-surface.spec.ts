/**
 * §5.3's denominator, and the gate that keeps it from being edited into
 * whatever the percentage needs it to be.
 *
 * The three properties that matter, and each has a test:
 *
 *   1. The surface cannot SHRINK silently. A committed denominator is what
 *      stops "60% → 100%" from being achieved by deleting the five cells that
 *      were not certified, and the gate compares the manifest against a
 *      committed BASELINE so a removal committed last month is still visible
 *      today. A gate that compares the manifest against itself cannot see
 *      that at all — the change already passed.
 *   2. Every exclusion NAMES AN ALTERNATIVE. `NOT_APPLICABLE` is a
 *      first-class state and it is printed, but an exclusion whose reason says
 *      only "not applicable here" is a deletion with a comment. The plan's own
 *      example — a CI concept on a Python ecosystem — shows the real shape: it
 *      names the surface the cell does belong to.
 *   3. `REQUIRED` may grow freely. That raises the bar and is never gated.
 *      Only shrinking is gated, and only with acknowledgement.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { CONCEPT_IDS } from "../../src/certification/concepts.js";
import {
  EXPECTED_CERTIFICATION_SURFACE,
  notApplicableCells,
  requiredCells,
  unknownConcepts,
} from "../../src/certification/surface-manifest.js";

const ROOT = resolve(import.meta.dirname, "..", "..");
const BASELINE = join(ROOT, "docs", "certification-surface-baseline.json");

const scratch: string[] = [];
afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Run the gate AT `root`.
 *
 * The path is resolved FROM `root`, not passed as a fixed path with a cwd —
 * because the gate computes its ROOT from its own location, so invoking the
 * real gate with a fixture cwd reads the REAL manifest and reports the real
 * surface. The fixture copied the gate in and then never ran it, which made
 * the shrink invisible for three runs.
 */
function runGate(args: string[] = [], root = ROOT) {
  const gate = join(root, "scripts", "check-certification-surface.mjs");
  try {
    const stdout = execFileSync(process.execPath, [gate, ...args], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1 << 26,
    });
    return { code: 0, output: stdout };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: e.status ?? 1,
      output: `${e.stdout ?? ""}${e.stderr ?? ""}`,
    };
  }
}

/**
 * A copy of the tree the gate can mutate without touching the repository.
 *
 * `node_modules` is a JUNCTION to the real one rather than a copy: the gate
 * spawns `tsx` from `ROOT/node_modules`, and without it the spawn fails. That
 * failure is what caught the bug this fixture exists for — the gate used to
 * swallow it and report PASS, so the shrink was never noticed. The gate now
 * exits 10 on an unreadable manifest, and the fixture has to give it something
 * readable so the OTHER failure is the one under test.
 */
function fixtureTree(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-surface-"));
  scratch.push(dir);
  for (const rel of [
    "package.json",
    "scripts/check-certification-surface.mjs",
    "scripts/certification-surface-cells.ts",
    "src/certification",
    // `surface-manifest.ts` imports `compareCodePoints` from `src/lib` for
    // its machine-facing sort (localeCompare resolves the AMBIENT locale, which
    // `deterministic-ordering.spec.ts` forbids). Copying only
    // `src/certification` left the fixture's manifest unresolvable, and the
    // gate reported exit 10 — which is the hardening working, but the fixture
    // has to give it something readable or it tests the wrong failure.
    "src/lib",
  ]) {
    const from = join(ROOT, rel);
    mkdirSync(join(dir, rel.split("/").slice(0, -1).join("/")), {
      recursive: true,
    });
    cpSync(from, join(dir, rel), { recursive: true });
  }
  mkdirSync(join(dir, "docs"), { recursive: true });
  symlinkSync(
    join(ROOT, "node_modules"),
    join(dir, "node_modules"),
    "junction",
  );
  return dir;
}

describe("the declared surface", () => {
  it("covers all eleven ecosystems, none deleted", () => {
    // §5.1 retains every ecosystem, including the three with zero corpus
    // repositories. Deleting them would improve every percentage in the report
    // by removing the ecosystems nobody has measured.
    expect(EXPECTED_CERTIFICATION_SURFACE).toHaveLength(11);
    const zeroCorpus = EXPECTED_CERTIFICATION_SURFACE.filter(
      (e) => e.corpusRepos === 0,
    );
    expect(
      zeroCorpus.map((e) => e.ecosystem).sort(),
      "the wave-C ecosystems with no corpus must STAY in the denominator",
    ).toEqual(["azure-pipelines", "gitlab-ci", "jenkins"]);
  });

  it("names no concept the vocabulary does not have", () => {
    // The gate caught three of these on its first run — ids guessed by hand
    // rather than read from the derived table. A REQUIRED cell for an
    // undefined concept is a denominator entry nobody can ever close.
    expect(unknownConcepts()).toEqual([]);
    expect(CONCEPT_IDS.length).toBeGreaterThan(50);
  });

  it("has a denominator", () => {
    // The whole point of declaring it. A surface with no REQUIRED cells has a
    // percentage of 0/0, which every report renders as 100%.
    expect(requiredCells().length).toBeGreaterThan(90);
  });

  it("prints its exclusions rather than absorbing them", () => {
    const excluded = notApplicableCells();
    expect(excluded.length).toBeGreaterThan(0);
    for (const cell of excluded) {
      expect(
        cell.reason,
        `${cell.ecosystem}|${cell.concept} has no reason`,
      ).not.toBe("");
    }
  });

  it("every NOT_APPLICABLE cell names what it belongs to instead", () => {
    // The reason's job is to say where the cell WENT. "Not applicable here"
    // with no successor is a deletion wearing a label.
    for (const cell of notApplicableCells()) {
      expect(
        cell.reason,
        `${cell.ecosystem}|${cell.concept} explains only why not here`,
      ).toMatch(/belongs|owned|expressible|not /u);
    }
  });

  it("declares no duplicate cell", () => {
    const keys = EXPECTED_CERTIFICATION_SURFACE.flatMap((eco) =>
      eco.cells.map((c) => `${eco.ecosystem}|${c.concept}|${c.framework}`),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("the gate", () => {
  it("passes on the committed surface", () => {
    const { code, output } = runGate();
    expect(code, output).toBe(0);
    expect(output).toContain("check-certification-surface: PASS");
  });

  it("is idempotent — acknowledging a change makes the next run pass", () => {
    // The first version recorded the acknowledgement REASON but never moved
    // the baseline's cell list, so the same removal fired on every subsequent
    // run and the gate could only be silenced by editing a JSON file by hand.
    // A gate that cannot be cleared by its own documented mechanism is a gate
    // that gets deleted.
    const dir = fixtureTree();
    const first = runGate([], dir);
    expect(first.code, first.output).toBe(0);

    // Shrink the surface in the fixture and acknowledge it.
    //
    // The edit is by REGEX on the concept key, not by matching the formatted
    // block: prettier's output for that object changed shape once already
    // during this file's writing, and an anchor that tracks the formatter is
    // an anchor that stops testing anything the next time formatting moves.
    const manifest = join(dir, "src", "certification", "surface-manifest.ts");
    const text = readFileSync(manifest, "utf8");
    const REMOVED_CONCEPT = "bare-truthiness-assert-on-complex-object";
    // Removed by LINE SCAN, not by a regex across lines. The linter is
    // right that `[^}]*?` followed by `\n\s*` can backtrack polynomially, and
    // the fix is to stop asking a pattern to find a closing brace on its own.
    //
    // UP to the object's own `{` first. Starting at the `concept:` line leaves
    // the opening brace behind and the manifest stops parsing — which the gate
    // then reports as exit 10, because a gate that cannot read its input must
    // not report a pass. That is the hardened behaviour doing its job on a
    // broken fixture, so the failure was legible instead of a false PASS.
    const lines = text.split("\n");
    const at = lines.findIndex((l) =>
      l.includes(`concept: "${REMOVED_CONCEPT}"`),
    );
    expect(
      at,
      `the fixture cannot find ${REMOVED_CONCEPT} to remove`,
    ).toBeGreaterThan(-1);
    let open = at;
    while (open >= 0 && !/^\s*\{\s*$/.test(lines[open] ?? "")) open--;
    let close = at;
    while (close < lines.length && !/^\s*\},?\s*$/.test(lines[close] ?? "")) {
      close++;
    }
    expect(
      open,
      "the cell object has no opening brace above its concept line",
    ).toBeGreaterThan(-1);
    expect(close, "the cell object is never closed").toBeLessThan(lines.length);
    lines.splice(open, close - open + 1);
    const shrunk = lines.join("\n");
    expect(
      shrunk,
      `the fixture could not remove ${REMOVED_CONCEPT} — the mutation no ` +
        "longer matches the manifest, so this test would pass without ever " +
        "shrinking anything",
    ).not.toBe(text);
    writeFileSync(manifest, shrunk, "utf8");

    const denied = runGate([], dir);
    expect(denied.code, denied.output).toBe(1);
    expect(denied.output).toContain("SHRANK");
    expect(denied.output).toContain(REMOVED_CONCEPT);

    const ack = runGate(
      [
        "--acknowledge-surface-change=that concept moved to a language-neutral cell",
      ],
      dir,
    );
    expect(ack.code, ack.output).toBe(0);

    // And the NEXT run is green — the property that was broken.
    const after = runGate([], dir);
    expect(after.code, after.output).toBe(0);

    const baseline = JSON.parse(
      readFileSync(
        join(dir, "docs", "certification-surface-baseline.json"),
        "utf8",
      ),
    ) as { acknowledged: string };
    expect(baseline.acknowledged).toContain("moved to a language-neutral cell");
  });

  it("rejects an unknown flag rather than ignoring it", () => {
    const { code, output } = runGate(["--acknowledge"]);
    expect(code).toBe(10);
    expect(output).toContain("unknown argument");
  });

  it("has committed its own baseline", () => {
    const baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as {
      cells: string[];
    };
    expect(
      baseline.cells.length,
      "the baseline is what makes a removal committed last month visible today; " +
        "an empty one compares nothing",
    ).toBeGreaterThan(90);
  });
});
