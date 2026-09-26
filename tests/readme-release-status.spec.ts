import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { syncTranslation } from "../scripts/readme-release-status.mjs";

const root = join(import.meta.dirname, "..");
const source = readFileSync(join(root, "README.md"), "utf8");
const translation = readFileSync(join(root, "README.de.md"), "utf8");

describe("README release status synchronization", () => {
  it("ports the canonical release section and command rows", () => {
    const synced = syncTranslation(translation, source, "2026-09-25");
    expect(synced).toContain("## Release status (English canonical)");
    expect(synced).toContain("Machine-assisted canonical text");
    expect(synced).toContain("| `mjolnir release-report`");
    expect(synced).toContain("Source hash: `");
    expect(synced).toContain("Last synced: 2026-09-25");
  });

  it("exposes the remaining structural translation gap in strict mode", () => {
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "check-readme-translations.mjs"), "--strict"],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("structurally incomplete");
  });

  it("is idempotent", () => {
    const once = syncTranslation(translation, source, "2026-09-25");
    expect(syncTranslation(once, source, "2026-09-25")).toBe(once);
  });
});
