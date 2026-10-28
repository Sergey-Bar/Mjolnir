/**
 * Every CI consumer's CLI command, run against the real CLI.
 *
 * The Action, the `ci install` npx template and this repository's PR workflow
 * all render the `--json` report their scan step saved. Through 6.0.0 they
 * called `summary` and `pr-comment --from`, the verbs the v6 carve retired onto
 * `--format github-summary` and `--format pr-comment`, so each one exited 10 on
 * every run. The Action failed every consumer's job, clean scan or not. The
 * template's `continue-on-error` steps produced nothing. This repository
 * posted "report unavailable" on its own pull requests. Four specs asserted the
 * command TEXT, and text is satisfied by a command that cannot run.
 *
 * So the commands here are extracted from the file that ships them and
 * executed, with a report saved by a real scan and the environment a GitHub
 * runner sets. A consumer that names a verb, a format or a flag the CLI does
 * not accept fails here, whatever the YAML says.
 *
 * The Action pins a PUBLISHED version and these tests run the working tree. A
 * stable release moves the Action's default to the version being released,
 * so the working tree is the CLI each command will run once it ships.
 */

import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";

import { parseArgs } from "../../src/cli.js";
import { TEMPLATE } from "../../src/integrations/ci-install.js";
import { UNIFIED_MARKER } from "../../src/reporter/pr-report-shared.js";

const ROOT = join(import.meta.dirname, "..", "..");
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const ENTRY = join(ROOT, "src", "cli.ts");

interface Step {
  name?: string;
  run?: string;
}

function stepsOf(yamlText: string, job?: string): Step[] {
  const doc = parse(yamlText) as {
    runs?: { steps?: Step[] };
    jobs?: Record<string, { steps?: Step[] }>;
  };
  if (job === undefined) return doc.runs?.steps ?? [];
  return doc.jobs?.[job]?.steps ?? [];
}

function runOf(steps: Step[], name: string): string {
  const step = steps.find((s) => s.name === name);
  expect(step, `no step named "${name}"`).toBeDefined();
  return step?.run ?? "";
}

/**
 * The CLI arguments of the first line in `run` that launches the CLI through
 * `launcher`, with the shell's redirect or pipe cut off. Every consumer here
 * passes plain tokens, so whitespace is the only separator to honour.
 */
function cliArgs(run: string, launcher: string): string[] {
  const line = run.split("\n").find((l) => l.includes(launcher));
  expect(line, `no line launches the CLI with ${launcher}`).toBeDefined();
  const rest = (line ?? "").slice(
    (line ?? "").indexOf(launcher) + launcher.length,
  );
  return (rest.split(/\s[>|]/)[0] ?? "").trim().split(/\s+/).filter(Boolean);
}

const ACTION = readFileSync(join(ROOT, "action.yml"), "utf8");
const PR_WORKFLOW = readFileSync(
  join(ROOT, ".github", "workflows", "mjolnir.yml"),
  "utf8",
);

const actionSteps = stepsOf(ACTION);
const templateSteps = stepsOf(TEMPLATE("error"), "scan");
const workflowSteps = stepsOf(PR_WORKFLOW, "scan");

type Render = "pr-comment" | "github-summary";

const RENDERS: ReadonlyArray<{
  consumer: string;
  argv: string[];
  render: Render;
}> = [
  {
    consumer: "action.yml: Generate unified PR report",
    argv: cliArgs(
      runOf(actionSteps, "Generate unified PR report"),
      '"$MJ_PACKAGE"',
    ),
    render: "pr-comment",
  },
  {
    consumer: "action.yml: Emit annotations + step summary",
    argv: cliArgs(
      runOf(actionSteps, "Emit annotations + step summary"),
      '"$MJ_PACKAGE"',
    ),
    render: "github-summary",
  },
  {
    consumer: "ci install template: Annotations + Job Summary",
    argv: cliArgs(runOf(templateSteps, "Annotations + Job Summary"), ".tgz"),
    render: "github-summary",
  },
  {
    consumer: "ci install template: Render PR comment",
    argv: cliArgs(runOf(templateSteps, "Render PR comment"), ".tgz"),
    render: "pr-comment",
  },
  {
    consumer: "mjolnir.yml: Render unified report",
    argv: cliArgs(
      runOf(workflowSteps, "Render unified report"),
      "node dist/cli.mjs",
    ),
    render: "pr-comment",
  },
];

/** A committed repository with one finding, and the report its scan saved. */
let workspace = "";
let head = "";
let summaries = 0;
const scratch: string[] = [];

function git(...args: string[]): string {
  return execFileSync(
    "git",
    [
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@t",
      "-c",
      "core.autocrlf=false",
      ...args,
    ],
    { cwd: workspace, encoding: "utf8" },
  ).trim();
}

function cli(
  argv: string[],
  env: NodeJS.ProcessEnv = {},
): { code: number | null; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, [TSX, ENTRY, ...argv], {
    cwd: workspace,
    encoding: "utf8",
    maxBuffer: 1 << 26,
    env: { ...process.env, ...env },
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), "mjolnir-ci-render-"));
  scratch.push(workspace);
  mkdirSync(join(workspace, "src"), { recursive: true });
  mkdirSync(join(workspace, ".github", "workflows"), { recursive: true });
  writeFileSync(
    join(workspace, "package.json"),
    '{"name":"fixture","version":"1.0.0","scripts":{"test":"vitest run"}}\n',
  );
  writeFileSync(
    join(workspace, "src", "index.ts"),
    "export function add(a: number, b: number): number {\n  return a + b;\n}\n",
  );
  writeFileSync(
    join(workspace, "src", "index.test.ts"),
    'import { add } from "./index.js";\nit("adds", () => {\n  expect(add(1, 1)).toBe(2);\n});\n',
  );
  // QA-CI-009: a piped test command without pipefail, so the summary has a
  // finding to annotate.
  writeFileSync(
    join(workspace, ".github", "workflows", "ci.yml"),
    "name: ci\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test | tee test.log\n",
  );
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture");
  head = git("rev-parse", "HEAD");
  const scan = cli([".", "--json", "--blocking", "none"], {
    GITHUB_ACTIONS: "",
    GITHUB_STEP_SUMMARY: "",
  });
  expect(scan.code, scan.stderr).toBe(0);
  writeFileSync(join(workspace, "mjolnir.json"), scan.stdout);
}, 120_000);

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

describe("every CI consumer's render command runs against the real CLI", () => {
  it("each consumer was found and renders the saved report", () => {
    expect(RENDERS).toHaveLength(5);
    for (const { consumer, argv } of RENDERS) {
      expect(argv, consumer).toContain("mjolnir.json");
    }
  });

  it.each(RENDERS.filter((r) => r.render === "pr-comment"))(
    "$consumer renders the comment and states the verified commit",
    ({ consumer, argv }) => {
      const r = cli(argv);
      expect(r.code, `${consumer}: ${r.stderr}`).toBe(0);
      expect(r.stdout.startsWith(UNIFIED_MARKER), consumer).toBe(true);
      // The checkout is the commit the report was scanned at, so the comment
      // may say so. Nothing passes the commit in; the CLI checks it.
      expect(r.stdout).toContain(`| Commit | \`${head}\` |`);
    },
    60_000,
  );

  it.each(RENDERS.filter((r) => r.render === "github-summary"))(
    "$consumer annotates on stdout and writes the step summary file",
    ({ consumer, argv }) => {
      const summary = join(workspace, `summary-${++summaries}.md`);
      writeFileSync(summary, "");
      const r = cli(argv, {
        GITHUB_ACTIONS: "true",
        GITHUB_STEP_SUMMARY: summary,
      });
      expect(r.code, `${consumer}: ${r.stderr}`).toBe(0);
      expect(r.stdout).toMatch(/^::error file=\.github\/workflows\/ci\.yml,/m);
      const written = readFileSync(summary, "utf8");
      expect(written).toContain("Mjölnir — Verification Trust");
      // The runner reads annotation commands from stdout only. Copied into the
      // summary file they render as literal text, which 6.0.0's `| tee` did.
      expect(written).not.toMatch(/^::/m);
      expect(r.stdout).not.toContain("Verification Trust");
    },
    60_000,
  );
});

describe("every scan argument a consumer passes is one the CLI parses", () => {
  /** Each `ARGS+=(…)` / `ARGS=(…)` group the Action can append, as tokens. */
  function argGroups(run: string): string[][] {
    return [...run.matchAll(/ARGS\+?=\(([^)]*)\)/g)].map((m) =>
      (m[1] ?? "").split(/\s+/).filter((t) => t !== "" && t !== '"$MJ_PATH"'),
    );
  }

  const groups = [
    ...argGroups(runOf(actionSteps, "Scan")),
    ...argGroups(runOf(actionSteps, "Capture JSON report for reporting")),
  ];

  it("the Action's scan steps were read", () => {
    // `--scope changed`, the tier flag, four formats and three gates, plus the
    // capture scan's own group.
    expect(groups.length).toBeGreaterThanOrEqual(10);
  });

  it.each(groups.map((g) => [g.join(" "), g] as const))(
    "action.yml passes `%s`, which parses with no deprecation",
    (_label, tokens) => {
      const errors: unknown[] = [];
      const args = parseArgs([".", ...tokens], (detail) => errors.push(detail));
      expect(errors).toEqual([]);
      expect(args).not.toBeNull();
      expect(args?.deprecatedFlags ?? []).toEqual([]);
    },
  );

  it("the template's and the PR workflow's scan commands parse", () => {
    const template = cliArgs(
      runOf(
        templateSteps,
        "Scan changed code (exit 1/2 is data — the gate step decides)",
      ),
      ".tgz",
    );
    const workflow = cliArgs(
      runOf(workflowSteps, "Run analysis"),
      "node dist/cli.mjs",
    ).map((t) => (t === '"$MJ_BLOCKING"' ? "error" : t));
    for (const argv of [template, workflow]) {
      const errors: unknown[] = [];
      expect(
        parseArgs(argv, (d) => errors.push(d)),
        argv.join(" "),
      ).not.toBeNull();
      expect(errors).toEqual([]);
    }
  });
});
