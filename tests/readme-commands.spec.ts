/**
 * README command-table verification (Master-Stabilization-Plan Sprint 4,
 * Task 16).
 *
 * The README's command table is a set of promises: each row implies the
 * command exists and does roughly what its description says. This test
 * extracts every `npx mjolnir-qa...` invocation from the table and
 * asserts the subcommand portion is one `main()` actually dispatches —
 * docs cannot promise a command that does not exist.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const README = readFileSync(join(ROOT, "README.md"), "utf8");
const CLI_SOURCE = readFileSync(join(ROOT, "src", "cli.ts"), "utf8");

/** Extracts the subcommand token (or none, for the bare scan path) from
 * each `npx mjolnir-qa...`/`mjolnir ...` invocation in the
 * README's command table. */
function extractReadmeCommands(markdown: string): string[] {
  // FW-RX-07: `(?:[ \t]+(args)|(?=`))` — the arg capture starts at a
  // non-space token so the space-run and the [^`]* scan can never
  // exchange characters; bare `mjolnir` spans yield an undefined group.
  const re =
    /`(?:npx mjolnir-qa(?:@latest)?|mjolnir)(?:[ \t]+([^\s`][^`]*)|(?=`))/g;
  const commands: string[] = [];
  for (const m of markdown.matchAll(re)) {
    const rest = (m[1] ?? "").trim();
    commands.push(rest);
  }
  return commands;
}

/** First whitespace-delimited token that isn't a flag, a flag's value,
 * or a target path — i.e. the actual subcommand, if any. */
function firstSubcommandToken(rest: string): string | null {
  const tokens = rest.split(/\s+/).filter(Boolean);
  // Flags that consume the following token as their value, not a
  // subcommand — keep in sync with parseArgs in src/cli.ts.
  const flagsWithValues = new Set(["--format", "--scope", "--max-duration"]);
  let skipNext = false;
  for (const t of tokens) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (t.startsWith("-")) {
      if (flagsWithValues.has(t)) skipNext = true;
      continue;
    }
    if (t.startsWith(".") || t.startsWith("/")) continue; // a target path, not a subcommand
    if (t.includes(">")) break; // stop at a shell redirect
    return t;
  }
  return null;
}

// Every string literal `main()` checks argv[0] against, read directly
// from source so this list can't drift from the real dispatch table.
const KNOWN_SUBCOMMANDS = [...CLI_SOURCE.matchAll(/argv\[0\] === "([^"]+)"/g)]
  .map((m) => m[1])
  .filter((s): s is string => Boolean(s));

describe("README command table", () => {
  const commands = extractReadmeCommands(README);

  it("found commands to check (sanity)", () => {
    expect(commands.length).toBeGreaterThan(5);
  });

  it("extracted at least one known dispatch string from cli.ts (sanity)", () => {
    expect(KNOWN_SUBCOMMANDS.length).toBeGreaterThan(5);
  });

  it.each(commands)("`mjolnir %s` is a real, dispatchable command", (rest) => {
    const sub = firstSubcommandToken(rest);
    if (sub === null) {
      // No subcommand token (e.g. bare `--json`, or a target path) —
      // this is the default scan path, which always exists.
      return;
    }
    expect(
      KNOWN_SUBCOMMANDS.includes(sub),
      `README documents "mjolnir ${rest}", but "${sub}" is not ` +
        `a subcommand src/cli.ts's main() dispatches on — the README ` +
        `is promising a command that does not exist.`,
    ).toBe(true);
  });
});
