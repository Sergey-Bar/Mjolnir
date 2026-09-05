/**
 * Agent-handoff plan M4 — `mjolnir install`.
 *
 * Safety contract (plan §17): directory probes detect instruction
 * surfaces (deterministic, offline); all detected surfaces are written;
 * marker-based idempotency; refusal without --force on non-Mjölnir
 * files; --force overwrites ONLY Mjölnir-marked files; --dry-run
 * performs zero writes; content is deterministic and version-pinned
 * (never @latest). No hook generation here — hooks land in M5 after
 * --staged/--blocking exist.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CLI_VERSION } from "../../src/cli.js";
import type { Output } from "../../src/cli.js";
import type { InstallPlanEntry } from "../../src/commands/install-agents.js";
import {
  detectSurfaces,
  executeInstall,
  planInstall,
  runInstallCommand,
} from "../../src/commands/install-agents.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-install-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function capture() {
  let out = "";
  let err = "";
  return {
    io: {
      out: ((s: string) => (out += `${s}\n`)) as Output,
      err: ((s: string) => (err += `${s}\n`)) as Output,
    },
    text: () => out,
    errText: () => err,
  };
}

describe("detectSurfaces", () => {
  it("detects nothing when no surface directories exist", () => {
    expect(detectSurfaces(dir)).toEqual([]);
  });

  it("detects each surface by directory presence", () => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    mkdirSync(join(dir, ".kilo"), { recursive: true });
    mkdirSync(join(dir, ".cursor"), { recursive: true });
    writeFileSync(join(dir, "AGENTS.md"), "repo instructions\n");
    const names = detectSurfaces(dir).map((s) => s.name);
    expect(names).toContain("Claude Code command surface");
    expect(names).toContain("Kilo command surface");
    expect(names).toContain("Cursor rule surface");
    expect(names).toContain("AGENTS.md instruction surface");
  });
});

describe("planInstall + executeInstall", () => {
  it("plans whole-file creates for command surfaces", () => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    const { entries } = planInstall(dir);
    expect(entries).toHaveLength(1);
    const created = entries[0] as InstallPlanEntry;
    if (created.action !== "create") throw new Error("expected create");
    expect(created.surface).toBe("Claude Code command surface");
    expect(created.content).toContain(
      `npx mjolnir-qa@${CLI_VERSION} . --scope changed`,
    );
    // Version-pinned, never @latest.
    expect(created.content).not.toContain("@latest");
  });

  it("AGENTS.md: appends the marker block, preserving existing content", () => {
    writeFileSync(join(dir, "AGENTS.md"), "repo instructions\n");
    const { entries } = planInstall(dir);
    const written = executeInstall(entries);
    expect(written).toBe(1);
    const after = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(after.startsWith("repo instructions\n")).toBe(true);
    expect(after).toContain("mjolnir:managed");
    expect(after).toContain("verification trust loop");
  });

  it("is idempotent: second run is a no-op with no writes", () => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    executeInstall(planInstall(dir).entries);
    const before = readFileSync(
      join(dir, ".claude", "commands", "mjolnir.md"),
      "utf8",
    );
    const { entries } = planInstall(dir);
    expect(entries.every((e) => e.action === "no-op")).toBe(true);
    expect(executeInstall(entries)).toBe(0);
    expect(
      readFileSync(join(dir, ".claude", "commands", "mjolnir.md"), "utf8"),
    ).toBe(before);
  });

  it("refuses (exit 10) to overwrite a non-Mjölnir file, with --force semantics", () => {
    mkdirSync(join(dir, ".claude", "commands"), { recursive: true });
    writeFileSync(
      join(dir, ".claude", "commands", "mjolnir.md"),
      "my custom command\n",
    );
    const { entries } = planInstall(dir);
    const e0 = entries[0] as InstallPlanEntry;
    expect(e0.action).toBe("refuse");
    // Even --force cannot overwrite an arbitrary user-owned file.
    const forced = planInstall(dir, { force: true });
    const f0 = forced.entries[0] as InstallPlanEntry;
    expect(f0.action).toBe("refuse");
    expect(executeInstall(forced.entries)).toBe(0);
    expect(
      readFileSync(join(dir, ".claude", "commands", "mjolnir.md"), "utf8"),
    ).toBe("my custom command\n");
  });

  it("--force overwrites a Mjölnir-marked file that was locally edited", () => {
    mkdirSync(join(dir, ".claude", "commands"), { recursive: true });
    const { entries } = planInstall(dir);
    executeInstall(entries);
    const original = readFileSync(
      join(dir, ".claude", "commands", "mjolnir.md"),
      "utf8",
    );
    // Simulate local edits INSIDE the managed block.
    const file = join(dir, ".claude", "commands", "mjolnir.md");
    const edited = readFileSync(file, "utf8").replace(
      "--scope changed",
      "--scope full",
    );
    writeFileSync(file, edited);
    const refusal = planInstall(dir);
    const r0 = refusal.entries[0] as InstallPlanEntry;
    expect(r0.action).toBe("refuse");
    const forced = planInstall(dir, { force: true });
    const ff0 = forced.entries[0] as InstallPlanEntry;
    expect(ff0.action).toBe("update-in-place");
    executeInstall(forced.entries);
    expect(readFileSync(file, "utf8")).toBe(original);
  });

  it("updates AGENTS.md's managed block in place (idempotent content)", () => {
    writeFileSync(join(dir, "AGENTS.md"), "repo instructions\n");
    executeInstall(planInstall(dir).entries);
    const { entries } = planInstall(dir);
    expect(entries.every((e) => e.action === "no-op")).toBe(true);
  });

  it("planning and execution are deterministic: identical plan twice", () => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    expect(planInstall(dir).entries).toEqual(planInstall(dir).entries);
  });

  it("planInstall performs zero writes", () => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    planInstall(dir);
    expect(existsSync(join(dir, ".claude", "commands", "mjolnir.md"))).toBe(
      false,
    );
  });
});

describe("runInstallCommand — CLI contract", () => {
  it("exit 0 with an honest message when nothing is detected", () => {
    const cap = capture();
    expect(runInstallCommand([], cap.io, dir)).toBe(0);
    expect(cap.text()).toContain("No instruction surfaces detected");
  });

  it("exit 0 + report of every written surface", () => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    const cap = capture();
    expect(runInstallCommand([], cap.io, dir)).toBe(0);
    expect(cap.text()).toContain("Claude Code command surface");
    expect(cap.text()).toContain(CLI_VERSION);
  });

  it("--dry-run prints the plan and writes nothing", () => {
    mkdirSync(join(dir, ".claude"), { recursive: true });
    const cap = capture();
    expect(runInstallCommand(["--dry-run"], cap.io, dir)).toBe(0);
    expect(cap.text()).toContain("dry run");
    expect(existsSync(join(dir, ".claude", "commands", "mjolnir.md"))).toBe(
      false,
    );
  });

  it("refusal → exit 10 with the offending path", () => {
    mkdirSync(join(dir, ".claude", "commands"), { recursive: true });
    writeFileSync(join(dir, ".claude", "commands", "mjolnir.md"), "mine\n");
    const cap = capture();
    expect(runInstallCommand([], cap.io, dir)).toBe(10);
    expect(cap.errText()).toContain("not Mjölnir-managed");
    expect(
      readFileSync(join(dir, ".claude", "commands", "mjolnir.md"), "utf8"),
    ).toBe("mine\n");
  });
});
