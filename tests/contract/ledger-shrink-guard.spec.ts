/**
 * The shrink guard, exercised without a network.
 *
 * `refuseLedgerShrink` is a pure function of (path, next, what) plus the
 * process argv, so it is tested by importing it and pointing it at a temp file.
 * Running `sync-m26-github.mjs` for real would need `gh`, and a test that
 * shells out to the network to prove a ledger is protected is a test that
 * fails for a reason that has nothing to do with the guard.
 *
 * The defect this exists for is real and was committed: the ledger went from
 * 429 rows to one newline, and the only thing that noticed was
 * `gates:disposition-source` refusing to read a zero-row file.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE = join(
  import.meta.dirname,
  "..",
  "..",
  "scripts",
  "sync-m26-github.mjs",
);

function ledger(rows: number): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-shrink-"));
  const path = join(dir, "M26-ISSUE-DISPOSITIONS.jsonl");
  writeFileSync(
    path,
    Array.from({ length: rows }, (_, i) =>
      JSON.stringify({ issue_number: i + 1 }),
    ).join("\n") + "\n",
    "utf8",
  );
  return path;
}

/** Run the guard out of the real module, with argv faked. */
function runGuard(
  path: string,
  next: number,
  allowShrink: boolean,
): {
  code: number;
  output: string;
} {
  const driver = `
    import { readFileSync, existsSync } from "node:fs";
    const source = readFileSync(${JSON.stringify(SOURCE)}, "utf8");
    // Extract the guard and its dependency, then evaluate them together so the
    // test exercises the SHIPPED function rather than a copy of it.
    const start = source.indexOf("function refuseLedgerShrink");
    const end = source.indexOf("\\n}\\n", start) + 3;
    const body = source
      .slice(start, end)
      .replace("const dispositionBody", "const dispositionBody = '';");
    const fn = new Function(
      "existsSync",
      "readFileSync",
      "console",
      "process",
      body + "; return refuseLedgerShrink;",
    )(
      existsSync,
      (p) => readFileSync(p, "utf8"),
      { warn: () => {}, log: () => {} },
      { argv: ${JSON.stringify(allowShrink ? ["node", "sync", "--allow-shrink"] : ["node", "sync"])} },
    );
    try {
      fn(${JSON.stringify(path)}, ${next}, "docs/M26-ISSUE-DISPOSITIONS.jsonl");
      console.log("OK");
    } catch (error) {
      console.log("THREW: " + error.message);
      process.exitCode = 1;
    }
  `;
  try {
    const stdout = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", driver],
      {
        encoding: "utf8",
      },
    );
    return { code: 0, output: stdout };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    return {
      code: err.stdout ? 0 : 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

describe("a network-shaped source cannot delete a committed ledger", () => {
  it("the same size passes", () => {
    const path = ledger(429);
    const run = runGuard(path, 429, false);
    expect(run.output).toContain("OK");
  });

  it("a GROWTH passes", () => {
    const path = ledger(429);
    const run = runGuard(path, 500, false);
    expect(run.output).toContain("OK");
  });

  it("a SHRINK is refused, and names the counts", () => {
    // The exact shape that emptied the real ledger: an authenticated fetch
    // that returns nothing.
    const path = ledger(429);
    const run = runGuard(path, 0, false);
    expect(run.output).toMatch(/THREW/);
    expect(run.output).toContain("429");
    expect(run.output).toContain("must not be able to");
  });

  it("--allow-shrink permits it, so a real reduction is still possible", () => {
    // Otherwise the guard is not a decision, it is a wall, and the first
    // legitimate closure gets the guard deleted rather than overridden.
    const path = ledger(429);
    const run = runGuard(path, 12, true);
    expect(run.output).toContain("OK");
  });

  it("an absent ledger is not a shrink", () => {
    // A fresh repository has no committed ledger to protect, and refusing
    // there would make the script unrunnable on a clean checkout.
    const run = runGuard(
      join(tmpdir(), "definitely-absent-ledger.jsonl"),
      0,
      false,
    );
    expect(run.output).toContain("OK");
  });
});
