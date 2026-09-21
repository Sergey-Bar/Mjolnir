/**
 * MCP ⇄ CLI parity lock (remediation plan §9 R8, WI-21).
 *
 * The transport adds SHAPE, never MEANING: for equivalent inputs the
 * MCP result MUST deep-equal the CLI's canonical derivation (the same
 * runForensics engine call the CLI verbs make, plus the same renderers)
 * — including hostile inputs, where a corrupt report degrades to zero
 * records on BOTH surfaces, never to a fabricated clean run. The table
 * below walks every new tool × every fixture class; the hostile matrix
 * walks every tool × every hostile parameter shape.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { handleToolCall, MCP_ERRORS, MCP_TOOLS } from "../../src/mcp/server.js";
import { runForensics } from "../../src/forensics/run.js";
import { renderTriageWorkflowJson } from "../../src/forensics/triage.js";
import {
  summarizePwRun,
  renderPwRunSummary,
} from "../../src/commands/pw-report.js";

const createdDirs: string[] = [];
function tmpRepo(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-mcp-parity-${prefix}-`));
  createdDirs.push(d);
  return d;
}
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

const TOOLS = ["forensics", "triage", "pw-report"] as const;

const PLAYWRIGHT_REPORT = {
  suites: [
    {
      title: "shop.spec.ts",
      specs: [
        {
          title: "checkout retries into pass",
          file: "e2e/shop.spec.ts",
          tests: [
            {
              results: [
                { status: "failed", duration: 400 },
                { status: "passed", duration: 600 },
              ],
            },
          ],
        },
        {
          title: "cart renders",
          file: "e2e/shop.spec.ts",
          tests: [{ results: [{ status: "passed", duration: 120 }] }],
        },
        {
          title: "payment hard-fails",
          file: "e2e/pay.spec.ts",
          tests: [{ results: [{ status: "failed", duration: 900 }] }],
        },
        {
          title: "beta flag skips",
          file: "e2e/flag.spec.ts",
          tests: [{ results: [{ status: "skipped", duration: 0 }] }],
        },
      ],
    },
  ],
};

const JUNIT_XML = `<?xml version="1.0"?>
<testsuite tests="3" failures="1" skipped="1">
  <testcase classname="tests/test_a.py" name="test_ok" time="0.100"/>
  <testcase classname="tests/test_a.py" name="test_bad" time="1.5">
    <failure message="assert 1 == 2">boom</failure>
  </testcase>
  <testcase classname="tests/test_b.py" name="test_skip" time="0">
    <skipped type="pytest.skip" message="wip"/>
  </testcase>
</testsuite>`;

/** The canonical CLI derivation the MCP result must equal 1:1. */
function cliDerivation(tool: (typeof TOOLS)[number], path: string): unknown {
  const { report } = runForensics(path, { writeFlakyMd: false });
  if (tool === "forensics") return report;
  if (tool === "triage") {
    return {
      workflow: JSON.parse(renderTriageWorkflowJson(report)) as Record<
        string,
        unknown
      >,
    };
  }
  return { report, summary: renderPwRunSummary(summarizePwRun(report)) };
}

describe("MCP result ≡ CLI result for the same fixture (parity table)", () => {
  const fixtures: Array<{ name: string; build: () => string }> = [
    {
      name: "playwright-json report",
      build: () => {
        const d = tmpRepo("pw");
        writeFileSync(
          join(d, "report.json"),
          JSON.stringify(PLAYWRIGHT_REPORT),
        );
        return d;
      },
    },
    {
      name: "junit xml report",
      build: () => {
        const d = tmpRepo("junit");
        writeFileSync(join(d, "report.xml"), JUNIT_XML);
        return d;
      },
    },
    {
      name: "hostile corrupt report (degrades to zero records, never a clean run)",
      build: () => {
        const d = tmpRepo("hostile");
        writeFileSync(join(d, "report.json"), "not json at all {{{");
        return d;
      },
    },
    {
      name: "directory with no recognized reports",
      build: () => tmpRepo("empty"),
    },
  ];

  for (const fixture of fixtures) {
    for (const tool of TOOLS) {
      it(`${tool} ≡ CLI derivation on ${fixture.name}`, async () => {
        const dir = fixture.build();
        const res = await handleToolCall({
          id: 1,
          name: tool,
          args: { path: dir },
        });
        expect(res.error).toBeUndefined();
        expect(res.result).toEqual(cliDerivation(tool, dir));
      });
    }
  }

  it("the catalog advertises the three runtime-evidence tools (required: path)", () => {
    for (const tool of TOOLS) {
      const entry = MCP_TOOLS.find((t) => t.name === tool);
      expect(entry, tool).toBeDefined();
      expect(entry?.inputSchema.required).toEqual(["path"]);
    }
  });
});

describe("hostile parameter matrix — every new tool", () => {
  const shapes: Array<{
    what: string;
    args: Record<string, unknown>;
    fragment: string;
  }> = [
    { what: "missing path", args: {}, fragment: "path" },
    { what: "empty path", args: { path: "" }, fragment: "non-empty string" },
    {
      what: "non-string path",
      args: { path: 42 },
      fragment: "non-empty string",
    },
  ];
  for (const tool of TOOLS) {
    for (const shape of shapes) {
      it(`${tool}: ${shape.what} ⇒ INVALID_PARAMS`, async () => {
        const res = await handleToolCall({
          id: 2,
          name: tool,
          args: shape.args,
        });
        expect(res.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
        expect(res.error?.message).toContain(shape.fragment);
      });
    }
    it(`${tool}: nonexistent path ⇒ INVALID_PARAMS naming the target, not a crash`, async () => {
      const missing = join(tmpRepo("missing"), "no-such-dir");
      const res = await handleToolCall({
        id: 3,
        name: tool,
        args: { path: missing },
      });
      expect(res.error?.code).toBe(MCP_ERRORS.INVALID_PARAMS);
      expect(res.error?.message).toContain("does not exist");
      expect(res.error?.message).toContain("no-such-dir");
    });
  }
});
