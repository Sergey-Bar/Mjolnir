import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const root = join(import.meta.dirname, "..", "..");
const path = join(root, ".github", "workflows", "release.yml");
const source = readFileSync(path, "utf8");

interface Step {
  id?: string;
  name?: string;
  run?: string;
  uses?: string;
  if?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
  needs?: string | string[];
}

interface Job {
  if?: string;
  needs?: string | string[];
  environment?: string;
  permissions?: Record<string, string>;
  outputs?: Record<string, string>;
  env?: Record<string, string>;
  steps?: Step[];
}

interface Workflow {
  on: {
    push?: { branches?: string[]; tags?: string[] };
    workflow_dispatch?: {
      inputs?: Record<string, { default?: boolean; type?: string }>;
    };
  };
  permissions: Record<string, string>;
  jobs: Record<string, Job>;
}

const workflow = parse(source) as Workflow;
const steps = (job: string): Step[] => workflow.jobs[job]?.steps ?? [];

function stepIndex(job: string, predicate: (step: Step) => boolean): number {
  return steps(job).findIndex(predicate);
}

describe("release candidate workflow", () => {
  it("parses and defaults every manual run to dry-run", () => {
    expect(workflow.on.workflow_dispatch?.inputs?.dry_run).toEqual({
      default: true,
      required: true,
      type: "boolean",
      description:
        "Validate and package only; publishing still requires repository approval.",
    });
    expect(workflow.permissions).toEqual({ contents: "read" });
  });

  it("never auto-releases from main", () => {
    expect(workflow.on.push?.branches).toBeUndefined();
    expect(workflow.on.push?.tags).toEqual(["v*-rc.*"]);
    expect(source).not.toContain("refs/heads/main");
    expect(source).not.toContain("git push origin main");
    expect(workflow.jobs.version).toBeUndefined();
  });

  it("validates RC identity, tag, changelog, and protected-main ancestry", () => {
    const validation = steps("verify").find(
      (step) => step.name === "Validate release identity",
    )?.run;

    expect(validation).toContain("^[0-9]+\\.[0-9]+\\.[0-9]+-rc\\.[0-9]+$");
    expect(validation).toContain('git cat-file -t "refs/tags/$TAG"');
    expect(validation).toContain('"$REF_NAME" == "release/v$BASE_VERSION"');
    expect(validation).toContain('"## [$BASE_VERSION]" CHANGELOG.md');
    expect(validation).toContain(
      "git merge-base --is-ancestor origin/main HEAD",
    );
    expect(validation).not.toContain("git push");
  });

  it("builds, certifies, packs once, audits, and uploads the candidate", () => {
    expect(
      steps("verify").some((step) => step.run === "npm run ci-local"),
    ).toBe(true);
    const pack = stepIndex("verify", (step) =>
      (step.run ?? "").includes("npm pack"),
    );
    const audit = stepIndex("verify", (step) =>
      (step.run ?? "").includes("scripts/pack-audit.mjs"),
    );
    const upload = stepIndex(
      "verify",
      (step) => step.uses?.startsWith("actions/upload-artifact") === true,
    );
    expect(pack).toBeGreaterThanOrEqual(0);
    expect(audit).toBeGreaterThanOrEqual(pack);
    expect(upload).toBeGreaterThan(audit);
    expect(steps("verify")[pack]?.run).toContain("npm pack --ignore-scripts");
    expect(steps("verify")[pack]?.run).toContain("sha256sum");
  });

  it("requires explicit repository approval before creating a tag", () => {
    const job = workflow.jobs.tag;
    expect(job?.environment).toBe("release-candidate");
    expect(job?.permissions).toEqual({ contents: "write" });
    expect(job?.if).toContain("needs.verify.outputs.dry-run == 'false'");
    expect(job?.if).toContain("vars.NPM_PUBLISH == 'true'");
    expect(job?.outputs).toEqual({
      commit:
        "${{ steps.identity.outputs.commit || steps.verify.outputs.commit }}",
      tag: "${{ steps.identity.outputs.tag || steps.verify.outputs.tag }}",
    });

    const checkout = steps("tag").find((step) =>
      step.uses?.startsWith("actions/checkout"),
    );
    expect(checkout?.with?.["persist-credentials"]).toBe(true);
    const tagRun = steps("tag")
      .map((step) => step.run ?? "")
      .join("\n");
    expect(tagRun).toContain('git tag -a "$TAG"');
    expect(tagRun).toContain('git push origin "refs/tags/$TAG"');
    expect(tagRun).not.toContain("--force");
  });

  it("verifies an existing tag points to the verified commit", () => {
    const verify = steps("tag").find((step) => step.id === "verify");
    expect(verify?.env?.EXPECTED_COMMIT).toBe(
      "${{ needs.verify.outputs.commit }}",
    );
    expect(verify?.run).toContain(
      'test "$(git rev-list -n 1 "$EXPECTED_TAG")" = "$EXPECTED_COMMIT"',
    );
  });

  it("publishes the audited tarball through npm trusted publishing", () => {
    const job = workflow.jobs["publish-npm"];
    expect(job?.environment).toBe("npm-publish");
    expect(job?.permissions).toEqual({
      contents: "read",
      "id-token": "write",
    });
    expect(job?.needs).toEqual(["verify", "tag"]);
    expect(job?.env?.NPM_CONFIG_USERCONFIG).toBe("/dev/null");

    const upgrade = stepIndex("publish-npm", (step) =>
      (step.run ?? "").includes("npm install --global npm@"),
    );
    const publish = stepIndex("publish-npm", (step) =>
      (step.run ?? "").includes("npm publish"),
    );
    expect(upgrade).toBeGreaterThanOrEqual(0);
    expect(upgrade).toBeLessThan(publish);
    expect(steps("publish-npm")[upgrade]?.run).toContain("npm@11.5.1");

    const publishStep = steps("publish-npm")[publish];
    expect(publishStep?.env?.TARBALL).toBe(
      "${{ needs.verify.outputs.tarball }}",
    );
    expect(publishStep?.run).toContain(
      'npm publish "./release-artifact/$TARBALL"',
    );
    expect(publishStep?.run).toContain("--tag next");
    expect(publishStep?.run).toContain("--provenance");
    expect(publishStep?.run).toContain("--ignore-scripts");
    const commands = steps("publish-npm").map((step) => step.run ?? "");
    expect(commands.join("\n")).not.toContain("npm run build");
    expect(commands.join("\n")).not.toContain("npm ci");
    expect(commands.join("\n")).toContain("sha256sum");
  });

  it("normalizes the multi-directory artifact extraction", () => {
    for (const job of ["publish-npm", "github-release"]) {
      const download = steps(job).find((step) =>
        step.uses?.startsWith("actions/download-artifact"),
      );
      expect(download?.with?.path).toBe(".");
    }
  });

  it("creates or reconciles the GitHub prerelease only after npm succeeds", () => {
    expect(workflow.jobs["github-release"]?.needs).toEqual([
      "verify",
      "tag",
      "publish-npm",
    ]);
    expect(workflow.jobs["github-release"]?.permissions).toEqual({
      contents: "write",
    });
    const reconcile = steps("github-release").find(
      (step) => step.name === "Reconcile immutable GitHub Release",
    );
    expect(reconcile?.env?.GH_REPO).toBe("${{ github.repository }}");
    expect(reconcile?.env?.CHECKSUM).toBe(
      "${{ needs.verify.outputs.checksum }}",
    );
    expect(reconcile?.env?.EXPECTED_COMMIT).toBe(
      "${{ needs.verify.outputs.commit }}",
    );
    expect(reconcile?.run).toContain(
      'test "$(git rev-list -n 1 "$TAG")" = "$EXPECTED_COMMIT"',
    );
    expect(reconcile?.run).toContain("gh release create");
    expect(reconcile?.run).toContain("--verify-tag");
    expect(reconcile?.run).toContain("--prerelease");
    expect(reconcile?.run).toContain("gh release upload");
    expect(reconcile?.run).toContain("cmp --");
    expect(reconcile?.run).toContain("sha256sum");
    expect(reconcile?.run).not.toContain("already has a GitHub Release");
  });

  it("passes expression outputs to shell only through quoted env variables", () => {
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps ?? []) {
        expect(step.run ?? "").not.toContain("${{");
      }
    }
  });

  it("uses only immutable full-SHA action references", () => {
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps ?? []) {
        if (!step.uses) continue;
        const [ref] = step.uses.split("@").slice(1);
        expect(ref, step.uses).toMatch(/^[0-9a-f]{40}$/u);
      }
    }
  });

  it("does not hide release failures with continue-on-error", () => {
    expect(source).not.toContain("continue-on-error");
  });

  it("moves stable action tags only outside RC releases", () => {
    const actionTags = readFileSync(
      join(root, ".github", "workflows", "action-tags.yml"),
      "utf8",
    );
    expect(actionTags).toContain("!contains(github.ref_name, '-rc.')");
    expect(actionTags).toContain('git tag -f "$major" "$GITHUB_SHA"');
    expect(actionTags).toContain('git push origin "refs/tags/$major" --force');
  });

  it("executes only real spec paths", () => {
    const files = readdirSync(join(root, ".github", "workflows")).filter(
      (file) => file.endsWith(".yml") || file.endsWith(".yaml"),
    );
    const missing: string[] = [];
    for (const file of files) {
      const raw = readFileSync(
        join(root, ".github", "workflows", file),
        "utf8",
      );
      const active = raw
        .split("\n")
        .map((line) => line.replace(/(^|\s)#.*$/u, "$1"))
        .join("\n");
      for (const match of active.matchAll(
        /(?:npx vitest run |vitest run )?(tests\/[\w/.-]+\.spec\.ts)/gu,
      )) {
        const spec = match[1];
        if (spec && !existsSync(join(root, spec)))
          missing.push(`${file}: ${spec}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
