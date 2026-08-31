/**
 * `ci install` template integrity (bug-audit H2 + B2.5/B2.6).
 *
 * The generated workflow is a promise about the user's CI. This spec locks
 * the promises the old template broke:
 *  - no floating `@latest` (a new release must never change a user's gate
 *    semantics without a commit of theirs — the dogfooding conclusion in
 *    .github/workflows/mjolnir.yml);
 *  - no `github.rest.checks` no-op (the exact dead code this repo's own
 *    audit removed from mjolnir.yml once shipped in the template);
 *  - reporting steps run with `if: always()` and the scan step is
 *    continue-on-error, so a scan exit 1/2 can no longer kill the job
 *    before annotate/summary/gate run;
 *  - the gate step is real: it reads mjolnir.json, never blocks on a
 *    partial scan, and sits LAST so it owns the job's exit code;
 *  - template actions stay SHA-pinned in parity with the dogfooded
 *    mjolnir.yml (B2.6 — one place to bump, both move together).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  TEMPLATE,
  gateScript,
  type GateLevel,
} from "../src/integrations/ci-install.js";

const ROOT = join(import.meta.dirname, "..");

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
  if?: boolean | string;
  "continue-on-error"?: boolean | string;
}

interface Workflow {
  on?: unknown;
  permissions?: Record<string, string>;
  jobs: Record<string, { steps?: WorkflowStep[] }>;
}

const GATES: GateLevel[] = ["advisory", "error", "warning"];

function renderParsed(gate: GateLevel): { text: string; wf: Workflow } {
  const text = TEMPLATE(gate);
  return { text, wf: parse(text) as Workflow };
}

describe("ci-install template (all gates)", () => {
  it("never recommends a floating @latest install", () => {
    for (const gate of GATES) {
      expect(
        TEMPLATE(gate).includes("@latest"),
        `gate=${gate}: the template must pin the version (scan-from-source guidance), not recommend @latest`,
      ).toBe(false);
    }
  });

  it("contains no github.rest.checks reference without a real call (the dead-code no-op the repo's own audit removed)", () => {
    for (const gate of GATES) {
      const { wf } = renderParsed(gate);
      for (const step of wf.jobs.scan?.steps ?? []) {
        const script = (step.with as { script?: string } | undefined)?.script;
        if (!script) continue;
        if (/github\.rest\.checks\b/.test(script)) {
          expect(script).toMatch(/github\.rest\.checks\.\w+\s*\(/);
        }
      }
    }
  });

  it("marks the scan step continue-on-error so the gate step owns the exit code", () => {
    for (const gate of GATES) {
      const { wf } = renderParsed(gate);
      const scan = (wf.jobs.scan?.steps ?? []).find((s) =>
        (s.run ?? "").includes("--json > mjolnir.json"),
      );
      expect(scan, "no scan step writing mjolnir.json").toBeDefined();
      expect(
        scan?.["continue-on-error"],
        "the scan step must be continue-on-error: with --gate error a scan exit 1 " +
          "would otherwise fail the job before annotate/summary/gate ever run",
      ).toBe(true);
    }
  });

  it("runs annotate/summary/reporting steps with if: always()", () => {
    for (const gate of GATES) {
      const { wf } = renderParsed(gate);
      const steps = wf.jobs.scan?.steps ?? [];
      const summary = steps.find((s) => s.name?.includes("Job Summary"));
      const comment = steps.find((s) =>
        s.uses?.startsWith("actions/github-script"),
      );
      expect(summary?.if).toBe("always()");
      expect(comment?.if).toBe("always()");
      expect(comment?.["continue-on-error"]).toBe(true);
    }
  });

  it("has a real gate step, last, that reads mjolnir.json and never blocks partial scans", () => {
    for (const gate of GATES) {
      const { wf } = renderParsed(gate);
      const steps = wf.jobs.scan?.steps ?? [];
      const gateStep = steps.find((s) => s.name?.startsWith("Gate ("));
      expect(gateStep, `gate=${gate}: no Gate step`).toBeDefined();
      expect(
        steps.indexOf(gateStep as WorkflowStep),
        "the gate step must be last — it owns the job's exit code",
      ).toBe(steps.length - 1);
      const run = gateStep?.run ?? "";
      if (gate !== "advisory") {
        expect(
          run,
          "gate must read mjolnir.json, not re-derive findings",
        ).toContain("mjolnir.json");
        expect(run).toContain("partial");
        expect(gateScript(gate)).toContain("process.exit(");
      } else {
        // advisory must provably never block: an echo, not an exit
        expect(run).toMatch(/echo/);
        expect(run).not.toContain("process.exit");
      }
    }
  });

  it("uses no ${{ github.event interpolation inside run: bodies (audit S-5)", () => {
    for (const gate of GATES) {
      const { wf } = renderParsed(gate);
      for (const step of wf.jobs.scan?.steps ?? []) {
        expect(
          /\$\{\{\s*github\.event/.test(step.run ?? ""),
          `step "${step.name}" interpolates github.event into a run: body`,
        ).toBe(false);
      }
    }
  });

  it("pins every action to a 40-hex SHA with a version comment (audit S-3)", () => {
    for (const gate of GATES) {
      const { wf } = renderParsed(gate);
      for (const step of wf.jobs.scan?.steps ?? []) {
        if (!step.uses) continue;
        expect(step.uses).toMatch(/@[0-9a-f]{40}(?:\s|#|$)/);
      }
    }
  });

  it("keeps least-privilege permissions (contents read + pull-requests write only)", () => {
    for (const gate of GATES) {
      const { wf } = renderParsed(gate);
      expect(wf.permissions).toEqual({
        contents: "read",
        "pull-requests": "write",
      });
    }
  });
});

describe("template parity with the dogfooded .github/workflows/mjolnir.yml (B2.6)", () => {
  const dogfood: Workflow = parse(
    readFileSync(join(ROOT, ".github", "workflows", "mjolnir.yml"), "utf8"),
  ) as Workflow;

  function actionsOf(wf: Workflow): Map<string, string> {
    const map = new Map<string, string>();
    for (const job of Object.values(wf.jobs ?? {})) {
      for (const step of job.steps ?? []) {
        if (!step.uses) continue;
        const [action = ""] = step.uses.split("@");
        map.set(action, step.uses);
      }
    }
    return map;
  }

  it("pins the same action SHAs as the dogfooded PR workflow", () => {
    const dogfoodActions = actionsOf(dogfood);
    for (const gate of GATES) {
      const { wf } = renderParsed(gate);
      for (const [action, uses] of actionsOf(wf)) {
        const expected = dogfoodActions.get(action);
        expect(
          expected,
          `template uses "${action}" but the dogfooded mjolnir.yml does not — ` +
            "the template and the dogfooded workflow must stay in sync",
        ).toBeDefined();
        expect(
          uses,
          `template pins ${action} differently than mjolnir.yml — bump both together`,
        ).toBe(expected);
      }
    }
  });

  it("mirrors the dogfooded PR-comment script structure (marker + list/update/create)", () => {
    const dogfoodScript =
      (
        (dogfood.jobs.scan?.steps ?? []).find((s) =>
          s.uses?.startsWith("actions/github-script"),
        )?.with as { script?: string } | undefined
      )?.script ?? "";
    const { wf } = renderParsed("advisory");
    const templateScript =
      (
        (wf.jobs.scan?.steps ?? []).find((s) =>
          s.uses?.startsWith("actions/github-script"),
        )?.with as { script?: string } | undefined
      )?.script ?? "";
    for (const fragment of [
      "<!-- mjolnir-pr-comment -->",
      "listComments(",
      "updateComment(",
      "createComment(",
    ]) {
      expect(templateScript).toContain(fragment);
      expect(dogfoodScript).toContain(fragment);
    }
  });
});
