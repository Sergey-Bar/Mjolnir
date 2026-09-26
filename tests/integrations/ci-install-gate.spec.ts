/**
 * The generated CI workflow must actually gate (plan V5-004).
 *
 * `mjolnir ci install` writes a workflow into the USER's repository. Three
 * defects shipped in that generated file, and all three produced a check that
 * could not go red:
 *
 *  1. The gate read `steps.mjolnir.outputs.exit`. The Action exposes
 *     `exit-code`. The read yielded an empty string, neither branch fired, and
 *     the gate exited 0 on findings.
 *  2. Exit 2 was downgraded to a warning, so a partial scan passed.
 *  3. `version:`/the npx tarball URL named the working version, which is not
 *     on npm while the candidate is a release candidate.
 *
 * These are asserted against the TEMPLATE, and the gate is then EXECUTED
 * against fixture JSONs for clean / findings / partial. A template assertion
 * alone would not catch a gate that reads a field nothing writes.
 */

import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  ACTION_TEMPLATE,
  gateScript,
  publishedVersionForInstall,
  TEMPLATE,
} from "../../src/integrations/ci-install.js";

const ROOT = join(import.meta.dirname, "..", "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  version: string;
  publishedStable: string;
};

/**
 * Output names, read out of `action.yml`.
 *
 * Written as `(\w+)` deliberately. Prettier rewrites the equivalent-looking
 * `[\w-]*` into `\w[-]*`, which matches ONE word character followed by
 * hyphens instead of a whole name; the extractor then returns nothing and
 * every assertion built on it silently stops testing anything. Each test
 * below therefore also asserts that the extractor extracted something.
 */
function actionOutputNames(): string[] {
  const action = readFileSync(join(ROOT, "action.yml"), "utf8");
  const block = action.slice(
    action.indexOf("\noutputs:"),
    action.indexOf("\nruns:"),
  );
  return [...block.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1] ?? "");
}

/** The step-output keys the Action actually writes. */
function writtenStepOutputs(): string[] {
  const action = readFileSync(join(ROOT, "action.yml"), "utf8");
  return [...action.matchAll(/echo "(\w+)=/g)].map((m) => m[1] ?? "");
}

describe("the generated Action workflow gates (V5-004)", () => {
  it("reads the output the Action actually declares, and that is readable", () => {
    const template = ACTION_TEMPLATE("error");
    const declared = actionOutputNames();
    expect(declared.length).toBeGreaterThan(0);
    expect(declared).toContain("exit_code");
    expect(template).toContain("steps.mjolnir.outputs.exit_code");
    // A hyphenated output name is unreadable in an expression, so the gate
    // must never reference one — that is how an unfailable gate is written.
    expect(template).not.toMatch(/steps\.mjolnir\.outputs\.\w+-/);
  });

  it("no Action output is hyphenated", () => {
    // A hyphenated name is not a naming preference: it makes the output
    // impossible to read from any expression, so every consumer of it silently
    // reads 0. That is the root cause behind several unfailable gates.
    const names = actionOutputNames();
    expect(names.length).toBeGreaterThan(0);
    const hyphenated = names.filter((name) => name.includes("-"));
    expect(
      hyphenated,
      `hyphenated output name(s) are unreadable in expressions: ${hyphenated.join(", ")}`,
    ).toEqual([]);
  });

  it("every declared output resolves to a step output that is written", () => {
    const action = readFileSync(join(ROOT, "action.yml"), "utf8");
    const outputsBlock = action.slice(
      action.indexOf("\noutputs:"),
      action.indexOf("\nruns:"),
    );
    const written = new Set(writtenStepOutputs());
    expect(written.size).toBeGreaterThan(0);
    // Documentation lines quote example expressions on purpose; only a real
    // declaration counts as a reference.
    const referenced = outputsBlock
      .split(/\r?\n/)
      .filter((line) => !/^\s*#/.test(line))
      .flatMap((line) => [...line.matchAll(/steps\.\w+\.outputs\.(\w+)/g)]);
    expect(referenced.length).toBeGreaterThan(0);
    const dangling = [
      ...new Set(referenced.map((match) => match[1] ?? "")),
    ].filter((output) => !written.has(output));
    expect(
      dangling,
      `declared outputs referencing a step output nothing writes: ${dangling.join(", ")}`,
    ).toEqual([]);
  });

  it("fails on findings, on partial, and on a missing exit code", () => {
    const template = ACTION_TEMPLATE("error");
    for (const branch of ["0)", "1)", "2)", '"")', "*)"]) {
      expect(template, `missing branch ${branch}`).toContain(branch);
    }
    // No branch may be a silent pass on an empty output.
    expect(template).not.toMatch(/MJ_SCAN_EXIT.*\n\s*fi\n\s*exit 0/);
  });

  it("does not pin the Action at an unpublished version", () => {
    const template = ACTION_TEMPLATE("error");
    // Omitting the input entirely lets the Action's own default (the
    // published stable) apply, so there is nothing to drift.
    expect(template).not.toContain(`version: ${pkg.version}`);
    expect(template).not.toContain(`version: ${pkg.publishedStable}`);
  });
});

describe("the generated npx workflow gates and can resolve its tarball", () => {
  it("installs a version that exists on the registry", () => {
    const template = TEMPLATE("error");
    expect(template).toContain(`mjolnir-qa-${pkg.publishedStable}.tgz`);
    expect(template).not.toContain(`mjolnir-qa-${pkg.version}.tgz`);
  });

  it("publishedVersionForInstall prefers the recorded published stable", () => {
    expect(publishedVersionForInstall(join(ROOT, "src", "integrations"))).toBe(
      pkg.publishedStable,
    );
  });

  it("falls back to the package's own version when publishedStable is absent", () => {
    // A 3.0.0 install shipped before `publishedStable` existed; its own
    // version is the correct answer, not a crash.
    const dir = mkdtempSync(join(tmpdir(), "mj-pubver-"));
    try {
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ name: "mjolnir-qa", version: "3.1.0" }),
        "utf8",
      );
      expect(publishedVersionForInstall(dir)).toBe("3.1.0");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * The npx gate, executed. This is the part a template assertion cannot
 * substitute for: the script has to read `mjolnir.json` and reach the right
 * exit code on its own.
 */
describe("the generated gate script, executed on real reports", () => {
  function runGate(report: unknown): number {
    const dir = mkdtempSync(join(tmpdir(), "mj-gate-"));
    try {
      writeFileSync(join(dir, "mjolnir.json"), JSON.stringify(report), "utf8");
      const script = gateScript("error");
      try {
        execFileSync(process.execPath, ["-e", script], {
          cwd: dir,
          stdio: "pipe",
        });
        return 0;
      } catch (error) {
        return (error as { status: number | null }).status ?? -1;
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  const clean = { partial: false, findings: [] as unknown[] };
  const errorFinding = {
    partial: false,
    findings: [{ severity: "error", ruleId: "QA-TEST-001" }],
  };
  const warningOnly = {
    partial: false,
    findings: [{ severity: "warning", ruleId: "QA-TEST-002" }],
  };
  const partialClean = { partial: true, findings: [] as unknown[] };

  it("a complete clean scan passes", () => {
    expect(runGate(clean)).toBe(0);
  });

  it("error findings fail", () => {
    expect(runGate(errorFinding)).toBe(1);
  });

  it("a warning-only scan passes at the error gate", () => {
    expect(runGate(warningOnly)).toBe(0);
  });

  it("law 11: a PARTIAL scan with zero findings FAILS", () => {
    // This is the case the old script passed with exit 0. Identical findings
    // to `clean`; the only difference is completeness, and it must change the
    // verdict.
    expect(runGate(partialClean)).toBe(1);
  });

  it("a missing report fails instead of passing silently", () => {
    const dir = mkdtempSync(join(tmpdir(), "mj-gate-missing-"));
    try {
      let status = 0;
      try {
        execFileSync(process.execPath, ["-e", gateScript("error")], {
          cwd: dir,
          stdio: "pipe",
        });
      } catch (error) {
        status = (error as { status: number | null }).status ?? -1;
      }
      expect(status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("the warning gate fails on warnings too", () => {
    const dir = mkdtempSync(join(tmpdir(), "mj-gate-warn-"));
    try {
      writeFileSync(
        join(dir, "mjolnir.json"),
        JSON.stringify(warningOnly),
        "utf8",
      );
      let status = 0;
      try {
        execFileSync(process.execPath, ["-e", gateScript("warning")], {
          cwd: dir,
          stdio: "pipe",
        });
      } catch (error) {
        status = (error as { status: number | null }).status ?? -1;
      }
      expect(status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
