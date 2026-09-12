/**
 * Repo hygiene guards (Master-Stabilization-Plan.md, Sprint 0).
 *
 * Two concrete failures found by direct source inspection:
 *  - `.gitignore` accidentally ignored CHANGELOG.md (and itself, twice),
 *    so the changelog required by Upgrade-Plan-v3 critical item #3
 *    existed on disk but was never tracked by git.
 *  - `.planning/STATE.md` cites several files as "source plans", but a
 *    fresh clone previously received none of them (see the outer
 *    `.gitignore` finding in Master-Stabilization-Plan.md §1 #4).
 *
 * These tests read the actual `.gitignore` and `git ls-files` output so
 * this class of drift fails CI instead of sitting undetected.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..", "..");

function gitLsFiles(pattern: string): string[] {
  try {
    return execFileSync("git", ["ls-files", pattern], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isGitRepo(): boolean {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], { cwd: ROOT });
    return true;
  } catch {
    return false;
  }
}

describe(".gitignore hygiene", () => {
  const gitignore = readFileSync(join(ROOT, ".gitignore"), "utf8");
  const lines = gitignore
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  it("does not list itself", () => {
    expect(
      lines,
      ".gitignore must never ignore itself — it silently untracks the " +
        "file that governs what git tracks, which is how CHANGELOG.md " +
        "went untracked previously.",
    ).not.toContain(".gitignore");
  });

  it("does not ignore CHANGELOG.md", () => {
    expect(
      lines,
      "CHANGELOG.md is required (Upgrade-Plan-v3 critical item #3) and " +
        "must be trackable, not silently excluded.",
    ).not.toContain("CHANGELOG.md");
  });

  it("has no duplicate entries", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const line of lines) {
      if (seen.has(line)) dupes.push(line);
      seen.add(line);
    }
    expect(
      dupes,
      `duplicate .gitignore entries look like accidental appends: ${dupes.join(", ")}`,
    ).toEqual([]);
  });
});

// Root cleanliness (Beta-to-Stable 1.0 plan, M0.3): sweep-era debugging
// left ~30 stray command logs (cov-ci*.log, gaps*.log, ist*.log, …) and
// probe-*.mts scripts at the repo root — contributor-hostile clutter
// that `git status` hid because *.log was already ignored. The guard is
// non-recursive (the root only): legit logs exist under site/, coverage/
// and .mjolnir/logs/, all already ignored and all subdirectories.
describe("root directory cleanliness", () => {
  const rootEntries = readdirSync(ROOT);
  const strayLogs = rootEntries.filter((name) => name.endsWith(".log"));
  const strayProbes = rootEntries.filter((name) => name.startsWith("probe-"));

  it("has no *.log files at the repo root", () => {
    expect(
      strayLogs,
      "stray root logs are sweep-era debug residue — delete them or " +
        "write them under an ignored subdirectory, never at the root.",
    ).toEqual([]);
  });

  it("has no probe-* scratch scripts at the repo root", () => {
    expect(
      strayProbes,
      "probe-* files are one-off debugging scripts — put them in " +
        "scratch/ (gitignored) or delete them once diagnosed.",
    ).toEqual([]);
  });

  // Product-gap-remediation master plan P1.1 (plan 1788853205786) —
  // documented contract amendment, per policy: the root now carries the
  // distribution surfaces. GitHub Marketplace requires action.yml at the
  // ROOT (a subdirectory action cannot be published); smithery.yaml must
  // sit at the package root for the Smithery registry to resolve the MCP
  // server (see docs/DISTRIBUTION-KIT.md). They are deliberate, they are
  // tracked, and this test keeps them from silently disappearing. A NEW
  // root file itself needs no allowlist edit — it arrives through a PR
  // where it is visible by definition; what must stay pinned is the
  // distribution contract and the absence of untracked debris.
  it("root contract: the distribution surfaces exist, are tracked, and are documented", () => {
    const DISTRIBUTION_ENTRIES = ["action.yml", "smithery.yaml"];
    for (const name of DISTRIBUTION_ENTRIES) {
      expect(
        existsSync(join(ROOT, name)),
        `${name} is missing from the repo root — the P1 distribution ` +
          `contract (docs/DISTRIBUTION-KIT.md) requires it there`,
      ).toBe(true);
      expect(
        gitLsFiles(name).length,
        `${name} exists on disk but git does not track it — a fresh clone ` +
          `would never receive it`,
      ).toBeGreaterThan(0);
    }
  });

  it("root has no untracked debris beyond the known ignored build/scratch dirs", () => {
    const IGNORED_DIRS = new Set([
      ".git",
      ".claude",
      ".husky",
      ".kilo",
      ".mjolnir",
      ".planning",
      ".vitepress",
      ".vscode",
      "node_modules",
      "dist",
      "coverage",
      "scratch",
      "release-assets",
      ".mjolnir",
    ]);
    const untracked = execFileSync(
      "git",
      ["ls-files", "--others", "--exclude-standard"],
      { cwd: ROOT, encoding: "utf8" },
    )
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((f) => !f.includes("/") && !IGNORED_DIRS.has(f));
    expect(
      untracked,
      "untracked files at the repo root — commit them, gitignore them, " +
        "or move them under a scratch directory",
    ).toEqual([]);
  });
});

describe.skipIf(!isGitRepo())("CHANGELOG.md is tracked", () => {
  it("is tracked by git, not just present on disk", () => {
    const tracked = gitLsFiles("CHANGELOG.md");
    expect(
      tracked.length,
      "CHANGELOG.md exists on disk but git does not track it — a fresh " +
        "clone would never receive it.",
    ).toBeGreaterThan(0);
  });

  it("package.json 'files' includes CHANGELOG.md so npm publishes it", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as {
      files?: string[];
    };
    expect(
      pkg.files,
      "package.json 'files' must list CHANGELOG.md so upgraders receive " +
        "it via npm, not just via git.",
    ).toContain("CHANGELOG.md");
  });
});

// .planning/ is machine-local agent-session state (untracked, see
// .gitignore) — present on dev machines, absent on CI checkouts. When
// STATE.md exists locally, its cited source plans must exist too; on CI
// the whole describe block is skipped.
describe("source plans referenced by .planning/STATE.md exist and are tracked", () => {
  const statePath = join(ROOT, ".planning", "STATE.md");
  const stateExists = existsSync(statePath);

  it.skipIf(!stateExists)(
    "STATE.md exists where present (dev machines)",
    () => {
      expect(stateExists).toBe(true);
    },
  );

  // Every plan file STATE.md's "Source plans" section names, resolved
  // relative to this package root (docs/archive/plans/**).
  const referencedPlans = [
    "docs/archive/plans/Product.txt",
    "docs/archive/plans/Product-MVP.txt",
    "docs/archive/plans/Sprint-Plan.txt",
    "docs/archive/plans/Upgrade-Plan-v2.txt",
    "docs/archive/plans/Upgrade-Plan-v3.txt",
  ];

  it.each(referencedPlans)("%s exists on disk", (relPath) => {
    expect(
      existsSync(join(ROOT, relPath)),
      `"${relPath}" (cited by .planning/STATE.md as a source of truth) ` +
        `does not exist at that path relative to the package root.`,
    ).toBe(true);
  });
});

// Smithery registry descriptor (master plan 1789041108156, M0.4): the
// descriptor shipped "MCP tools: scan, explain, diff" while the server
// catalog had grown to seven tools, and its version read 1.0.0 while
// package.json was at 1.0.5 — a stale public claim on a registry
// surface that no other gate covered. The catalog itself is already
// drift-locked (mcp-transport/parity suites); this pins the descriptor
// to both single sources of truth.
describe("smithery.yaml descriptor sync", () => {
  // The descriptor is YAML (its flow mappings carry trailing commas), so
  // parse it with the repo's YAML library, never JSON.parse.
  const smithery = parse(readFileSync(join(ROOT, "smithery.yaml"), "utf8")) as {
    version?: string;
    description?: string;
  };

  it("declares the same version as package.json", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { version?: string };
    expect(
      smithery.version,
      "smithery.yaml 'version' drifted from package.json — the registry " +
        "must never advertise a version the package is not. Update the " +
        "descriptor in the same commit as the version bump.",
    ).toBe(pkg.version);
  });

  it("names every tool in the MCP catalog in its description", async () => {
    const { MCP_TOOLS } = await import("../../src/mcp/server.js");
    const description = smithery.description ?? "";
    const missing = MCP_TOOLS.map((t) => t.name).filter(
      (name) => !description.includes(name),
    );
    expect(
      missing,
      "smithery.yaml 'description' omits MCP tool(s) that the server " +
        "actually serves — a stale public claim on the registry surface. " +
        "Sync the descriptor when the catalog changes.",
    ).toEqual([]);
  });
});

// Supply-chain hygiene (master plan 1789041108156 §6, MR-8.A): SC-3
// (action pinning) and SC-4 (workflow permissions) are enforced by TEST,
// not by review — the review-only version of these gates is how drift
// ships silently. SC-3 also locks the version-comment consistency spot-
// checks to a grep at gate time (SC-5 stays G2).
describe("workflow supply-chain hygiene (SC-3/SC-4)", () => {
  const wfDir = join(ROOT, ".github", "workflows");
  const files = readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f));

  /** Every `uses:` value anywhere in one parsed workflow document. */
  function usesRefs(node: unknown, out: string[] = []): string[] {
    if (Array.isArray(node)) {
      for (const item of node) usesRefs(item, out);
    } else if (node && typeof node === "object") {
      for (const [key, value] of Object.entries(node)) {
        if (key === "uses" && typeof value === "string") out.push(value);
        else usesRefs(value, out);
      }
    }
    return out;
  }

  it("SC-3: every uses: is a local ./ action or a full 40-hex SHA pin", () => {
    expect(
      files.length,
      "no workflow files found — the gate went blind",
    ).toBeGreaterThan(0);
    const violations: string[] = [];
    for (const file of files) {
      const doc = parse(readFileSync(join(wfDir, file), "utf8")) as unknown;
      for (const ref of usesRefs(doc)) {
        const ok = ref.startsWith("./") || /^[^@\s]+@[0-9a-f]{40}$/.test(ref);
        if (!ok) violations.push(`${file}: ${ref}`);
      }
    }
    expect(
      violations,
      "actions must be pinned to a full commit SHA (or be a local ./ " +
        "action) — a mutable tag ref is a supply-chain hole: whoever " +
        "pushes to the upstream repo executes arbitrary code in OUR CI. " +
        "Pin: owner/repo@<40-hex-sha> # vX.Y.Z",
    ).toEqual([]);
  });

  it("SC-4: every workflow declares top-level permissions and none grants write-all", () => {
    const violations: string[] = [];
    for (const file of files) {
      const doc = parse(readFileSync(join(wfDir, file), "utf8")) as {
        permissions?: unknown;
      };
      if (doc.permissions === undefined)
        violations.push(`${file}: no top-level permissions:`);
      if (JSON.stringify(doc).includes("write-all"))
        violations.push(`${file}: grants write-all`);
    }
    expect(
      violations,
      "each workflow must declare a least-privilege top-level " +
        "permissions: block — the GITHUB_TOKEN default is the blast " +
        "radius of a compromised action or a poisoned PR",
    ).toEqual([]);
  });
});

// SC-7 (master plan §6, MR-8.A): npm lifecycle hooks run arbitrary code
// on every consumer's install/prepublish — the set must stay minimal and
// every hook must be justified in docs/PUBLISHING.md. The test fails the
// moment a hook appears without its documented justification (and vice
// versa is caught by review: a documented hook that no longer exists is
// a docs-consistency defect the same suite's npm-run scan also covers).
describe("lifecycle scripts are documented (SC-7)", () => {
  const LIFECYCLE_HOOKS = [
    "preinstall",
    "install",
    "postinstall",
    "prepublish",
    "prepublishOnly",
    "prepack",
    "postpack",
    "prepare",
  ] as const;

  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const hooks = LIFECYCLE_HOOKS.filter((h) => pkg.scripts?.[h] !== undefined);

  it("every lifecycle hook in package.json is justified in docs/PUBLISHING.md", () => {
    const publishing = readFileSync(
      join(ROOT, "docs", "PUBLISHING.md"),
      "utf8",
    );
    const undocumented = hooks.filter(
      (h) => !new RegExp(`\\b${h}\\b`).test(publishing),
    );
    expect(
      undocumented,
      "a lifecycle hook runs on consumers' machines without a written " +
        "justification — document it in docs/PUBLISHING.md 'Lifecycle " +
        "scripts' (what it runs, why it must exist, who it runs for) or " +
        "remove the hook",
    ).toEqual([]);
  });
});
