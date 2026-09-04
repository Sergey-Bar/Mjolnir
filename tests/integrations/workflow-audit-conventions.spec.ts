/**
 * CI config meta-test (bug-audit B1.2) — converts the repo's own audit
 * conventions into an enforced ratchet over EVERY `.github/workflows/*.yml`:
 *
 *  - S-3: every `uses:` is pinned to a 40-hex SHA (a tag is mutable; a
 *    mutable action reference is a supply-chain injection point);
 *  - S-5: event data never reaches a `run:` body by `${{ github.event … }}`
 *    interpolation (a crafted event string becomes shell code);
 *  - S-6: `pull_request_target` is never used (fork PRs would run
 *    privileged code on untrusted input);
 *  - S-7: every job has an explicit `timeout-minutes` (a hung job must not
 *    sit for the 6-hour default);
 *  - S-3/S-10: top-level `permissions:` is declared and stays at or below
 *    the least-privilege baseline (jobs escalate for themselves, so a new
 *    job cannot silently inherit the repository default token).
 *
 * Adding a new workflow file automatically brings it under this test. If a
 * check fires on a deliberate change, fix the workflow — or consciously
 * widen the baseline below, with a comment explaining why.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const ROOT = join(import.meta.dirname, "..", "..");
const WORKFLOWS_DIR = join(ROOT, ".github", "workflows");

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
}

interface WorkflowJob {
  steps?: WorkflowStep[];
  uses?: string;
  "timeout-minutes"?: number | string;
}

interface Workflow {
  name?: string;
  on?: unknown;
  permissions?: Record<string, string>;
  jobs?: Record<string, WorkflowJob>;
}

/**
 * Top-level least-privilege baseline. Job-level blocks may escalate; the
 * top level may not. Extend only with a written reason.
 */
const TOP_LEVEL_BASELINE: Record<string, readonly string[]> = {
  contents: ["read", "none"],
  // mjolnir.yml posts PR comments — write is required at the level the
  // GITHUB_TOKEN is shared across its steps.
  "pull-requests": ["write"],
  // osv-scanner.yml uploads SARIF to the Security tab and calls reusable
  // workflows that require actions: read from their caller.
  "security-events": ["write"],
  actions: ["read"],
};

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .sort();
}

function loadWorkflow(file: string): Workflow {
  const text = readFileSync(join(WORKFLOWS_DIR, file), "utf8");
  return parse(text) as Workflow;
}

describe("every GitHub workflow satisfies the repo's own audit conventions", () => {
  const files = workflowFiles();

  it("discovers the expected workflow files (fails if workflows vanish)", () => {
    expect(files).toEqual(
      expect.arrayContaining([
        "ci.yml",
        "mjolnir.yml",
        "release.yml",
        "release-smoke.yml",
        "corpus-audit.yml",
        "codeql.yml",
      ]),
    );
  });

  for (const file of files) {
    describe(file, () => {
      const wf = loadWorkflow(file);

      it("parses as valid YAML", () => {
        expect(() => loadWorkflow(file)).not.toThrow();
        expect(wf).toBeTruthy();
      });

      it("declares top-level permissions at or below the least-privilege baseline", () => {
        expect(
          wf.permissions,
          "every workflow must declare top-level permissions so new jobs cannot silently inherit the repo default token",
        ).toBeDefined();
        for (const [scope, level] of Object.entries(wf.permissions ?? {})) {
          const allowed = TOP_LEVEL_BASELINE[scope];
          expect(
            allowed,
            `scope "${scope}" is not in the top-level baseline — escalate in the job's own permissions block instead, or extend the baseline with a written reason`,
          ).toBeDefined();
          expect(
            (allowed as readonly string[]).includes(level),
            `top-level ${scope}: ${level} exceeds the least-privilege baseline (${(allowed as readonly string[]).join("|")})`,
          ).toBe(true);
        }
      });

      it("every job has an explicit timeout-minutes (audit S-7)", () => {
        const jobs = wf.jobs ?? {};
        expect(Object.keys(jobs).length).toBeGreaterThan(0);
        for (const [jobName, job] of Object.entries(jobs)) {
          // A reusable-workflow call cannot set its own timeout — the
          // called workflow owns it. Its `uses:` reference is still
          // checked for SHA pinning below.
          if (job.uses) continue;
          const timeout = job["timeout-minutes"];
          expect(
            timeout,
            `job "${jobName}" has no timeout-minutes — a hung job would sit for the 6-hour default`,
          ).toBeDefined();
          expect(
            Number(timeout),
            `job "${jobName}" timeout-minutes must be a positive number`,
          ).toBeGreaterThan(0);
        }
      });

      it("every uses: is pinned to a 40-hex SHA (audit S-3)", () => {
        for (const [jobName, job] of Object.entries(wf.jobs ?? {})) {
          const uses: string[] = [];
          if (job.uses) uses.push(job.uses);
          for (const step of job.steps ?? []) {
            if (step.uses) uses.push(step.uses);
          }
          for (const ref of uses) {
            if (!ref.includes("@")) continue; // local action paths
            expect(
              ref,
              `a uses: reference in job "${jobName}" is not SHA-pinned`,
            ).toMatch(/@[0-9a-f]{40}$/);
          }
        }
      });

      it("never triggers on pull_request_target (audit S-6)", () => {
        const on = wf.on;
        if (on && typeof on === "object") {
          expect(
            "pull_request_target" in (on as Record<string, unknown>),
            "pull_request_target runs privileged code on untrusted fork input — use pull_request",
          ).toBe(false);
        }
      });

      it("no ${{ github.event interpolation inside run: bodies (audit S-5)", () => {
        for (const [jobName, job] of Object.entries(wf.jobs ?? {})) {
          for (const step of job.steps ?? []) {
            const run = step.run ?? "";
            const match = run.match(/\$\{\{\s*github\.event/);
            expect(
              match,
              `step "${step.name ?? "(unnamed)"}" in job "${jobName}" interpolates ` +
                `github.event into a run: body (${match?.[0]}…) — pass it through env: instead`,
            ).toBeNull();
          }
        }
      });
    });
  }
});
