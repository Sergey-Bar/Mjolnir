/**
 * P0-13 — configuration nobody reads is a claim the repository does not make.
 *
 * `sonar-project.properties` and `.coderabbit.yaml` sat at the root for a
 * release with no consumer in this tree and no note saying who read them. The
 * dangerous reading is not "these are read by an external service I cannot
 * run" — that is true and is now recorded — it is "these are dead weight",
 * which is what invites deleting a curated file.
 *
 * The gate also found two more, which is the point of running it: the
 * self-referential check (`kilo.json` names itself in its own `$schema`, so a
 * naive search reported it as consumed by itself) and `capability-manifest.json`,
 * which asserted `4.0.0` while the package was at `5.0.0` and was read by
 * nothing. The second was fixed by binding it to the version-surface envelope,
 * not by deleting it.
 *
 * All mutations happen in a fixture tree. Editing a tracked root file while
 * `tests/certification/candidate-manifest.spec.ts` hashes the working tree is
 * the cross-test interference this repository has already paid for once.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-config-consumers.mjs");

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
 * A copy of the committed root: the config files, `docs/EXTERNAL-CONFIG.md`,
 * and enough tracked source for the mention search to have something to read.
 * The `.git` directory is not needed — without it the check reports
 * "external declarations only" and the negative tests below would pass for
 * the wrong reason, so a git index is initialised and the files staged.
 */
function fixtureTree(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-config-consumers-"));
  scratch.push(dir);
  mkdirSync(join(dir, "docs"), { recursive: true });
  mkdirSync(join(dir, "src", "release"), { recursive: true });
  cpSync(join(ROOT, "package.json"), join(dir, "package.json"));
  cpSync(
    join(ROOT, "docs", "EXTERNAL-CONFIG.md"),
    join(dir, "docs", "EXTERNAL-CONFIG.md"),
  );
  cpSync(
    join(ROOT, "src", "release", "version-surface.ts"),
    join(dir, "src", "release", "version-surface.ts"),
  );
  for (const name of [
    "sonar-project.properties",
    ".coderabbit.yaml",
    "codecov.yml",
    "kilo.json",
    "capability-manifest.json",
  ]) {
    cpSync(join(ROOT, name), join(dir, name));
  }
  // Every file the REGISTRY declares, not a hand-picked subset. The first
  // version listed five names and the gate's reverse check then failed with
  // "`docs/EXTERNAL-CONFIG.md` declares action.yml … which is not in the tree"
  // the moment a sixth row was added — so the fixture silently became a test of
  // the registry's own bookkeeping rather than of the checker. A fixture that
  // has to be updated whenever a row is added is a fixture that will be
  // *forgotten* rather than updated.
  for (const path of declaredIn(
    readFileSync(join(dir, "docs", "EXTERNAL-CONFIG.md"), "utf8"),
  ).keys()) {
    const source = join(ROOT, path);
    if (!existsSync(source) || !statSync(source).isFile()) continue;
    mkdirSync(join(dir, path, ".."), { recursive: true });
    cpSync(source, join(dir, path));
  }
  execFileSync("git", ["init", "-q", "--initial-branch=main", "."], {
    cwd: dir,
    stdio: "pipe",
  });
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  return dir;
}

/**
 * The registry's declared rows, parsed the same way the checker parses them.
 *
 * Duplicated rather than imported on purpose: the checker's own parser would
 * make the fixture agree with the checker by construction, and a fixture that
 * cannot disagree is not a fixture.
 */
function declaredIn(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split("\n")) {
    // `\s*` after `[^|]+` would let the two quantifiers exchange the same
    // characters, which is a super-linear backtracking warning AND a capture
    // that reads as wider than it is.
    const m = /^\|\s*`([^`]+)`\s*\|([^|]+)\|$/.exec(line);
    if (m?.[1] !== undefined && m[2] !== undefined) out.set(m[1], m[2]);
  }
  return out;
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

describe("root configuration must name its consumer", () => {
  it("the committed tree passes", () => {
    const { code, output } = runChecker(fixtureTree());
    expect(code, output).toBe(0);
    const report = JSON.parse(output) as { declaredExternal: string[] };
    // The two files the gate was written for must be among the declared, or
    // the PASS would be about something else.
    expect(report.declaredExternal).toContain("sonar-project.properties");
    expect(report.declaredExternal).toContain(".coderabbit.yaml");
  });

  it("a new root config with no consumer fails", () => {
    // Staged, because untracked files are skipped by design: several
    // machine-local agent configs are gitignored, and gating on them would
    // fail on any checkout where a developer has an editor configured. A
    // config becomes a repository claim when it is committed.
    const dir = fixtureTree();
    writeFileSync(
      join(dir, "lintrc.json"),
      JSON.stringify({ rules: {} }, null, 2),
      "utf8",
    );
    execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("lintrc.json");
    expect(output).toContain("does not declare who reads it");
  });

  it("removing a config from the registry fails", () => {
    // The direction that matters: the two curated files are only accounted
    // for because the registry says so. Delete the row and the gate must go
    // red rather than pass by omission.
    const dir = fixtureTree();
    const path = join(dir, "docs", "EXTERNAL-CONFIG.md");
    const text = readFileSync(path, "utf8")
      .split("\n")
      .filter((line) => !/^\|\s*`\.coderabbit\.yaml`/.test(line))
      .join("\n");
    writeFileSync(path, text, "utf8");
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain(".coderabbit.yaml");
  });

  it("a registry row for a file that no longer exists fails", () => {
    // An exemption for a deleted file is a hole with a comment on it, and
    // it is how a deleted file stays exempt.
    const dir = fixtureTree();
    rmSync(join(dir, "codecov.yml"));
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("not in the tree");
  });

  it("a one-word consumer is rejected", () => {
    // The reason is the part a reviewer checks; "SonarQube" alone is not a
    // reason, it is a name.
    const dir = fixtureTree();
    const path = join(dir, "docs", "EXTERNAL-CONFIG.md");
    const text = readFileSync(path, "utf8").replace(
      // `[^|]*` and `\s*` adjacent to each other can match the same
      // characters, which the regexp plugin flags as super-linear
      // backtracking — and the capture would read wider than it is.
      /^(\|\s*`sonar-project\.properties`\s*\|)[^|]*(\|)$/m,
      "$1sonar$2",
    );
    writeFileSync(path, text, "utf8");
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("one-word consumer");
  });

  it("a missing registry fails rather than passing vacuously", () => {
    const dir = fixtureTree();
    rmSync(join(dir, "docs", "EXTERNAL-CONFIG.md"));
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("missing");
  });

  it("a file that names only itself is not its own consumer", () => {
    // The self-reference trap: `kilo.json` carries
    // `"$schema": "https://kilo.ai/schema/kilo.json"`, so a search that reads
    // the file while checking the file reports it as consumed by itself. The
    // fixture proves the stripping works by removing the registry row AND
    // every other mention.
    const dir = fixtureTree();
    const path = join(dir, "docs", "EXTERNAL-CONFIG.md");
    writeFileSync(
      path,
      readFileSync(path, "utf8")
        .split("\n")
        .filter((line) => !/^\|\s*`kilo\.json`/.test(line))
        .join("\n"),
      "utf8",
    );
    const { code, output } = runChecker(dir);
    expect(code).toBe(1);
    expect(output).toContain("kilo.json");
  });

  it("an untracked root config is not a repository claim", () => {
    // Several machine-local agent configs are gitignored by design. Gating
    // on them would fail on every checkout where a developer has an editor
    // configured — the same defect as gating on a machine-local path.
    const dir = fixtureTree();
    writeFileSync(join(dir, "local-tool.json"), "{}\n", "utf8");
    const { code, output } = runChecker(dir);
    expect(code, output).toBe(0);
  });
});
