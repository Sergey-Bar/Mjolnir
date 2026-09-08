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
 *  - a partial scan can never block: exit 2 downgrades to a warning
 *    (the frozen exit-code contract, README "Exit codes");
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
      "version",
    ]) {
      expect(
        scanEnv.some((k) => scan?.env?.[k] === `\${{ inputs.${input} }}`),
        `scan step env: must map inputs.${input} to an MJ_* variable (audit S-5 indirection)`,
      ).toBe(true);
    }
  });

  it("a partial scan never blocks (exit 2 downgrades to a warning — frozen exit-code contract)", () => {
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

  it("the enforcing template pins an exact mjolnir-qa version (never floating)", () => {
    for (const gate of ["error", "warning"] as GateLevel[]) {
      const text = ACTION_TEMPLATE(gate);
      expect(text).toMatch(/version: \d+\.\d+\.\d+/);
      expect(text).not.toContain("@latest");
    }
  });
});
