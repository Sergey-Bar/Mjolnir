/**
 * P0-10 / P0-5 — every npm script is reachable from a gate, or declared manual.
 *
 * `package.json` carried 57 scripts that no workflow step ran and no other
 * script chained to. Nothing failed: an npm script wired to nothing is
 * indistinguishable from a script that does not exist. Fifty of them turned
 * out to be genuine one-shot tools and write-mode generators; the interesting
 * finding was the inverse — the two gates that "covered" this ground each
 * cover half of it, and neither can see the seam:
 *
 *   - `check-gate-tiers.mjs` asks whether a DECLARED gate has a step. It says
 *     nothing about scripts nobody declared.
 *   - `check-unimported-modules.mjs` asks whether a SCRIPT FILE is invoked. A
 *     script reachable only as a member of a chain looks orphaned to it by
 *     construction, so it cannot be the whole answer.
 *
 * Every mutation here happens in a fixture tree. Editing a committed
 * `package.json` or `docs/MANUAL-SCRIPTS.md` while
 * `tests/certification/candidate-manifest.spec.ts` hashes the working tree is
 * the cross-test interference this repository has already paid for once.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-script-reachability.mjs");

const scratch: string[] = [];

interface CheckerResult {
  code: number;
  output: string;
}

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

function fixtureTree(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-script-reach-"));
  scratch.push(dir);
  cpSync(join(ROOT, "package.json"), join(dir, "package.json"));
  mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
  for (const name of readdirSync(join(ROOT, ".github", "workflows"))) {
    cpSync(
      join(ROOT, ".github", "workflows", name),
      join(dir, ".github", "workflows", name),
    );
  }
  mkdirSync(join(dir, "docs"), { recursive: true });
  cpSync(
    join(ROOT, "docs", "MANUAL-SCRIPTS.md"),
    join(dir, "docs", "MANUAL-SCRIPTS.md"),
  );
  return dir;
}

function runChecker(dir: string): CheckerResult {
  try {
    const stdout = execFileSync(process.execPath, [CHECKER, `--root=${dir}`], {
      cwd: dir,
      encoding: "utf8",
    });
    return { code: 0, output: stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

function setScripts(
  dir: string,
  mutate: (scripts: Record<string, string>) => void,
) {
  const path = join(dir, "package.json");
  const parsed = JSON.parse(readFileSync(path, "utf8")) as {
    scripts: Record<string, string>;
  };
  mutate(parsed.scripts);
  writeFileSync(path, JSON.stringify(parsed, null, 2) + "\n", "utf8");
}

function addWorkflowStep(dir: string, script: string) {
  const path = join(dir, ".github", "workflows", "probe.yml");
  writeFileSync(
    path,
    [
      "name: probe",
      "on:",
      "  workflow_dispatch:",
      "jobs:",
      "  run:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      `      - run: ${script}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

describe("every npm script is reachable or declared", () => {
  it("the committed tree passes", () => {
    const { code, output } = runChecker(fixtureTree());
    expect(code, output).toBe(0);
    const report = JSON.parse(output) as {
      scripts: number;
      reachableFromWorkflows: number;
      declaredManual: string[];
    };
    expect(report.scripts).toBeGreaterThan(100);
    expect(report.reachableFromWorkflows).toBeGreaterThan(0);
  });

  it("a new unwired script fails", () => {
    const dir = fixtureTree();
    setScripts(dir, (scripts) => {
      scripts["gate:nothing-calls-this"] = "node scripts/nothing.js";
    });
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("gate:nothing-calls-this");
    expect(output).toContain("no workflow step runs it");
  });

  it("a script reached only through a chain is NOT reported", () => {
    // The seam between the two existing gates, stated as a test: `certify:ci`
    // is reached from a workflow through `ci-local`, and `typecheck` is
    // reached from `certify:ci` — so it is reachable and the checker must not
    // report it, which `check-unimported-modules.mjs` would.
    //
    // The assertion is on scripts the CHAIN reaches, not on
    // `docs:translations`: that one is now reachable too (via `certify:ci`),
    // so checking it would be checking nothing. A test that asserts on a name
    // that is absent for an unrelated reason reads as a passing guard.
    const dir = fixtureTree();
    const { code, output } = runChecker(dir);
    expect(code, output).toBe(0);
    const report = JSON.parse(output) as { declaredManual: string[] };
    expect(report.declaredManual).not.toContain("typecheck");
    expect(report.declaredManual).not.toContain("certify:ci");
    expect(report.declaredManual).not.toContain("docs:translations");
    // And the manual list is genuinely populated, so the "not.toContain"
    // above is not passing because the checker reports nothing.
    expect(report.declaredManual.length).toBeGreaterThan(20);
  });

  it("removing the workflow step that reaches a chain is caught", () => {
    // The negative of the previous test. `ci-local` is what reaches `certify`,
    // and `certify` is what reaches most of the chain; strip that one line
    // from every workflow that names it and the whole chain goes dark at once.
    const dir = fixtureTree();
    const workflowDir = join(dir, ".github", "workflows");
    for (const name of readdirSync(workflowDir)) {
      const path = join(workflowDir, name);
      const workflow = parse(readFileSync(path, "utf8")) as Record<
        string,
        unknown
      >;
      let touched = false;
      for (const job of Object.values(
        workflow["jobs"] as Record<string, { steps?: unknown[] }>,
      )) {
        const before = job.steps?.length ?? 0;
        job.steps = (job.steps ?? []).filter((step) => {
          const run = (step as { run?: unknown }).run;
          return typeof run !== "string" || !/npm run ci-local/.test(run);
        });
        if (job.steps.length !== before) touched = true;
      }
      if (touched) writeFileSync(path, stringify(workflow), "utf8");
    }
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("no workflow step runs it");
  });

  it("declaring the script manual makes it legal", () => {
    const dir = fixtureTree();
    setScripts(dir, (scripts) => {
      scripts["gate:nothing-calls-this"] = "node scripts/nothing.js";
    });
    const path = join(dir, "docs", "MANUAL-SCRIPTS.md");
    writeFileSync(
      path,
      readFileSync(path, "utf8") +
        "\n| `gate:nothing-calls-this` | TOOL — a hypothetical one-shot " +
        "investigation with no cadence, declared here so the account is complete |\n",
      "utf8",
    );
    const { code, output } = runChecker(dir);
    expect(code, output).toBe(0);
  });

  it("a manual row for a script a gate DOES reach is a failure", () => {
    // The direction that keeps the registry honest. Without it, a maintainer
    // under pressure silences the gate by declaring everything manual, and the
    // next generation of that script is never noticed. `test:coverage:ci` is
    // the fixture: `ci.yml` names it directly, so no chain is involved and
    // reachability is not in question.
    const dir = fixtureTree();
    const path = join(dir, "docs", "MANUAL-SCRIPTS.md");
    writeFileSync(
      path,
      readFileSync(path, "utf8") +
        "\n| `test:coverage:ci` | ALIAS — declared manual even though " +
        "`.github/workflows/ci.yml` runs it directly, which must be rejected |\n",
      "utf8",
    );
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("cannot be both a gate and a manual tool");
  });

  it("a manual row for a script package.json does not define is a failure", () => {
    // An exemption for a deleted script is a hole with a comment on it.
    const dir = fixtureTree();
    const path = join(dir, "docs", "MANUAL-SCRIPTS.md");
    writeFileSync(
      path,
      readFileSync(path, "utf8") +
        "\n| `gate:deleted-last-month` | TOOL — this script no longer exists, " +
        "and the row outlived it, which is the defect this checks for |\n",
      "utf8",
    );
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("hole with a comment on it");
  });

  it("a one-word reason is rejected", () => {
    // "manual" is a category, not a reason. The reason is the part a reviewer
    // needs in order to check the decision.
    const dir = fixtureTree();
    setScripts(dir, (scripts) => {
      scripts["gate:barely-explained"] = "node scripts/barely.js";
    });
    const path = join(dir, "docs", "MANUAL-SCRIPTS.md");
    writeFileSync(
      path,
      readFileSync(path, "utf8") + "\n| `gate:barely-explained` | manual |\n",
      "utf8",
    );
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("one-word reason");
  });

  it("a missing registry fails rather than passing vacuously", () => {
    const dir = fixtureTree();
    rmSync(join(dir, "docs", "MANUAL-SCRIPTS.md"));
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("missing");
  });

  it("npm-owned lifecycle scripts are neither reported nor required to be declared", () => {
    // `prepublishOnly` is invoked by npm on publish, so nothing in this
    // repository names it. Special-casing it in the checker keeps the
    // exception next to the rule it bends, rather than as a table row that
    // dresses npm's contract up as a decision of ours.
    const dir = fixtureTree();
    setScripts(dir, (scripts) => {
      scripts["prepublishOnly"] = "npm run build";
    });
    const { code, output } = runChecker(dir);
    expect(code, output).toBe(0);
  });

  it("a workspace script is not attributed to the root package", () => {
    // `npm --prefix site run doctor` names the SITE's script. Reading it as a
    // root script would let the root's manifest vouch for a workspace's
    // script — which is the pages.yml defect the workflow-scripts gate exists
    // for, arriving through a different door.
    const dir = fixtureTree();
    addWorkflowStep(dir, "npm --prefix site run build");
    const { code, output } = runChecker(dir);
    expect(code, output).toBe(0);
  });
});
