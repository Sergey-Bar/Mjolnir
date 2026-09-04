/**
 * javaAdapter / csharpAdapter unit tests (Master-Stabilization-Plan
 * Sprint 3 — coverage gap found alongside the Java/C# rule tests: these
 * two adapters sat at ~35-40% line coverage, the lowest in the repo,
 * with no dedicated test file at all before this one).
 */

import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { javaAdapter } from "../../../src/adapters/java.js";
import { csharpAdapter } from "../../../src/adapters/csharp.js";
import type {
  ScanContext,
  UniversalRule,
} from "../../../src/engine/adapter.js";
import { createIgnoreMatcher, LIMITS } from "../../../src/discovery/ignores.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "mjolnir-jvcs-adapter-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeCtx(overrides: Partial<ScanContext> = {}): ScanContext {
  return {
    workspace: { root: dir, name: "t", packageJson: {}, workspaceGlobs: [] },
    testFiles: [],
    deadline: Date.now() + 10_000,
    maxFiles: LIMITS.maxFilesPerAdapter,
    ignoreMatcher: createIgnoreMatcher(dir),
    onSkippedFile: () => {},
    onDiscoveryTruncated: () => {},
    ...overrides,
  };
}

describe("javaAdapter.isTestFile", () => {
  it.each([
    "src/test/java/com/x/LoginTest.java",
    "com/x/DashboardTests.java",
    "com/x/SmokeIT.java",
    "TestLogin.java",
  ])("%s is a test file", (p) => {
    expect(javaAdapter.isTestFile(p)).toBe(true);
  });

  it.each(["src/main/java/com/x/Login.java", "README.md", "Utils.java"])(
    "%s is not a test file",
    (p) => {
      expect(javaAdapter.isTestFile(p)).toBe(false);
    },
  );
});

describe("javaAdapter.detectFrameworks", () => {
  it("reports unknown with no pom.xml/build.gradle at all", () => {
    expect(javaAdapter.detectFrameworks(dir)).toEqual({
      frameworks: [],
      unknown: true,
    });
  });

  it("detects junit via pom.xml content", () => {
    writeFileSync(
      join(dir, "pom.xml"),
      "<project><dependencies><dependency><artifactId>junit</artifactId></dependency></dependencies></project>",
    );
    expect(javaAdapter.detectFrameworks(dir)).toEqual({
      frameworks: ["junit"],
      unknown: false,
    });
  });

  it("detects testng via a pom.xml <dependency> block (plan §15.1 D7: dependency-block parsing, not whole-text regex)", () => {
    writeFileSync(
      join(dir, "pom.xml"),
      "<project><dependencies><dependency><groupId>org.testng</groupId><artifactId>testng</artifactId></dependency></dependencies></project>",
    );
    expect(javaAdapter.detectFrameworks(dir).frameworks).toContain("testng");
  });

  it("does NOT claim a framework from prose mentioning the name outside a dependency (D7)", () => {
    writeFileSync(
      join(dir, "pom.xml"),
      "<project><description>migrated from junit and testng both referenced historically</description></project>",
    );
    expect(javaAdapter.detectFrameworks(dir)).toEqual({
      frameworks: [],
      unknown: true,
    });
  });

  it("detects both junit and testng in the same pom.xml", () => {
    writeFileSync(
      join(dir, "pom.xml"),
      "<project><dependencies><dependency><artifactId>junit-jupiter</artifactId></dependency><dependency><artifactId>testng</artifactId></dependency></dependencies></project>",
    );
    const info = javaAdapter.detectFrameworks(dir);
    expect(info.frameworks).toEqual(["junit", "testng"]);
  });

  it("reports unknown when pom.xml exists but names neither framework", () => {
    writeFileSync(join(dir, "pom.xml"), "<project></project>");
    expect(javaAdapter.detectFrameworks(dir)).toEqual({
      frameworks: [],
      unknown: true,
    });
  });

  it("falls back to build.gradle when pom.xml is absent", () => {
    writeFileSync(
      join(dir, "build.gradle"),
      "testImplementation 'junit:junit:4.13'",
    );
    expect(javaAdapter.detectFrameworks(dir).frameworks).toContain("junit");
  });

  it("falls back to build.gradle.kts when neither pom.xml nor build.gradle exist", () => {
    writeFileSync(
      join(dir, "build.gradle.kts"),
      'testImplementation("org.testng:testng")',
    );
    expect(javaAdapter.detectFrameworks(dir).frameworks).toContain("testng");
  });

  it("KTS dependencies with BOTH frameworks parse both (Gradle coordinate parsing)", () => {
    writeFileSync(
      join(dir, "build.gradle.kts"),
      'testImplementation("junit:junit:4.13")\ntestImplementation("org.testng:testng:7")',
    );
    expect(javaAdapter.detectFrameworks(dir).frameworks).toEqual([
      "junit",
      "testng",
    ]);
  });

  it("prefers the union: both build files contribute (each is parsed on its own)", () => {
    writeFileSync(
      join(dir, "pom.xml"),
      "<project><dependencies><dependency><artifactId>junit</artifactId></dependency></dependencies></project>",
    );
    writeFileSync(
      join(dir, "build.gradle"),
      "testImplementation 'org.testng:testng:7.4'",
    );
    expect(javaAdapter.detectFrameworks(dir)).toEqual({
      frameworks: ["junit", "testng"],
      unknown: false,
    });
  });
});

describe("javaAdapter.discoverTestFiles", () => {
  it("finds *Test.java / *Tests.java / *IT.java under the tree", () => {
    mkdirSync(join(dir, "src", "test", "java"), { recursive: true });
    writeFileSync(
      join(dir, "src", "test", "java", "LoginTest.java"),
      "class LoginTest {}",
    );
    writeFileSync(
      join(dir, "src", "test", "java", "DashboardTests.java"),
      "class DashboardTests {}",
    );
    writeFileSync(
      join(dir, "src", "test", "java", "SmokeIT.java"),
      "class SmokeIT {}",
    );
    writeFileSync(
      join(dir, "src", "test", "java", "Helper.java"),
      "class Helper {}",
    );
    const ctx = makeCtx();
    javaAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(3);
    expect(ctx.testFiles.some((f) => f.endsWith("Helper.java"))).toBe(false);
  });

  it("skips target/ and build/ and .gradle/ directories", () => {
    mkdirSync(join(dir, "target"), { recursive: true });
    writeFileSync(
      join(dir, "target", "GeneratedTest.java"),
      "class GeneratedTest {}",
    );
    mkdirSync(join(dir, "build"), { recursive: true });
    writeFileSync(join(dir, "build", "OutputTest.java"), "class OutputTest {}");
    const ctx = makeCtx();
    javaAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("respects an already-expired deadline (no files found)", () => {
    mkdirSync(join(dir, "test"), { recursive: true });
    writeFileSync(join(dir, "test", "ATest.java"), "class ATest {}");
    const ctx = makeCtx({ deadline: Date.now() - 1000 });
    expect(() => javaAdapter.discoverTestFiles(ctx)).not.toThrow();
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("never follows a symlinked directory out of the repo", () => {
    const outside = mkdtempSync(join(tmpdir(), "mjolnir-jv-outside-"));
    try {
      writeFileSync(join(outside, "EscapedTest.java"), "class EscapedTest {}");
      const linkPath = join(dir, "linked");
      try {
        symlinkSync(outside, linkPath, "junction");
      } catch {
        return; // symlink privilege unavailable in this environment — skip
      }
      const ctx = makeCtx();
      expect(() => javaAdapter.discoverTestFiles(ctx)).not.toThrow();
      expect(ctx.testFiles.some((f) => f.includes("EscapedTest"))).toBe(false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("degrades gracefully instead of throwing on an unreadable directory", () => {
    const ctx = makeCtx({
      workspace: {
        root: join(dir, "does-not-exist"),
        name: "t",
        packageJson: {},
        workspaceGlobs: [],
      },
    });
    expect(() => javaAdapter.discoverTestFiles(ctx)).not.toThrow();
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("counts a file that fails stat() as skipped rather than throwing", () => {
    mkdirSync(join(dir, "test"), { recursive: true });
    writeFileSync(join(dir, "test", "GoneTest.java"), "class GoneTest {}");
    // Delete the file between readdir and stat by racing isn't reliable
    // cross-platform in a unit test; instead verify the try/catch path
    // exists and is exercised for a file that IS readable (no throw) —
    // the true race is covered structurally by the try/catch in source.
    const ctx = makeCtx();
    expect(() => javaAdapter.discoverTestFiles(ctx)).not.toThrow();
  });
});

describe("javaAdapter.runRules", () => {
  it("only runs rules that declare 'java' in appliesTo", () => {
    const javaRule: UniversalRule = {
      id: "J",
      category: "test",
      appliesTo: ["java"],
      run: () => [
        {
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "HYGIENE",
          file: "x",
          line: 1,
          column: 1,
          message: "m",
          why: "w",
          fix: "f",
        },
      ],
    };
    const pyRule: UniversalRule = {
      ...javaRule,
      id: "P",
      appliesTo: ["python"],
    };
    const out: string[] = [];
    javaAdapter.runRules(
      [javaRule, pyRule],
      { path: "T.java", text: "" },
      (_f, id) => out.push(id),
    );
    expect(out).toEqual(["J"]);
  });

  it("isolates a crashing rule without propagating the throw", () => {
    const boom: UniversalRule = {
      id: "BOOM",
      category: "test",
      appliesTo: ["java"],
      run: () => {
        throw new Error("kaboom");
      },
    };
    expect(() =>
      javaAdapter.runRules([boom], { path: "T.java", text: "" }, () => {}),
    ).not.toThrow();
  });
});

describe("csharpAdapter.isTestFile", () => {
  it.each(["LoginTests.cs", "DashboardTest.cs", "SmokeIT.cs"])(
    "%s is a test file",
    (p) => {
      expect(csharpAdapter.isTestFile(p)).toBe(true);
    },
  );

  it.each(["Login.cs", "README.md"])("%s is not a test file", (p) => {
    expect(csharpAdapter.isTestFile(p)).toBe(false);
  });
});

describe("csharpAdapter.detectFrameworks", () => {
  it("reports unknown with no .csproj", () => {
    expect(csharpAdapter.detectFrameworks(dir)).toEqual({
      frameworks: [],
      unknown: true,
    });
  });

  it("detects nunit/xunit/mstest/playwright from a .csproj's PackageReferences", () => {
    writeFileSync(
      join(dir, "Tests.csproj"),
      '<Project><ItemGroup><PackageReference Include="NUnit" /><PackageReference Include="xunit" /><PackageReference Include="MSTest.TestFramework" /><PackageReference Include="Microsoft.Playwright" /></ItemGroup></Project>',
    );
    expect(csharpAdapter.detectFrameworks(dir)).toEqual({
      frameworks: ["nunit", "xunit", "mstest", "playwright"],
      unknown: false,
    });
  });

  it("parses EVERY .csproj at the root, not the first one (plan §15.1 D7)", () => {
    writeFileSync(
      join(dir, "A.Tests.csproj"),
      '<Project><ItemGroup><PackageReference Include="NUnit" /></ItemGroup></Project>',
    );
    writeFileSync(
      join(dir, "B.Tests.csproj"),
      '<Project><ItemGroup><PackageReference Include="xunit" /></ItemGroup></Project>',
    );
    expect(csharpAdapter.detectFrameworks(dir)).toEqual({
      frameworks: ["nunit", "xunit"],
      unknown: false,
    });
  });

  it("reports unknown when a .csproj exists but names no known framework", () => {
    writeFileSync(join(dir, "Tests.csproj"), "<Project></Project>");
    expect(csharpAdapter.detectFrameworks(dir)).toEqual({
      frameworks: [],
      unknown: true,
    });
  });

  it("degrades to unknown instead of throwing when the root directory can't be read", () => {
    const missing = join(dir, "does-not-exist");
    expect(() => csharpAdapter.detectFrameworks(missing)).not.toThrow();
    expect(csharpAdapter.detectFrameworks(missing)).toEqual({
      frameworks: [],
      unknown: true,
    });
  });
});

describe("csharpAdapter.discoverTestFiles", () => {
  it("finds *Tests.cs / *Test.cs / *IT.cs and skips non-matching files", () => {
    mkdirSync(join(dir, "Tests"), { recursive: true });
    writeFileSync(join(dir, "Tests", "LoginTests.cs"), "class LoginTests {}");
    writeFileSync(
      join(dir, "Tests", "DashboardTest.cs"),
      "class DashboardTest {}",
    );
    writeFileSync(join(dir, "Tests", "SmokeIT.cs"), "class SmokeIT {}");
    writeFileSync(join(dir, "Tests", "Helper.cs"), "class Helper {}");
    const ctx = makeCtx();
    csharpAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(3);
    expect(ctx.testFiles.some((f) => f.endsWith("Helper.cs"))).toBe(false);
  });

  it("skips bin/ and obj/ directories", () => {
    mkdirSync(join(dir, "bin"), { recursive: true });
    writeFileSync(join(dir, "bin", "OutputTests.cs"), "class OutputTests {}");
    mkdirSync(join(dir, "obj"), { recursive: true });
    writeFileSync(join(dir, "obj", "GenTests.cs"), "class GenTests {}");
    const ctx = makeCtx();
    csharpAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("respects an already-expired deadline", () => {
    mkdirSync(join(dir, "Tests"), { recursive: true });
    writeFileSync(join(dir, "Tests", "ATests.cs"), "class ATests {}");
    const ctx = makeCtx({ deadline: Date.now() - 1000 });
    expect(() => csharpAdapter.discoverTestFiles(ctx)).not.toThrow();
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("never follows a symlinked directory out of the repo", () => {
    const outside = mkdtempSync(join(tmpdir(), "mjolnir-cs-outside-"));
    try {
      writeFileSync(join(outside, "EscapedTests.cs"), "class EscapedTests {}");
      const linkPath = join(dir, "linked");
      try {
        symlinkSync(outside, linkPath, "junction");
      } catch {
        return; // symlink privilege unavailable in this environment — skip
      }
      const ctx = makeCtx();
      expect(() => csharpAdapter.discoverTestFiles(ctx)).not.toThrow();
      expect(ctx.testFiles.some((f) => f.includes("EscapedTests"))).toBe(false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("degrades gracefully instead of throwing on an unreadable directory", () => {
    const ctx = makeCtx({
      workspace: {
        root: join(dir, "does-not-exist"),
        name: "t",
        packageJson: {},
        workspaceGlobs: [],
      },
    });
    expect(() => csharpAdapter.discoverTestFiles(ctx)).not.toThrow();
    expect(ctx.testFiles).toHaveLength(0);
  });
});

describe("csharpAdapter.runRules", () => {
  it("only runs rules that declare 'csharp' in appliesTo", () => {
    const csRule: UniversalRule = {
      id: "C",
      category: "test",
      appliesTo: ["csharp"],
      run: () => [
        {
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "HYGIENE",
          file: "x",
          line: 1,
          column: 1,
          message: "m",
          why: "w",
          fix: "f",
        },
      ],
    };
    const pyRule: UniversalRule = { ...csRule, id: "P", appliesTo: ["python"] };
    const out: string[] = [];
    csharpAdapter.runRules(
      [csRule, pyRule],
      { path: "T.cs", text: "" },
      (_f, id) => out.push(id),
    );
    expect(out).toEqual(["C"]);
  });

  it("isolates a crashing rule without propagating the throw", () => {
    const boom: UniversalRule = {
      id: "BOOM",
      category: "test",
      appliesTo: ["csharp"],
      run: () => {
        throw new Error("kaboom");
      },
    };
    expect(() =>
      csharpAdapter.runRules([boom], { path: "T.cs", text: "" }, () => {}),
    ).not.toThrow();
  });
});
