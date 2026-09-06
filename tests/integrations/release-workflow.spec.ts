/**
 * release.yml review (Master-Stabilization-Plan Sprint 4, Task 18).
 *
 * Asserts the workflow is valid YAML and that the npm-publish step is
 * *intentionally* gated off (if: false), not accidentally live — a
 * publish to the parked/wrong npm name would be a real, damaging
 * mistake (see docs/plans/Master-Stabilization-Plan.md §5).
 *
 * Auto-NPM-Release plan (2026-09-05): extended for the two-job shape —
 * a `version` job (auto-release brain: label-driven bump, CHANGELOG
 * collapse, bot commit + tag) ahead of the `release` job (the publish
 * pipeline, byte-identical). The one-workflow-file constraint is hard:
 * npmjs.com's Trusted Publisher matches the workflow FILENAME, so a
 * second file would fail OIDC with ENEEDAUTH.
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
  if?: boolean | string;
  with?: Record<string, unknown>;
}

interface WorkflowJob {
  permissions?: Record<string, string>;
  steps?: WorkflowStep[];
  if?: string;
  needs?: string | string[];
  outputs?: Record<string, string>;
}

interface Workflow {
  on?: Record<string, unknown>;
  jobs: Record<string, WorkflowJob>;
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
        /vars\.NPM_PUBLISH\s*==\s*'true'/.test(publishStep.if),
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
        (s) =>
          s.run?.includes("package.json") && s.run?.includes("RELEASE_TAG"),
      ),
    ).toBe(true);
  });

  // ── Ordering: publish before Release ────────────────────────────────
  //
  // v0.5.0 shipped a public "Latest" GitHub Release for a version npm
  // never received: the gh-release step ran first and succeeded, then the
  // publish step failed. A GitHub Release is a promise that `npm i` works,
  // so it must not be created until that is true. These three tests lock
  // the ordering, the verification gate, and the retry trigger.

  function stepIndex(
    steps: WorkflowStep[],
    predicate: (s: WorkflowStep) => boolean,
  ): number {
    return steps.findIndex(predicate);
  }

  it("publishes to npm BEFORE creating the GitHub Release", () => {
    const steps = loadReleaseWorkflow().jobs.release?.steps ?? [];
    const publishAt = stepIndex(steps, (s) => !!s.run?.includes("npm publish"));
    const releaseAt = stepIndex(
      steps,
      (s) => !!s.uses?.startsWith("softprops/action-gh-release"),
    );
    expect(publishAt, "no npm publish step found").toBeGreaterThanOrEqual(0);
    expect(releaseAt, "no gh-release step found").toBeGreaterThanOrEqual(0);
    expect(
      publishAt,
      "npm publish must run before the GitHub Release is created — " +
        "otherwise a failed publish still leaves a public Release " +
        "advertising a version nobody can install (v0.5.0 did exactly this)",
    ).toBeLessThan(releaseAt);
  });

  it("verifies the version is live on the registry before creating the Release", () => {
    const steps = loadReleaseWorkflow().jobs.release?.steps ?? [];
    const verifyAt = stepIndex(
      steps,
      (s) => !!s.run?.includes("npm view") && !!s.run?.includes("::error::"),
    );
    const releaseAt = stepIndex(
      steps,
      (s) => !!s.uses?.startsWith("softprops/action-gh-release"),
    );
    expect(
      verifyAt,
      "expected a step that resolves the published version via `npm view` " +
        "and fails the job when it is not there",
    ).toBeGreaterThanOrEqual(0);
    expect(verifyAt).toBeLessThan(releaseAt);
  });

  it("can be re-run for an existing tag without force-pushing it", () => {
    const text = readFileSync(
      join(ROOT, ".github", "workflows", "release.yml"),
      "utf8",
    );
    const wf = parse(text) as { on?: Record<string, unknown> };
    expect(
      wf.on?.["workflow_dispatch"],
      "release.yml needs a workflow_dispatch trigger: when a release fails " +
        "for a reason outside the repo (registry auth), the only other " +
        "retry path is deleting and force-pushing the tag",
    ).toBeDefined();
  });

  it("skips the publish when the version is already on npm, instead of failing", () => {
    const steps = loadReleaseWorkflow().jobs.release?.steps ?? [];
    const publishStep = steps.find((s) => s.run?.includes("npm publish"));
    expect(
      typeof publishStep?.if === "string" &&
        /steps\.registry\.outputs\.published\s*!=\s*'true'/.test(
          publishStep.if,
        ),
      "re-running a release for an already-published version must skip the " +
        "publish (npm rejects duplicates with E403), not fail the job. " +
        `Found: ${JSON.stringify(publishStep?.if)}`,
    ).toBe(true);
  });

  // ── Auto-release: the version job (merge to main → publish) ─────────
  //
  // Every merge to main must produce exactly one npm release with zero
  // manual commands. The version job computes the bump from PR labels,
  // collapses the CHANGELOG [Unreleased] sections, and pushes the bot
  // commit + tag; the release job then publishes from that tag. These
  // tests lock the two-job shape so neither job can regress silently.

  const pushTriggers = loadReleaseWorkflow().on?.push as
    { branches?: string[]; tags?: string[] } | undefined;

  it("triggers on main-branch pushes (the auto-release path) as well as v* tags", () => {
    expect(
      pushTriggers?.branches,
      "release.yml must trigger on pushes to main — that is the whole " +
        "auto-release path (plan: merge → publish, zero manual commands)",
    ).toContain("main");
    expect(
      pushTriggers?.tags,
      "the manual rc path (push a v* tag) must keep working",
    ).toContain("v*");
  });

  it("has a version job with contents: write + pull-requests: read", () => {
    const wf = loadReleaseWorkflow();
    const version = wf.jobs.version;
    expect(
      version,
      "the auto-release brain job must exist before the release job",
    ).toBeDefined();
    expect(
      version?.permissions?.["contents"],
      "the version job pushes the bump commit and tag to main",
    ).toBe("write");
    expect(
      version?.permissions?.["pull-requests"],
      "the version job resolves PR labels via gh pr view",
    ).toBe("read");
  });

  it("the release job needs the version job", () => {
    const wf = loadReleaseWorkflow();
    const needs = wf.jobs.release?.needs;
    expect(
      Array.isArray(needs) ? needs : [needs],
      "publishing must be chained behind the version job (needs: version) " +
        "in the SAME workflow file — a GITHUB_TOKEN-pushed tag fires no " +
        "new run, so chaining is what makes the tag publish at all",
    ).toContain("version");
  });

  it("the version job has a tag-exists loop-guard step", () => {
    const steps = loadReleaseWorkflow().jobs.version?.steps ?? [];
    expect(
      steps.some(
        (s) =>
          s.run?.includes("git describe --tags --exact-match") &&
          s.run?.includes("skip=true"),
      ),
      "the version job must detect that HEAD is already the bot's own " +
        "release commit (tagged v<package.json version> at HEAD) and exit " +
        "with skip=true — without it a re-run or PAT-based push would " +
        "release in an infinite loop",
    ).toBe(true);
  });

  it("the version job only runs on main-branch pushes", () => {
    const jobIf = loadReleaseWorkflow().jobs.version?.if;
    expect(
      typeof jobIf === "string" &&
        jobIf.includes("github.event_name == 'push'") &&
        jobIf.includes("startsWith(github.ref, 'refs/heads/')"),
      "the version job must be restricted to branch pushes (tag pushes and " +
        "workflow_dispatch go straight to the release job). " +
        `Found: ${JSON.stringify(jobIf)}`,
    ).toBe(true);
  });

  it("the release job checks out the version job's tag on the auto path", () => {
    const steps = loadReleaseWorkflow().jobs.release?.steps ?? [];
    const checkout = steps.find((s) => s.uses?.startsWith("actions/checkout"));
    expect(
      typeof checkout?.with?.ref === "string" &&
        checkout.with.ref.includes("needs.version.outputs.tag"),
      "on a main-branch push the release job must check out the tag the " +
        "version job just cut (needs.version.outputs.tag), not the branch " +
        `tip. Found: ${JSON.stringify(checkout?.with?.ref)}`,
    ).toBe(true);
  });

  it("the release job publishes only when the version job actually cut a tag", () => {
    const jobIf = loadReleaseWorkflow().jobs.release?.if;
    expect(
      typeof jobIf === "string" && jobIf.includes("needs.version.outputs.skip"),
      "the release job must consult needs.version.outputs.skip so a skipped " +
        "decision (bot-commit loop guard, all-release:skip) does not publish " +
        "a half state. Found: " +
        JSON.stringify(jobIf),
    ).toBe(true);
    expect(
      typeof jobIf === "string" &&
        jobIf.includes("needs.version.result == 'success'") &&
        jobIf.includes("needs.version.result == 'skipped'"),
      "the release job must run when the version job was skipped (tag-push " +
        "and dispatch triggers) but NOT when it failed — a failed version " +
        "job means no release commit, and publishing the branch tip would " +
        "ship unversioned code. Found: " +
        JSON.stringify(jobIf),
    ).toBe(true);
  });
});
