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
  });

  it("creates immutable stable tags only after approval", () => {
    const tag = workflow.jobs.tag;
    expect(tag?.environment).toBe("release-candidate");
    expect(tag?.permissions).toEqual({ contents: "write" });
    const run = tag?.steps?.map((step) => step.run ?? "").join("\n");
    expect(run).toContain('git tag -a "$TAG"');
    expect(run).toContain('git push origin "refs/tags/$TAG"');
    expect(run).not.toContain("--force");
    const identityStep = tag?.steps?.find((step) =>
      step.run?.includes('git tag -a "$TAG"'),
    );
    expect(identityStep?.env?.GIT_AUTHOR_NAME).toBe("github-actions[bot]");
    expect(identityStep?.env?.GIT_COMMITTER_NAME).toBe("github-actions[bot]");
  });

  it("materializes an existing immutable tag before packing", () => {
    expect(source).toContain("tag_commit=$TAG_COMMIT");
    expect(source).toContain("Materialize and build existing release tag");
    expect(source).toContain(
      "EXPECTED_COMMIT: ${{ needs.verify.outputs.tag-commit }}",
    );
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
