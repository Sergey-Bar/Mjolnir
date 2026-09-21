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

const ROOT = join(import.meta.dirname, "..", "..");
const packageJson = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
) as { version: string };

describe("version string consistency", () => {
  it("SARIF driver.version uses ENGINE_VERSION (no hardcoded literal)", () => {
    const sarifSource = readFileSync(
      join(ROOT, "src", "reporter", "sarif.ts"),
      "utf8",
    );
    // Verify sarif.ts imports ENGINE_VERSION and uses it (not a hardcoded string)
    expect(sarifSource).toContain(
      'import { ENGINE_VERSION } from "../engine/version.js"',
    );
    expect(sarifSource).toContain("version: ENGINE_VERSION");
    // Verify no hardcoded version literal remains
    const hardcodedMatch = sarifSource.match(/version:\s*"\d+\.\d+\.\d+"/);
    expect(
      hardcodedMatch,
      "sarif.ts should not hardcode a version string — use ENGINE_VERSION instead",
    ).toBeNull();
  });

  it("src/engine/version.ts ENGINE_VERSION matches package.json version (R4c: the literal moved from cli.ts)", () => {
    const source = readFileSync(
      join(ROOT, "src", "engine", "version.ts"),
      "utf8",
    );
    const match = source.match(/export const ENGINE_VERSION = "([^"]+)";/);
    expect(
      match,
      "could not find ENGINE_VERSION in engine/version.ts to check",
    ).not.toBeNull();
    expect(
      match?.[1],
      `engine/version.ts hardcodes ENGINE_VERSION "${match?.[1]}" but package.json is at ` +
        `"${packageJson.version}" — \`mjolnir --version\` would report a ` +
        `stale version to every user until this literal is updated. ` +
        `Run \`node scripts/sync-sarif-version.cjs\`.`,
    ).toBe(packageJson.version);
  });
});
