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
      steps.some((step) =>
        step.run?.includes("dist/cli.mjs . --scope changed --format json"),
      ),
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
    expect(analysis?.["continue-on-error"]).toBe(true);
    expect(analysis?.run).not.toMatch(/\|\|\s*true/);
  });
});
