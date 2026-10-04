import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CLI_COMMAND_NAMES } from "../../src/engine/cli-command-names.js";

const ROOT = join(import.meta.dirname, "..", "..");
const DOC = "docs/guide/PERSONAS.md";

/**
 * The persona matrix, checked.
 *
 * A persona table is a promise about what the product does for three different
 * readers, and it is the easiest document in the repository to leave to rot:
 * nothing else in the tree depends on it, so a renamed verb or a dropped flag
 * leaves a confidently-worded page describing a tool that no longer exists.
 *
 * So this parses the table and asserts each row's command against the CLI's own
 * registry, and runs the flags that are safe to run without a repository. The
 * document cannot claim a command the engine does not have.
 */

const doc = readFileSync(join(ROOT, DOC), "utf8");

/** One table row: | persona | `command` | ... | */
function matrixRows(): { persona: string; command: string }[] {
  const rows: { persona: string; command: string }[] = [];
  for (const line of doc.split("\n")) {
    if (!line.startsWith("| **")) continue;
    const cells = line.split("|").map((c) => c.trim());
    // cells[0] is empty before the first pipe.
    const persona = cells[1] ?? "";
    const command = cells[2] ?? "";
    const m = /`([^`]+)`/.exec(command);
    if (m?.[1]) rows.push({ persona, command: m[1] });
  }
  return rows;
}

const rows = matrixRows();

describe("the persona matrix", () => {
  it("names the three personas the product claims to serve", () => {
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const text = rows
      .map((r) => r.persona)
      .join(" ")
      .toLowerCase();
    expect(text).toContain("qa engineer");
    expect(text).toContain("sdet");
    expect(text).toContain("tester");
  });

  it("gives every row a command that starts with the published package", () => {
    // `npx mjolnir-qa@<version> …` — so the row is copy-pasteable and pins the
    // version it was written against. A bare `mjolnir` assumes an install.
    for (const { persona, command } of rows) {
      expect(command, `${persona} has no runnable command`).toMatch(
        /^npx mjolnir-qa@[\d.]+(-[\w.]+)? /,
      );
    }
  });

  it("pins every row to the version this tree actually is", () => {
    // A matrix that names 5.1.0 while the tree is 6.0.0-rc.1 is the same drift
    // the managed-surface stamp gate was written to catch, in a document nothing
    // else checks. Reading the version from package.json is what keeps this
    // table from becoming a second stale surface.
    const { version } = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { version: string };
    for (const { persona, command } of rows) {
      expect(
        command,
        `${persona} pins a version that is not ${version}`,
      ).toContain(`mjolnir-qa@${version}`);
    }
  });

  it("uses only verbs the CLI actually registers", () => {
    for (const { persona, command } of rows) {
      // `npx mjolnir-qa@<v> . --scope changed` names NO verb: the bare `.` is
      // the target path and `scan` is the default. That form is real and the
      // QA engineer's row uses it, so it resolves to `scan` rather than being
      // read as a verb called ".".
      const token = command.split(/\s+/)[2] ?? "";
      const verb = token === "." ? "scan" : token;
      expect(
        CLI_COMMAND_NAMES as readonly string[],
        `${persona} names the verb "${verb}", which the CLI does not register`,
      ).toContain(verb);
    }
  });

  it("states a trust claim AND a remaining gap on every row", () => {
    // The two halves are the point. A matrix of promises with no gaps is
    // marketing; a matrix of gaps with no promises is a complaint.
    const tableLines = doc
      .split("\n")
      .filter((l) => l.startsWith("| **") && l.includes("`npx "));
    expect(tableLines.length).toBe(rows.length);
    for (const line of tableLines) {
      const cells = line.split("|").map((c) => c.trim());
      // 0 empty, 1 persona, 2 command, 3 what, 4 claim, 5 gap, 6 empty
      const claim = cells[4] ?? "";
      const gap = cells[5] ?? "";
      expect(
        claim.length,
        "a row states what they get but no trust claim",
      ).toBeGreaterThan(20);
      expect(
        gap.length,
        "a row states a claim but no remaining gap",
      ).toBeGreaterThan(20);
    }
  });

  it("runs `stats` — the one row whose command is safe with no repository", () => {
    // Not a mock and not a claim about it: an actual run, so a table that
    // promises a working command is checked by running it. `stats` is the
    // right row to execute because it reads only local counters — scanning
    // would need a fixture repository and would assert nothing about the doc.
    const result = spawnSync("npx", ["tsx", "src/cli.ts", "stats"], {
      cwd: ROOT,
      encoding: "utf8",
      shell: true,
    });
    const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    expect(
      out.length,
      "`stats` produced no output, so the persona table promises a command that " +
        "does not run",
    ).toBeGreaterThan(0);
    // Not asserted as 0: `stats` legitimately exits non-zero when no fixes have
    // been recorded on this machine, and asserting 0 would make the test depend
    // on state it does not own. What is asserted is that the command RUNS and
    // says something.
    expect(out).toContain("STATS");
  });
});
