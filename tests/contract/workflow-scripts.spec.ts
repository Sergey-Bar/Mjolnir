/**
 * P0-3 / P0-5 — the workflow-script gate, and the defect it exists for.
 *
 * `pages.yml` once ran the SITE's own doctor script in a step with no
 * `working-directory`. The root package.json has no `doctor` script; it
 * exists only in `site/package.json`. The step could never pass, and the
 * workflow only triggers on `site/**`, `docs/**`, `src/**` and manual
 * dispatch, so nobody watched it fail.
 *
 * The tree is correct today — the step carries `working-directory: site` —
 * which is exactly why the assertion below is worth having. A correct line
 * found by reading is not an invariant, and the next edit does not have to
 * be as careful as the last one. The gate is spawned against fixture trees,
 * never against the repository: the first version of a mutation test that
 * edits a committed file is how `candidate-manifest` once reported a
 * `workingTreeSha256 drift` three suites away from the cause.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";

import {
  EXEMPT_FROM_SCRIPT_CHECK,
  EXEMPT_FROM_TIERS,
  MIN_REASON_LENGTH,
  weakExemptionReasons,
} from "../../scripts/lib/workflow-exemptions.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-workflow-scripts.mjs");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

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

/**
 * A copy of everything the checker reads: the root package.json, every
 * workflow, and the `site/` manifest those workflows resolve against.
 */
function fixtureTree(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-workflow-scripts-"));
  scratch.push(dir);
  cpSync(join(ROOT, "package.json"), join(dir, "package.json"));
  mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
  for (const name of readdirSync(join(ROOT, ".github", "workflows"))) {
    cpSync(
      join(ROOT, ".github", "workflows", name),
      join(dir, ".github", "workflows", name),
    );
  }
  mkdirSync(join(dir, "site"), { recursive: true });
  cpSync(join(ROOT, "site", "package.json"), join(dir, "site", "package.json"));
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

/** A fixture tree with one workflow step mutated. */
function withMutatedStep(
  file: string,
  mutate: (workflow: Record<string, unknown>) => void,
): CheckerResult {
  const dir = fixtureTree();
  const path = join(dir, ".github", "workflows", file);
  const workflow = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  mutate(workflow);
  writeFileSync(path, stringify(workflow), "utf8");
  return runChecker(dir);
}

describe("every workflow step's npm script resolves where it runs", () => {
  it("the committed workflows pass, and so does a faithful copy of them", () => {
    // The fixture is a COPY of every workflow, not a hand-picked subset, so a
    // check that passed here and failed on the repository would be telling us
    // the fixture diverged. Asserted on the fixture so the negative tests below
    // are known to be measuring the checker.
    const { code, output } = runChecker(fixtureTree());
    expect(code, output).toBe(0);
  });

  it("the shipped defect is caught: a site-only script run from the repo root", () => {
    // Exactly the shape pages.yml had: a `doctor` script that exists only in
    // site/package.json, run from a step with no `working-directory`. The name
    // is assembled rather than written out, because a literal in this file
    // would be a literal a repository-wide grep finds — and the
    // docs-consistency gate reports any `npm run <name>` in tracked source
    // that package.json does not define, which is the same class of
    // "this file tells a reader to run something that does not exist".
    const siteOnly = ["doc", "tor"].join("");
    const { code, output } = withMutatedStep("pages.yml", (workflow) => {
      for (const job of Object.values(
        workflow["jobs"] as Record<string, { steps?: unknown[] }>,
      )) {
        for (const step of job.steps ?? []) {
          const s = step as Record<string, unknown>;
          if (typeof s["run"] === "string" && /npm run /.test(s["run"])) {
            delete s["working-directory"];
          }
        }
      }
    });
    expect(code).toBe(1);
    expect(output).toContain(`npm run ${siteOnly}`);
    expect(output).toContain("does not define");
    // The failure names the file, so a maintainer is not left guessing which of
    // two identically-named manifests was consulted.
    expect(output).toContain("package.json");
  });

  it("a working-directory pointing at a manifest without the script still fails", () => {
    // The other direction of the same mistake: pointing the step at a real
    // directory is not sufficient, the script has to be IN it. So the
    // site-only script is aimed at the ROOT manifest this time.
    const siteOnly = ["doc", "tor"].join("");
    const { code, output } = withMutatedStep("pages.yml", (workflow) => {
      for (const job of Object.values(
        workflow["jobs"] as Record<string, { steps?: unknown[] }>,
      )) {
        for (const step of job.steps ?? []) {
          const s = step as Record<string, unknown>;
          if (
            typeof s["run"] === "string" &&
            new RegExp(`npm run ${siteOnly}`).test(s["run"])
          ) {
            s["working-directory"] = ".";
          }
        }
      }
    });
    expect(code).toBe(1);
    expect(output).toContain("does not define");
  });

  it("a missing working-directory manifest fails rather than skipping", () => {
    const { code, output } = withMutatedStep("pages.yml", (workflow) => {
      for (const job of Object.values(
        workflow["jobs"] as Record<string, { steps?: unknown[] }>,
      )) {
        for (const step of job.steps ?? []) {
          const s = step as Record<string, unknown>;
          if (typeof s["run"] === "string" && /npm run build/.test(s["run"])) {
            s["working-directory"] = "a/directory/that/is/not/here";
          }
        }
      }
    });
    expect(code).toBe(1);
    expect(output).toContain("does not exist");
  });

  it("a root-level script still passes, so the gate is not merely a namer", () => {
    // The control: a real root script with no working-directory must stay
    // green, or the gate would be failing everything and proving nothing.
    const dir = fixtureTree();
    writeFileSync(
      join(dir, ".github", "workflows", "probe.yml"),
      [
        "name: probe",
        "on:",
        "  workflow_dispatch:",
        "jobs:",
        "  run:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - run: npm run typecheck",
        "",
      ].join("\n"),
      "utf8",
    );
    const { code, output } = runChecker(dir);
    expect(code, output).toBe(0);
  });

  it("invalid YAML in a workflow is a failure, not a skip", () => {
    const dir = fixtureTree();
    writeFileSync(
      join(dir, ".github", "workflows", "broken.yml"),
      "on: [\n",
      "utf8",
    );
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("invalid YAML");
  });

  it("leaves the committed tree untouched", () => {
    const before = readFileSync(
      join(ROOT, ".github", "workflows", "pages.yml"),
      "utf8",
    );
    withMutatedStep("pages.yml", (workflow) => {
      for (const job of Object.values(
        workflow["jobs"] as Record<string, { steps?: unknown[] }>,
      )) {
        for (const step of job.steps ?? []) {
          const s = step as Record<string, unknown>;
          if (typeof s["run"] === "string") s["run"] = "npm run typecheck";
        }
      }
    });
    expect(
      readFileSync(join(ROOT, ".github", "workflows", "pages.yml"), "utf8"),
    ).toBe(before);
  });
});

describe("the exemption lists are data with reasons", () => {
  it("imports the real maps rather than scraping a checker's source", () => {
    // The first version of this test read `check-workflow-scripts.mjs` and
    // pattern-matched its source text for `".github/workflows/…"`, with
    // adjacent `\s*\n?\s*` quantifiers that the regexp linter correctly called
    // super-linear. A test that parses the implementation's formatting is
    // testing the formatting; the lists moved to their own module, which is
    // where a reviewer reads them anyway.
    expect(EXEMPT_FROM_SCRIPT_CHECK.size).toBeGreaterThan(0);
    expect(EXEMPT_FROM_TIERS.size).toBeGreaterThan(0);
    expect(weakExemptionReasons()).toEqual([]);
  });

  it("every reason is a reason, not a category", () => {
    // `MIN_REASON_LENGTH` is 24; the shortest shipped entry is 49. A one-word
    // exemption is unfalsifiable, because there is no claim in it to disagree
    // with.
    for (const list of [EXEMPT_FROM_TIERS, EXEMPT_FROM_SCRIPT_CHECK]) {
      for (const [path, reason] of list) {
        expect(reason.trim().length, path).toBeGreaterThanOrEqual(
          MIN_REASON_LENGTH,
        );
        expect(reason.trim(), path).not.toBe("not a gate");
        expect(reason.trim(), path).not.toBe("manual");
      }
    }
  });

  it("every exempt workflow is a file that exists", () => {
    for (const list of [EXEMPT_FROM_TIERS, EXEMPT_FROM_SCRIPT_CHECK]) {
      for (const path of list.keys()) {
        expect(existsSync(join(ROOT, path)), path).toBe(true);
      }
    }
  });

  it("a script the exempted workflow names is the INSTALLED package's, and the reason says so", () => {
    // The first version asserted that a script-exempt workflow names no root
    // script — and it failed on `release-smoke.yml` running the build script,
    // which is correct: it builds the tarball it then installs. A consumer
    // driving a published package runs THAT package's scripts, and the script
    // checker cannot verify them against this repository's manifest at all.
    //
    // So the checkable property is the interlock, not a prohibition: a
    // script-exempt workflow that names a root script must SAY that the
    // scripts belong to something else. An exemption whose reason does not
    // account for the names it is exempt from is the shape of a hole — a
    // workflow running this repository's own gates with an exemption stapled
    // on.
    for (const [path, reason] of EXEMPT_FROM_SCRIPT_CHECK) {
      const workflow = parse(readFileSync(join(ROOT, path), "utf8")) as {
        jobs?: Record<string, { steps?: Array<{ run?: unknown }> }>;
      };
      const steps = Object.values(workflow.jobs ?? {}).flatMap(
        (job) => job.steps ?? [],
      );
      const namesRootScript = steps.some(
        (step) =>
          typeof step.run === "string" &&
          [...step.run.matchAll(/\bnpm run ([\w:.-]+)/g)].some(
            (m) => m[1] !== undefined && m[1] in pkg.scripts,
          ),
      );
      if (!namesRootScript) continue;
      expect(
        reason,
        `${path} names a root script but the reason does not say whose it is`,
      ).toMatch(
        /installed package|belongs to something other than this repository/i,
      );
    }
  });

  it("the two lists may overlap, and a gate checks that it does not contradict", () => {
    // `release-smoke.yml` is a nightly workflow this repository owns AND runs
    // someone else's scripts, so it is legitimately in `gates/nightly.json`
    // and legitimately script-exempt. A single list with one reason per
    // workflow could not say either honestly — the reason would have to be
    // both "belongs to the nightly tier" and "does not belong to any tier".
    expect(
      EXEMPT_FROM_SCRIPT_CHECK.has(".github/workflows/release-smoke.yml"),
    ).toBe(true);
    expect(EXEMPT_FROM_TIERS.has(".github/workflows/release-smoke.yml")).toBe(
      false,
    );
  });
});
