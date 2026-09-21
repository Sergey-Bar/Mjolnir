/**
 * Fixture typecheck gate — wiring + allowlist guards (certification-audit
 * Phase 2.7 anti-false-green tests, §23).
 *
 * Proves the gate cannot silently rot:
 *   1. package.json's typecheck script actually invokes the gate
 *      (unwiring it is itself a failure);
 *   2. the allowlist length is snapshot-locked (growth requires a
 *      conscious edit here);
 *   3. every allowlisted file exists and carries a real justification;
 *   4. the gate script FAILS on a synthetic missing-import fixture
 *      (the QA-PW-125 class: a broken executable import can no longer
 *      pass silently) — via a REAL tsc run over a synthetic tree;
 *   5. the gate FAILS on a stale allowlist entry (fixture fixed but the
 *      row left behind).
 */

import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

interface PkgJson {
  scripts?: Record<string, string>;
}
interface FixturesTsConfig {
  include?: string[];
  compilerOptions?: Record<string, unknown>;
}
interface AllowlistJson {
  entries?: Array<{ path: string; reason: string }>;
}

function readTyped<T>(rel: string): T {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8")) as T;
}

let tmpDirs: string[] = [];
afterEach(() => {
  for (const d of tmpDirs) rmSync(d, { recursive: true, force: true });
  tmpDirs = [];
});

/**
 * Runs the real gate script against a synthetic repo root (the gate
 * resolves ROOT from its own location, so we copy it into the synthetic
 * tree and let it typecheck THAT tree's fixtures project).
 */
function runGateIn(syntheticRoot: string): { status: number; output: string } {
  const scriptDir = join(syntheticRoot, "scripts");
  mkdirSync(scriptDir, { recursive: true });
  // The gate is location-independent: it derives ROOT from its own path.
  const gateSource = readFileSync(
    join(ROOT, "scripts", "typecheck-fixtures.ts"),
    "utf8",
  );
  writeFileSync(join(scriptDir, "typecheck-fixtures.ts"), gateSource);
  try {
    const output = execFileSync(
      process.execPath,
      [
        join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
        join(scriptDir, "typecheck-fixtures.ts"),
      ],
      {
        cwd: syntheticRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          // Synthetic trees have no node_modules — borrow the real repo's
          // TypeScript through the gate's declared seam.
          MJOLNIR_TYPECHECK_NODE_MODULES: join(ROOT, "node_modules"),
        },
      },
    );
    return { status: 0, output };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return {
      status: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

describe("fixture typecheck gate wiring (F1 closure)", () => {
  it("package.json typecheck runs the fixture gate (unwiring the gate is a failure)", () => {
    const pkg = readTyped<PkgJson>("package.json");
    expect(pkg.scripts?.typecheck).toContain("typecheck-fixtures.ts");
    // The gate itself must stay pointed at the fixtures project.
    const gate = readFileSync(
      join(ROOT, "scripts", "typecheck-fixtures.ts"),
      "utf8",
    );
    expect(gate).toContain("tsconfig.fixtures.json");
  });

  it("tsconfig.fixtures.json covers both fixture trees", () => {
    const cfg = readTyped<FixturesTsConfig>("tsconfig.fixtures.json");
    expect(cfg.include).toContain("tests/fixtures/**/*.ts");
    expect(cfg.include).toContain("tests/corpus/positive-fixtures/**/*.ts");
    expect(cfg.compilerOptions?.noEmit).toBe(true);
  });

  it("the allowlist is snapshot-locked — growth requires a conscious edit HERE", () => {
    const allow = readTyped<AllowlistJson>(
      "tests/fixtures/typecheck-allowlist.json",
    );
    // Snapshot: 21 justified entries at Phase-2 landing (2026-09-07).
    expect(allow.entries?.length ?? -1).toBe(21);
  });

  it("every allowlist entry exists on disk and carries a non-empty justification", () => {
    const allow = readTyped<AllowlistJson>(
      "tests/fixtures/typecheck-allowlist.json",
    );
    expect(allow.entries).toBeDefined();
    for (const entry of allow.entries ?? []) {
      expect(
        existsSync(join(ROOT, entry.path)),
        `allowlist entry points at a missing file: ${entry.path}`,
      ).toBe(true);
      expect(entry.reason.length).toBeGreaterThan(15);
    }
  });
});

describe("the gate catches the QA-PW-125 rot class (missing executable import)", () => {
  it("a fixture with a known-missing import FAILS the gate with a TS2304 diagnostic", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-fx-gate-"));
    tmpDirs.push(dir);
    // Minimal synthetic tree: the fixtures project + allowlist + one broken
    // fixture that mirrors the historical QA-PW-125 execSync rot.
    mkdirSync(join(dir, "tests", "fixtures"), { recursive: true });
    mkdirSync(join(dir, "scripts"), { recursive: true });
    writeFileSync(
      join(dir, "tsconfig.fixtures.json"),
      JSON.stringify({
        extends: join(ROOT, "tsconfig.json"),
        compilerOptions: {
          noEmit: true,
          allowJs: true,
          lib: ["ES2022", "DOM"],
          types: ["node"],
          typeRoots: [join(ROOT, "node_modules", "@types")],
          rootDir: ".",
          skipLibCheck: true,
        },
        include: ["tests/fixtures/**/*.ts"],
        exclude: ["node_modules", "dist"],
      }),
    );
    writeFileSync(join(dir, "tests", "fixtures", "fixtures-globals.d.ts"), "");
    writeFileSync(
      join(dir, "tests", "fixtures", "typecheck-allowlist.json"),
      JSON.stringify({ entries: [] }),
    );
    writeFileSync(
      join(dir, "scripts", "typecheck-fixtures.ts"),
      readFileSync(join(ROOT, "scripts", "typecheck-fixtures.ts"), "utf8"),
    );
    // The broken fixture: uses execSync, never imports it.
    mkdirSync(join(dir, "tests", "fixtures", "QA-PW-125"), { recursive: true });
    writeFileSync(
      join(dir, "tests", "fixtures", "QA-PW-125", "global-setup.ts"),
      'export default async function setup() {\n  execSync("npx prisma migrate deploy");\n}\n',
    );

    const { status, output } = runGateIn(dir);
    expect(
      status,
      `gate should fail on the missing import; output:\n${output}`,
    ).not.toBe(0);
    expect(output).toContain("QA-PW-125");
    expect(output).toContain("TS2304");
  });

  it("a stale allowlist entry (fixture fixed, row left) FAILS the gate", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-fx-gate-"));
    tmpDirs.push(dir);
    mkdirSync(join(dir, "tests", "fixtures"), { recursive: true });
    writeFileSync(
      join(dir, "tsconfig.fixtures.json"),
      JSON.stringify({
        extends: join(ROOT, "tsconfig.json"),
        compilerOptions: {
          noEmit: true,
          allowJs: true,
          lib: ["ES2022", "DOM"],
          types: ["node"],
          typeRoots: [join(ROOT, "node_modules", "@types")],
          rootDir: ".",
          skipLibCheck: true,
        },
        include: ["tests/fixtures/**/*.ts"],
        exclude: ["node_modules", "dist"],
      }),
    );
    writeFileSync(join(dir, "tests", "fixtures", "fixtures-globals.d.ts"), "");
    writeFileSync(
      join(dir, "tests", "fixtures", "typecheck-allowlist.json"),
      JSON.stringify({
        entries: [
          {
            path: "tests/fixtures/fixed-now.spec.ts",
            reason: "stale row: this fixture has no type errors anymore",
          },
        ],
      }),
    );
    writeFileSync(
      join(dir, "tests", "fixtures", "fixed-now.spec.ts"),
      "export const ok = true;\n",
    );

    const { status, output } = runGateIn(dir);
    expect(
      status,
      `gate should fail on the stale entry; output:\n${output}`,
    ).not.toBe(0);
    expect(output).toContain("no longer have type errors");
    expect(output).toContain("fixed-now.spec.ts");
  });

  it("a clean tree with an empty allowlist PASSES the gate", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-fx-gate-"));
    tmpDirs.push(dir);
    mkdirSync(join(dir, "tests", "fixtures"), { recursive: true });
    writeFileSync(
      join(dir, "tsconfig.fixtures.json"),
      JSON.stringify({
        extends: join(ROOT, "tsconfig.json"),
        compilerOptions: {
          noEmit: true,
          allowJs: true,
          lib: ["ES2022", "DOM"],
          types: ["node"],
          typeRoots: [join(ROOT, "node_modules", "@types")],
          rootDir: ".",
          skipLibCheck: true,
        },
        include: ["tests/fixtures/**/*.ts"],
        exclude: ["node_modules", "dist"],
      }),
    );
    writeFileSync(
      join(dir, "tests", "fixtures", "clean.spec.ts"),
      'import { readFileSync } from "node:fs";\nexport const size = readFileSync(__filename, "utf8").length;\n',
    );
    writeFileSync(
      join(dir, "tests", "fixtures", "typecheck-allowlist.json"),
      JSON.stringify({ entries: [] }),
    );

    const { status, output } = runGateIn(dir);
    expect(status, `gate should pass on a clean tree; output:\n${output}`).toBe(
      0,
    );
    expect(output).toContain("OK");
  });
});
