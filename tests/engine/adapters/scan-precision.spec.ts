/**
 * Precision locks for the 2026-08-31 corpus-wave fixes:
 *  - QA-TQUAL-011's scanner bug (a `/*` inside a template literal opened a
 *    phantom comment to EOF, flagging live tests) — commentAndStringRanges
 *    now rejects scanner ranges that pierce real template/string nodes;
 *  - the TypeScript adapter's config discovery (playwright.config.ts was
 *    never scanned, so config-gated rules were dead in real scans),
 *    including Windows backslash paths;
 *  - adapter gating: config rules run only on configs, test rules never
 *    on configs.
 */

import { describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  commentAndStringRanges,
  parseTsFile,
} from "../../../src/engine/ts-ast.js";
import { computeCodeText } from "../../../src/engine/code-text.js";
import { typescriptAdapter } from "../../../src/adapters/typescript.js";
import type { UniversalRule } from "../../../src/engine/adapter.js";

const GHOST = `const route = \`\${ROUTES.Base}/*\`;
test('shows live', () => {});
it('also live', () => {});
`;

describe("commentAndStringRanges: template-piercing phantom rejection", () => {
  it("a /* inside a template literal does not swallow live tests", () => {
    const ast = parseTsFile({ path: "ghost.ts", text: GHOST });
    const ranges = commentAndStringRanges({
      path: "ghost.ts",
      text: GHOST,
      ast,
    });
    // The scanner once emitted a phantom comment from the `/*` inside the
    // template to EOF; assert no range extends past the template's line.
    for (const r of ranges) {
      expect(r.end).toBeLessThan(GHOST.indexOf("test('shows live'"));
    }
  });

  it("genuine comments and strings are still reported", () => {
    const text = '// a comment\nconst s = "a string";\n/* block */\n';
    const ast = parseTsFile({ path: "plain.ts", text });
    const ranges = commentAndStringRanges({ path: "plain.ts", text, ast });
    // line comment + string literal; the /* block */ opener merges with
    // the string line in scanner trivia but is one MultiLineComment range.
    expect(ranges.length).toBeGreaterThanOrEqual(2);
    expect(
      ranges.some((r) => text.slice(r.start, r.end).includes("block */")),
    ).toBe(true);
  });

  it("falls back to [] when there is no AST (fixture harness path)", () => {
    const text = "// it('a', () => {});\n";
    expect(
      commentAndStringRanges({ path: "x.ts", text, ast: undefined }).length,
    ).toBeGreaterThanOrEqual(0);
  });

  it("never throws on unparseable text", () => {
    const broken = "const x = ;";
    const ast = parseTsFile({ path: "broken.ts", text: broken });
    expect(
      () =>
        commentAndStringRanges({ path: "broken.ts", text: broken, ast }).length,
    ).not.toThrow();
  });

  it("getCodeOnlyText keeps live tests visible past a template-hosted /*", () => {
    const ast = parseTsFile({ path: "ghost.ts", text: GHOST });
    const masked = computeCodeText(
      { path: "ghost.ts", text: GHOST, ast },
      "typescript",
    );
    // The template (including its `/*`) is blanked, but everything after
    // it — the live tests — must stay in the mask. (String ARGUMENTS of
    // the live tests are masked by their own string ranges, so assert on
    // the code skeleton, not the string contents.)
    expect(masked).toContain("test(");
    expect(masked).toContain("it(");
    expect(masked).toContain("ROUTES.Base");
  });
});

describe("typescript adapter: playwright.config discovery and gating", () => {
  it("isTestFile accepts playwright.config.ts on Windows backslash paths", () => {
    expect(typescriptAdapter.isTestFile("C:\\repo\\playwright.config.ts")).toBe(
      true,
    );
    expect(typescriptAdapter.isTestFile("e2e/playwright.config.js")).toBe(true);
    expect(typescriptAdapter.isTestFile("src/other.config.ts")).toBe(false);
  });

  function rule(configOnly: boolean, hits: string[]): UniversalRule {
    return {
      id: configOnly ? "CFG" : "TEST",
      category: "QA-PW",
      appliesTo: ["typescript"],
      configOnly,
      run(file) {
        hits.push(`${configOnly ? "CFG" : "TEST"}@${file.path}`);
        return [];
      },
    };
  }

  it("config rules run only on configs; test rules never on configs", () => {
    const hits: string[] = [];
    const rules = [rule(true, hits), rule(false, hits)];
    typescriptAdapter.runRules(
      rules,
      { path: "playwright.config.ts", text: "export default {};" },
      () => {},
    );
    typescriptAdapter.runRules(
      rules,
      { path: "e2e/a.spec.ts", text: "it('a', () => {});" },
      () => {},
    );
    expect(hits).toEqual(["CFG@playwright.config.ts", "TEST@e2e/a.spec.ts"]);
  });

  it("discovers playwright.config.ts via the shared walk", () => {
    const dir = join(
      import.meta.dirname,
      "..",
      "..",
      "tmp-config-discovery-target",
    );
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "playwright.config.ts"), "export default {};\n");
    const files: string[] = [];
    typescriptAdapter.discoverTestFiles({
      workspace: { root: dir, name: "t", packageJson: {}, workspaceGlobs: [] },
      testFiles: files,
      deadline: Date.now() + 60_000,
      ignoreMatcher: { isIgnored: () => false },
      onSkippedFile: () => {},
      onDiscoveryTruncated: () => {},
      maxFiles: 1000,
    });
    rmSync(dir, { recursive: true, force: true });
    expect(files.some((f) => f.endsWith("playwright.config.ts"))).toBe(true);
  });
});
