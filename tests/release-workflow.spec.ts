/**
 * release.yml review (Master-Stabilization-Plan Sprint 4, Task 18).
 *
 * Asserts the workflow is valid YAML and that the npm-publish step is
 * *intentionally* gated off (if: false), not accidentally live — a
 * publish to the parked/wrong npm name would be a real, damaging
 * mistake (see docs/plans/Master-Stabilization-Plan.md §5).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const ROOT = join(import.meta.dirname, "..");

interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
  if?: boolean | string;
}

interface Workflow {
  jobs: Record<
    string,
    {
      permissions?: Record<string, string>;
      steps?: WorkflowStep[];
    }
  >;
}

function loadReleaseWorkflow(): Workflow {
  const text = readFileSync(
    join(ROOT, ".github", "workflows", "release.yml"),
    "utf8",
  );
  return parse(text) as Workflow;
}

describe("release.yml", () => {
  it("parses as valid YAML", () => {
    expect(() => loadReleaseWorkflow()).not.toThrow();
  });

  it("has a release job", () => {
    const wf = loadReleaseWorkflow();
    expect(wf.jobs.release).toBeDefined();
  });

  it("creates a GitHub Release with the packed tarball attached", () => {
    const wf = loadReleaseWorkflow();
    const steps = wf.jobs.release?.steps ?? [];
    expect(
      steps.some((s) => s.uses?.startsWith("softprops/action-gh-release")),
    ).toBe(true);
  });

  it("the npm publish step exists and is gated behind an explicit opt-in variable, never unconditional", () => {
    const wf = loadReleaseWorkflow();
    const steps = wf.jobs.release?.steps ?? [];
    const publishStep = steps.find((s) => s.run?.includes("npm publish"));
    expect(
      publishStep,
      "expected a documented npm publish step — Task 18 requires writing " +
        "it, not omitting it entirely",
    ).toBeDefined();
    // The gate must be present and must reference a repo variable — never
    // absent (which would publish on every tag), and never a bare boolean
    // literal that a copy-paste could flip to `true` with OIDC not set up,
    // failing the release job.
    expect(
      typeof publishStep?.if === "string" &&
        /vars\.NPM_PUBLISH\s*==\s*'true'/.test(publishStep.if as string),
      `npm publish must be gated on \`vars.NPM_PUBLISH == 'true'\` so it ` +
        `only runs once the npmjs.com OIDC trusted-publisher setup is ` +
        `done (see docs/PUBLISHING.md). Found: ${JSON.stringify(publishStep?.if)}`,
    ).toBe(true);
  });

  it("publishes with --provenance (verifiable attestation), not a bare publish", () => {
    const wf = loadReleaseWorkflow();
    const steps = wf.jobs.release?.steps ?? [];
    const publishStep = steps.find((s) => s.run?.includes("npm publish"));
    expect(publishStep?.run).toContain("--provenance");
  });

  it("declares id-token: write for future OIDC provenance publishing", () => {
    const wf = loadReleaseWorkflow();
    expect(wf.jobs.release?.permissions?.["id-token"]).toBe("write");
  });

  it("the publish step uses --provenance", () => {
    const wf = loadReleaseWorkflow();
    const steps = wf.jobs.release?.steps ?? [];
    const publishStep = steps.find((s) => s.run?.includes("npm publish"));
    expect(publishStep?.run).toContain("--provenance");
  });

  it("verifies the git tag matches package.json's version before releasing", () => {
    const wf = loadReleaseWorkflow();
    const steps = wf.jobs.release?.steps ?? [];
    expect(
      steps.some(
        (s) => s.run?.includes("package.json") && s.run?.includes("ref_name"),
      ),
    ).toBe(true);
  });
});
