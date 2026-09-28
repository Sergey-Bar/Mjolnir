/**
 * The unimported-module guard has to be able to fail.
 *
 * `scripts/check-unimported-modules.mjs` compares the modules nothing imports
 * against a committed list. Without a test that proves the failure is
 * reachable, the gate is the same kind of assertion this release has been
 * removing: a thing that passes because its subject never comes up.
 *
 * Both directions matter, and the second is the one that bites. A first
 * version of the related reachability assertion asked `reachable.has(path) ===
 * false` about two modules — and passed for four commits after they were
 * deleted, because that is true of a path that does not exist.
 *
 * Every mutation here runs in a temp fixture tree via the checker's
 * `--root=` flag, never against the repository. See
 * `tests/contract/gate-tiers.spec.ts` for why: the committed-file version of
 * this made `npm test` fail intermittently by mutating files a parallel
 * worker was hashing.
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

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-unimported-modules.mjs");
const LEDGER_LIB = join(
  ROOT,
  "scripts",
  "lib",
  "coverage-exemption-ledger.mjs",
);
const LISTER = join(ROOT, "scripts", "list-unimported-modules.mjs");

const scratch: string[] = [];

interface CheckerResult {
  code: number;
  output: string;
}

function runChecker(dir?: string): CheckerResult {
  // In a fixture the copy lives at <dir>/scripts/ so its relative
  // `./lib/coverage-exemption-ledger.mjs` resolves — the checker resolves
  // ROOT from `import.meta.url`, so the layout has to mirror the real one.
  const script =
    dir === undefined
      ? CHECKER
      : join(dir, "scripts", "check-unimported-modules.mjs");
  const args = dir === undefined ? [script] : [script, `--root=${dir}`];
  try {
    const stdout = execFileSync(process.execPath, args, {
      cwd: dir ?? ROOT,
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

/**
 * A minimal tree the checker can run against: two unimported modules, both on
 * the committed list, and the checker's own source with the list reduced to
 * those two.
 *
 * `wireBeta` makes `alpha/orphan.ts` import `beta/used.js`, which pulls
 * `beta/used.ts` off the unimported set while leaving its committed entry
 * behind — the stale-entry case. `alpha/orphan.ts` is unaffected because
 * nothing imports it either way.
 */
function fixtureTree({ wireBeta }: { wireBeta: boolean }): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-unimported-"));
  scratch.push(dir);
  mkdirSync(join(dir, "src", "alpha"), { recursive: true });
  mkdirSync(join(dir, "src", "beta"), { recursive: true });
  mkdirSync(join(dir, "scripts", "lib"), { recursive: true });
  cpSync(
    LEDGER_LIB,
    join(dir, "scripts", "lib", "coverage-exemption-ledger.mjs"),
  );

  writeFileSync(
    join(dir, "src", "alpha", "orphan.ts"),
    "export const a = 1;\n",
  );
  writeFileSync(join(dir, "src", "beta", "used.ts"), "export const b = 1;\n");
  if (wireBeta) {
    writeFileSync(
      join(dir, "src", "alpha", "orphan.ts"),
      'import "../beta/used.js";\nexport const a = 1;\n',
    );
  }

  const source = readFileSync(CHECKER, "utf8");
  const reduced = source.replace(
    /const COMMITTED = \{[\s\S]*?\n\};/,
    [
      "const COMMITTED = {",
      '  "src/alpha/orphan.ts": "ORPHAN — fixture module, nothing imports it.",',
      '  "src/beta/used.ts": "ORPHAN — fixture module the stale-entry test needs.",',
      "};",
    ].join("\n"),
  );
  expect(reduced, "the COMMITTED block was not replaced").not.toBe(source);
  writeFileSync(join(dir, "scripts", "check-unimported-modules.mjs"), reduced);
  return dir;
}

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

describe("the unimported-module guard", () => {
  it("passes on the committed tree, and the list is exactly the set", () => {
    const { code, output } = runChecker();
    expect(output, output).toBeTruthy();
    expect(code, output).toBe(0);
    const report = JSON.parse(output) as {
      unimported: number;
      committed: number;
    };
    // Exact equality, not ">= 0". A guard whose two sides can disagree is a
    // guard whose list is decoration.
    expect(report.committed).toBe(report.unimported);
  });

  it("the lister agrees the list is current", () => {
    const stdout = execFileSync(process.execPath, [LISTER], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(JSON.parse(stdout) as { status: string }).toMatchObject({
      status: "CURRENT",
    });
  });

  it("every committed entry carries a class and a reason", () => {
    const entries = [
      ...readFileSync(CHECKER, "utf8").matchAll(
        /^ {2}"(src\/[^"]+)": ?"([^"]*)"?/gm,
      ),
    ];
    expect(entries.length, "no committed entries were parsed").toBeGreaterThan(
      0,
    );
    for (const entry of entries) {
      const path = entry[1];
      const value = entry[2] ?? "";
      if (path === undefined) continue;
      expect(value, `${path} has no reason`).not.toBe("");
      expect(
        /^(?:BARREL|ENTRY|ORPHAN|GAP)\b/.test(value),
        `${path} is missing a class: ${value.slice(0, 48)}`,
      ).toBe(true);
    }
  });

  it("every committed entry names a file that exists", () => {
    // The vacuity trap, closed. A committed entry for a deleted file is
    // satisfied by "not on the unimported set" forever, which is how the
    // deleted-module claims in this release's first history passed unnoticed.
    for (const entry of readFileSync(CHECKER, "utf8").matchAll(
      /^ {2}"(src\/[^"]+)":/gm,
    )) {
      const path = entry[1];
      if (path === undefined) continue;
      expect(
        existsSync(join(ROOT, path)),
        `${path} is on the committed list but does not exist`,
      ).toBe(true);
    }
  });
});

describe("the unimported-module guard can fail", () => {
  it("passes on a fixture whose list matches the graph", () => {
    const { code, output } = runChecker(fixtureTree({ wireBeta: false }));
    expect(output, output).toBeTruthy();
    expect(code, output).toBe(0);
  });

  it("fails on a new module nothing imports, and names it", () => {
    const dir = fixtureTree({ wireBeta: false });
    writeFileSync(
      join(dir, "src", "alpha", "brand-new.ts"),
      "export const n = 1;\n",
    );
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("src/alpha/brand-new.ts");
    expect(output).toContain("nothing imports it");
    // And it says what to do, not merely that something is wrong.
    expect(output).toContain("wire it, delete it, or add it");
  });

  it("fails when a committed entry gains an importer", () => {
    // The direction that bites in practice: a module is wired, the list is
    // not updated, and the entry now describes a module that is not dead.
    // An entry that no longer describes reality is a lie in a data file.
    const { code, output } = runChecker(fixtureTree({ wireBeta: true }));
    expect(code).toBe(1);
    expect(output).toContain("src/beta/used.ts");
    expect(output).toContain("no longer describes reality");
  });
});
