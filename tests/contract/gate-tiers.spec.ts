/**
 * The gate tier declarations are a contract, so they get the same treatment
 * as any other contract: a spec that proves the relation holds, proves the
 * checker can fail, and proves the declarations still describe the workflows
 * they name.
 *
 * The second of those is the one that matters. `scripts/check-ci-local-parity.mjs`
 * has always asserted one direction — that a required command is present —
 * and a checker that can only ever pass is a checker nobody believes. Every
 * assertion here that says "this fails" mutates the committed data, runs the
 * real checker, and restores the file in a `finally` — so the suite proves
 * the failure is reachable rather than asserting that a function returns a
 * number.
 */

import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const TIER_DIR = join(ROOT, "gates");
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

function readTier(tier: Tier): TierFile {
  return JSON.parse(
    readFileSync(join(TIER_DIR, `${tier}.json`), "utf8"),
  ) as TierFile;
}

function runChecker(): CheckerResult {
  try {
    const stdout = execFileSync(process.execPath, [CHECKER], {
      cwd: ROOT,
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

const scratch: string[] = [];

/**
 * Run the checker against a mutated copy of a committed tier file.
 *
 * The mutation swaps the committed file and restores it from a byte copy
 * taken immediately beforehand, in a `finally`. Copying the whole
 * repository would be safer and much slower; a test at the end asserts the
 * tree is left byte-identical, so a dropped `finally` cannot pass silently.
 */
function withMutatedTier(
  tier: Tier,
  mutate: (parsed: TierFile) => void,
): CheckerResult {
  const target = join(TIER_DIR, `${tier}.json`);
  const backup = readFileSync(target, "utf8");
  try {
    const parsed = JSON.parse(backup) as TierFile;
    mutate(parsed);
    writeFileSync(target, JSON.stringify(parsed, null, 2) + "\n", "utf8");
    return runChecker();
  } finally {
    writeFileSync(target, backup, "utf8");
  }
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

  it("fails when a gate has no description-worthy rationale, i.e. an empty tier", () => {
    const { code, output } = withMutatedTier("pr", (parsed) => {
      parsed.gates = [];
    });
    expect(code).toBe(1);
    expect(output).toContain("gates must be a non-empty array");
  });

  it("the tree is left exactly as it was found", () => {
    // The mutation tests above swap committed files. If a `finally` were
    // ever removed, the next `npm test` would run against a tier file that
    // no longer matches its name, and the failure would look like a real
    // contract breach. This assertion is the receipt.
    const before = TIERS.map((tier) =>
      readFileSync(join(TIER_DIR, `${tier}.json`), "utf8"),
    );
    withMutatedTier("pr", (parsed) => {
      parsed.gates = [];
    });
    const after = TIERS.map((tier) =>
      readFileSync(join(TIER_DIR, `${tier}.json`), "utf8"),
    );
    expect(after).toEqual(before);
  });
});

describe("the committed tier files are byte-stable", () => {
  it("a bare run of the checker leaves them untouched", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-tiers-"));
    scratch.push(dir);
    for (const tier of TIERS) {
      copyFileSync(join(TIER_DIR, `${tier}.json`), join(dir, `${tier}.json`));
    }
    expect(runChecker().code).toBe(0);
    for (const tier of TIERS) {
      expect(
        readFileSync(join(TIER_DIR, `${tier}.json`), "utf8"),
        `${tier}.json was rewritten by the checker`,
      ).toBe(readFileSync(join(dir, `${tier}.json`), "utf8"));
    }
  });
});
