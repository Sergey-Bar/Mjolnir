/**
 * Java/JUnit adapter (Upgrade-Plan-v3 Phase 4).
 *
 * Second tree-sitter consumer. Uses web-tree-sitter with the prebuilt
 * tree-sitter-java WASM grammar (tree-sitter-wasms package) — no native
 * compile, preserving the zero-network/cross-platform guarantees.
 *
 * Test discovery: src/test/java/**\/*Test.java, *Tests.java, *IT.java
 * (Maven/Gradle conventions).
 * Frameworks: JUnit/TestNG via build files + annotation scanning.
 *
 * Rules run over the file text (regex layer), same discipline as the
 * Python adapter's rule family — the AST seam is available for future
 * precision upgrades without touching the rule contract.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { isDefaultIgnored, LIMITS } from "../discovery/ignores.js";
import type {
  FrameworkInfo,
  LanguageAdapter,
  ScanContext,
} from "../engine/adapter.js";

const JAVA_TEST_RE = /(?:^|[\\/])(?:Test[A-Z]\w*|\w+Tests?|\w+IT)\.java$/;

export const javaAdapter: LanguageAdapter = {
  id: "java",
  extensions: [".java"],

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
    walkJava(
      ctx.workspace.root,
      ctx.workspace.root,
      ctx.testFiles,
      ctx.deadline,
      ctx.onSkippedFile,
    );
  },

  runRules(rules, file, emit) {
    for (const rule of rules) {
      if (!rule.appliesTo.includes(this.id)) continue;
      try {
        for (const f of rule.run(file)) {
          emit(f, rule.id, rule.category);
        }
      } catch {
        // Crash isolation (§25)
      }
    }
  },
};

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function walkJava(
  dir: string,
  root: string,
  out: string[],
  deadline: number,
  onSkipped: () => void,
): void {
  if (Date.now() > deadline || out.length > 10_000) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = full.slice(root.length + 1).replaceAll("\\", "/");
    if (isDefaultIgnored(rel)) continue;
    if (entry.isSymbolicLink()) continue; // never follow links out of the repo
    if (entry.isDirectory()) {
      if (["target", "build", ".gradle"].includes(entry.name)) continue;
      if (rel.split("/").length <= LIMITS.maxDepth)
        walkJava(full, root, out, deadline, onSkipped);
    } else if (entry.isFile() && JAVA_TEST_RE.test(entry.name)) {
      try {
        if (statSync(full).size <= LIMITS.maxFileBytes) out.push(full);
      } catch {
        onSkipped();
      }
    }
  }
}
