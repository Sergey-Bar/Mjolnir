/**
 * mjolnir.yml review (Master-Stabilization-Plan Sprint 6, Task 25).
 *
 * Task 25 requires auditing the existing PR workflow before building on
 * it. The audit found real dead code: an annotate step that referenced
 * `github.rest.checks` without ever calling it (a no-op), and no
 * connection at all to baseline/diff (Task 24) or a real posted PR
 * comment — findings only ever landed in mjolnir.json, a file nobody
 * on a PR ever opens. This locks in the fix so a future edit can't
 * silently reintroduce dead code or drop the comment step.
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
  if?: boolean | string;
  "continue-on-error"?: boolean;
}

interface Workflow {
  on?: unknown;
  permissions?: Record<string, string>;
  jobs: Record<string, { steps?: WorkflowStep[] }>;
}

function loadPrWorkflow(): Workflow {
  const text = readFileSync(
    join(ROOT, ".github", "workflows", "mjolnir.yml"),
    "utf8",
  );
  return parse(text) as Workflow;
}

describe("mjolnir.yml (the PR feedback loop workflow)", () => {
  it("parses as valid YAML", () => {
    expect(() => loadPrWorkflow()).not.toThrow();
  });

  it("has a scan job triggered on pull_request", () => {
    const wf = loadPrWorkflow();
    expect(wf.jobs.scan).toBeDefined();
    expect(wf.on).toHaveProperty("pull_request");
  });

  it("declares pull-requests: write so it can actually post a comment", () => {
    const wf = loadPrWorkflow();
    expect(wf.permissions?.["pull-requests"]).toBe("write");
  });

  it("does not reference github.rest.checks without calling it (the dead-code bug this audit found)", () => {
    const wf = loadPrWorkflow();
    const steps = wf.jobs.scan?.steps ?? [];
    for (const s of steps) {
      const script = (s.with as { script?: string } | undefined)?.script;
      if (!script) continue;
      // Referencing the namespace without an actual call (e.g.
      // `github.rest.checks // comment`) is exactly the bug found: a
      // statement with no effect. Any real usage calls a method on it.
      const referencesChecks = /github\.rest\.checks\b/.test(script);
      if (referencesChecks) {
        expect(script).toMatch(/github\.rest\.checks\.\w+\s*\(/);
      }
    }
  });

  it("runs mjolnir diff so only new/worsened debt is what gets surfaced (Task 24 integration)", () => {
    const wf = loadPrWorkflow();
    const steps = wf.jobs.scan?.steps ?? [];
    expect(
      steps.some((s) =>
        /(?:mjolnir-qa@latest|dist\/cli\.mjs)\s+diff\b/.test(s.run ?? ""),
      ),
    ).toBe(true);
  });

  it("runs mjolnir pr-comment and actually posts/updates a PR comment via the GitHub API", () => {
    const wf = loadPrWorkflow();
    const steps = wf.jobs.scan?.steps ?? [];
    expect(steps.some((s) => s.run?.includes("pr-comment"))).toBe(true);
    const commentStep = steps.find((s) =>
      (s.with as { script?: string } | undefined)?.script?.includes(
        "mjolnir-pr-comment",
      ),
    );
    expect(
      commentStep,
      "expected a github-script step that reads the rendered comment and " +
        "posts/updates it via the issues API, keyed on the pr-comment " +
        "module's own idempotency marker",
    ).toBeDefined();
    const script = (commentStep?.with as { script?: string })?.script ?? "";
    expect(script).toMatch(/createComment\s*\(/);
    expect(script).toMatch(/updateComment\s*\(/);
    expect(script).toMatch(/listComments\s*\(/);
  });

  it("checks out full history (fetch-depth: 0) — required for --scope changed and impact/diff", () => {
    const wf = loadPrWorkflow();
    const steps = wf.jobs.scan?.steps ?? [];
    const checkout = steps.find((s) => s.uses?.startsWith("actions/checkout"));
    expect(checkout?.with?.["fetch-depth"]).toBe(0);
  });

  it("never blocks the job on findings (advisory mode) via continue-on-error on the diff step, not a blanket `|| true`", () => {
    const wf = loadPrWorkflow();
    const steps = wf.jobs.scan?.steps ?? [];
    const diffStep = steps.find((s) =>
      /(?:mjolnir-qa@latest|dist\/cli\.mjs)\s+diff\b/.test(s.run ?? ""),
    );
    // diff's exit code can be 1 on new errors — must be tolerated via
    // continue-on-error on this specific step, never a blanket `|| true`
    // (the tool's own QA-CI-002 rule flags that as a false-green
    // anti-pattern — this workflow must not commit the exact mistake it
    // exists to catch in other repos).
    expect(diffStep?.["continue-on-error"]).toBe(true);
    expect(diffStep?.run).not.toMatch(/\|\|\s*true/);
  });
});
