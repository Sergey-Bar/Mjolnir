/**
 * Version consistency across surfaces (Test Hardening Plan).
 *
 * The tool's version appears in multiple independent places that have
 * no structural link to each other — package.json, and a literal string
 * inside the SARIF reporter. Nothing keeps them in sync automatically,
 * so nothing catches drift except a test that reads both.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const packageJson = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
);

describe("version string consistency", () => {
  it("SARIF driver.version matches package.json version", () => {
    const sarifSource = readFileSync(
      join(ROOT, "src", "reporter", "sarif.ts"),
      "utf8",
    );
    const match = sarifSource.match(/version:\s*"([^"]+)"/);
    expect(
      match,
      "could not find a literal version string in sarif.ts to check",
    ).not.toBeNull();
    const sarifVersion = match?.[1];
    expect(
      sarifVersion,
      `sarif.ts hardcodes driver.version "${sarifVersion}" but ` +
        `package.json is at "${packageJson.version}" — GitHub Code ` +
        `Scanning and any other SARIF consumer sees a stale tool version ` +
        `on every release until this literal is updated by hand.`,
    ).toBe(packageJson.version);
  });
});
