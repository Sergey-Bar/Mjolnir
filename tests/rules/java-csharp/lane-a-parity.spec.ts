/**
 * Lane A migration parity tests (blueprint §10 dossier — hard-sleep
 * JV/CS family): the QA-model re-expression must be finding-IDENTICAL
 * to the lexical baseline on every committed fixture, PLUS the grammar
 * precision gains (comment/string/declaration containment).
 *
 * Pattern note: tree parsing mirrors tests/engine/analysis/qa-model.spec.ts
 * (expect(tree).toBeDefined() + disposal push). Runtime AST shape:
 * parseJavaAst/parseCSharpAst return the TREE directly — ctx.ast carries
 * it unwrapped, exactly as the scan pipeline does.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { jvWaitForTimeout } from "../../../src/rules/java/qa-jv-105-wait-for-timeout.js";
import { csWaitForTimeout } from "../../../src/rules/csharp/qa-cs-105-wait-for-timeout.js";
import {
  parseJavaAst,
  parseCSharpAst,
  disposeTree,
} from "../../../src/engine/tree-sitter-ast.js";
import type { Tree } from "web-tree-sitter";
import type { QADoctorRule } from "../../../src/rules/rule.js";

const FIXTURES = join(process.cwd(), "tests", "fixtures");

const trees: Array<Tree | undefined> = [];
afterEach(() => {
  for (const t of trees) disposeTree(t);
  trees.length = 0;
});

function ctxWithAst(
  rule: QADoctorRule,
  path: string,
  text: string,
  tree: Tree,
): Parameters<QADoctorRule["run"]>[0] {
  void rule;
  return { path, text, ast: tree };
}

async function javaTree(rel: string): Promise<Tree> {
  const text = readFileSync(join(FIXTURES, rel), "utf8");
  const tree = await parseJavaAst(text);
  expect(tree).toBeDefined();
  trees.push(tree);
  return tree as Tree;
}

async function csTree(rel: string): Promise<Tree> {
  const text = readFileSync(join(FIXTURES, rel), "utf8");
  const tree = await parseCSharpAst(text);
  expect(tree).toBeDefined();
  trees.push(tree);
  return tree as Tree;
}

describe("Lane A: QA-JV-105 parity (QA-model vs lexical baseline)", () => {
  it("must-fire fixture: identical finding via the model", async () => {
    const path = "QA-JV-105/must-fire/ModalTest.java";
    const findings = jvWaitForTimeout.run(
      ctxWithAst(
        jvWaitForTimeout,
        "ModalTest.java",
        readFileSync(join(FIXTURES, path), "utf8"),
        await javaTree(path),
      ),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(8); // the waitForTimeout call line
    expect(findings[0]?.message).toContain("waitForTimeout");
  });

  it("must-not-fire fixture: prose/comment mentions do NOT fire (grammar precision)", async () => {
    const path = "QA-JV-105/must-not-fire/ProseMentions.java";
    const findings = jvWaitForTimeout.run(
      ctxWithAst(
        jvWaitForTimeout,
        "ProseMentions.java",
        readFileSync(join(FIXTURES, path), "utf8"),
        await javaTree(path),
      ),
    );
    // The model sees no invocation node — the comment/string/declaration
    // prose is invisible to the grammar (rev-1's adjudicated FP class).
    expect(findings).toHaveLength(0);
  });

  it("string-literal containment: structurally impossible via the model", async () => {
    const text = 'String s = "page.waitForTimeout(1000)"; // prose\n';
    const tree = await parseJavaAst(text);
    expect(tree).toBeDefined();
    trees.push(tree);
    const findings = jvWaitForTimeout.run(
      ctxWithAst(jvWaitForTimeout, "S.java", text, tree as Tree),
    );
    expect(findings).toHaveLength(0);
  });

  it("grammar-error body: the model still extracts the real call (error-tolerant parse)", async () => {
    // A body with a tree-sitter ERROR node (unclosed brace) — the parse
    // is error-tolerant, so the real call is still reported; no silent
    // drop and no crash.
    const text = "class A { void m() { page.waitForTimeout(50); ";
    const tree = await parseJavaAst(text);
    expect(tree).toBeDefined();
    trees.push(tree);
    const findings = jvWaitForTimeout.run(
      ctxWithAst(jvWaitForTimeout, "A.java", text, tree as Tree),
    );
    expect(findings).toHaveLength(1);
  });

  it("no AST (parse declined): the lexical fallback preserves rev-1 behavior", () => {
    const findings = jvWaitForTimeout.run({
      path: "T.java",
      text: "page.waitForTimeout(1000);",
    });
    expect(findings).toHaveLength(1);
  });

  it("non-.java files never fire on either path", () => {
    expect(
      jvWaitForTimeout.run({
        path: "T.cs",
        text: "page.waitForTimeout(1);",
      }),
    ).toEqual([]);
  });

  it("the rule declares QA_MODEL + detectorRevision 2 (§10 dossier)", () => {
    expect(jvWaitForTimeout.detectionStrategy).toBe("QA_MODEL");
    expect(jvWaitForTimeout.detectorRevision).toBe(2);
  });
});

describe("Lane A: QA-CS-105 parity (QA-model vs lexical baseline)", () => {
  it("must-fire fixture: identical finding via the model", async () => {
    const path = "QA-CS-105/must-fire/ModalTests.cs";
    const findings = csWaitForTimeout.run(
      ctxWithAst(
        csWaitForTimeout,
        "ModalTests.cs",
        readFileSync(join(FIXTURES, path), "utf8"),
        await csTree(path),
      ),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(10); // the WaitForTimeoutAsync call line
  });

  it("must-not-fire fixture: prose/comment mentions do NOT fire (grammar precision)", async () => {
    const path = "QA-CS-105/must-not-fire/ProseMentions.cs";
    const findings = csWaitForTimeout.run(
      ctxWithAst(
        csWaitForTimeout,
        "ProseMentions.cs",
        readFileSync(join(FIXTURES, path), "utf8"),
        await csTree(path),
      ),
    );
    expect(findings).toHaveLength(0);
  });

  it("a real .NET call fires via the model (grammar path)", async () => {
    const tree = await parseCSharpAst(
      "await Page.WaitForTimeoutAsync(2000);\n",
    );
    expect(tree).toBeDefined();
    trees.push(tree);
    const findings = csWaitForTimeout.run(
      ctxWithAst(
        csWaitForTimeout,
        "T.cs",
        "await Page.WaitForTimeoutAsync(2000);\n",
        tree as Tree,
      ),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("WaitForTimeoutAsync");
  });

  it("no AST (parse declined): the lexical fallback preserves rev-1 behavior", () => {
    const findings = csWaitForTimeout.run({
      path: "T.cs",
      text: "await Page.WaitForTimeoutAsync(2000);",
    });
    expect(findings).toHaveLength(1);
  });

  it("non-.cs files never fire on either path", () => {
    expect(
      csWaitForTimeout.run({
        path: "T.java",
        text: "WaitForTimeoutAsync(1);",
      }),
    ).toEqual([]);
  });

  it("the rule declares QA_MODEL + detectorRevision 2 (§10 dossier)", () => {
    expect(csWaitForTimeout.detectionStrategy).toBe("QA_MODEL");
    expect(csWaitForTimeout.detectorRevision).toBe(2);
  });
});

describe("Lane A: registry consistency", () => {
  it("both migrated rules are registered with rev 2 + QA_MODEL", async () => {
    const { RULES } = await import("../../../src/rules/index.js");
    const jv = RULES.find((r) => r.id === "QA-JV-105");
    const cs = RULES.find((r) => r.id === "QA-CS-105");
    expect(jv?.detectorRevision).toBe(2);
    expect(cs?.detectorRevision).toBe(2);
    expect(jv?.detectionStrategy).toBe("QA_MODEL");
    expect(cs?.detectionStrategy).toBe("QA_MODEL");
  });
});
