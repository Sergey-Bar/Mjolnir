/**
 * Two of the four sites A2 named were already instrumented before this
 * release: `ts-ast.ts` records `ast-parse-failed` and
 * `ast-range-scan-failed`, and the workflow parser throws
 * `WorkflowParseSkipped` for the caller to count. The plan asserted all four
 * were uncounted; two of them were not. The two that WERE uncounted are
 * here, and this file is what keeps them counted.
 *
 * The failure shape is the same in both cases and it is the shape the whole
 * repository has been fighting: a `catch` that returns a value. The
 * python adapter returned an unchanged framework set, so a repo with an
 * unreadable `pyproject.toml` detected as "no pytest configured" — the one
 * answer indistinguishable from "this is not a Python project", and the
 * adapter's own `unknown: true` branch proves the author knew the difference
 * mattered. The AST parse functions returned `undefined`, so a grammar WASM
 * that failed to load turned off the comment/string false-positive firewall
 * for every Java, C# and Python file and the scan still reported findings.
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

import { afterEach, describe, expect, it } from "vitest";

import {
  beginDegradationWindow,
  degradationsSince,
  recordDegradation,
  summarizeDegradations,
} from "../../src/engine/degradation-ledger.js";
import { deriveCompletion } from "../../src/engine/completion.js";
import { pythonAdapter } from "../../src/adapters/python.js";
import { parseJavaAst } from "../../src/engine/tree-sitter-ast.js";

const ROOT = join(import.meta.dirname, "..", "..");

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-degradation-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

function windowReasons(since: number): string[] {
  return degradationsSince(since).map((record) => record.reason);
}

describe("the python adapter counts a manifest it could not read", () => {
  it("records python-manifest-unreadable and reports frameworks as unknown", () => {
    // Windows will not make the file unreadable via chmod, and running this
    // suite as an administrator ignores the bit anyway. So the unreadable
    // state is produced the way a real scan hits it: a DIRECTORY named
    // `pyproject.toml`, which exists() reports as present and readText then
    // fails to read as a file. That is the same catch, reached for the same
    // reason, on every platform.
    const root = tempDir();
    mkdirSync(join(root, "pyproject.toml"));

    const marker = beginDegradationWindow();
    const detected = pythonAdapter.detectFrameworks(root);

    expect(
      windowReasons(marker),
      "an unreadable pyproject.toml produced a clean detection and no record",
    ).toContain("python-manifest-unreadable");
    // And the returned value is honest about it rather than reporting a
    // confident negative.
    expect(detected.unknown).toBe(true);
    expect(detected.frameworks).not.toContain("pytest");
  });

  it("a readable pyproject.toml records nothing", () => {
    // The other half. A degradation that fires on the happy path is noise,
    // and a noisy ledger is one people stop reading — which is how the
    // ledger became a place where real losses were lost.
    const root = tempDir();
    writeFileSync(
      join(root, "pyproject.toml"),
      '[tool.pytest.ini_options]\ntestpaths = ["tests"]\n',
    );

    const marker = beginDegradationWindow();
    const detected = pythonAdapter.detectFrameworks(root);

    expect(windowReasons(marker)).not.toContain("python-manifest-unreadable");
    expect(detected.frameworks).toContain("pytest");
    expect(detected.unknown).toBe(false);
  });
});

describe("the AST stage counts a grammar it could not load", () => {
  it("a missing grammar WASM is recorded, not silently undefined", () => {
    // The contract `parseJavaAst` documents — "returns undefined on any
    // failure, callers must fall back to the regex path" — is load-bearing
    // and is kept. What was missing is that the consequence was invisible:
    // with no AST the comment/string firewall is off for every file, so a
    // prose comment reads as code, and the scan still reports findings.
    const marker = beginDegradationWindow();
    // Non-empty, syntactically fine Java. Whether the grammar is available in
    // this environment varies (it is an optional WASM), so BOTH outcomes are
    // acceptable — the one that is not acceptable is a failure with no
    // record.
    return parseJavaAst("class A { void m() {} }").then((tree) => {
      const reasons = windowReasons(marker);
      if (tree === undefined) {
        expect(
          reasons,
          "the AST returned undefined without recording why",
        ).toContain("ast-grammar-unavailable");
      } else {
        expect(
          reasons,
          "a successful AST parse must not record a degradation",
        ).not.toContain("ast-grammar-unavailable");
      }
    });
  });

  it("a degradation forces partial via deriveCompletion", () => {
    // The ledger is only worth anything if a record changes the outcome.
    // This is the wiring assertion, and it is the reason the ledger exists
    // rather than being a log file.
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
    const marker = beginDegradationWindow();
    recordDegradation("ast-grammar-unavailable");
    const degraded = deriveCompletion({
      discoveryTruncated: false,
      rulesPartial: false,
      skippedFiles: 0,
      rulesCrashed: 0,
      truncationReasons: [],
      scopeIgnored: 0,
      scopeUnrecognized: 0,
      parseFailed: 0,
      // Summarised first, exactly as scan-pipeline does — the ledger stores
      // one record per loss and the completion input takes per-reason counts.
      // Passing the raw records would type-error, which is the point of the
      // two types being different.
      degradations: summarizeDegradations(degradationsSince(marker)),
    });
    expect(clean.partial).toBe(false);
    expect(degraded.partial).toBe(true);
    expect(degraded.analysisStatus.degradations).toEqual([
      { reason: "ast-grammar-unavailable", count: 1 },
    ]);
  });
});

describe("the two sites the plan claimed were uncounted and were not", () => {
  it("ts-ast already records both of its parse failures", () => {
    // Named here so the next audit does not re-open them. The plan listed
    // ts-ast as uncounted; `src/engine/ts-ast.ts:63` records
    // `ast-parse-failed` and `:150` records `ast-range-scan-failed`, both
    // with a comment explaining why the loss matters.
    const source = readFileSync(
      join(ROOT, "src", "engine", "ts-ast.ts"),
      "utf8",
    );
    expect(source).toContain('recordDegradation("ast-parse-failed")');
    expect(source).toContain('recordDegradation("ast-range-scan-failed")');
  });

  it("the workflow parser throws rather than swallowing a parse failure", () => {
    // Same reason. `runRules` throws `WorkflowParseSkipped` and the caller
    // counts it, so there is nothing to return-and-forget here.
    const source = readFileSync(
      join(ROOT, "src", "adapters", "github-actions.ts"),
      "utf8",
    );
    expect(source).toContain("throw new WorkflowParseSkipped()");
  });
});
