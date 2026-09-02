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
 * Frameworks (plan §15.1, D7): repo-level detection parses the actual
 * dependency declarations in pom.xml (Maven `<dependency>` blocks) and
 * build.gradle(.kts) dependency statements — junit-jupiter/junit4,
 * testng, selenium. Per-file tags come from the file's own import
 * declarations (the parsed tree's `import_declaration` nodes).
 * Rules match test annotations (`@Disabled`, `@Test`, …) via regex over
 * the file text — there is no separate annotation-scanning pass.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { sharedWalk } from "../discovery/shared-walk.js";
import { computeCodeText } from "../engine/code-text.js";
import { parseJavaAst } from "../engine/tree-sitter-ast.js";
import {
  frameworkFilterApplies,
  type FrameworkInfo,
  type LanguageAdapter,
  type ParsedAst,
  type ParsedFile,
  type ScanContext,
} from "../engine/adapter.js";

const JAVA_TEST_RE = /(?:^|[\\/])(?:Test[A-Z]\w*|\w+Tests?|\w+IT)\.java$/;

/** Dependency-artifact → framework tag (Maven `<artifactId>` / Gradle coordinate). */
const JAVA_ARTIFACT_TAGS: Array<{ re: RegExp; tag: string }> = [
  { re: /junit[-_]?jupiter|^junit$|^junit4$/i, tag: "junit" },
  { re: /testng/i, tag: "testng" },
  { re: /selenium/i, tag: "selenium" },
  { re: /playwright/i, tag: "playwright" },
];

export const javaAdapter: LanguageAdapter = {
  id: "java",
  extensions: [".java"],
  testFileGlobs: ["Test*.java", "*Test.java", "*Tests.java", "*IT.java"],
  dirSkips: ["target", "build", ".gradle"],

  isTestFile(path: string): boolean {
    return JAVA_TEST_RE.test(path);
  },

  detectFrameworks(root: string): FrameworkInfo {
    const frameworks = new Set<string>();

    // Maven: parse <dependency> blocks (D7 — dependency-block parsing,
    // not a bare "junit appears anywhere in the file" regex).
    const pomPath = join(root, "pom.xml");
    if (existsSync(pomPath)) {
      try {
        const text = readText(pomPath);
        for (const block of text.matchAll(
          /<dependency>[\s\S]*?<\/dependency>/g,
        )) {
          const artifact =
            /<artifactId>([^<]+)<\/artifactId>/.exec(block[0])?.[1] ?? "";
          for (const { re, tag } of JAVA_ARTIFACT_TAGS) {
            if (re.test(artifact)) frameworks.add(tag);
          }
        }
      } catch {
        /* unreadable — skip */
      }
    }

    // Gradle: dependency statements with group:artifact:version
    // coordinates (GString/config-block aware enough for coordinates;
    // the artifact segment is what carries the framework identity).
    for (const gradle of ["build.gradle", "build.gradle.kts"]) {
      const path = join(root, gradle);
      if (!existsSync(path)) continue;
      try {
        const text = readText(path);
        for (const m of text.matchAll(
          /(?:implementation|testImplementation|api|testFixturesImplementation|compile|testCompile)\s*(?:\(|\s)[^\n]*?["']([^"']+)["']/g,
        )) {
          const coordinate = m[1] ?? "";
          const artifact = coordinate.split(":")[1] ?? "";
          for (const { re, tag } of JAVA_ARTIFACT_TAGS) {
            if (re.test(artifact)) frameworks.add(tag);
          }
        }
      } catch {
        /* unreadable — skip */
      }
    }

    if (frameworks.size === 0) return { frameworks: [], unknown: true };
    return { frameworks: [...frameworks], unknown: false };
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
    const enriched = Object.defineProperty(
      { ...file, frameworkTags: javaFileTags(file) },
      "codeText",
      {
        get() {
          if (cachedCodeText === undefined) {
            cachedCodeText = computeCodeText(file, "java");
          }
          return cachedCodeText;
        },
        enumerable: true,
        configurable: true,
      },
    );
    for (const rule of rules) {
      if (!rule.appliesTo.includes(this.id)) continue;
      // §15.1: framework opt-in filtering (open-when-unknown — a file
      // with no import-derived tags is analyzed by every rule).
      if (!frameworkFilterApplies(rule, enriched)) continue;
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

/**
 * Per-file tags from the parsed tree's `import_declaration` nodes (D7):
 * `import org.junit.jupiter.api.Test` → "junit", TestNG → "testng",
 * org.openqa.selenium → "selenium". Uses the AST (not the raw text), so
 * comments/strings never tag a file.
 */
function javaFileTags(file: ParsedFile): string[] {
  const ast = file.ast;
  if (
    !(ast instanceof Object) ||
    !("rootNode" in ast) ||
    !((ast as { rootNode?: unknown }).rootNode instanceof Object)
  ) {
    return [];
  }
  const root = (
    ast as {
      rootNode: {
        descendantsOfType(t: string): Array<{ text?: string } | null>;
      };
    }
  ).rootNode;
  const tags = new Set<string>();
  for (const imp of root.descendantsOfType("import_declaration")) {
    if (!imp) continue;
    const t = imp.text ?? "";
    if (/junit/i.test(t)) tags.add("junit");
    if (/testng/i.test(t)) tags.add("testng");
    if (/selenium/i.test(t)) tags.add("selenium");
    if (/playwright/i.test(t)) tags.add("playwright");
  }
  return [...tags];
}

/** All sibling build files worth checking (monorepo submodule poms). */
export function javaBuildFiles(root: string): string[] {
  try {
    return readdirSync(root).filter((f) =>
      /pom\.xml$|build\.gradle(?:\.kts)?$/.test(f),
    );
  } catch {
    return [];
  }
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
