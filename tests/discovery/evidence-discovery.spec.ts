/**
 * Zero-config evidence discovery (Mega MVP Master Plan v3.1 §26 WI-11).
 *
 * Locks: every conventional layout variant is discovered (mjolnir
 * report, PW JSON names, test-results dir, JUnit XML — at root and one
 * level deep); unknown names are NEVER vacuumed; candidates are
 * deterministic; discovery stays bounded (no node_modules walks); and
 * the missing-evidence message states what was looked for (the §16
 * evidence-state vocabulary).
 */

import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  discoverEvidenceCandidates,
  missingEvidenceMessage,
} from "../../src/discovery/evidence-discovery.js";

function makeRepo(files: Record<string, string>): {
  root: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-evdisc-"));
  for (const [rel, content] of Object.entries(files)) {
    const p = join(root, rel);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, content);
  }
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

const PW_JSON = JSON.stringify({
  suites: [
    {
      specs: [
        {
          title: "t",
          file: "e2e/a.spec.ts",
          tests: [{ results: [{ status: "passed", duration: 1 }] }],
        },
      ],
    },
  ],
});

const JUNIT_XML =
  '<?xml version="1.0"?><testsuites><testsuite name="s" tests="1"><testcase name="t" classname="c"/></testsuite></testsuites>';

describe("layout variants (WI-11 layout-variant fixtures)", () => {
  it("discovers the mjolnir.report.json convention at root", () => {
    const { root, cleanup } = makeRepo({
      "mjolnir.report.json": PW_JSON,
      "e2e/a.spec.ts": "test('t', () => {});",
    });
    try {
      const c = discoverEvidenceCandidates(root);
      expect(c[0]?.convention).toBe("mjolnir-report");
    } finally {
      cleanup();
    }
  });

  it("discovers the playwright-report.json convention", () => {
    const { root, cleanup } = makeRepo({ "playwright-report.json": PW_JSON });
    try {
      expect(discoverEvidenceCandidates(root)[0]?.convention).toBe(
        "playwright-json",
      );
    } finally {
      cleanup();
    }
  });

  it("discovers test-results/ and nested results.json one level deep", () => {
    const { root, cleanup } = makeRepo({
      "test-results/results.json": PW_JSON,
      "e2e/a.spec.ts": "test('t', () => {});",
    });
    try {
      const c = discoverEvidenceCandidates(root);
      expect(c.some((x) => x.convention === "test-results-dir")).toBe(true);
      expect(c.some((x) => x.path.endsWith("results.json"))).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("discovers JUnit XML reports", () => {
    const { root, cleanup } = makeRepo({ "junit-report.xml": JUNIT_XML });
    try {
      expect(discoverEvidenceCandidates(root)[0]?.convention).toBe(
        "junit-file",
      );
    } finally {
      cleanup();
    }
  });

  it("discovers evidence two levels deep but never beyond the bound", () => {
    const { root, cleanup } = makeRepo({
      // test-results itself sits at depth 2 — the DIR convention reaches it.
      "packages/app/test-results/results.json": PW_JSON,
      "packages/app/e2e/a.spec.ts": "test('t', () => {});",
      // a bare report file three levels deep — beyond the bound:
      "packages/app/sub/inner/deeper/report.json": PW_JSON,
    });
    try {
      const c = discoverEvidenceCandidates(root).map((x) => ({
        ...x,
        path: x.path.replace(/\\/g, "/"),
      }));
      expect(c.some((x) => x.path.includes("packages/app/test-results"))).toBe(
        true,
      );
      expect(c.some((x) => x.path.includes("sub/inner/deeper"))).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("never vacuums unknown json files or walks node_modules", () => {
    const { root, cleanup } = makeRepo({
      "package.json": "{}",
      "tsconfig.json": "{}",
      "node_modules/left-pad/package.json": "{}",
      "e2e/a.spec.ts": "test('t', () => {});",
    });
    try {
      expect(discoverEvidenceCandidates(root)).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it("candidates are deterministic (sorted) across repeated calls", () => {
    const { root, cleanup } = makeRepo({
      "junit.xml": JUNIT_XML,
      "test-results/results.json": PW_JSON,
    });
    try {
      expect(discoverEvidenceCandidates(root)).toEqual(
        discoverEvidenceCandidates(root),
      );
    } finally {
      cleanup();
    }
  });

  it("the missing-evidence message names the conventions and the honest ceiling", () => {
    const msg = missingEvidenceMessage("/some/repo");
    expect(msg).toContain("no runtime evidence");
    expect(msg).toContain("mjolnir.report.json");
    expect(msg).toContain("caps at L2");
  });
});

describe("listDirs hostile fallback (P8 coverage)", () => {
  it("a FILE passed as the scan root degrades to zero candidates — no crash", () => {
    const root = mkdtempSync(join(tmpdir(), "mjolnir-evdisc-"));
    try {
      const fileAsDir = join(root, "not-a-dir.txt");
      writeFileSync(fileAsDir, "x");
      const out = discoverEvidenceCandidates(fileAsDir);
      expect(Array.isArray(out)).toBe(true);
      expect(out).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
