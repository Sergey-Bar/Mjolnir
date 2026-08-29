/**
 * Language-adapter edge cases (Test Hardening Plan — coverage-gap
 * closure). All three adapters (typescript, python, github-actions)
 * share the same discovery skeleton: readdirSync, a depth cap, a
 * per-file size cap, and per-adapter crash isolation around rule
 * execution. None of the failure branches in that skeleton were
 * exercised anywhere in the existing suite — every adapter test to
 * date only walks the happy path.
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runScan } from "../src/cli.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-adapter-edge-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function scan(target = dir) {
  return runScan({
    target,
    json: true,
    verbose: true,
    maxDurationMs: 15_000,
    scopeChanged: false,
    format: "json",
  });
}

describe("unreadable discovery directories degrade instead of crashing", () => {
  it("an e2e/ directory with permissions revoked does not crash the scan (TS adapter)", () => {
    const locked = join(dir, "e2e");
    mkdirSync(locked, { recursive: true });
    writeFileSync(
      join(locked, "a.spec.ts"),
      "it('a', () => { expect(1).toBe(1); });\n",
    );
    let revoked = false;
    try {
      chmodSync(locked, 0o000);
      revoked = true;
    } catch {
      /* platform doesn't support this — nothing to assert */
    }
    try {
      expect(() => scan()).not.toThrow();
    } finally {
      if (revoked) chmodSync(locked, 0o755);
    }
  });
});

describe("oversized files are skipped, not scanned", () => {
  it("a .spec.ts file over the 1MB cap is excluded from discovery", () => {
    mkdirSync(join(dir, "e2e"), { recursive: true });
    // Genuinely over LIMITS.maxFileBytes (1MB) with a real trigger
    // pattern inside it, so if it WERE scanned it would produce a
    // finding — absence of that finding is the signal it was skipped.
    const huge =
      "it.only('huge', () => {\n" + "// ".repeat(400_000) + "\n});\n";
    writeFileSync(join(dir, "e2e", "huge.spec.ts"), huge);

    const result = scan();
    // The size cap silently excludes the file from discovery (it's
    // never pushed to testFiles at all) rather than routing through
    // onSkippedFile() — so skippedFiles staying at 0 here is the
    // adapter's actual (if slightly under-reported) behavior, not a
    // bug this test is chasing. The finding's absence is the real proof
    // the cap worked.
    expect(result.findings.some((f) => f.file.includes("huge"))).toBe(false);
  });

  it("a Python file over the size cap is excluded from discovery", () => {
    mkdirSync(join(dir, "tests"), { recursive: true });
    const huge =
      "def test_huge():\n" +
      "    # padding\n".repeat(400_000) +
      "    assert True\n";
    writeFileSync(join(dir, "tests", "test_huge.py"), huge);

    const result = scan();
    expect(result.findings.some((f) => f.file.includes("huge"))).toBe(false);
  });
});

describe("directory nesting beyond the depth cap is not descended into", () => {
  it("a test file nested past the max depth is not discovered", () => {
    let deep = join(dir, "e2e");
    for (let i = 0; i < 40; i++) deep = join(deep, `d${i}`); // > LIMITS.maxDepth (32)
    mkdirSync(deep, { recursive: true });
    writeFileSync(
      join(deep, "too-deep.spec.ts"),
      "it.only('x', () => { expect(1).toBe(1); });\n",
    );
    // Also add a shallow control file so the scan isn't just "empty".
    mkdirSync(join(dir, "e2e", "shallow"), { recursive: true });
    writeFileSync(
      join(dir, "e2e", "shallow", "ok.spec.ts"),
      "it.only('y', () => { expect(1).toBe(1); });\n",
    );

    const result = scan();
    expect(result.findings.some((f) => f.file.includes("too-deep"))).toBe(
      false,
    );
    expect(result.findings.some((f) => f.file.includes("shallow"))).toBe(true);
  });
});

describe("virtualenv/dependency directories are skipped by the Python adapter", () => {
  for (const skipDir of [
    "venv",
    ".venv",
    "env",
    "__pycache__",
    "site-packages",
  ]) {
    it(`does not descend into "${skipDir}"`, () => {
      mkdirSync(join(dir, skipDir), { recursive: true });
      writeFileSync(
        join(dir, skipDir, "test_vendored.py"),
        "def test_x():\n    pass\n",
      );
      mkdirSync(join(dir, "tests"), { recursive: true });
      // Use a pattern a default-tier rule still fires on (QA-PY-002),
      // so "the real test dir was scanned" stays observable via findings.
      writeFileSync(
        join(dir, "tests", "test_real.py"),
        "import pytest\n\n@pytest.mark.skip\ndef test_y():\n    pass\n",
      );

      const result = scan();
      expect(result.findings.some((f) => f.file.includes(skipDir))).toBe(false);
      expect(result.findings.some((f) => f.file.includes("test_real"))).toBe(
        true,
      );
    });
  }
});

describe("malformed GitHub Actions workflow YAML degrades the scan honestly", () => {
  it("a workflow file with unparseable YAML does not crash the whole scan", () => {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(
      join(dir, ".github", "workflows", "broken.yml"),
      "on: [\n  push\njobs: {{{ not: valid: yaml: at: all\n",
    );
    // A second, valid, well-formed workflow alongside it — proves one
    // bad file degrades gracefully rather than aborting discovery for
    // every workflow file.
    writeFileSync(
      join(dir, ".github", "workflows", "ci.yml"),
      "on:\n  push:\njobs:\n  build:\n    steps:\n      - run: exit 1 || true\n",
    );

    expect(() => scan()).not.toThrow();
    const result = scan();
    expect(result.analysisStatus.skippedFiles).toBeGreaterThan(0);
    // The valid sibling workflow was still scanned and its real finding
    // (|| true swallowing exit code) surfaced.
    expect(result.findings.some((f) => f.file.includes("ci.yml"))).toBe(true);
  });

  it("a workflow YAML bomb (excess aliases) does not hang or crash the scan", () => {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    const aliasBomb =
      "on:\n  push:\njobs:\n  a: &a [" +
      Array.from({ length: 60 }, () => "*a").join(",") +
      "]\n";
    writeFileSync(join(dir, ".github", "workflows", "bomb.yml"), aliasBomb);

    const start = performance.now();
    expect(() => scan()).not.toThrow();
    expect(performance.now() - start).toBeLessThan(10_000);
  });
});
