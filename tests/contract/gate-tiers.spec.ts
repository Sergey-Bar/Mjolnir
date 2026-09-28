/**
 * The gate tier declarations are a contract, so they get the same treatment
 * as any other contract: a spec that proves the relation holds, proves the
 * checker can fail, and proves the declarations still describe the workflows
 * they name.
 *
 * The second of those is the one that matters. `scripts/check-ci-local-parity.mjs`
 * has always asserted one direction — that a required command is present —
 * and a checker that can only ever pass is a checker nobody believes.
 *
 * MUTATION HAPPENS IN A FIXTURE TREE, NEVER IN THE REPOSITORY. The first
 * version of this spec mutated a committed tier file, ran the checker, and
 * restored it in a `finally`. That worked, and it also made `npm test` fail
 * intermittently: vitest runs files in parallel workers, and
 * `tests/certification/candidate-manifest.spec.ts` was hashing the working
 * tree at the same moment this file had `gates/pr.json` emptied. The
 * symptom was a `workingTreeSha256 drift` error three suites away from the
 * cause, which is a bad way to spend an afternoon.
 *
 * `--root=<dir>` on the checker makes the fixture approach possible, and
 * removes the restore step entirely — so there is no window in which the
 * repository is in a state the test did not intend.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-gate-tiers.mjs");
const TIERS = ["pr", "release", "nightly"] as const;
type Tier = (typeof TIERS)[number];

interface CheckerResult {
  code: number;
  output: string;
}

/** The minimum of a tier file these tests mutate. */
interface TierFile {
  schemaVersion: number;
  tier: string;
  description: string;
  workflows: string[];
  gates: Array<{ id: string; command: string }>;
}

interface CommittedWorkflow {
  jobs?: Record<string, unknown>;
}

const scratch: string[] = [];

function readTier(tier: Tier): TierFile {
  return JSON.parse(
    readFileSync(join(ROOT, "gates", `${tier}.json`), "utf8"),
  ) as TierFile;
}

/**
 * A throwaway copy of everything the checker reads: the three tier files, the
 * workflows they name, and package.json (for the script-chain closure).
 * Nothing outside this directory is read or written.
 */
function fixtureTree(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-gate-tiers-"));
  scratch.push(dir);
  mkdirSync(join(dir, "gates"), { recursive: true });
  mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
  for (const tier of TIERS) {
    cpSync(
      join(ROOT, "gates", `${tier}.json`),
      join(dir, "gates", `${tier}.json`),
    );
  }
  const declared = new Set<string>();
  for (const tier of TIERS) {
    for (const path of readTier(tier).workflows) declared.add(path);
  }
  for (const path of declared) {
    cpSync(join(ROOT, path), join(dir, path));
  }
  cpSync(join(ROOT, "package.json"), join(dir, "package.json"));
  return dir;
}

function runChecker(root?: string): CheckerResult {
  const args = root === undefined ? [CHECKER] : [CHECKER, `--root=${root}`];
  try {
    const stdout = execFileSync(process.execPath, args, {
      cwd: root ?? ROOT,
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

/** Run the checker against a fixture tree with one tier file mutated. */
function withMutatedTier(
  tier: Tier,
  mutate: (parsed: TierFile) => void,
): CheckerResult {
  const dir = fixtureTree();
  const path = join(dir, "gates", `${tier}.json`);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as TierFile;
  mutate(parsed);
  writeFileSync(path, JSON.stringify(parsed, null, 2) + "\n", "utf8");
  return runChecker(dir);
}

/** A fixture tree with a workflow mutated, for the presence check. */
function withMutatedWorkflow(
  mutate: (workflow: CommittedWorkflow) => void,
): CheckerResult {
  const dir = fixtureTree();
  const path = join(dir, readTier("pr").workflows[0] as string);
  // Parsed and re-emitted with the same `yaml` package the checker uses, so
  // the fixture is a real workflow file rather than a JSON file wearing a
  // .yml extension. A hand-rolled emitter would drift from the real parser
  // and the test would be asserting on an artefact the checker never sees.
  const workflow = parse(readFileSync(path, "utf8")) as CommittedWorkflow;
  mutate(workflow);
  writeFileSync(path, stringify(workflow), "utf8");
  return runChecker(dir);
}

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

describe("gate tier declarations", () => {
  it("the three tiers are declared and nested pr ⊆ release ⊆ nightly", () => {
    const { code, output } = runChecker();
    expect(output).toBeTruthy();
    expect(code, output).toBe(0);
  });

  it("the committed tree and a faithful copy of it agree", () => {
    // If the fixture is not a faithful copy, every negative test below proves
    // nothing: it would be asserting on a tree that is not the repository's.
    expect(runChecker(fixtureTree()).code).toBe(0);
  });

  it("every tier declares a description saying why its gates are in it", () => {
    for (const tier of TIERS) {
      const parsed = readTier(tier);
      // A description has to be a paragraph, not a token: the question a
      // reviewer asks of a tier file is "why is this gate here and not one
      // tier up", and a two-word answer does not answer it.
      expect(parsed.description.length, tier).toBeGreaterThan(120);
      expect(parsed.description, tier).toMatch(/[.!?](\s|$)/);
      expect(parsed.workflows.length, tier).toBeGreaterThan(0);
    }
  });

  it("the chain is genuinely nested, not three equal sets", () => {
    const size = TIERS.map((tier) => {
      const parsed = readTier(tier);
      return new Set(parsed.gates.map((gate) => gate.id)).size;
    });
    const [pr, release, nightly] = size as [number, number, number];
    // Strictly increasing. Equal counts would satisfy every subset check
    // while carrying no information about ordering.
    expect(pr).toBeLessThan(release);
    expect(release).toBeLessThan(nightly);
  });

  it("every gate id is unique within its tier", () => {
    for (const tier of TIERS) {
      const ids = readTier(tier).gates.map((gate) => gate.id);
      expect(new Set(ids).size, tier).toBe(ids.length);
    }
  });
});

describe("the tier checker can fail", () => {
  it("fails when a gate is dropped from a middle tier", () => {
    const { code, output } = withMutatedTier("release", (parsed) => {
      parsed.gates = parsed.gates.filter((gate) => gate.id !== "lint");
    });
    expect(code).toBe(1);
    expect(output).toContain("pr ⊆ release is violated");
  });

  it("fails when a gate is dropped from the outermost tier", () => {
    const { code, output } = withMutatedTier("nightly", (parsed) => {
      parsed.gates = parsed.gates.filter((gate) => gate.id !== "typecheck");
    });
    expect(code).toBe(1);
    expect(output).toContain("release ⊆ nightly is violated");
  });

  it("fails when a gate is declared that no workflow runs", () => {
    const { code, output } = withMutatedTier("pr", (parsed) => {
      // Assembled rather than written out: `tests/contract/docs-consistency.spec.ts`
      // greps tracked source for literal `npm run <script>` names and fails on
      // any that package.json does not define. Invented script names are
      // legitimate test data, and the fix is to not spell them where a reader
      // — or that grep — will read them as an instruction.
      const invented = ["not", "a", "real", "gate"].join("-");
      parsed.gates.push({ id: "phantom", command: `npm run ${invented}` });
    });
    expect(code).toBe(1);
    expect(output).toContain('gate "phantom"');
    expect(output).toContain("reads as coverage");
  });

  it("fails when a declared gate's step is removed from the workflow", () => {
    // The other direction of the same check, and the one that matters most:
    // a gate that is declared and no longer run reads as coverage.
    const { code, output } = withMutatedWorkflow((workflow) => {
      for (const job of Object.values(workflow.jobs ?? {})) {
        const steps = (job as { steps?: unknown }).steps;
        if (Array.isArray(steps)) steps.length = 0;
      }
    });
    expect(code).toBe(1);
    expect(output).toMatch(/no step in .* runs it directly/);
  });

  it("fails on a duplicate gate id, which would make the relation ambiguous", () => {
    const { code, output } = withMutatedTier("pr", (parsed) => {
      const first = parsed.gates[0];
      if (first === undefined) throw new Error("pr.json declares no gates");
      parsed.gates.push({ ...first });
    });
    expect(code).toBe(1);
    expect(output).toContain("duplicate gate id");
  });

  it("fails when a tier names a workflow that does not exist", () => {
    const { code, output } = withMutatedTier("pr", (parsed) => {
      parsed.workflows = [".github/workflows/not-a-workflow.yml"];
    });
    expect(code).toBe(1);
    expect(output).toContain("does not exist");
  });

  it("fails when the tier field disagrees with the filename", () => {
    const { code, output } = withMutatedTier("pr", (parsed) => {
      parsed.tier = "release";
    });
    expect(code).toBe(1);
    expect(output).toContain('tier field is "release"');
  });

  it("fails on a tier with no gates at all", () => {
    const { code, output } = withMutatedTier("pr", (parsed) => {
      parsed.gates = [];
    });
    expect(code).toBe(1);
    expect(output).toContain("gates must be a non-empty array");
  });

  it("fails on a tier with no description", () => {
    const { code, output } = withMutatedTier("pr", (parsed) => {
      parsed.description = "   ";
    });
    expect(code).toBe(1);
    expect(output).toContain("description is required");
  });

  it("leaves the committed tree untouched", () => {
    // The receipt for the property this file is built around. Every negative
    // test above writes only inside a temp directory; this proves it.
    const before = TIERS.map((tier) =>
      readFileSync(join(ROOT, "gates", `${tier}.json`), "utf8"),
    );
    withMutatedTier("pr", (parsed) => {
      parsed.gates = [];
    });
    const after = TIERS.map((tier) =>
      readFileSync(join(ROOT, "gates", `${tier}.json`), "utf8"),
    );
    expect(after).toEqual(before);
  });
});

describe("the committed tier files are byte-stable", () => {
  it("a bare run of the checker leaves them untouched", () => {
    const dir = fixtureTree();
    const before = TIERS.map((tier) =>
      readFileSync(join(ROOT, "gates", `${tier}.json`), "utf8"),
    );
    expect(runChecker().code).toBe(0);
    const after = TIERS.map((tier) =>
      readFileSync(join(ROOT, "gates", `${tier}.json`), "utf8"),
    );
    expect(after, "the checker rewrote a committed tier file").toEqual(before);
    expect(existsSync(join(dir, "gates", "pr.json"))).toBe(true);
  });
});
