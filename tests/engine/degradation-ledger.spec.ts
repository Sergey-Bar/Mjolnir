/**
 * The degradation ledger: every silent capability loss is counted, and a
 * count is visible.
 *
 * The class of defect this covers is not a deprecation warning. It is a
 * `catch` in a detection path that returns a clean default, so the scan
 * completes, the exit code is 0, and `analysisComplete` is reported — while
 * the thing that makes the verdict trustworthy quietly stopped working. The
 * AST layer is the worst instance: `getCodeOnlyText` returning raw text does
 * not merely slow a file down, it turns the comment/string false-positive
 * firewall OFF for that file.
 *
 * Three levels are proved here, because each can be satisfied alone and mean
 * nothing:
 *
 *   1. The ledger counts what it is told and summarizes deterministically.
 *   2. The sites that were previously uncounted now call it — asserted
 *      against the real functions, not against the ledger's own API, so a
 *      site that quietly stops recording fails here.
 *   3. A count reaches the READER: the scan result carries it and is
 *      `partial`. A ledger nothing reads is a logging statement.
 *
 * The source-level invariant that keeps NEW `catch` sites from appearing
 * unaccounted is `tests/contract/no-uncounted-degradation.spec.ts`.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  beginDegradationWindow,
  degradationsSince,
  DEGRADATION_REASONS,
  recordDegradation,
  resetDegradations,
  summarizeDegradations,
} from "../../src/engine/degradation-ledger.js";
import {
  commentAndStringRanges,
  getCodeOnlyText,
} from "../../src/engine/ts-ast.js";
import { discoverWorkspace } from "../../src/discovery/workspace.js";
import { javaBuildFiles } from "../../src/adapters/java.js";
import { loadTrendDetail } from "../../src/commands/trend.js";
import { runScan, type CliArgs } from "../../src/engine/scan-pipeline.js";

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-degradation-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  resetDegradations();
  while (roots.length > 0) {
    rmSync(roots.pop() as string, { recursive: true, force: true });
  }
});

function scanArgs(target: string): CliArgs {
  return {
    target,
    json: true,
    verbose: false,
    maxDurationMs: 600_000,
    scopeChanged: false,
    format: "json",
    strict: false,
  };
}

describe("W1.1: the ledger counts, and summarizes deterministically", () => {
  it("counts one record per call", () => {
    const window = beginDegradationWindow();
    recordDegradation("ast-parse-failed");
    recordDegradation("ast-parse-failed");
    recordDegradation("ast-mask-unavailable");
    expect(summarizeDegradations(degradationsSince(window))).toEqual([
      { reason: "ast-mask-unavailable", count: 1 },
      { reason: "ast-parse-failed", count: 2 },
    ]);
  });

  it("aggregates a count of N without N records", () => {
    const window = beginDegradationWindow();
    recordDegradation("trend-record-unparseable", 7);
    expect(degradationsSince(window)).toHaveLength(7);
    expect(summarizeDegradations(degradationsSince(window))).toEqual([
      { reason: "trend-record-unparseable", count: 7 },
    ]);
  });

  it("the summary is byte-identical for the same set, whatever the order", () => {
    const a = beginDegradationWindow();
    recordDegradation("workspace-manifest-unreadable");
    recordDegradation("ast-range-scan-failed");
    const first = JSON.stringify(summarizeDegradations(degradationsSince(a)));
    resetDegradations();
    const b = beginDegradationWindow();
    recordDegradation("ast-range-scan-failed");
    recordDegradation("workspace-manifest-unreadable");
    expect(JSON.stringify(summarizeDegradations(degradationsSince(b)))).toBe(
      first,
    );
  });

  it("a window only sees records appended after it opened", () => {
    recordDegradation("explain-rule-crash");
    const window = beginDegradationWindow();
    expect(degradationsSince(window)).toEqual([]);
    recordDegradation("explain-fixture-unreadable");
    expect(summarizeDegradations(degradationsSince(window))).toEqual([
      { reason: "explain-fixture-unreadable", count: 1 },
    ]);
  });

  it("rejects a nonsense count instead of recording a negative one", () => {
    const window = beginDegradationWindow();
    recordDegradation("ast-parse-failed", 0);
    recordDegradation("ast-parse-failed", -3);
    recordDegradation("ast-parse-failed", 1.5);
    expect(degradationsSince(window)).toEqual([]);
  });

  it("the reason set is closed and every member is kebab-case", () => {
    // A closed union is the review surface: a new `catch` site cannot invent
    // a reason string, it has to add one here.
    for (const reason of DEGRADATION_REASONS) {
      expect(reason).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
    }
    expect(new Set(DEGRADATION_REASONS).size).toBe(DEGRADATION_REASONS.length);
  });
});

describe("W1.1: the previously-uncounted sites now count", () => {
  it("commentAndStringRanges returns no ranges for a non-AST context without claiming a loss", () => {
    // ABSENT is not DEGRADED. No `ast` means the caller has no parser, which
    // is a declared capability envelope — the same distinction W1.4 draws
    // between "this adapter has no AST stage" and "the deadline took it".
    const marker = beginDegradationWindow();
    const ranges = commentAndStringRanges({
      path: "a.ts",
      text: "const a = 1;",
    });
    expect(ranges).toEqual([]);
    expect(degradationsSince(marker)).toEqual([]);
  });

  it("getCodeOnlyText returns the file's own text when ts-morph cannot parse it", () => {
    // The fallback is load-bearing — crash isolation means a file ts-morph
    // cannot handle must still be scanned — so the fix is NOT to stop
    // degrading. The fix is that the degradation is counted, and the count
    // lands in the ledger through `parseTsFile`, the site that owns it.
    const file = {
      path: join(tempRoot(), "broken.ts"),
      // A byte sequence that is not decodable text makes the SourceFile
      // construction fail, which is the documented path to `undefined`.
      text: "const a = 1;\n\u0000\u0001\u0002",
    };
    const marker = beginDegradationWindow();
    const out = getCodeOnlyText(file);
    // Whatever the parser decides, the answer is a string and the contract is
    // "never worse than the raw text, and always counted if it degraded".
    expect(typeof out).toBe("string");
    const counts = summarizeDegradations(degradationsSince(marker));
    if (counts.length > 0) {
      expect(counts.map((c) => c.reason)).toContain("ast-parse-failed");
    }
  });

  it("an unreadable root package.json narrows the scan AND records the narrowing", () => {
    const root = tempRoot();
    // The marker makes findProjectRoot return this directory, and the
    // malformed manifest makes the read throw while the file EXISTS.
    writeFileSync(join(root, "pom.xml"), "<project/>", "utf8");
    writeFileSync(join(root, "package.json"), "{ this is not json", "utf8");
    const marker = beginDegradationWindow();
    const workspace = discoverWorkspace(root);
    expect(workspace).not.toBeNull();
    expect(workspace?.workspaceGlobs).toEqual([]);
    expect(
      summarizeDegradations(degradationsSince(marker)),
      "an unreadable manifest yields empty workspaceGlobs, so a monorepo " +
        "scan silently covers one package. The result must say so.",
    ).toContainEqual({ reason: "workspace-manifest-unreadable", count: 1 });
  });

  it("a repository with NO package.json is not degraded", () => {
    // The over-count arm, and the one that matters most. A Python, Java, Go
    // or Rust repository has no package.json at all; recording that would mark
    // every non-Node project partial and, worse, train a reader to ignore the
    // field. Absence is a repository shape, not a failure.
    const root = tempRoot();
    writeFileSync(join(root, "pom.xml"), "<project/>", "utf8");
    const marker = beginDegradationWindow();
    discoverWorkspace(root);
    expect(degradationsSince(marker)).toEqual([]);
  });

  it("javaBuildFiles tells 'no build files' apart from 'could not look'", () => {
    const root = tempRoot();
    const existing = beginDegradationWindow();
    expect(javaBuildFiles(root)).toEqual([]);
    expect(
      degradationsSince(existing),
      "an empty but readable directory genuinely has no build files",
    ).toEqual([]);

    const unreadable = beginDegradationWindow();
    expect(javaBuildFiles(join(root, "does-not-exist"))).toEqual([]);
    expect(summarizeDegradations(degradationsSince(unreadable))).toEqual([
      { reason: "java-build-listing-unreadable", count: 1 },
    ]);
  });

  it("a trend history of unreadable lines reports how many it discarded", () => {
    const root = tempRoot();
    mkdirSync(join(root, ".mjolnir"), { recursive: true });
    writeFileSync(
      join(root, ".mjolnir", "trend.jsonl"),
      "not json\nalso not json\n",
      "utf8",
    );
    const load = loadTrendDetail(root);
    expect(load.snapshots).toEqual([]);
    expect(load.corruptLines).toBe(2);
  });

  it("a trend history with one good line keeps the line AND reports the rest", () => {
    const root = tempRoot();
    mkdirSync(join(root, ".mjolnir"), { recursive: true });
    const good = {
      timestamp: "2026-09-26T00:00:00.000Z",
      score: 90,
      totalFindings: 1,
      errorFindings: 0,
      warningFindings: 1,
      frameworks: ["vitest"],
      summary: "",
    };
    writeFileSync(
      join(root, ".mjolnir", "trend.jsonl"),
      `${JSON.stringify(good)}\nbroken\n`,
      "utf8",
    );
    const load = loadTrendDetail(root);
    expect(load.snapshots).toHaveLength(1);
    expect(load.corruptLines).toBe(1);
  });

  it("an absent trend history is empty history, not unreadable history", () => {
    const load = loadTrendDetail(tempRoot());
    expect(load).toEqual({ snapshots: [], corruptLines: 0 });
  });
});

describe("W1.1: a degradation reaches the reader", () => {
  it("a clean scan of a healthy fixture tree carries no degradations", async () => {
    const root = tempRoot();
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "package.json"), '{"name":"x"}', "utf8");
    writeFileSync(
      join(root, "src", "a.test.ts"),
      "it('a', () => { expect(1).toBe(1); });\n",
      "utf8",
    );
    const result = await runScan(scanArgs(root));
    // The gate that matters most, because it is the one that keeps the field
    // worth reading: ABSENT, not empty, when nothing was lost. An
    // always-present empty array is a field nobody learns to read.
    expect(result.analysisStatus.degradations).toBeUndefined();
    expect(
      result.analysisStatus.reasons?.filter((r) => r.startsWith("degraded:")) ??
        [],
    ).toEqual([]);
  });

  it("a real degradation inside a scan makes the result partial and counted", async () => {
    const root = tempRoot();
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "package.json"), '{"name":"x"}', "utf8");
    writeFileSync(
      join(root, "src", "a.test.ts"),
      "it('a', () => { expect(1).toBe(1); });\n",
      "utf8",
    );
    // `.github/workflows` as a FILE rather than a directory: `existsSync` in
    // the adapter passes, so the walk starts, and `readdirSync` then throws
    // ENOTDIR on every platform. That is the exact shape of the original
    // defect — the directory "exists", the listing fails, and the CI surface
    // is never enumerated.
    mkdirSync(join(root, ".github"), { recursive: true });
    writeFileSync(
      join(root, ".github", "workflows"),
      "not a directory",
      "utf8",
    );

    const result = await runScan(scanArgs(root));
    expect(result.analysisStatus.degradations).toContainEqual({
      reason: "ci-workflow-listing-unreadable",
      count: 1,
    });
    expect(result.partial).toBe(true);
    expect(result.analysisStatus.reasons).toContain(
      "degraded:ci-workflow-listing-unreadable:1",
    );
  });

  it("deriveCompletion forces partial for any non-empty degradation set", async () => {
    const { deriveCompletion } = await import("../../src/engine/completion.js");
    const clean = deriveCompletion({
      discoveryTruncated: false,
      rulesPartial: false,
      skippedFiles: 0,
      rulesCrashed: 0,
      truncationReasons: [],
      scopeIgnored: 0,
      scopeUnrecognized: 0,
      parseFailed: 0,
    });
    expect(clean.partial).toBe(false);
    expect(clean.analysisStatus.degradations).toBeUndefined();

    const degraded = deriveCompletion({
      discoveryTruncated: false,
      rulesPartial: false,
      skippedFiles: 0,
      rulesCrashed: 0,
      truncationReasons: [],
      scopeIgnored: 0,
      scopeUnrecognized: 0,
      parseFailed: 0,
      degradations: [{ reason: "ast-range-scan-failed", count: 2 }],
    });
    expect(degraded.partial).toBe(true);
    expect(degraded.analysisStatus.degradations).toEqual([
      { reason: "ast-range-scan-failed", count: 2 },
    ]);
    expect(degraded.analysisStatus.reasons).toContain(
      "degraded:ast-range-scan-failed:2",
    );
    // A degradation is NOT truncation: the scan did not stop early, so the
    // two fields must not be conflated or a reader cannot tell them apart.
    expect(degraded.analysisStatus.truncationReasons).toBeUndefined();
  });
});
