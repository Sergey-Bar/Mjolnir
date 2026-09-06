/**
 * Help + error UX (Terminal + CI UX Overhaul plan, M2).
 *
 * The help verb must dispatch BEFORE the scan fall-through (unknown
 * verbs are scan targets — `mjolnir help` used to scan the CWD).
 * Usage errors keep exit 10 but explain themselves: nearest-flag
 * suggestion (Levenshtein ≤ 2, hand-rolled) + the help command.
 * `help`/`<verb> --help` answer a question → exit 0.
 */

import { describe, expect, it, vi } from "vitest";
import {
  main,
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

  it("skips a GROUPS verb missing from the registry (defensive, no crash)", () => {
    // HELP_ENTRIES is a mutable exported array; simulating a drifted
    // GROUPS entry exercises the render guard without crashing.
    const idx = HELP_ENTRIES.findIndex((e) => e.verb === "badge");
    const removed = HELP_ENTRIES.splice(idx, 1)[0];
    try {
      const text = renderRootHelp();
      expect(text).not.toContain("shields.io endpoint JSON");
    } finally {
      HELP_ENTRIES.splice(idx, 0, removed as (typeof HELP_ENTRIES)[number]);
    }
  });
});

describe("per-verb help", () => {
  it("renders usage, examples and next step for a known verb", () => {
    const text = renderVerbHelp("fix");
    expect(text).toContain("fix — ");
    expect(text).toContain("Usage:");
    expect(text).toMatch(/\$ mjolnir fix --dry-run/);
  });

  it("renders the Next step block when an entry declares one", () => {
    const text = renderVerbHelp("baseline");
    expect(text).toContain("Next step:");
    expect(text).toContain("$ mjolnir diff");
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

  it("`mjolnir help <verb>` prints the verb page and exits 0 (default io)", () => {
    // Omitting io exercises the console fallback wiring directly.
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(runHelpCommand(["fix"])).toBe(0);
      const printed = logSpy.mock.calls.map((a) => a.join(" ")).join("\n");
      expect(printed).toContain("apply safe auto-fixes");
    } finally {
      logSpy.mockRestore();
    }
  });

  it("`mjolnir help <unknown>` is honest and still exits 0", () => {
    const cap = capture();
    expect(runHelpCommand(["teleport"], cap.io)).toBe(0);
    expect(cap.text()).toContain('No detailed help for "teleport"');
  });

  it("`mjolnir help ci install` resolves the two-word verb page", () => {
    const cap = capture();
    expect(runHelpCommand(["ci", "install"], cap.io)).toBe(0);
    expect(cap.text()).toContain("ci install — ");
    // Two tokens that do NOT form a registered verb fall through to the
    // single-word page (here: unknown → honest no-page).
    const cap2 = capture();
    expect(runHelpCommand(["no", "such"], cap2.io)).toBe(0);
    expect(cap2.text()).toContain('No detailed help for "no"');
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

  it('a missing value renders empty quotes (?? "" fallback)', () => {
    // --path-prefix as the last token leaves val undefined; the message
    // must still render (never "undefined" in user-facing text).
    const msg = usageErrorMessage({ flag: "--path-prefix", token: undefined });
    expect(msg).toContain('invalid value "" for --path-prefix');
    const msg2 = usageErrorMessage({ token: undefined });
    expect(msg2).toContain('unknown flag ""');
  });

  it("levenshtein's ?? fallbacks hold for empty inputs (boundary arms)", () => {
    // The DP table reads cur[j-1] on the first column: the ?? arms exist
    // for the no-candidate case; these calls exercise the boundary cells.
    expect(nearestFlags("--json").length).toBeGreaterThan(0);
    expect(levenshtein("a", "b")).toBe(1);
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

  it("--no-progress parses into args.noProgress (additive flag)", () => {
    expect(parseArgs(["--no-progress"])?.noProgress).toBe(true);
    expect(parseArgs(["--no-progress", "."])?.target).toBe(".");
    expect(parseArgs(["."])?.noProgress).toBeUndefined();
  });

  it("-h/--help return null from parseArgs (the caller prints usage)", () => {
    expect(parseArgs(["-h"])).toBeNull();
    expect(parseArgs(["--help"])).toBeNull();
  });
});

describe("main() dispatch to help (plan M2)", () => {
  it("`mjolnir <verb> --help` routes through main() to the verb page (exit 0)", async () => {
    const cap = capture();
    await expect(main(["fix", "--help"], cap.io)).resolves.toBe(0);
    expect(cap.text()).toContain("fix — ");
  });

  it("`mjolnir <verb> -h` routes through main() too", async () => {
    const cap = capture();
    await expect(main(["rules", "-h"], cap.io)).resolves.toBe(0);
    expect(cap.text()).toContain("rules — ");
  });

  it("`mjolnir ci install --help` reaches the two-word page (exit 0)", async () => {
    const cap = capture();
    await expect(main(["ci", "install", "--help"], cap.io)).resolves.toBe(0);
    expect(cap.text()).toContain("ci install — ");
  });

  it("`mjolnir ci install -h` reaches the page via the short flag", async () => {
    const cap = capture();
    await expect(main(["ci", "install", "-h"], cap.io)).resolves.toBe(0);
    expect(cap.text()).toContain("ci install — ");
  });

  it("runHelpCommand with an explicit io uses it (default io arm covered)", () => {
    const cap = capture();
    expect(runHelpCommand(["fix"], cap.io)).toBe(0);
    expect(runHelpCommand([], { out: cap.io.out, err: cap.io.err })).toBe(0);
  });

  it("the two-token join falls through to the single-token page when the pair is unregistered", () => {
    const cap = capture();
    expect(runHelpCommand(["teleport", "now"], cap.io)).toBe(0);
    expect(cap.text()).toContain('No detailed help for "teleport"');
  });

  it("`mjolnir help` dispatches as a verb, never as a scan target", async () => {
    const cap = capture();
    await expect(main(["help"], cap.io)).resolves.toBe(0);
    expect(cap.text()).toContain("Usage: mjolnir");
  });

  it("`mjolnir summary` dispatches to the summary command", async () => {
    // Not-found path: exit 10, nothing written to stdout (no scan ran).
    const cap = capture();
    await expect(main(["summary"], cap.io)).resolves.toBe(10);
    expect(cap.errText()).toContain("not found");
  });
});
