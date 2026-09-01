/**
 * README truthfulness (Test Hardening Plan, P2).
 *
 * The README is the actual product page — every code block in it is an
 * implicit promise (Legendary-Roadmap's own framing: "README Is the
 * Product"). Nothing before this verified those promises stay true as
 * the CLI evolves. Two checks, both parsing README.md directly at test
 * time so this can't itself drift from what the file actually says:
 *
 *  1. every `QA-*` rule ID mentioned in the README's rule tables is
 *     actually registered — catches exactly the kind of drift the plan-
 *     file audit found in the planning docs, but for user-facing docs.
 *  2. every `npx mjolnir-qa ...` command shown in the README actually
 *     runs against a small fixture repo without hitting a usage error
 *     (exit 10) or crashing (exit 20) — a lightweight doctest, not full
 *     output matching.
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { main } from "../src/cli.js";
import { RULES } from "../src/rules/index.js";

const README = readFileSync(
  join(import.meta.dirname, "..", "README.md"),
  "utf8",
);

describe("README rule-ID claims match the registry", () => {
  const mentioned = [...new Set(README.match(/QA-[A-Z]+-\d+/g) ?? [])];
  const registered = new Set(RULES.map((r) => r.id));

  it("found at least one rule ID in the README (sanity check on the regex itself)", () => {
    expect(mentioned.length).toBeGreaterThan(0);
  });

  for (const id of mentioned) {
    it(`${id} (mentioned in README) is registered in src/rules/index.ts`, () => {
      expect(
        registered.has(id),
        `README documents "${id}" but it is not in the RULES array — ` +
          `either it was removed/renamed without updating the README, ` +
          `or it was never actually wired up.`,
      ).toBe(true);
    });
  }
});

let dir: string;
let origCwd: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-readme-doctest-"));
  mkdirSync(join(dir, "e2e"), { recursive: true });
  writeFileSync(
    join(dir, "e2e", "checkout.spec.ts"),
    `import { test, expect } from '@playwright/test';\n` +
      `test.only('checkout', async ({ page }) => {\n` +
      `  await page.waitForTimeout(3000);\n` +
      `  expect(true).toBe(true);\n` +
      `});\n`,
  );
  origCwd = process.cwd();
  process.chdir(dir);
});

afterEach(() => {
  process.chdir(origCwd);
  rmSync(dir, { recursive: true, force: true });
});

function extractReadmeCommands(): string[] {
  const lines = README.split("\n");
  const commands: string[] = [];
  for (const line of lines) {
    // Only match table-cell commands: `mjolnir ...` or `npx mjolnir-qa ...`
    // wrapped in backticks inside a markdown table row (starts with |).
    const cellMatch =
      /\|\s*`(?:npx mjolnir-qa(?:@latest)?|mjolnir)\s+([^`]*)`/.exec(line);
    if (!cellMatch) continue;
    let rest = (cellMatch[1] ?? "").trim();
    // Strip shell redirection — that's a shell concern, not a CLI-arg one.
    rest = rest.replace(/\s*>.*$/, "").trim();
    // Skip commands with placeholder args like <RULE-ID>, <dir>
    if (rest.includes("<")) continue;
    if (rest) commands.push(rest);
  }
  return [...new Set(commands)];
}

describe("every `mjolnir` command in the README actually runs", () => {
  const commands = extractReadmeCommands();

  it("found at least one command in the README (sanity check on parsing)", () => {
    expect(commands.length).toBeGreaterThan(0);
  });

  for (const cmdline of commands) {
    it(`"mjolnir ${cmdline}" does not hit a usage error or crash`, async () => {
      const argv = cmdline.split(/\s+/).filter(Boolean);
      // `./test-results/` doesn't exist in the fixture — that's fine,
      // those commands document their own "no report found" exit (2).
      // Since the Phase 0.5 async parse stage main() dispatches to async
      // handlers; a crash surfaces as a rejected promise, which the
      // await propagates.
      const code = await main(argv);
      expect(
        code,
        `"mjolnir ${cmdline}" returned exit 10 (usage error) — the ` +
          `README shows an example that mjolnir's own arg parser rejects.`,
      ).not.toBe(10);
      expect(
        code,
        `"mjolnir ${cmdline}" returned exit 20 (internal crash).`,
      ).not.toBe(20);
    });
  }
});
