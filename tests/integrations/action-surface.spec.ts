/**
 * Root action.yml integrity (product-gap-remediation master plan P1.1/
 * P1.3, plan 1788853205786).
 *
 * The root action.yml is the Marketplace surface — a promise to every
 * consumer who writes `uses: Sergey-Bar/Mjolnir@v1`. These locks keep
 * the promise honest:
 *
 *  - the file parses as YAML with the composite run shape and the
 *    documented inputs;
 *  - every action reference is SHA-pinned (the same rule the ci-install
 *    template tests enforce — audit S-3);
 *  - no `${{ github.event… }}` interpolation inside `run:` bodies
 *    (audit S-5 — event data reaches the shell through env only);
 *  - partial scans warn by default and can require a complete scan only
 *    through an explicit opt-in;
 *  - the ci-install action template agrees with the real action: the
 *    inputs it sets exist in action.yml and its gate level maps to a
 *    real fail-on value — the two surfaces ship one contract.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  ACTION_TEMPLATE,
  ACTION_REF,
} from "../../src/integrations/ci-install.js";
import type { GateLevel } from "../../src/integrations/ci-install.js";
import { ENGINE_VERSION } from "../../src/engine/version.js";

const ROOT = join(import.meta.dirname, "..", "..");
const ACTION = readFileSync(join(ROOT, "action.yml"), "utf8");
const action = parse(ACTION) as {
  name: string;
  description: string;
  branding?: { icon?: string; color?: string };
  inputs: Record<
    string,
    { description: string; required?: boolean; default?: string }
  >;
  outputs?: Record<string, { description: string; value: string }>;
  runs: {
    using: string;
    steps: Array<{
      name?: string;
      uses?: string;
      run?: string;
      shell?: string;
      id?: string;
      env?: Record<string, string>;
      with?: Record<string, string>;
      if?: string;
    }>;
  };
};

const GATES: GateLevel[] = ["advisory", "error", "warning"];
const FAIL_ON_FOR_GATE: Record<GateLevel, string> = {
  advisory: "none",
  error: "error",
  warning: "warning",
};

describe("root action.yml (Marketplace surface) is locked", () => {
  it("exists at the repo ROOT with the composite run shape and branding", () => {
    expect(action.runs.using).toBe("composite");
    expect(action.branding?.icon).toBeTruthy();
    expect(action.name).toContain("Mjölnir");
    expect(action.description.length).toBeGreaterThan(40);
  });

  it("defaults to the package's exact supported Node floor", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { engines: { node: string } };
    expect(action.inputs["node-version"]?.default).toBe(
      pkg.engines.node.replace(/^>=/, ""),
    );
  });

  it("defaults to error findings and non-blocking partial scans", () => {
    expect(action.inputs["fail-on"]?.default).toBe("error");
    expect(action.inputs["fail-on-partial"]?.default).toBe("false");
  });

  it("defaults to the published stable version, never the working candidate", () => {
    // The action fetches an exact tarball from npm. Defaulting to the working
    // version made every consumer who pinned nothing 404 while the candidate
    // was an RC. `publishedStable` in package.json is the record; the check
    // below is the law that keeps action.yml from drifting from it.
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { version: string; publishedStable: string };
    expect(action.inputs["version"]?.default).toBe(pkg.publishedStable);
    expect(pkg.publishedStable).not.toContain("-");
    // The Action default is the last PUBLISHED stable, so it must not name
    // the working tree's build. While this repository was a release
    // candidate those were different strings and this was a real assertion.
    // On a stable release `publishedStable` IS the working version, and the
    // requirement is expressed by the two assertions above — the default
    // equals the published record, and that record is not a prerelease.
    // Asserting they differ would demand that a published release lie about
    // its own version.
    if (pkg.version.includes("-")) {
      expect(pkg.publishedStable).not.toBe(ENGINE_VERSION);
    } else {
      expect(pkg.version).toBe(pkg.publishedStable);
    }
  });

  it("rejects an unpublished pinned version before the scan, with a reason", () => {
    const resolve = action.runs.steps.find(
      (s) => s.name === "Resolve the pinned package version",
    );
    expect(resolve, "no registry-resolvability step").toBeDefined();
    expect(resolve?.run).toContain("npm view");
    expect(resolve?.run).toContain("is not published on the npm registry");
    expect(resolve?.env?.MJ_VERSION).toBe("${{ inputs.version }}");
  });

  it("never resolves a floating version at runtime", () => {
    const validate = action.runs.steps.find(
      (s) => s.name === "Validate inputs",
    );
    expect(validate?.env?.MJ_VERSION).toBe("${{ inputs.version }}");
    expect(validate?.run ?? "").toContain(
      "version must be an exact semantic version",
    );
    for (const step of action.runs.steps) {
      expect(step.run ?? "").not.toContain("mjolnir-qa@latest");
    }
  });

  it("produces its report on findings, not only on a clean scan", () => {
    // A step whose `if:` omits `always()` is implicitly `success()`. The scan
    // step exits non-zero on findings, so every reporter was skipped exactly
    // when a reviewer needed it.
    const reporters = action.runs.steps.filter(
      (s) =>
        s.name === "Capture JSON report for reporting" ||
        s.name === "Generate unified PR report" ||
        s.name === "Emit annotations + step summary" ||
        s.name === "Post unified report as PR comment" ||
        s.name === "Upload unified report artifacts" ||
        s.name === "Upload SARIF to GitHub Code Scanning",
    );
    expect(reporters.length).toBeGreaterThanOrEqual(6);
    for (const step of reporters) {
      expect(String(step.if), step.name).toContain("always()");
    }
  });

  it("declares the documented inputs", () => {
    for (const input of [
      "path",
      "scope",
      "strict",
      "format",
      "fail-on",
      "node-version",
      "version",
      "upload-sarif",
    ]) {
      expect(
        action.inputs[input],
        `action.yml is missing the "${input}" input the docs promise`,
      ).toBeDefined();
    }
  });

  it("validates the closed input vocabularies before scanning", () => {
    const validate = action.runs.steps.find(
      (s) => s.name === "Validate inputs",
    );
    expect(validate, "no input-validation step").toBeDefined();
    for (const word of [
      "error",
      "warning",
      "none",
      "all",
      "changed",
      "terminal",
      "json",
      "sarif",
    ]) {
      expect(validate?.run ?? "").toContain(word);
    }
  });

  it("rejects floating package versions in the input vocabulary", () => {
    const validate = action.runs.steps.find(
      (s) => s.name === "Validate inputs",
    );
    expect(validate?.env?.MJ_VERSION).toBe("${{ inputs.version }}");
    expect(validate?.run ?? "").toContain(
      "version must be an exact semantic version",
    );
  });

  it("pins every action reference to a 40-hex SHA with a version comment (audit S-3)", () => {
    for (const step of action.runs.steps) {
      if (!step.uses) continue;
      expect(step.uses).toMatch(/@[0-9a-f]{40}(?:\s|#|$)/);
    }
  });

  it("interpolates no github.event data into run: bodies (audit S-5)", () => {
    for (const step of action.runs.steps) {
      expect(
        /\$\{\{\s*github\.event/.test(step.run ?? ""),
        `step "${step.name}" interpolates github.event into a run: body — pass it through env:`,
      ).toBe(false);
    }
  });

  it("input interpolation inside run: bodies goes through env, never direct", () => {
    const scan = action.runs.steps.find((s) => s.id === "scan");
    expect(scan, "no scan step").toBeDefined();
    for (const input of [
      "path",
      "scope",
      "strict",
      "format",
      "fail-on",
      "fail-on-partial",
      "version",
    ]) {
      // `${{ inputs.X }}` may only appear in env: values (or step `with:`),
      // never in the run: body itself.
      expect(
        (scan?.run ?? "").includes(`inputs.${input}}`),
        `scan step interpolates inputs.${input} directly into the shell — use the MJ_ env indirection`,
      ).toBe(false);
    }
    const scanEnv = Object.keys(scan?.env ?? {});
    for (const input of [
      "path",
      "scope",
      "strict",
      "format",
      "fail-on",
      "fail-on-partial",
      "version",
    ]) {
      expect(
        scanEnv.some((k) => scan?.env?.[k] === `\${{ inputs.${input} }}`),
        `scan step env: must map inputs.${input} to an MJ_* variable (audit S-5 indirection)`,
      ).toBe(true);
    }
  });

  it("partial scans warn by default and fail only when opted in", () => {
    const scan = action.runs.steps.find((s) => s.id === "scan");
    expect(action.inputs["fail-on-partial"]?.default).toBe("false");
    expect(scan?.env?.MJ_FAIL_ON_PARTIAL).toBe("${{ inputs.fail-on-partial }}");
    expect(scan?.run).toMatch(
      /if \[ "\$MJ_FAIL_ON_PARTIAL" = "true" \]; then[\s\S]*?exit 2[\s\S]*?fi\s+exit 0/,
    );
  });

  it("a partial scan downgrade precedes the final exit", () => {
    const scan = action.runs.steps.find((s) => s.id === "scan");
    const run = scan?.run ?? "";
    expect(run).toContain('"$EXIT" = "2"');
    expect(run).toContain("::warning::");
    // and the downgrade happens BEFORE the final exit
    const downgrade = run.indexOf('"$EXIT" = "2"');
    const finalExit = run.lastIndexOf('exit "$EXIT"');
    expect(downgrade).toBeGreaterThan(-1);
    expect(finalExit).toBeGreaterThan(downgrade);
  });

  it("the gate comes from fail-on via --blocking (no second gate implementation)", () => {
    const scan = action.runs.steps.find((s) => s.id === "scan");
    const run = scan?.run ?? "";
    for (const [failOn, blocking] of [
      ["error", "--blocking error"],
      ["warning", "--blocking warning"],
      ["none", "--blocking none"],
    ] as const) {
      expect(run).toContain(`${failOn})`);
      expect(run).toContain(blocking);
    }
  });

  it("run: steps declare a shell (composite actions require it)", () => {
    for (const step of action.runs.steps) {
      if (!step.run) continue;
      expect(
        step.shell,
        `step "${step.name}" has run: without shell: — composite actions require an explicit shell`,
      ).toBeTruthy();
    }
  });

  it("publishes one unified v2 report from the saved JSON artifact", () => {
    expect(ACTION).not.toContain("Generate Trust Report");
    expect(ACTION).toContain("pr-comment --from mjolnir.json");
    expect(ACTION).toContain('--commit "$MJ_COMMIT"');
    expect(ACTION).toContain("${{ github.sha }}");
    expect(ACTION).toContain("<!-- mjolnir-report:v2 -->");
    expect(ACTION).not.toContain("mjolnir-trust-report:v1");
    expect(action.inputs["trust-artifact"]?.default).toBe("false");
  });

  it("streams summary output while tee writes the GitHub step summary", () => {
    const summary = action.runs.steps.find(
      (s) => s.name === "Emit annotations + step summary",
    );
    expect(summary?.run).toContain('tee "${GITHUB_STEP_SUMMARY:-/dev/null}"');
    expect(summary?.run).not.toContain(">/dev/null 2>&1");
  });
});

describe("ci-install action template agrees with the real action.yml", () => {
  it("the template references the published action ref", () => {
    for (const gate of GATES) {
      expect(ACTION_TEMPLATE(gate)).toContain(`uses: ${ACTION_REF}`);
    }
  });

  it.each(GATES)(
    "gate=%s maps to a fail-on value the action actually validates",
    (gate) => {
      const failOn = FAIL_ON_FOR_GATE[gate];
      // The action's validation step accepts exactly these words:
      const validate = action.runs.steps.find(
        (s) => s.name === "Validate inputs",
      );
      expect(validate?.run ?? "").toContain(failOn);
      // And the template sets exactly that value:
      const wf = parse(ACTION_TEMPLATE(gate)) as {
        jobs: Record<
          string,
          { steps?: Array<{ uses?: string; with?: Record<string, string> }> }
        >;
      };
      const step = (wf.jobs.scan?.steps ?? []).find(
        (s) => s.uses === ACTION_REF,
      );
      expect(step?.with?.["fail-on"]).toBe(failOn);
    },
  );

  it("every `with:` key the template sets is a real action input", () => {
    for (const gate of GATES) {
      const wf = parse(ACTION_TEMPLATE(gate)) as {
        jobs: Record<
          string,
          { steps?: Array<{ uses?: string; with?: Record<string, string> }> }
        >;
      };
      for (const step of wf.jobs.scan?.steps ?? []) {
        if (step.uses !== ACTION_REF) continue;
        for (const key of Object.keys(step.with ?? {})) {
          expect(
            action.inputs[key],
            `template sets with.${key} but action.yml has no such input`,
          ).toBeDefined();
        }
      }
    }
  });

  it("the enforcing template never floats the version", () => {
    // The template used to pin `version: ${CLI_VERSION}` — the working
    // version, which is not on npm while the candidate is a release
    // candidate, so a generated workflow could not install what it asked for.
    // The input is now omitted and the Action's own default (the published
    // stable) applies, which is the one value that always resolves.
    for (const gate of ["error", "warning"] as GateLevel[]) {
      const text = ACTION_TEMPLATE(gate);
      expect(text, gate).not.toContain("@latest");
      expect(text, gate).not.toMatch(/version: \d+\.\d+\.\d+/);
    }
  });
});
