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
  env?: Record<string, string>;
  if?: boolean | string;
  "continue-on-error"?: boolean;
}

interface WorkflowJob {
  permissions?: Record<string, string>;
  needs?: string | string[];
  if?: string;
  steps?: WorkflowStep[];
}

interface Workflow {
  on?: unknown;
  permissions?: Record<string, string>;
  jobs: Record<string, WorkflowJob>;
}

function loadPrWorkflow(): Workflow {
  return parse(
    readFileSync(join(ROOT, ".github", "workflows", "mjolnir.yml"), "utf8"),
  ) as Workflow;
}

describe("mjolnir.yml (the PR feedback loop workflow)", () => {
  it("parses as valid YAML and triggers on pull_request", () => {
    const wf = loadPrWorkflow();
    expect(wf.on).toHaveProperty("pull_request");
    expect(wf.jobs.scan).toBeDefined();
    expect(wf.jobs.publish).toBeDefined();
  });

  it("keeps write permissions out of the checkout-backed scan job", () => {
    const wf = loadPrWorkflow();
    expect(wf.permissions).toEqual({ contents: "read" });
    expect(wf.jobs.scan?.permissions).toEqual({ contents: "read" });
    expect(wf.jobs.publish?.permissions).toEqual({
      contents: "read",
      "pull-requests": "write",
    });
    expect(wf.jobs.publish?.steps?.some((step) => step.uses === "./")).toBe(
      false,
    );
  });

  it("checks out full history without credentials or a local action", () => {
    const steps = loadPrWorkflow().jobs.scan?.steps ?? [];
    expect(steps.some((step) => step.uses === "./")).toBe(false);
    const checkout = steps.find((step) =>
      step.uses?.startsWith("actions/checkout"),
    );
    expect(checkout?.with?.["persist-credentials"]).toBe(false);
    expect(checkout?.with?.["fetch-depth"]).toBe(0);
  });

  it("runs the pinned source build in the read-only scan job", () => {
    const steps = loadPrWorkflow().jobs.scan?.steps ?? [];
    expect(steps.some((step) => step.run?.includes("npm run build"))).toBe(
      true,
    );
    expect(
      steps.some((step) => step.run?.includes("dist/cli.mjs . --format json")),
    ).toBe(true);
    expect(
      steps.some((step) => step.run?.includes("dist/cli.mjs pr-comment")),
    ).toBe(true);
    expect(
      readFileSync(join(ROOT, ".github", "workflows", "mjolnir.yml"), "utf8"),
    ).not.toContain("mjolnir-qa@latest");
  });

  it("uploads one unified report artifact from the scan job", () => {
    const steps = loadPrWorkflow().jobs.scan?.steps ?? [];
    const render = steps.find((step) => step.name === "Render unified report");
    const upload = steps.find((step) =>
      step.uses?.startsWith("actions/upload-artifact"),
    );
    expect(render?.["continue-on-error"]).toBe(true);
    expect(render?.run).toContain('--commit "$MJ_COMMIT"');
    expect(render?.env?.["MJ_COMMIT"]).toBe("${{ github.sha }}");
    expect(render?.run).toContain("<!-- mjolnir-report:v2 -->");
    expect(upload?.with).toMatchObject({
      name: "mjolnir-report",
      path: "mjolnir-comment.md",
      "if-no-files-found": "error",
    });
  });

  it("renders and uploads the report on findings, not only on a clean scan", () => {
    // A report that only exists when nothing was found tells a reviewer
    // nothing at the exact moment they need it.
    const steps = loadPrWorkflow().jobs.scan?.steps ?? [];
    const gateIndex = steps.findIndex((step) =>
      step.name?.startsWith("Gate on"),
    );
    for (const name of ["Render unified report"]) {
      const step = steps.find((candidate) => candidate.name === name);
      expect(step?.if, name).toBe("always()");
    }
    const upload = steps.find((step) =>
      step.uses?.startsWith("actions/upload-artifact"),
    );
    expect(upload?.if).toBe("always()");
    // The gate runs last so the evidence is published before the verdict.
    expect(gateIndex).toBeGreaterThan(
      steps.findIndex((step) => step.name === "Render unified report"),
    );
  });

  it("publishes only from the downloaded report artifact", () => {
    const steps = loadPrWorkflow().jobs.publish?.steps ?? [];
    expect(
      steps.some((step) => step.uses?.startsWith("actions/download-artifact")),
    ).toBe(true);
    expect(
      steps.some((step) => step.uses?.startsWith("actions/github-script")),
    ).toBe(true);
    expect(
      steps.some((step) => step.uses?.startsWith("actions/checkout")),
    ).toBe(false);
    const script = steps.find((step) =>
      step.uses?.startsWith("actions/github-script"),
    )?.with?.script;
    expect(String(script)).toContain("mjolnir-comment.md");
    expect(String(script)).toContain("<!-- mjolnir-report:v2 -->");
    expect(String(script)).toContain("github.paginate");
    expect(String(script)).toContain("listComments");
    expect(String(script)).toContain("createComment");
    expect(String(script)).toContain("updateComment");
  });

  it("publishes only after the gate passed, not merely after the scan ran", () => {
    const wf = loadPrWorkflow();
    expect(wf.jobs.publish?.needs).toBe("scan");
    // The scan job's result is now the gate's result, because the gate is the
    // last step in that job. A comment must never imply a clean scan that the
    // gate rejected.
    expect(String(wf.jobs.publish?.if)).toContain(
      "needs.scan.result == 'success'",
    );
  });

  it("does not leave dead github.rest.checks references", () => {
    const jobs = Object.values(loadPrWorkflow().jobs);
    for (const job of jobs) {
      for (const step of job.steps ?? []) {
        const script = step.with?.script;
        if (typeof script !== "string") continue;
        if (/github\.rest\.checks\b/u.test(script)) {
          expect(script).toMatch(/github\.rest\.checks\.\w+\s*\(/u);
        }
      }
    }
  });

  it("tolerates analysis exit without a blanket shell true", () => {
    const steps = loadPrWorkflow().jobs.scan?.steps ?? [];
    const analysis = steps.find((step) => step.name === "Run analysis");
    expect(analysis?.run).not.toMatch(/\|\|\s*true/);
    // The step must record the real exit code: `continue-on-error` would keep
    // the code from later steps, and a blanket success would erase it.
    expect(analysis?.run).toContain('echo "exit_code=$code"');
    expect(analysis?.run).toContain("node dist/cli.mjs . --format json");
    expect(analysis?.run).not.toContain("--scope changed");
  });

  it("gates the pull request on the recorded exit code", () => {
    // G-V5-009: the dogfood workflow forced exit 0 and had no gate step, so
    // its own PRs read green regardless of what the scan found. The gate is
    // the deliverable of this workflow.
    const steps = loadPrWorkflow().jobs.scan?.steps ?? [];
    const gate = steps.find((step) => step.name?.startsWith("Gate on"));
    expect(gate, "the scan job must contain a gate step").toBeDefined();
    expect(gate?.env?.["EXIT_CODE"]).toBe(
      "${{ steps.analysis.outputs.exit_code }}",
    );
    expect(gate?.if).toBe("always()");
    expect(gate?.["continue-on-error"]).toBeUndefined();
    const script = gate?.run ?? "";
    // Each verdict the exit-code contract can produce must have a verdict.
    expect(script).toMatch(/0\)/);
    expect(script).toMatch(/1\)/);
    expect(script).toContain('2) echo "::warning::');
    expect(script).toContain('echo "outcome=partial"');
    expect(script).toMatch(/""\)/);
    expect(script).toMatch(/\*\)/);
  });

  it("treats a clean exit with no report as partial, never as clean", () => {
    const steps = loadPrWorkflow().jobs.scan?.steps ?? [];
    const analysis = steps.find((step) => step.name === "Run analysis");
    expect(analysis?.run).toContain('echo "exit_code=2"');
  });

  it("exposes the finding gate as an explicit, non-secret input", () => {
    const wf = loadPrWorkflow() as Workflow & {
      on?: { workflow_dispatch?: { inputs?: Record<string, unknown> } };
    };
    const input = wf.on?.workflow_dispatch?.inputs?.blocking;
    expect(
      input,
      "the gate must be overridable, and the default stated",
    ).toBeDefined();
    expect(input).toMatchObject({ default: "error" });
  });
});
