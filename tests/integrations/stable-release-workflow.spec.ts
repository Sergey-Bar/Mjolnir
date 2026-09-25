import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const root = join(import.meta.dirname, "..", "..");
const source = readFileSync(
  join(root, ".github", "workflows", "stable-release.yml"),
  "utf8",
);
const workflow = parse(source) as {
  on: {
    push?: unknown;
    workflow_dispatch?: {
      inputs?: Record<
        string,
        {
          default?: boolean;
          type?: string;
          required?: boolean;
          description?: string;
        }
      >;
    };
  };
  permissions: Record<string, string>;
  jobs: Record<
    string,
    {
      environment?: string;
      permissions?: Record<string, string>;
      steps?: Array<{
        uses?: string;
        run?: string;
        env?: Record<string, string>;
      }>;
    }
  >;
};

describe("stable release workflow", () => {
  it("is dispatch-only and dry-run by default", () => {
    expect(workflow.on.push).toBeUndefined();
    expect(workflow.on.workflow_dispatch?.inputs?.dry_run).toEqual({
      default: true,
      required: true,
      type: "boolean",
      description:
        "Validate and package only; publishing still requires repository approval.",
    });
    expect(workflow.permissions).toEqual({ contents: "read" });
  });

  it("publishes the audited stable tarball with trusted npm OIDC", () => {
    const publish = workflow.jobs["publish-npm"];
    expect(publish?.environment).toBe("npm-publish");
    expect(publish?.permissions).toEqual({
      contents: "read",
      "id-token": "write",
    });
    const run = publish?.steps?.map((step) => step.run ?? "").join("\n");
    expect(run).toContain("npm install --global npm@11.5.1");
    expect(run).toContain("sha256sum");
    expect(run).toContain('npm publish "./release-artifact/$TARBALL"');
    expect(run).toContain("--provenance");
    expect(run).not.toContain("--tag next");
    expect(run).toContain("dist-tags.latest");
    expect(run).toContain("dist.integrity");
    expect(run).toContain("LOCAL_INTEGRITY");
    const verifyRun = workflow.jobs.verify?.steps
      ?.map((step) => step.run ?? "")
      .join("\n");
    expect(verifyRun).toContain("scripts/generate-sbom.mjs");
    expect(verifyRun).toContain(".sbom.spdx.json");
  });

  it("creates immutable stable tags only after approval", () => {
    const tag = workflow.jobs.tag;
    expect(tag?.environment).toBe("release-candidate");
    expect(tag?.permissions).toEqual({ contents: "write" });
    const run = tag?.steps?.map((step) => step.run ?? "").join("\n");
    expect(run).toContain('git tag -a "$TAG"');
    expect(run).toContain('git push origin "refs/tags/$TAG"');
    const identityStep = tag?.steps?.find((step) =>
      step.run?.includes('git tag -a "$TAG"'),
    );
    expect(identityStep?.run).not.toContain("--force");
    expect(identityStep?.env?.GIT_AUTHOR_NAME).toBe("github-actions[bot]");
    expect(identityStep?.env?.GIT_COMMITTER_NAME).toBe("github-actions[bot]");
  });

  it("moves only the current v3 Action major after a stable release", () => {
    const run = workflow.jobs.tag?.steps
      ?.map((step) => step.run ?? "")
      .join("\n");
    expect(run).toContain('if [[ "$MAJOR" != "3" ]]');
    expect(run).toContain('git tag -f "v$MAJOR" "$TAG_COMMIT"');
    expect(run).toContain('git push origin "refs/tags/v$MAJOR" --force');
  });

  it("attaches SBOM and never clobbers release assets", () => {
    const run = workflow.jobs["github-release"]?.steps
      ?.map((step) => step.run ?? "")
      .join("\n");
    expect(run).toContain('sha256sum --check "$SBOM.sha256"');
    expect(run).toContain("release-artifact/$SBOM#$SBOM");
    expect(run).not.toContain("--clobber");
  });

  it("supports publishing a prior verified artifact without rebuilding", () => {
    expect(source).toContain("artifact_run_id");
    expect(source).toContain("resume-npm:");
    expect(source).toContain(
      'gh run download "$ARTIFACT_RUN_ID" --name "stable-release-$VERSION"',
    );
    expect(source).toContain(
      "inputs.artifact_run_id != '' && vars.NPM_PUBLISH == 'true'",
    );
    expect(source).toContain("resume-release:");
  });

  it("materializes an existing immutable tag before packing", () => {
    expect(source).toContain("tag_commit=$TAG_COMMIT");
    expect(source).toContain("Materialize and build existing release tag");
    expect(source).toContain(
      "EXPECTED_COMMIT: ${{ needs.verify.outputs.tag-commit }}",
    );
  });

  it("runs the exact stable changelog gate before certification", () => {
    const run = workflow.jobs.verify?.steps
      ?.map((step) => step.run ?? "")
      .join("\n");
    expect(run).toContain(
      'npm run changelog:check -- --expect-version "$VERSION"',
    );
    expect(run).toContain('git diff --quiet "$BASE_REF" HEAD -- src/rules');
    expect(run).toContain("--rules-touched");
  });

  it("requires authorized candidate evidence before certification", () => {
    const run = workflow.jobs.verify?.steps
      ?.map((step) => step.run ?? "")
      .join("\n");
    expect(run).toContain("npm run m26:audit");
    expect(run).toContain("npm run candidate:readiness");
    const readiness = workflow.jobs.verify?.steps?.findIndex(
      (step) => step.run?.includes("npm run m26:audit") === true,
    );
    const certification = workflow.jobs.verify?.steps?.findIndex(
      (step) => step.run === "npm run ci-local",
    );
    expect(readiness).toBeGreaterThanOrEqual(0);
    expect(readiness).toBeLessThan(certification ?? -1);
  });

  it("validates the packaged CLI version banner", () => {
    expect(source).toContain('= "mjolnir-qa $VERSION"');
  });

  it("pins every action reference", () => {
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps ?? []) {
        if (!step.uses) continue;
        const ref = step.uses.split("@")[1];
        expect(ref, step.uses).toMatch(/^[0-9a-f]{40}$/u);
      }
    }
  });
});
