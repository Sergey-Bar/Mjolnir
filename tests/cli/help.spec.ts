/**
 * Help + error UX (Terminal + CI UX Overhaul plan, M2).
 *
 * The help verb must dispatch BEFORE the scan fall-through (unknown
 * verbs are scan targets — `mjolnir help` used to scan the CWD).
 * Usage errors keep exit 10 but explain themselves: nearest-flag
 * suggestion (Levenshtein ≤ 2, hand-rolled) + the help command.
 * `help`/`<verb> --help` answer a question → exit 0.
 */

import { describe, expect, it } from "vitest";
import {
  runHelpCommand,
  levenshtein,
  nearestFlags,
  parseArgs,
  usageErrorMessage,
  type Output,
} from "../../src/cli.js";
import {
  EXIT_CODE_TABLE,
  HELP_ENTRIES,
  hasVerbHelp,
  renderRootHelp,
  renderVerbHelp,
} from "../../src/commands/help.js";

function capture() {
  let out = "";
  let err = "";
  return {
    io: {
      out: ((s: string) => (out += `${s}\n`)) as Output,
      err: ((...parts: string[]) => (err += `${parts.join(" ")}\n`)) as Output,
    },
    text: () => out,
    errText: () => err,
  };
}

describe("root help", () => {
  it("groups every registered verb under its section", () => {
    const text = renderRootHelp();
    for (const group of [
      "Scan",
      "CI & PRs",
      "Forensics",
      "Maintenance",
      "Meta",
    ]) {
      expect(text).toContain(group);
    }
    for (const e of HELP_ENTRIES) {
      expect(text).toContain(e.verb);
      expect(text).toContain(e.summary);
    }
  });

  it("carries copy-pasteable examples, the exit-code table and the docs link", () => {
    const text = renderRootHelp();
    expect(text).toMatch(/\$ mjolnir --scope changed/);
    expect(text).toMatch(/\$ mjolnir ci install/);
    expect(text).toMatch(/\$ mjolnir forensics test-results/);
    for (const [code] of EXIT_CODE_TABLE) {
      expect(text).toContain(`  ${code} `);
    }
    expect(text).toContain("https://github.com/Sergey-Bar/Mjolnir");
    expect(text).toContain("mjolnir help <verb>");
  });

  it("shows the frozen exit-code line verbatim", () => {
    expect(renderRootHelp()).toContain("Exit codes: 0 · 1 · 2 · 10 · 20");
  });
});

describe("per-verb help", () => {
  it("renders usage, examples and next step for a known verb", () => {
    const text = renderVerbHelp("fix");
    expect(text).toContain("fix — ");
    expect(text).toContain("Usage:");
    expect(text).toMatch(/\$ mjolnir fix --dry-run/);
  });

  it("never fabricates a page for an unknown verb", () => {
    const text = renderVerbHelp("teleport");
    expect(text).toContain('No detailed help for "teleport"');
    expect(text).toContain("$ mjolnir --help");
  });

  it("hasVerbHelp is exact-match only", () => {
    expect(hasVerbHelp("fix")).toBe(true);
    expect(hasVerbHelp("fixit")).toBe(false);
    expect(hasVerbHelp("fix --dry-run")).toBe(false);
  });

  it("every registered entry has usage + at least one example", () => {
    for (const e of HELP_ENTRIES) {
      expect(e.usage.startsWith("mjolnir "), e.verb).toBe(true);
      expect(e.examples.length, e.verb).toBeGreaterThan(0);
    }
  });
});

describe("help dispatch", () => {
  it("`mjolnir help` prints the overview and exits 0", () => {
    const cap = capture();
    expect(runHelpCommand([], cap.io)).toBe(0);
    expect(cap.text()).toContain("Usage: mjolnir");
  });

  it("`mjolnir help <verb>` prints the verb page and exits 0", () => {
    const cap = capture();
    expect(runHelpCommand(["fix"], cap.io)).toBe(0);
    expect(cap.text()).toContain("apply safe auto-fixes");
  });

  it("`mjolnir help <unknown>` is honest and still exits 0", () => {
    const cap = capture();
    expect(runHelpCommand(["teleport"], cap.io)).toBe(0);
    expect(cap.text()).toContain('No detailed help for "teleport"');
  });

  it("`mjolnir <verb> --help` routes to the verb page before the handler", () => {
    const cap = capture();
    // `fix --help` would otherwise scan the CWD (exit 1 path); help
    // intercepts it with a page and exits 0.
    const code = runHelpCommand(["fix", "--help"], cap.io);
    expect(code).toBe(0);
    expect(cap.text()).toContain("fix — ");
  });
});

describe("levenshtein (hand-rolled, no deps)", () => {
  it("matches the textbook definition", () => {
    expect(levenshtein("", "")).toBe(0);
    expect(levenshtein("a", "")).toBe(1);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("--scope", "--scope")).toBe(0);
    expect(levenshtein("--tone", "--tore")).toBe(1);
  });

  it("is symmetric", () => {
    expect(levenshtein("abcdef", "azced")).toBe(levenshtein("azced", "abcdef"));
  });
});

describe("nearestFlags suggestions", () => {
  it("suggests the right flag for a near miss", () => {
    const s = nearestFlags("--jso");
    expect(s).toContain("--json");
  });

  it("suggests for typos within distance 2", () => {
    expect(nearestFlags("--scope")).toContain("--scope");
    expect(nearestFlags("--verbosee")).toContain("--verbose");
  });

  it("returns nothing for a token unlike any flag", () => {
    expect(nearestFlags("--zzzzzzzz")).toEqual([]);
  });

  it("caps the suggestion list", () => {
    expect(nearestFlags("--json", 1)).toHaveLength(1);
  });
});

describe("friendly usage errors", () => {
  it("unknown flag names itself, suggests neighbors, points at help", () => {
    const msg = usageErrorMessage({ token: "--jso" });
    expect(msg).toContain('unknown flag "--jso"');
    expect(msg).toContain("Did you mean: --json");
    expect(msg).toContain("Run mjolnir --help");
  });

  it("a rejected value names the flag it belongs to", () => {
    const msg = usageErrorMessage({ flag: "--tone", token: "loud" });
    expect(msg).toContain('invalid value "loud" for --tone');
    expect(msg).toContain("Run mjolnir --help");
  });

  it("parseArgs still returns null for every usage error (legacy contract)", () => {
    expect(parseArgs(["--nope"])).toBeNull();
    expect(parseArgs(["--tone", "loud"])).toBeNull();
    expect(parseArgs(["--format", "xml"])).toBeNull();
    expect(parseArgs(["-h"])).toBeNull();
    expect(parseArgs(["--help"])).toBeNull();
  });

  it("parseArgs reports the offending token through the optional hook", () => {
    const seen: Array<{
      token?: string | undefined;
      flag?: string | undefined;
    }> = [];
    const args = parseArgs(["--nope"], (d) => seen.push(d));
    expect(args).toBeNull();
    expect(seen).toEqual([{ token: "--nope" }]);
    const seen2: Array<{
      token?: string | undefined;
      flag?: string | undefined;
    }> = [];
    expect(parseArgs(["--tone", "loud"], (d) => seen2.push(d))).toBeNull();
    expect(seen2).toEqual([{ flag: "--tone", token: "loud" }]);
  });

  it("parseArgs without the hook reports nothing (stdout purity)", () => {
    expect(parseArgs(["--nope"])).toBeNull();
  });
});
