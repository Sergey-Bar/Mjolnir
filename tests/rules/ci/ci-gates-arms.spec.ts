/**
 * CI gate-helper arms coverage (azure-gates.ts + jenkins-gates.ts).
 * The shipped-repo PASS paths run through the rules' own suites; this
 * file drives every locator/gate-classification arm directly (the
 * no-anchor floors, the far-key fallbacks, the task-command vocabulary,
 * and the string-aware scanner's hostile shapes).
 */

import { describe, expect, it } from "vitest";

import {
  isAzurePipelineDoc,
  azureStepGateText,
  stepIsVerificationGate,
  jobRunsVerificationGate,
  locateAzureStepKey,
  locateAzureJobKey,
} from "../../../src/rules/ci/azure-gates.js";
import {
  shSegments,
  catchErrorBlocks,
  tryCatchPairs,
  textIsVerificationGate,
  lineOfOffset,
} from "../../../src/rules/ci/jenkins-gates.js";

describe("isAzurePipelineDoc", () => {
  it("accepts only the azure-pipelines platform marker", () => {
    expect(isAzurePipelineDoc({ platform: "azure-pipelines" })).toBe(true);
    expect(isAzurePipelineDoc({ platform: "github" })).toBe(false);
    expect(isAzurePipelineDoc(null)).toBe(false);
    expect(isAzurePipelineDoc(42)).toBe(false);
  });
});

describe("azureStepGateText / stepIsVerificationGate", () => {
  it("joins the inline script and every string task input", () => {
    const text = azureStepGateText({
      script: "npm test",
      inputs: { command: "test", extra: 7 },
    });
    expect(text).toContain("npm test");
    expect(text).toContain("test");
    expect(text).not.toContain("7");
  });

  it("task-command vocabulary: Npm@1 with command test/t is a gate", () => {
    expect(
      stepIsVerificationGate({ task: "Npm@1", inputs: { command: "test" } }),
    ).toBe(true);
    expect(
      stepIsVerificationGate({ task: "npm@0", inputs: { command: "t" } }),
    ).toBe(true);
  });

  it("Npm@1 custom command is a gate only when it matches the gate vocabulary", () => {
    expect(
      stepIsVerificationGate({
        task: "Npm@1",
        inputs: { command: "custom", customCommand: "npx playwright test" },
      }),
    ).toBe(true);
    expect(
      stepIsVerificationGate({
        task: "Npm@1",
        inputs: { command: "custom", customCommand: "echo hello" },
      }),
    ).toBe(false);
  });

  it("Npm@1 without inputs and non-npm tasks fall back to the text regex", () => {
    expect(stepIsVerificationGate({ task: "Npm@1" })).toBe(false);
    expect(
      stepIsVerificationGate({
        task: "Bash@3",
        script: "npx playwright test",
      }),
    ).toBe(true);
    expect(stepIsVerificationGate({})).toBe(false);
  });

  it("jobRunsVerificationGate scans every step", () => {
    expect(
      jobRunsVerificationGate({
        name: "j",
        kind: "job",
        steps: [{ script: "echo hi" }, { script: "npm test" }],
      }),
    ).toBe(true);
    expect(
      jobRunsVerificationGate({
        name: "j",
        kind: "job",
        steps: [{ script: "echo hi" }],
      }),
    ).toBe(false);
  });
});

describe("locateAzureStepKey arms", () => {
  const text = [
    "steps:",
    "  - task: Npm@1",
    "    continueOnError: true",
    "    inputs:",
    "      command: test",
  ].join("\n");

  it("anchors on the step's task and finds the key AFTER it", () => {
    const line = locateAzureStepKey(text, { task: "Npm@1" }, "continueOnError");
    expect(line).toBe(3);
  });

  it("anchor present but the key only appears BEFORE it ⇒ falls back to the anchor's own line", () => {
    const t = ["continueOnError: true", "  - script: echo hi"].join("\n");
    const line = locateAzureStepKey(
      t,
      { script: "echo hi" },
      "continueOnError",
    );
    expect(line).toBe(2);
  });

  it("no anchor (empty step) ⇒ the key anywhere in the file is the honest floor", () => {
    expect(locateAzureStepKey(text, {}, "continueOnError")).toBe(3);
  });

  it("no anchor and no key anywhere ⇒ line 1", () => {
    expect(locateAzureStepKey("steps: []", {}, "continueOnError")).toBe(1);
  });

  it("a multi-line script anchors on its first non-blank line", () => {
    const t = [
      "steps:",
      "  - script: |",
      "      echo hi",
      "      npm test",
      "    continueOnError: true",
    ].join("\n");
    const line = locateAzureStepKey(
      t,
      { script: "echo hi\nnpm test" },
      "continueOnError",
    );
    expect(line).toBe(5);
  });
});

describe("locateAzureJobKey arms", () => {
  const text = ["jobs:", "  - job: Test", "    continueOnError: true"].join(
    "\n",
  );

  it("anchors on the job name and finds the key after it", () => {
    expect(
      locateAzureJobKey(text, { name: "Test" } as never, "continueOnError"),
    ).toBe(3);
  });

  it("anchor present but the key only appears before it ⇒ the anchor's line", () => {
    const t = ["continueOnError: true", "  - job: Test"].join("\n");
    expect(
      locateAzureJobKey(t, { name: "Test" } as never, "continueOnError"),
    ).toBe(2);
  });

  it("no anchor ⇒ the key anywhere in the file", () => {
    const t = "continueOnError: true";
    const job = { kind: "job", steps: [] };
    expect(locateAzureJobKey(t, job as never, "continueOnError")).toBe(1);
  });

  it("no anchor and no key ⇒ line 1", () => {
    const job = { kind: "job", steps: [] };
    expect(locateAzureJobKey("jobs: []", job as never, "condition")).toBe(1);
  });
});

describe("jenkins scanner arms — string-aware structural map", () => {
  it("a triple-quoted string's parens never desynchronize the scan", () => {
    const jf = [
      "pipeline {",
      "  stages {",
      "    stage('t') {",
      "      steps {",
      "        sh '''",
      "          echo '(never closes a paren",
      "        '''",
      "      }",
      "    }",
      "  }",
      "}",
    ].join("\n");
    const segs = shSegments(jf);
    expect(segs.length).toBe(1);
    expect(segs[0]?.text).toContain("(never closes");
  });

  it("an unterminated triple-quote consumes to EOF (honest no-detection)", () => {
    const segs = shSegments("x = '''never closed\nsh 'npm test'");
    // The whole tail rides inside the unterminated string — nothing structural.
    expect(segs).toEqual([]);
  });

  it("an escaped quote inside a string does not close it", () => {
    const jf = "sh 'echo \\'(paren\\' && npm test'";
    const segs = shSegments(jf);
    expect(segs.length).toBe(1);
    expect(segs[0]?.text).toContain("npm test");
  });

  it("line comments and block comments are non-structural (both arms)", () => {
    const closed = "/* ( comment */\nsh 'npm test'";
    expect(shSegments(closed)).toHaveLength(1);
    const unterminated = "/* ( never closed\nsh 'npm test'";
    expect(shSegments(unterminated)).toEqual([]);
  });

  it("the command-call form ends at a newline, a semicolon, or a // comment", () => {
    expect(shSegments("sh 'npm test'\nother()")[0]?.text).toBe("sh 'npm test'");
    expect(shSegments("sh 'npm test'; x()")[0]?.text).toBe("sh 'npm test'");
    expect(shSegments("sh 'npm test' // done")[0]?.text).toBe("sh 'npm test'");
  });

  it("a bare `sh` keyword with no argument is too small to be a segment", () => {
    expect(shSegments("sh")).toEqual([]);
  });

  it("an unbalanced paren form stops honestly (no fabricated block)", () => {
    expect(shSegments("sh('npm test")).toEqual([]);
  });

  it("catchError without a brace body and with a far brace both degrade honestly", () => {
    // Closure form without a body:
    expect(catchErrorBlocks("catchError(buildResult: 'SUCCESS')")).toEqual([]);
    // A `{` more than 40 chars after the paren group is not this closure's body:
    const far = `catchError(buildResult: 'SUCCESS')\n${"x".repeat(50)}\n{ }`;
    expect(catchErrorBlocks(far)).toEqual([]);
    // The normal paren+brace shape:
    const normal = "catchError(buildResult: 'SUCCESS') {\n  sh 'npm test'\n}";
    expect(catchErrorBlocks(normal)).toHaveLength(1);
  });

  it("tryCatchPairs degrade honestly on every non-pair shape", () => {
    // try never closes:
    expect(tryCatchPairs("try { never")).toEqual([]);
    // try with no catch:
    expect(tryCatchPairs("try { x() }\nfoo()")).toEqual([]);
    // finally before catch ⇒ the far catch belongs to an outer try:
    expect(tryCatchPairs("try { x() } finally { } catch (e) { }")).toEqual([]);
    // a catch farther than 200 chars is not this try's catch:
    const far = `try { x() }\n${"y".repeat(210)}\ncatch (e) { }`;
    expect(tryCatchPairs(far)).toEqual([]);
    // the ( too far after `catch`:
    const farParen = `try { x() } catch\n${"y".repeat(30)}(e) { }`;
    expect(tryCatchPairs(farParen)).toEqual([]);
    // an unbalanced catch paren:
    expect(tryCatchPairs("try { x() } catch (e { }")).toEqual([]);
    // a catch without a brace body:
    expect(tryCatchPairs("try { x() } catch (e)\nnothing")).toEqual([]);
    // the normal pair:
    const normal =
      "try {\n  sh 'npm test'\n} catch (e) {\n  echo 'swallowed'\n}";
    const pairs = tryCatchPairs(normal);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.catchBlock.text).toContain("swallowed");
  });

  it("textIsVerificationGate rides the shared allowlist; lineOfOffset counts lines", () => {
    expect(textIsVerificationGate("npx playwright test")).toBe(true);
    expect(textIsVerificationGate("echo hello")).toBe(false);
    expect(lineOfOffset("a\nb\nc", 4)).toBe(3);
    expect(lineOfOffset("abc", 2)).toBe(1);
  });
});
