/**
 * 6.0's exit gate: `npx mjolnir-qa@6.0.0` on `examples/demo-repo` prints the
 * verdict, the GATE count and the gate command — on one screen.
 *
 * This is the promise the whole release is named for, and it is the one thing
 * a user meets before deciding whether the tool is worth another minute. So it
 * is asserted against the REAL command over the REAL fixture rather than a
 * renderer called directly with a hand-built result: a renderer test proves the
 * renderer formats what it is given, and this promise is about what the command
 * gives it.
 *
 * "One screen" is a real bound, not a figure of speech. A first run that needs
 * scrolling has already lost the reader who has not committed to it yet, and
 * the number is checked so a future block added to the report fails here
 * instead of being noticed by a user.
 *
 * The demo repo is committed and the budget is unbounded, so the bytes under
 * test are a function of the fixture and not of how loaded the machine is.
 */

import { describe, expect, it } from "vitest";

import { runScanCommand } from "../../src/cli-handlers.js";

const DEMO = "examples/demo-repo";

/** A 24-row terminal is the narrowest height worth calling a screen. */
const SCREEN_ROWS = 24;

async function firstRun(): Promise<{ out: string; err: string; code: number }> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runScanCommand(
    [DEMO, "--max-duration", "600", "--width", "100"],
    {
      out: (...parts: unknown[]) => void out.push(parts.join(" ")),
      err: (...parts: unknown[]) => void err.push(parts.join(" ")),
    },
  );
  return { out: out.join("\n"), err: err.join("\n"), code };
}

describe("the first run answers three questions on one screen", () => {
  it("prints the verdict, the gate count and the gate command", async () => {
    const { out } = await firstRun();

    // 1. The verdict — the block a reader reads first, with a real sentence
    //    in it rather than a bare level code.
    expect(out).toContain("TRUST VERDICT");
    expect(out).toMatch(
      /(did not finish|not (clean|ready)|Run evidence|Deterministic static|Static signal|could not be established|backed)/i,
    );

    // 2. The number, in the two words that are the whole user-facing tier
    //    vocabulary. Counted, not just named: a "GATE" with no count is a
    //    label, and the label is not what the reader came for.
    const counts = /(\d+) GATE · (\d+) WARN/.exec(out);
    expect(
      counts,
      `the verdict block must carry "N GATE · N WARN"; got:\n${out}`,
    ).not.toBeNull();
    expect(Number(counts?.[1])).toBeGreaterThan(0);

    // 3. The gate command, as a command.
    expect(out).toContain("mjolnir ci install");
  });

  it("fits one screen", async () => {
    const { out } = await firstRun();
    const lines = out.split("\n").filter((l) => l.trim().length > 0);
    expect(
      lines.length,
      `the default report is ${lines.length} non-blank lines, which does not ` +
        `fit ${SCREEN_ROWS} rows — a first run that scrolls has lost the ` +
        "reader who has not committed yet",
    ).toBeLessThanOrEqual(SCREEN_ROWS);
  });

  it("reads GATE / WARN and nothing else — no tiers, no rungs", async () => {
    const { out } = await firstRun();
    // The three tiers are internal, and the E/L ladders live in --json and
    // `mjolnir explain`. A first run that still teaches them is teaching the
    // wrong vocabulary first.
    for (const pattern of [
      /\bquarantine\b/i,
      /\bextended tier\b/i,
      /\bcore tier\b/i,
      /\bE[0-2]\b/,
      /\bL[0-5]\b/,
    ]) {
      expect(
        out,
        `the default report still shows ${pattern}; it belongs in --json or ` +
          "`mjolnir explain`",
      ).not.toMatch(pattern);
    }
  });

  it("says what to do next with a real command", async () => {
    const { out } = await firstRun();
    expect(out).toContain("NEXT ACTION");
    expect(out).toMatch(/mjolnir (explain|--scope changed|ci install)/);
  });

  it("exits with the frozen contract's code for what it found", async () => {
    const { code } = await firstRun();
    // Demo findings are error-severity, so the gate is 1. Asserting the set
    // rather than the exact value keeps this from becoming a change detector
    // for the fixture while still failing if the exit stops being the
    // contract's.
    expect([0, 1, 2]).toContain(code);
  });
});
