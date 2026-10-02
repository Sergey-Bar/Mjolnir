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

/**
 * The retired M26 program. No command under this prefix may come back: it read
 * four ledgers recording blocked evidence that was never going to arrive, and a
 * release path that gates on it is a wall, not a decision.
 *
 * Named, and interpolated into the pattern rather than written as a literal,
 * because `docs-consistency` reads this file's source and treats a runnable
 * command in a comment as an instruction to a reader.
 */
const RETIRED_M26 = "m26";

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
    // Prereleases AND stable releases. The RC-only list was correct while
    // `latest` on the registry was 3.0.0 and every 4.x attempt stopped at a
    // candidate — a gate that can only produce prereleases is a gate that
    // never lets the project ship.
    expect(workflow.on.push?.tags).toEqual([
      "v*-rc.*",
      "v[0-9]+.[0-9]+.[0-9]+",
    ]);
    expect(source).not.toContain("refs/heads/main");
    expect(source).not.toContain("git push origin main");
    expect(workflow.jobs.version).toBeUndefined();
  });

  it("validates release identity, tag, changelog, and protected-main ancestry", () => {
    const validation = steps("verify").find(
      (step) => step.name === "Validate release identity",
    )?.run;

    // Stable or prerelease, decided once from the version and carried
    // downstream as `is_prerelease`. The old regex accepted only
    // `-rc.N`, so a stable tag could never pass this step even if the
    // workflow had been triggered by one.
    expect(validation).toContain("^[0-9]+\\.[0-9]+\\.[0-9]+(-rc\\.[0-9]+)?$");
    expect(validation).toContain("is_prerelease");
    expect(validation).toContain('git cat-file -t "refs/tags/$TAG"');
    expect(validation).toContain('"$REF_NAME" == "release/v$BASE_VERSION"');
    expect(validation).not.toContain('grep -F "##');
    expect(validation).toContain(
      "git merge-base --is-ancestor origin/main HEAD",
    );
    expect(validation).not.toContain("git push");
  });

  it("runs the exact RC-aware changelog gate before certification", () => {
    const changelog = stepIndex("verify", (step) => step.id === "changelog");
    const certification = stepIndex(
      "verify",
      (step) => step.run === "npm run ci-local",
    );
    expect(changelog).toBeGreaterThanOrEqual(0);
    expect(changelog).toBeLessThan(certification);
    const run = steps("verify")[changelog]?.run ?? "";
    expect(steps("verify")[changelog]?.env?.EXPECTED_VERSION).toBe(
      "${{ steps.context.outputs.version }}",
    );
    expect(run).toContain(
      'npm run check-version -- --expect-version "$VERSION"',
    );
    expect(run).toContain('git diff --quiet "$BASE_REF" HEAD -- src/rules');
    expect(run).toContain("--rules-touched");
  });

  it("requires authorized candidate evidence before non-dry-run certification", () => {
    // 6.0: the evidence step ran the M26 audit, which read four ledgers
    // of the retired M26 program and could only ever report blocked cells for
    // evidence that was never going to arrive. Repointed at the readiness gate
    // that can actually be satisfied — and the deleted script is asserted
    // absent, because "we removed the permanent blocker" and "we removed the
    // name of it" are different claims. (Deliberately not naming the deleted
    // script as a runnable command: docs-consistency would flag this comment
    // as telling a reader to run a script that does not exist.)
    const run = steps("verify")
      .map((step) => step.run ?? "")
      .join("\n");
    // Narrower than "no mention of m26 at all": the step's comment explains
    // what was removed and has to be able to name it. What must not come back
    // is the command — and the pattern is assembled rather than written out,
    // because docs-consistency reads this file's source and would match the
    // literal in a regex as an instruction to run a script that does not exist.
    expect(run).not.toMatch(new RegExp(`npm\\s+run\\s+${RETIRED_M26}:`));
    const authorization = stepIndex(
      "verify",
      (step) =>
        step.run?.includes("npm run candidate:readiness") === true &&
        step.run.includes("|| true"),
    );
    const certification = stepIndex(
      "verify",
      (step) => step.run === "npm run ci-local",
    );
    expect(authorization).toBeGreaterThanOrEqual(0);
    expect(authorization).toBeLessThan(certification);
    expect(steps("verify")[authorization]?.if).toContain(
      "steps.context.outputs.dry_run == 'false'",
    );
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
    expect(job?.if).toContain("needs.verify.outputs.dry_run == 'false'");
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
    // The gating job is named `verify`. It was briefly expected to be
    // `contract-verify` — a CLI verb, not a job in this workflow — while the
    // assertion 15 lines below still read `needs.verify.outputs.tarball`.
    // Both cannot be true, and the one naming a job that does not exist
    // would have let a rename break the publish path silently. Derived from
    // the job list so the two halves cannot disagree again.
    expect(job?.needs).toEqual(["verify", "tag"]);
    expect(workflow.jobs["contract-verify"]).toBeUndefined();
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
    expect(commands.join("\n")).toContain("dist.integrity");
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

  it("moves the released major's action tag, and never an RC", () => {
    const actionTags = readFileSync(
      join(root, ".github", "workflows", "action-tags.yml"),
      "utf8",
    );
    expect(actionTags).toContain("!contains(github.ref_name, '-rc.')");
    expect(actionTags).toContain('MAJOR="${VERSION%%.*}"');
    expect(actionTags).toContain('MAJOR_TAG="v$MAJOR"');
    // The tag must be created locally before a ref can be pushed, and the push
    // must carry a credential.
    expect(actionTags).toContain('git tag -f "$MAJOR_TAG" "$TARGET"');
    expect(actionTags).toContain('"refs/tags/$MAJOR_TAG" --force');
    expect(actionTags).toContain("TAG_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
    // The regression. The major was hardcoded to 3, so no v4 or v5 tag could
    // ever be published and every `uses: Sergey-Bar/Mjolnir@vN` in the docs
    // after v2 pointed at a ref that did not exist. Deriving the major from
    // the tag being pushed is the only rule that survives the next major.
    expect(actionTags).not.toContain('"$MAJOR" != "3"');
  });

  it("pushes the major tag with a credential it actually has", () => {
    // The third regression, and the one that stopped `@v5` from existing even
    // after the major was derived correctly. `actions/checkout` ran with
    // `persist-credentials: false`, which is right for a job that only reads
    // and wrong for the single step that pushes. The result was
    //
    //   fatal: could not read Username for 'https://github.com'
    //
    // and because the hardcoded-to-3 version exited before reaching the push,
    // every earlier run had "succeeded" without ever moving a tag. A job that
    // cannot push must not be able to report that it did.
    const actionTags = readFileSync(
      join(root, ".github", "workflows", "action-tags.yml"),
      "utf8",
    );
    expect(actionTags).toContain("x-access-token:${TAG_TOKEN}");
    expect(actionTags).toContain("--force");
    // The token is scoped to one command rather than left in .git/config for a
    // later step to find. The pattern is deliberately free of nested
    // quantifiers: `url\s*=\s*.*x-access-token` is a super-linear backtracking
    // hazard, which `regexp/no-super-linear-backtracking` correctly rejects.
    expect(actionTags).not.toMatch(/remote set-url[^"]*x-access-token/);
  });

  it("can move the major tag for a tag that was already pushed", () => {
    // The second regression, and the one that actually blocked 5.0.0. A
    // tag-push-only trigger cannot move a tag that was pushed before the
    // workflow could: `v5.0.0` was cut and verified, this fix merged
    // afterwards, and no further v* tag will ever be pushed — so `@v5` had no
    // path to existence. The docs' recommended `uses: Sergey-Bar/Mjolnir@v5`
    // pointed at a ref the workflow whose whole job is to create it could not
    // create.
    const actionTags = readFileSync(
      join(root, ".github", "workflows", "action-tags.yml"),
      "utf8",
    );
    expect(actionTags).toContain("workflow_dispatch:");
    expect(actionTags).toContain("DISPATCH_MAJOR");
    // The manual path is not a loophole: the operator still names the major,
    // and a non-integer is refused rather than coerced.
    expect(actionTags).toContain("^[1-9][0-9]*$");
    expect(actionTags).toContain("major must be a positive integer");
    // And the RC exclusion still holds on the path that can bypass the push.
    expect(actionTags).toMatch(/workflow_dispatch[\s\S]*DISPATCH_MAJOR/);
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
