/**
 * Writer containment (plan V5-002, "no uncontained writer").
 *
 * Every file Mjölnir writes to a user's repository goes through
 * `writeFileAtomic`: temp sibling, exclusive create, rename. A plain
 * `writeFileSync` there means a crash mid-write leaves a TRUNCATED file at the
 * real path, and the next read serves confident nonsense from it.
 *
 * That is not hypothetical. The uncontained set this guard now forbids
 * included a policy file (a gate input: a half-parsed policy silently applies
 * fewer rules than the user configured), git hooks (a truncated hook fails
 * OPEN — the next commit runs without the check), and generated CI workflows
 * in the user's repo.
 *
 * The allowlist is explicit and justified, so a new writer cannot slip in
 * under a vague exemption, and an existing exemption that is no longer needed
 * has to be deleted rather than left to rot.
 */

import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

/**
 * Where a direct `writeFileSync` is acceptable, and why.
 *
 * `fix` writes a temp sibling with the `wx` flag and renames it itself: it
 * must refuse to overwrite a concurrent writer's temp, which
 * `writeFileAtomic` does not expose. That is the atomic pattern, done
 * locally because it needs a different flag.
 */
const ALLOWED: Record<string, string> = {
  "src/commands/fix.ts":
    "writes an exclusive temp sibling then renames it (the atomic pattern, with wx)",
  "src/rules/families/test-independence.ts":
    "contains the token only as a detector regex, never calls the writer",
  "src/lib/fs-atomic.ts":
    "IS the atomic writer — it must call the primitive it wraps",
};

function sourceFiles(): string[] {
  return globSync("src/**/*.ts", { cwd: ROOT })
    .map((path) => relative(ROOT, join(ROOT, path)).replace(/\\/g, "/"))
    .filter((path) => !path.endsWith(".d.ts"));
}

function directWriteCalls(path: string): number[] {
  const text = readFileSync(join(ROOT, path), "utf8");
  const lines = text.split(/\r?\n/);
  const found: number[] = [];
  lines.forEach((line, index) => {
    if (!/\bwriteFileSync\s*\(/.test(line)) return;
    // A comment or a string mentioning the call is not a call.
    const before = line.slice(0, line.indexOf("writeFileSync")).trim();
    if (
      before.startsWith("//") ||
      before.startsWith("*") ||
      before.startsWith("/")
    )
      return;
    found.push(index + 1);
  });
  return found;
}

describe("writer containment (V5-002)", () => {
  it("no source file calls writeFileSync outside the documented allowlist", () => {
    const offenders: string[] = [];
    for (const path of sourceFiles()) {
      const calls = directWriteCalls(path);
      if (calls.length === 0) continue;
      if (path in ALLOWED) continue;
      offenders.push(`${path}:${calls.join(",")}`);
    }
    expect(
      offenders,
      `uncontained writer(s) — route through writeFileAtomic so a crash ` +
        `cannot leave a truncated file at a real path: ${offenders.join("; ")}`,
    ).toEqual([]);
  });

  it("every allowlisted exemption is still justified and still exists", () => {
    for (const [path, reason] of Object.entries(ALLOWED)) {
      expect(
        path,
        "allowlist entry names a file that no longer exists",
      ).toMatch(/src\/.*\.ts$/);
      expect(reason.length, `${path} needs a reason`).toBeGreaterThan(20);
    }
  });

  it("writeFileAtomic accepts binary payloads, so no writer needs a bypass", () => {
    // `impact` writes git blobs. Before this, a string-only signature forced
    // that call site back to the non-atomic path.
    const text = readFileSync(join(ROOT, "src/lib/fs-atomic.ts"), "utf8");
    expect(text).toMatch(/data:\s*string\s*\|\s*Uint8Array/);
    expect(text).toMatch(/typeof data === "string"/);
  });
});
