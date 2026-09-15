import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { discoverEvidenceCandidates } from "../../src/discovery/evidence-discovery.js";

function makeRepo(files: Record<string, string>): {
  root: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-evdisc-branch-"));
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
          file: "a.spec.ts",
          tests: [{ results: [{ status: "passed", duration: 1 }] }],
        },
      ],
    },
  ],
});

describe("evidence-discovery branch coverage (line 111 — kind mismatch)", () => {
  it("a FILE named 'test-results' is not a dir match (conv.kind === 'dir' ? st.isDirectory() path)", () => {
    const { root, cleanup } = makeRepo({
      "test-results": PW_JSON, // FILE named test-results, not a directory
    });
    try {
      const c = discoverEvidenceCandidates(root);
      // test-results convention is for dirs, but this is a file — no match
      expect(c.filter((x) => x.convention === "test-results-dir")).toEqual([]);
    } finally {
      cleanup();
    }
  });

  it("a DIRECTORY named 'report.json' is not a file match (conv.kind === 'file' ? st.isFile() path)", () => {
    const { root, cleanup } = makeRepo({
      "report.json/something.txt": PW_JSON,
    });
    try {
      const c = discoverEvidenceCandidates(root);
      // report.json is a dir convention, but this is expected to be a file
      expect(c.filter((x) => x.convention === "playwright-json")).toEqual([]);
    } finally {
      cleanup();
    }
  });
});
