/**
 * Pack-audit gate negative + positive proof (SC-6, master plan §6,
 * MR-8.B): the audit must be proven able to FIRE on every forbidden
 * shape (forbidden entry, sourcemap, secret material, missing product)
 * and able to stay silent on the exact shape the release actually
 * ships. A gate that only ever ran green is not evidence.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..", "..");
const SCRIPT = join(ROOT, "scripts", "pack-audit.mjs");

/** Build a synthetic tarball with `package/<rel>` entries. */
function makeTar(entries: Record<string, string>): {
  dir: string;
  tgz: string;
} {
  const dir = mkdtempSync(join(tmpdir(), "pack-audit-"));
  const pkg = join(dir, "package");
  mkdirSync(pkg, { recursive: true });
  for (const [rel, content] of Object.entries(entries)) {
    const file = join(pkg, rel);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, content);
  }
  const tgz = join(dir, "test.tgz");
  execFileSync("tar", ["-czf", tgz, "-C", dir, "package"]);
  return { dir, tgz };
}

const PKG = JSON.stringify({ name: "mjolnir-qa", version: "0.0.0-test" });
const VALID = {
  "package.json": PKG,
  "dist/cli.mjs": "export {};",
  "dist/mcp/stdio.mjs": "export {};",
};

function run(tgz: string): { code: number; stderr: string } {
  try {
    execFileSync(process.execPath, [SCRIPT, tgz], { stdio: "pipe" });
    return { code: 0, stderr: "" };
  } catch (err) {
    const e = err as { status?: number; stderr?: Buffer };
    return { code: e.status ?? 1, stderr: e.stderr?.toString() ?? "" };
  }
}

function withTar(entries: Record<string, string>, fn: (tgz: string) => void) {
  const { dir, tgz } = makeTar(entries);
  try {
    fn(tgz);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("pack-audit (SC-6)", () => {
  it("the shippable shape passes", () => {
    withTar({ ...VALID, "README.md": "x", "README.he.md": "x" }, (tgz) => {
      expect(run(tgz).code).toBe(0);
    });
  });

  it("a forbidden directory entry FIRES", () => {
    withTar({ ...VALID, "tests/foo.spec.ts": "x" }, (tgz) => {
      const r = run(tgz);
      expect(r.code).toBe(1);
      expect(r.stderr).toContain("forbidden entry");
    });
  });

  it("a sourcemap FIRES", () => {
    withTar({ ...VALID, "dist/cli.mjs.map": "{}" }, (tgz) => {
      const r = run(tgz);
      expect(r.code).toBe(1);
      expect(r.stderr).toContain("forbidden entry");
    });
  });

  it("machine-local agent dirs FIRES", () => {
    withTar({ ...VALID, ".claude/commands/mjolnir.md": "x" }, (tgz) => {
      expect(run(tgz).code).toBe(1);
    });
  });

  it("secret material in a shipped file FIRES", () => {
    withTar(
      {
        ...VALID,
        "dist/cli.mjs": "const k = '-----BEGIN RSA PRIVATE KEY-----';",
      },
      (tgz) => {
        const r = run(tgz);
        expect(r.code).toBe(1);
        expect(r.stderr).toContain("local-path/secret");
      },
    );
  });

  it("a local absolute path in a shipped file FIRES", () => {
    withTar(
      { ...VALID, "dist/cli.mjs": 'const p = "C:\\\\Users\\\\dev\\\\repo";' },
      (tgz) => {
        expect(run(tgz).code).toBe(1);
      },
    );
  });

  it("a tarball without the product FIRES", () => {
    withTar({ "package.json": PKG, "README.md": "x" }, (tgz) => {
      const r = run(tgz);
      expect(r.code).toBe(1);
      expect(r.stderr).toContain("required entry missing");
    });
  });

  it("an entry outside the whitelisted intent FIRES (extra doc)", () => {
    withTar({ ...VALID, "EXTRA.md": "x" }, (tgz) => {
      const r = run(tgz);
      expect(r.code).toBe(1);
      expect(r.stderr).toContain("outside the whitelisted intent");
    });
  });
});
