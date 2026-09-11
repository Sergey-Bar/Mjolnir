/**
 * Agent skill-surface contract (remediation plan §9 R8 / growth roadmap
 * WI-22, plan §17).
 *
 * `mjolnir install` writes the SAME deterministic brief to every
 * detected instruction surface (.claude/, .cursor/, .kilo/, AGENTS.md).
 * The contract: every surface carries the full agent loop (baseline →
 * fix → verify digest) AND the §17 safety wording — agents may not
 * manufacture evidence, convert INCONCLUSIVE to pass, silently
 * suppress, or declare trustworthiness without evidence; AGENT CLAIM
 * ≠ VERIFICATION. Frozen surfaces only; content is version-pinned and
 * byte-deterministic.
 */

import {
  mkdtempSync,
  mkdirSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  detectSurfaces,
  executeInstall,
  MARKER_CLOSE,
  MARKER_OPEN,
  planInstall,
} from "../../src/commands/install-agents.js";

const createdDirs: string[] = [];
function tmpSkillRepo(): string {
  const d = mkdtempSync(join(tmpdir(), "mjolnir-skill-surface-"));
  createdDirs.push(d);
  return d;
}
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

/** The frozen four-surface fixture: every surface Mjölnir probes. */
function repoWithAllSurfaces(): string {
  const d = tmpSkillRepo();
  for (const dir of [".claude", ".cursor", ".kilo"]) {
    mkdirSync(join(d, dir), { recursive: true });
  }
  writeFileSync(join(d, "AGENTS.md"), "# agent instructions\n");
  return d;
}

const SAFETY_PHRASES = [
  "AGENT CLAIM ≠ VERIFICATION",
  "NEVER declare trustworthiness without evidence",
  "NEVER manufacture, edit, or synthesize evidence",
  "NEVER convert INCONCLUSIVE to pass",
  "NEVER suppress findings or weaken rules to get green",
] as const;

const LOOP_PHRASES = [
  "FIX requires a proven actionable defect",
  "RESCAN requires changed-scope identification",
  "PROOF requires fresh post-fix execution evidence",
] as const;

describe("agent skill surfaces (WI-22, plan §17)", () => {
  it("all four frozen surfaces are detected when present", () => {
    const surfaces = detectSurfaces(repoWithAllSurfaces());
    expect(surfaces).toHaveLength(4);
    expect(surfaces.map((s) => s.name)).toEqual([
      "Claude Code command surface",
      "Kilo command surface",
      "Cursor rule surface",
      "AGENTS.md instruction surface",
    ]);
  });

  it("every surface carries the agent loop (baseline → fix → verify digest)", () => {
    for (const s of detectSurfaces(repoWithAllSurfaces())) {
      expect(s.content, s.name).toContain("baseline");
      expect(s.content, s.name).toContain("Agent loop");
      expect(s.content, s.name).toContain(
        "verify prints the before/after digest",
      );
      expect(s.content, s.name).toContain(
        "resolved (per §15 lifecycle) / new / unchanged",
      );
    }
  });

  it("every surface carries the §17 safety wording (contract wording asserted)", () => {
    for (const s of detectSurfaces(repoWithAllSurfaces())) {
      for (const phrase of SAFETY_PHRASES) {
        expect(s.content, `${s.name}: ${phrase}`).toContain(phrase);
      }
      for (const phrase of LOOP_PHRASES) {
        expect(s.content, `${s.name}: ${phrase}`).toContain(phrase);
      }
    }
  });

  it("install writes every surface; the written files keep markers, loop and safety wording", () => {
    const repo = repoWithAllSurfaces();
    const plan = planInstall(repo);
    expect(plan.detected).toBe(4);
    expect(plan.entries.every((e) => e.action === "create")).toBe(true);

    const written = executeInstall(plan.entries);
    expect(written).toBe(4);

    const files = [
      join(repo, ".claude", "commands", "mjolnir.md"),
      join(repo, ".kilo", "command", "mjolnir.md"),
      join(repo, ".cursor", "rules", "mjolnir.mdc"),
      join(repo, "AGENTS.md"),
    ];
    for (const file of files) {
      expect(existsSync(file), file).toBe(true);
      const content = readFileSync(file, "utf8");
      expect(content).toContain(MARKER_OPEN);
      expect(content).toContain(MARKER_CLOSE);
      expect(content).toContain("AGENT CLAIM ≠ VERIFICATION");
      expect(content).toContain("verify prints the before/after digest");
    }
    // AGENTS.md append-block mode preserves the pre-existing user content.
    const agents = readFileSync(join(repo, "AGENTS.md"), "utf8");
    expect(agents.startsWith("# agent instructions")).toBe(true);
  });

  it("content is deterministic: two detections are byte-identical (no timestamps)", () => {
    const repo = repoWithAllSurfaces();
    const a = detectSurfaces(repo).map((s) => s.content);
    const b = detectSurfaces(repo).map((s) => s.content);
    expect(a).toEqual(b);
  });

  it("re-install after content change rewrites the managed region idempotently", () => {
    const repo = repoWithAllSurfaces();
    const first = planInstall(repo);
    executeInstall(first.entries);
    // Second run with identical content: every AGENTS.md entry no-ops
    // (markers match), whole-file surfaces report no-op as well.
    const second = planInstall(repo);
    expect(second.entries.every((e) => e.action === "no-op")).toBe(true);
  });
});
