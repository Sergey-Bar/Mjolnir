/**
 * Java/JUnit adapter (Upgrade-Plan-v3 Phase 4).
 *
 * Regex-layer adapter: rules run over the file text (and the masked
 * code-text view). Since Verification Trust Evolution Phase 0.5 (§10)
 * the adapter also implements the async `parseAst` hook — the file loop
 * awaits `parseJavaAst` (tree-sitter WASM) and hands the tree to rules
 * via `ParsedFile.ast`; rules stay synchronous. Parse failure or a
 * missing grammar resolves `undefined` and rules fall back to the regex
 * path — never fatal.
 *
 * Test discovery: src/test/java/**\/*Test.java, *Tests.java, *IT.java
 * (Maven/Gradle conventions).
 * Frameworks: detected from build-file content (pom.xml / build.gradle*).
 * Rules match test annotations (`@Disabled`, `@Test`, …) via regex over
 * the file text — there is no separate annotation-scanning pass.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { sharedWalk } from "../discovery/shared-walk.js";
import { computeCodeText } from "../engine/code-text.js";
import { parseJavaAst } from "../engine/tree-sitter-ast.js";
import type {
  FrameworkInfo,
  LanguageAdapter,
  ParsedAst,
  ParsedFile,
  ScanContext,
} from "../engine/adapter.js";

const JAVA_TEST_RE = /(?:^|[\\/])(?:Test[A-Z]\w*|\w+Tests?|\w+IT)\.java$/;

export const javaAdapter: LanguageAdapter = {
  id: "java",
  extensions: [".java"],
  testFileGlobs: ["Test*.java", "*Test.java", "*Tests.java", "*IT.java"],
  dirSkips: ["target", "build", ".gradle"],

  isTestFile(path: string): boolean {
    return JAVA_TEST_RE.test(path);
  },

  detectFrameworks(root: string): FrameworkInfo {
    const frameworks: string[] = [];
    const hasMaven = existsSync(join(root, "pom.xml"));
    const hasGradle =
      existsSync(join(root, "build.gradle")) ||
      existsSync(join(root, "build.gradle.kts"));

    if (hasMaven || hasGradle) {
      // Build-file content decides JUnit vs TestNG; absence of either
      // marker means we can't claim a framework honestly.
      const buildFile = hasMaven
        ? join(root, "pom.xml")
        : existsSync(join(root, "build.gradle"))
          ? join(root, "build.gradle")
          : join(root, "build.gradle.kts");
      try {
        const text = readText(buildFile);
        if (/junit/i.test(text)) frameworks.push("junit");
        if (/testng/i.test(text)) frameworks.push("testng");
      } catch {
        /* unreadable — skip */
      }
    }

    if (frameworks.length === 0) return { frameworks: [], unknown: true };
    return { frameworks, unknown: false };
  },

  discoverTestFiles(ctx: ScanContext): void {
    sharedWalk({
      root: ctx.workspace.root,
      deadline: ctx.deadline,
      ignoreMatcher: ctx.ignoreMatcher,
      onSkipped: ctx.onSkippedFile,
      onTruncated: (reason) =>
        ctx.onDiscoveryTruncated(
          reason === "file-cap" ? "file-cap:java" : reason,
        ),
      skipDirs: ["target", "build", ".gradle"],
      isTestFile: (name) => JAVA_TEST_RE.test(name),
      onTestFile: (f) => ctx.testFiles.push(f),
      isFull: () => ctx.testFiles.length >= ctx.maxFiles,
      fixtureDirMemo: new Map(),
    });
  },

  async parseAst(file: ParsedFile): Promise<ParsedAst | undefined> {
    const tree = await parseJavaAst(file.text);
    if (!tree) return undefined;
    return { ast: tree, dispose: () => tree.delete() };
  },

  runRules(rules, file, emit, onCrash, budget) {
    // Phase 1 (Tempering): lazy codeText — computed on first access.
    let cachedCodeText: string | undefined;
    const enriched = Object.defineProperty({ ...file }, "codeText", {
      get() {
        if (cachedCodeText === undefined) {
          cachedCodeText = computeCodeText(file, "java");
        }
        return cachedCodeText;
      },
      enumerable: true,
      configurable: true,
    });
    for (const rule of rules) {
      if (!rule.appliesTo.includes(this.id)) continue;
      // Audit P-1: a single oversized file must not own the whole budget.
      if (budget && Date.now() > budget.deadline) {
        budget.onExceeded();
        return;
      }
      try {
        for (const f of rule.run(enriched)) {
          emit(f, rule.id, rule.category);
        }
      } catch (error) {
        // Crash isolation (§25) — counted and debuggable (R-9).
        onCrash?.(rule.id, error);
      }
    }
  },
};

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
