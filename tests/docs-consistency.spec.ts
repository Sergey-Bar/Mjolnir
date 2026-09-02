/**
 * Docs-vs-registry consistency (Master-Stabilization-Plan Sprint 3,
 * Task 15).
 *
 * README.md's rule tables are an explicitly curated sample ("the full
 * live catalog is generated from the registry" — it links to
 * `qa-doctor rules --md` for completeness), not a claim of covering
 * every rule. What must never happen is a listed ID that doesn't exist,
 * or a listed severity that doesn't match the registry — that's a
 * silent lie a reader has no way to catch themselves. This test makes
 * that class of drift fail CI instead of sitting undetected (guards
 * the class of bug in Master-Stabilization-Plan findings #3 and #10).
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RULES } from "../src/rules/index.js";

const ROOT = join(import.meta.dirname, "..");
const README = readFileSync(join(ROOT, "README.md"), "utf8");
const STATE = readFileSync(join(ROOT, ".planning", "STATE.md"), "utf8");

/** Extracts `| QA-XXX-000 | ... | severity |` rows from a markdown table row. */
function extractRuleTableRows(
  markdown: string,
): Array<{ id: string; severity: string }> {
  const rows: Array<{ id: string; severity: string }> = [];
  const lineRe = /^\|\s*(QA-[A-Z]+-\d{3})\s*\|.*\|\s*([a-z]+)\s*\|\s*$/gm;
  for (const m of markdown.matchAll(lineRe)) {
    const id = m[1];
    const severity = m[2];
    if (id && severity) rows.push({ id, severity });
  }
  return rows;
}

describe("README.md rule tables match the actual registry", () => {
  const rows = extractRuleTableRows(README);
  const byId = new Map(RULES.map((r) => [r.id, r]));

  it("found at least one rule row to check (sanity — regex didn't silently match nothing)", () => {
    expect(rows.length).toBeGreaterThan(10);
  });

  it.each(rows)("$id: exists in the registry", ({ id }) => {
    expect(
      byId.has(id),
      `README.md lists "${id}" as a shipped rule, but it is not in ` +
        `src/rules/index.ts's RULES array — either the rule was removed ` +
        `without updating the README, or the ID has a typo.`,
    ).toBe(true);
  });

  it.each(rows)(
    "$id: README severity matches the registry (or is a documented dynamic-severity floor)",
    ({ id, severity }) => {
      const rule = byId.get(id);
      if (!rule) return; // already failed by the existence check above
      if (severity === rule.severity) return;
      // Some rules compute severity per-occurrence rather than declaring
      // a single static one (e.g. QA-TEST-002: a justified skip is a
      // warning, an unjustified one escalates to error). README rows
      // documenting BOTH observed severities for the same ID are
      // accurate to real runtime behavior, not stale — but a row
      // claiming a severity that is neither the registry's declared
      // floor nor one this allowlist has reviewed as a real dynamic
      // outcome is still a bug.
      const reviewedDynamicSeverities: Record<string, string[]> = {
        "QA-TEST-002": ["error", "warning"],
      };
      const allowed = reviewedDynamicSeverities[id];
      expect(
        allowed,
        `README.md claims "${id}" is severity "${severity}", but the ` +
          `registry has it as "${rule.severity}" and this isn't a ` +
          `reviewed dynamic-severity rule — a reader deciding whether ` +
          `this rule would block their CI is reading a false claim.`,
      ).toBeDefined();
      expect(allowed).toContain(severity);
    },
  );
});

describe("no doc claims a gap that source contradicts", () => {
  // Two concrete stale-gap claims found by direct source inspection
  // (Master-Stabilization-Plan finding #10): the Windows tar bug was
  // already fixed, and ci.yml already runs all three OSes. Guard both
  // so a future revert of either fix doesn't silently un-fix the docs
  // claim along with it, and so a *new* stale claim of this shape gets
  // caught by extending this describe block rather than by accident.
  it("STATE.md does not claim the Windows tar --force-local bug is still open", () => {
    expect(STATE).not.toMatch(
      /Windows.{0,40}(tar --force-local|force-local).{0,60}(still open|unresolved|known gap)/i,
    );
  });

  it("ci.yml actually runs the OS matrix STATE.md credits it with", () => {
    const ci = readFileSync(
      join(ROOT, ".github", "workflows", "ci.yml"),
      "utf8",
    );
    for (const os of ["ubuntu-latest", "windows-latest", "macos-latest"]) {
      expect(
        ci,
        `STATE.md and Master-Stabilization-Plan.md credit ci.yml with ` +
          `running ${os}, but it is not in the workflow's matrix.`,
      ).toContain(os);
    }
  });

  it("docs/SARIF-INTEGRATION.md does not claim GitHub Code Scanning upload is already wired into ci.yml when it isn't (a real fabricated claim caught while writing this doc)", () => {
    const sarifDoc = readFileSync(
      join(ROOT, "docs", "SARIF-INTEGRATION.md"),
      "utf8",
    );
    const ci = readFileSync(
      join(ROOT, ".github", "workflows", "ci.yml"),
      "utf8",
    );
    // "Wired in" now includes the dedicated weekly SARIF workflow —
    // upload-sarif runs there, not in the PR-blocking ci.yml.
    const sarifWorkflow = readFileSync(
      join(ROOT, ".github", "workflows", "sarif-code-scanning.yml"),
      "utf8",
    );
    const claimsAlreadyWired =
      /already (covered|wired|running)/i.test(sarifDoc) &&
      /upload-sarif/i.test(sarifDoc);
    const actuallyWired =
      /upload-sarif/i.test(ci) || /upload-sarif/i.test(sarifWorkflow);
    if (claimsAlreadyWired) {
      expect(
        actuallyWired,
        "docs/SARIF-INTEGRATION.md claims Code Scanning upload is " +
          "already running, but neither ci.yml nor " +
          "sarif-code-scanning.yml contains an upload-sarif step.",
      ).toBe(true);
    }
  });

  it("every CLI flag documented in docs/SARIF-INTEGRATION.md's own examples is a real, recognized flag", () => {
    const sarifDoc = readFileSync(
      join(ROOT, "docs", "SARIF-INTEGRATION.md"),
      "utf8",
    );
    // Extract `--flag` tokens that appear directly after `qa-doctor` in a
    // fenced command example — a lightweight, deliberately conservative
    // check (it will under-match rather than false-flag prose), aimed at
    // catching exactly the class of bug found while writing this doc: an
    // invented flag (--output) that doesn't exist in parseArgs.
    const flags = new Set(
      [...sarifDoc.matchAll(/mjolnir[^\n`]*?(--[a-z-]+)/g)].map((m) => m[1]),
    );
    const knownFlags = new Set([
      "--json",
      "--format",
      "--verbose",
      "--scope",
      "--max-duration",
      "--width",
      "--ascii",
      "--no-ascii",
      "--since",
      "--tone",
    ]);
    for (const flag of flags) {
      expect(
        knownFlags.has(flag as string),
        `docs/SARIF-INTEGRATION.md references "${flag}" as a mjolnir ` +
          `flag, but it is not in this test's known-flags list (kept in ` +
          `sync with parseArgs in src/cli.ts) — either it's a real flag ` +
          `this list needs to learn about, or it's an invented flag the ` +
          `same way --output was.`,
      ).toBe(true);
    }
  });
});

describe("README Node version matches package.json engines", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const enginesNode = pkg.engines?.node as string | undefined;

  it("package.json declares a node engines field", () => {
    expect(enginesNode).toBeDefined();
  });

  it("README states the correct minimum Node version (not a stale ≥ 20 claim)", () => {
    // The README must mention the actual floor from package.json, not a
    // lower version that would lead users to install and fail.
    expect(README).not.toMatch(/Node\.js\s*[≥>]=?\s*20\b/);
    // It should mention 22 (the real floor).
    expect(README).toMatch(/Node\.js\s*[≥>]=?\s*22/);
  });

  it("CONTRIBUTING.md states the correct Node requirement", () => {
    const contributing = readFileSync(join(ROOT, "CONTRIBUTING.md"), "utf8");
    expect(contributing).toMatch(/Node.*22/);
  });
});

describe("README does not reference the unrelated npm package 'qa-doctor' (unscoped)", () => {
  it("no npmjs.com/package/qa-doctor link (that's someone else's software)", () => {
    expect(README).not.toMatch(/npmjs\.com\/package\/qa-doctor(?!\/)/);
  });

  it("no shields.io badge querying the unscoped 'qa-doctor' npm package", () => {
    expect(README).not.toMatch(/img\.shields\.io\/npm\/[vd]\/qa-doctor\b/);
  });
});

describe("every documented `npm run` command actually exists", () => {
  // A real, shipped defect this locks: all 91 generated rule pages told
  // the reader to reproduce corpus counts with a script whose name had
  // been changed to "corpus:regression" without updating the generator
  // string, so the one command a skeptical reader would actually
  // copy-paste failed with "Missing script". For a tool whose whole
  // claim is "we prove it", that is the worst possible first impression
  // — and exactly the class a grep catches for free.
  //
  // (This comment deliberately does not spell the dead name out as a
  // literal `npm run …`, or this test would flag its own source.)
  const scripts = new Set(
    Object.keys(
      (
        JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
          scripts: Record<string, string>;
        }
      ).scripts,
    ),
  );

  // Fixtures, the golden repo and archived plans deliberately contain
  // invented script names as test data or historical record — they are
  // not instructions to a reader. site/ has its own package.json whose
  // scripts (prebuild/predev/gen) are checked by its own toolchain.
  // Corpus review sheets embed real-world source verbatim (bug-audit
  // 2026-08-31): a scanned repo's own build+preview script line lands in
  // the sheet as quoted evidence — data, never an instruction to a
  // mjolnir reader. (This comment deliberately does not spell the
  // preview command out as a literal `npm run …`, or this test would
  // flag its own source — same trap as the sibling comment above.)
  const EXCLUDED = [
    "tests/fixtures/",
    "tests/golden/",
    "tests/corpus/review/",
    // §08 classes B/C committed corpora are realistic-world TEST DATA:
    // a fixture's webServer command legitimately references an invented
    // script name exactly because a real repo's config would. Data,
    // never an instruction to a mjolnir reader. (The script name is
    // deliberately not spelled out here, or this test would flag its
    // own source — same trap as the sibling comment above.)
    "tests/corpus/positive-fixtures/",
    "tests/corpus/negative-fixtures/",
    "docs/archive/",
    "node_modules/",
    "dist/",
    "coverage/",
    "site/",
    ".planning/Tempering",
  ];

  function trackedFiles(): string[] {
    return execFileSync("git", ["ls-files", "*.md", "*.ts", "*.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((f) => !EXCLUDED.some((prefix) => f.startsWith(prefix)));
  }

  it("finds tracked files to check (sanity)", () => {
    expect(trackedFiles().length).toBeGreaterThan(20);
  });

  it("no tracked doc or source references a script package.json does not define", () => {
    const offenders: string[] = [];
    for (const file of trackedFiles()) {
      let text: string;
      try {
        text = readFileSync(join(ROOT, file), "utf8");
      } catch {
        continue; // listed but unreadable — not this test's concern
      }
      for (const m of text.matchAll(/npm run ([a-z][a-z0-9:-]*)/g)) {
        const script = m[1];
        if (script && !scripts.has(script)) {
          offenders.push(`${file}: npm run ${script}`);
        }
      }
    }
    expect(
      [...new Set(offenders)],
      "these files tell a reader to run an npm script that does not exist " +
        "in package.json — either the script was renamed and the doc was " +
        "not, or the command was never real",
    ).toEqual([]);
  });
});

describe("the north-star law is committed, not just cited", () => {
  // Strategic-review finding F0: the governing law was quoted by
  // doctor.ts, FP-AUDIT.md, copilot-instructions.md and the planning
  // docs while living in no committed file — an unversioned conscience
  // for a product whose entire thesis is provenance. The law file must
  // exist, carry the exact quoted sentence, and stay in sync with the
  // code that enforces it.
  const LAW =
    "Rules without a measured FP rate (n ≥ 10) cannot ship in the core tier";
  // Collapse whitespace AND strip `*` decoration, so a citation of the
  // sentence inside a block comment (doctor.ts's Law #3 note wraps it
  // across lines) still matches after normalization.
  const normalize = (s: string) => s.replace(/\*/g, " ").replace(/\s+/g, " ");

  let claude: string;
  try {
    claude = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
  } catch {
    throw new Error(
      "CLAUDE.md is missing — the north-star law must be committed, " +
        "not just cited (strategic-review finding F0).",
    );
  }

  it("CLAUDE.md exists and states the north-star law verbatim", () => {
    expect(normalize(claude)).toContain(LAW);
  });

  it("CLAUDE.md states the north-star metric the law serves", () => {
    expect(claude).toContain("false-proof rate ≈ 0");
  });

  it("doctor.ts's Law #3 citation still quotes the same sentence", () => {
    const doctor = readFileSync(
      join(ROOT, "src", "commands", "doctor.ts"),
      "utf8",
    );
    expect(normalize(doctor)).toContain(LAW);
  });

  it("copilot-instructions.md still carries the same laws (canonical-copy sync)", () => {
    const copilot = readFileSync(
      join(ROOT, ".github", "copilot-instructions.md"),
      "utf8",
    );
    expect(copilot).toContain("false-proof rate ≈ 0");
    expect(copilot).toContain("equal-size removal");
    expect(copilot).toContain("must-fire AND must-not-fire");
  });
});
