/**
 * Self-scan CI workflow structure (Master-Stabilization-Plan Sprint 2,
 * Task 11).
 *
 * The self-scan gate already existed (fails on any error-severity
 * finding against this repo). What was missing: the result was never
 * surfaced anywhere a human could see it without re-running the job
 * locally. This test asserts the workflow actually produces and
 * uploads that artifact, instead of only asserting the job "exists".
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const ROOT = join(import.meta.dirname, "..", "..");

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
  "continue-on-error"?: boolean | string;
  if?: string;
}

interface WorkflowJob {
  "runs-on"?: string;
  needs?: string | string[];
  steps?: WorkflowStep[];
}

interface Workflow {
  jobs: Record<string, WorkflowJob>;
}

function loadCiWorkflow(): Workflow {
  const text = readFileSync(
    join(ROOT, ".github", "workflows", "ci.yml"),
    "utf8",
  );
  return parse(text) as Workflow;
}

describe("ci.yml self-scan job", () => {
  it("parses as valid YAML", () => {
    expect(() => loadCiWorkflow()).not.toThrow();
  });

  it("has a self-scan job that depends on build-test", () => {
    const wf = loadCiWorkflow();
    const job = wf.jobs["self-scan"];
    expect(job, "ci.yml must define a self-scan job").toBeDefined();
    expect(job?.needs).toBe("build-test");
  });

  it("produces self-scan.json before gating on it", () => {
    const wf = loadCiWorkflow();
    const steps = wf.jobs["self-scan"]?.steps ?? [];
    const runSteps = steps.map((s) => s.run).filter(Boolean) as string[];
    const scanIdx = runSteps.findIndex((r) => r.includes("self-scan.json"));
    const gateIdx = runSteps.findIndex((r) => r.includes("Self-scan errors"));
    expect(
      scanIdx,
      "no step writes self-scan.json — the gate would have nothing to read",
    ).toBeGreaterThanOrEqual(0);
    expect(
      gateIdx,
      "no step reads self-scan.json to fail on new errors",
    ).toBeGreaterThanOrEqual(0);
    expect(
      scanIdx,
      "self-scan.json must be produced before the gate step reads it",
    ).toBeLessThan(gateIdx);
  });

  it("uploads the self-scan result as a downloadable build artifact", () => {
    const wf = loadCiWorkflow();
    const steps = wf.jobs["self-scan"]?.steps ?? [];
    const uploadStep = steps.find((s) =>
      s.uses?.startsWith("actions/upload-artifact"),
    );
    expect(
      uploadStep,
      "self-scan job must upload its result so it's visible without " +
        "re-running the job locally (Task 11: 'publish the self-scan " +
        "result as an artifact')",
    ).toBeDefined();
    const rawPath = uploadStep?.with?.path;
    const paths = typeof rawPath === "string" ? rawPath : "";
    expect(paths).toContain("self-scan.json");
  });

  it("uploads always, even if the gate step fails (if: always())", () => {
    const wf = loadCiWorkflow();
    const steps = wf.jobs["self-scan"]?.steps ?? [];
    const uploadStep = steps.find((s) =>
      s.uses?.startsWith("actions/upload-artifact"),
    );
    expect(
      uploadStep?.if,
      "artifact upload must run even when the gate step fails — a red " +
        "self-scan is exactly the run someone most needs to inspect",
    ).toBe("always()");
  });

  it("badge generation is scoped with continue-on-error at the step level, not || true", () => {
    // This is a deliberate regression guard: an earlier draft of this
    // task wrote `node dist/cli.mjs badge . || true`, which the tool's
    // own QA-CI-002 rule flags (self-scan then failed on its own repo).
    // continue-on-error on a genuinely non-blocking step is the honest
    // fix the rule's own message recommends.
    const wf = loadCiWorkflow();
    const steps = wf.jobs["self-scan"]?.steps ?? [];
    const badgeStep = steps.find((s) => s.run?.includes("badge"));
    expect(badgeStep, "expected a badge-generation step").toBeDefined();
    expect(badgeStep?.run).not.toMatch(/\|\|\s*true/);
    expect(badgeStep?.["continue-on-error"]).toBe(true);
  });
});
