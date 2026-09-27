/**
 * `ci-adapter` generated-template integrity.
 *
 * The command's only test for years was substring containment
 * (`tests/commands/ux-verification.spec.ts`), which is why a workflow with
 * no `permissions:` block shipped: `toContain("actions/checkout")` is
 * satisfied by a workflow that would also run with write scope on the
 * repository's default `GITHUB_TOKEN`.
 *
 * These assertions parse the YAML and read the keys, so the thing being
 * checked is the document GitHub will run rather than a string in it. The
 * shape is lifted from the sibling emitter's own suite
 * (`tests/integrations/ci-install-template.spec.ts`), which already
 * YAML-parses the template it emits and asserts the scan job has no
 * `pull-requests` write. Two emitters of the same artifact in one
 * repository should not disagree about what that artifact promises.
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";

import { runCiAdapterCommand } from "../../src/commands/ci-adapter.js";
import { EXIT_CLEAN, EXIT_USAGE } from "../../src/exit-codes.js";
import type { Output } from "../../src/cli-io.js";

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
  "continue-on-error"?: boolean | string;
}

interface Workflow {
  on?: unknown;
  permissions?: Record<string, string>;
  jobs: Record<
    string,
    { steps?: WorkflowStep[]; permissions?: Record<string, string> }
  >;
}

let workdir = "";
const captured: string[] = [];

/**
 * Handlers take the shared variadic `Output` signature, not a
 * `(line: string) => void`. A narrower sink is a type error, and widening
 * the command's signature to accept one would be a change to shipped code
 * made for a test's convenience.
 */
function silentIo(): { out: Output; err: Output } {
  return { out: () => {}, err: () => {} };
}

function generate(adapter: string, filename: string): string {
  const io = {
    out: (...parts: unknown[]) => captured.push(parts.map(String).join(" ")),
    err: (...parts: unknown[]) => {
      throw new Error(
        `ci-adapter wrote to stderr: ${parts.map(String).join(" ")}`,
      );
    },
  };
  const code = runCiAdapterCommand([adapter, workdir], io);
  expect(code).toBe(EXIT_CLEAN);
  return readFileSync(join(workdir, filename), "utf8");
}

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), "mjolnir-ci-adapter-"));
});

afterAll(() => {
  rmSync(workdir, { recursive: true, force: true });
});

describe("ci-adapter github template", () => {
  it("declares least privilege instead of inheriting the repository default", () => {
    const wf = parse(generate("github", "qa-check.yml")) as Workflow;
    // Top-level: the whole workflow runs read-only. Absent here means the
    // job inherits whatever the repository's default GITHUB_TOKEN scope is,
    // which is not a property of this file and therefore not this file's
    // promise.
    expect(wf.permissions).toEqual({ contents: "read" });
    for (const [name, job] of Object.entries(wf.jobs)) {
      expect(job.permissions, `job ${name} has no permissions block`).toEqual({
        contents: "read",
      });
    }
  });

  it("grants no pull-request, issue, or package write anywhere in the file", () => {
    const wf = parse(generate("github", "qa-check.yml")) as Workflow;
    const writeScopes = new Set([
      "pull-requests",
      "issues",
      "packages",
      "actions",
      "deployments",
      "contents-write",
    ]);
    for (const [name, job] of Object.entries(wf.jobs)) {
      for (const [scope, level] of Object.entries(job.permissions ?? {})) {
        if (level !== "write" && level !== "admin") continue;
        expect(
          writeScopes.has(scope),
          `job ${name} holds ${scope}: ${level}`,
        ).toBe(false);
      }
    }
  });

  it("does not persist checkout credentials into the generated scan job", () => {
    const wf = parse(generate("github", "qa-check.yml")) as Workflow;
    const checkout = Object.values(wf.jobs)
      .flatMap((job) => job.steps ?? [])
      .find((step) => step.uses?.startsWith("actions/checkout"));
    expect(checkout, "no checkout step in template").toBeDefined();
    expect(checkout?.with?.["persist-credentials"]).toBe(false);
  });

  it("pins the checkout action to a commit SHA", () => {
    const wf = parse(generate("github", "qa-check.yml")) as Workflow;
    for (const step of Object.values(wf.jobs).flatMap(
      (job) => job.steps ?? [],
    )) {
      if (!step.uses) continue;
      expect(step.uses).toMatch(/@[0-9a-f]{40}(?:\s|#|$)/);
    }
  });

  it("scans a pinned published version rather than a floating tag", () => {
    const wf = parse(generate("github", "qa-check.yml")) as Workflow;
    const runs = Object.values(wf.jobs).flatMap((job) => job.steps ?? []);
    const scan = runs.find((step) => step.run?.includes("mjolnir-qa@"));
    expect(scan, "no scan step in template").toBeDefined();
    expect(scan?.run).not.toMatch(/mjolnir-qa@(?:latest|main|master)\b/);
  });
});

describe("ci-adapter rejects unusable arguments", () => {
  it("refuses an unknown adapter with a usage exit", () => {
    expect(runCiAdapterCommand(["circleci", workdir], silentIo())).toBe(
      EXIT_USAGE,
    );
  });

  it("refuses a flag in the target position", () => {
    expect(
      runCiAdapterCommand(["github", "--force", workdir], silentIo()),
    ).toBe(EXIT_USAGE);
  });
});
