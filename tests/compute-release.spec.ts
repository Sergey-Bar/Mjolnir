/**
 * compute-release.mjs — the pure bump-decision core of the auto-release
 * path (plan .kilo/plans/1788579000817, "Auto-NPM-Release").
 *
 * Bump matrix (user-confirmed policy):
 * - no PR number in the subject (direct push) → patch + warning
 * - label lookup failure → patch + warning, never fatal
 * - labels OR-ed across the whole range; max bump wins
 *   (release:major > release:minor > no label = patch)
 * - release:skip excludes that PR; all-skip → skip the release
 * - empty range → skip
 */

import { describe, expect, it } from "vitest";
import {
  computeRelease,
  prNumberFromSubject,
} from "../scripts/compute-release.mjs";

/** Labels lookup that never fails and never returns labels (patch). */
const noLabels = () => Promise.resolve([] as string[]);

describe("prNumberFromSubject", () => {
  it("extracts the PR number from a squash-merge subject", () => {
    expect(
      prNumberFromSubject(
        "site: live the three orphaned components — false-green chain, score explainer, evidence badge (G6/G7/G8/G9) (#29)",
      ),
    ).toBe(29);
  });

  it("returns null for subjects without a PR reference", () => {
    expect(
      prNumberFromSubject(
        "security: fix 8 CodeQL high-severity findings in my own new code",
      ),
    ).toBeNull();
    expect(
      prNumberFromSubject("chore: trailing (# without a number"),
    ).toBeNull();
    expect(prNumberFromSubject("")).toBeNull();
  });

  it("does not confuse version-like numbers for PR numbers", () => {
    expect(prNumberFromSubject("release v1.2.3 (no PR)")).toBeNull();
  });
});

describe("computeRelease", () => {
  it("empty commit range → skip", async () => {
    const decision = await computeRelease([], noLabels);
    expect(decision.skip).toBe(true);
    expect(decision.reason).toContain("no commits");
  });

  it("a commit with no PR number defaults to patch with a warning", async () => {
    const decision = await computeRelease(
      [{ subject: "security: direct hotfix push" }],
      noLabels,
    );
    expect(decision.skip).toBe(false);
    expect(decision.bump).toBe("patch");
    expect(decision.warnings.some((w) => w.includes("no PR number"))).toBe(
      true,
    );
  });

  it("a PR with no release labels defaults to patch", async () => {
    const decision = await computeRelease(
      [{ subject: "fix: something (#12)" }],
      () => Promise.resolve(["bug"]),
    );
    expect(decision.skip).toBe(false);
    expect(decision.bump).toBe("patch");
  });

  it("release:minor wins over the patch default", async () => {
    const decision = await computeRelease(
      [
        { subject: "fix: small thing (#12)" },
        { subject: "feat: bigger thing (#13)" },
      ],
      (pr) => Promise.resolve(pr === 13 ? ["release:minor"] : []),
    );
    expect(decision.bump).toBe("minor");
  });

  it("release:major beats minor and patch across the whole batch", async () => {
    const decision = await computeRelease(
      [
        { subject: "fix: patchy (#1)" },
        { subject: "feat: minor (#2)" },
        { subject: "feat!: major (#3)" },
      ],
      (pr) =>
        Promise.resolve(
          pr === 1
            ? ["release:patch"]
            : pr === 2
              ? ["release:minor"]
              : ["release:major"],
        ),
    );
    expect(decision.bump).toBe("major");
  });

  it("release:minor beats release:patch labels (patch is not a label, but a stray one must not win)", async () => {
    const decision = await computeRelease([{ subject: "feat: a (#1)" }], () =>
      Promise.resolve(["release:minor", "release:patch"]),
    );
    expect(decision.bump).toBe("minor");
  });

  it("a skipped PR is excluded from the decision", async () => {
    const decision = await computeRelease(
      [{ subject: "docs: typos (#1)" }, { subject: "feat: real change (#2)" }],
      (pr) => Promise.resolve(pr === 1 ? ["release:skip"] : []),
    );
    expect(decision.skip).toBe(false);
    expect(decision.bump).toBe("patch");
    expect(decision.reason).toContain("1 skipped");
  });

  it("a skipped PR does not raise the bump even when labeled minor too", async () => {
    const decision = await computeRelease(
      [{ subject: "docs: typos (#1)" }],
      () => Promise.resolve(["release:skip", "release:minor"]),
    );
    expect(decision.skip).toBe(true);
    expect(decision.reason).toContain("release:skip");
  });

  it("all commits skipped → skip the release entirely", async () => {
    const decision = await computeRelease(
      [{ subject: "docs: typos (#1)" }, { subject: "docs: more typos (#2)" }],
      () => Promise.resolve(["release:skip"]),
    );
    expect(decision.skip).toBe(true);
    expect(decision.bump).toBe("patch");
  });

  it("gh lookup failure falls back to patch with a warning, never fails", async () => {
    const decision = await computeRelease(
      [{ subject: "feat: something (#7)" }],
      () => Promise.reject(new Error("gh: API blip")),
    );
    expect(decision.skip).toBe(false);
    expect(decision.bump).toBe("patch");
    expect(
      decision.warnings.some(
        (w) => w.includes("#7") && w.includes("patch default"),
      ),
    ).toBe(true);
  });

  it("lookup failure on one PR does not mask a minor label on another", async () => {
    const decision = await computeRelease(
      [
        { subject: "feat: labeled minor (#1)" },
        { subject: "fix: lookup dies (#2)" },
      ],
      (pr) =>
        pr === 1
          ? Promise.resolve(["release:minor"])
          : Promise.reject(new Error("gh: rate limited")),
    );
    expect(decision.bump).toBe("minor");
    expect(decision.warnings).toHaveLength(1);
  });

  it("mixed batch: skip + no-PR + minor → minor release", async () => {
    const decision = await computeRelease(
      [
        { subject: "docs: skip me (#1)" },
        { subject: "chore: no PR ref" },
        { subject: "feat: the one that counts (#3)" },
      ],
      (pr) =>
        Promise.resolve(
          pr === 1 ? ["release:skip"] : pr === 3 ? ["release:minor"] : [],
        ),
    );
    expect(decision.skip).toBe(false);
    expect(decision.bump).toBe("minor");
    expect(decision.reason).toContain("2 release commit(s)");
  });
});
