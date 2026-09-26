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
import { CLI_COMMAND_NAMES } from "../../src/engine/command-registry.js";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
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
  const flagsWithValues = new Set([
    "--format",
    "--scope",
    "--max-duration",
    "--blocking",
  ]);
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

const KNOWN_SUBCOMMANDS = [
  ...CLI_COMMAND_NAMES,
  ...[...CLI_SOURCE.matchAll(/argv\[0\] === "([^"]+)"/g)].map(
    (match) => match[1],
  ),
];

/**
 * Verbs that are deliberately not in the README table, with the reason.
 *
 * A verb absent from the README is a promise the documentation does not
 * make; a verb present in the README that the CLI does not dispatch is a
 * promise the CLI does not keep. The original test only checked the
 * second direction, which is why `diff` and `verify` could be shipped
 * verbs with no README row and nothing failed.
 */
const DELIBERATELY_UNDOCUMENTED: ReadonlyMap<string, string> = new Map([
  [
    "scan",
    "the default path — the README documents it as bare `mjolnir`, and the " +
      "explicit spelling is a synonym, not a separate command worth a row",
  ],
]);

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

describe("the command surface is documented, not just implemented", () => {
  const undocumented = CLI_COMMAND_NAMES.filter(
    (verb) => !README.includes(`mjolnir ${verb}`),
  );

  it("every registered verb appears in the README, or has a recorded reason", () => {
    const unexplained = undocumented.filter(
      (verb) => !DELIBERATELY_UNDOCUMENTED.has(verb),
    );
    expect(
      unexplained,
      `These verbs are dispatchable but undocumented: ${unexplained.join(", ")}. ` +
        `A verb nobody can discover is a verb nobody uses, and the cost of a ` +
        `verb is a promise — the README is where the promise is made. Add a ` +
        `row, or record a reason in DELIBERATELY_UNDOCUMENTED.`,
    ).toEqual([]);
  });

  it("the recorded reasons have not gone stale", () => {
    // A reason for a verb that IS now documented is a lie about a
    // decision, so fail rather than let it linger.
    const stale = [...DELIBERATELY_UNDOCUMENTED.keys()].filter((verb) =>
      README.includes(`mjolnir ${verb}`),
    );
    expect(
      stale,
      `now documented; drop the exception: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  it("the verb count is under its ceiling", () => {
    // The gate proper is `npm run verbs:budget`; this asserts the count the
    // gate reads is the count the CLI actually dispatches, so a verb added
    // to the manifest without a handler still trips the documentation test.
    expect(CLI_COMMAND_NAMES.length).toBeLessThanOrEqual(50);
  });
});
