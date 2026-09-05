/**
 * The evidence layer of the demo-video pipeline: runs Mjölnir for real
 * and writes down exactly what it printed.
 *
 * Same discipline as `scripts/generate-readme-demo.ts`, which this
 * follows deliberately — the assets are rendered from `renderTerminal`'s
 * real output against a real scan, so they cannot drift from actual
 * behavior because they ARE actual behavior. Nothing here mocks, trims or
 * rewrites CLI output; the single normalization is the wall-clock
 * duration, which is real but differs run to run, and it is declared in
 * the script file itself.
 *
 * Every command is invoked through its injectable `io.out` sink rather
 * than a subprocess or a PTY, so what is captured is byte-for-byte what
 * the CLI would print.
 *
 * Usage: npm run docs:video:capture
 */

import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  runExplainCommand,
  runForensicsCommand,
  runScan,
} from "../../src/cli.js";
import { renderTerminal } from "../../src/reporter/terminal.js";
import type { ScanResult } from "../../src/types.js";
import { FONTS } from "./fonts.js";
import { PACING } from "./pacing.js";
import type { Beat, BeatAssertions, VideoScript } from "./script-types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
const DEMO_REPO = join(ROOT, "examples", "demo-repo");
const FIXED_WORKFLOW = join(
  ROOT,
  "assets",
  "video",
  "fixtures",
  "ci.fixed.yml",
);
const WORKFLOW_REL = join(".github", "workflows", "ci.yml");

/**
 * The wall-clock duration is real but non-deterministic run to run.
 * Masked here — only in these assets, never in the real reporter — so a
 * re-capture is a no-op diff when the scan itself is unchanged. Same
 * treatment as generate-readme-demo.ts.
 */
export const NORMALIZATION = ["/· \\d+ms$/ → '· a few ms'"];
const normalize = (line: string): string =>
  line.replace(/· \d+ms$/, "· a few ms");

/** `$ command` as the prompt line the video types out, in the reporter's palette. */
function promptLine(command: string): string {
  return `\u001b[92m$\u001b[0m \u001b[1m${command}\u001b[0m`;
}

/** A real scan, run exactly as generate-readme-demo.ts runs it. */
async function scan(target: string): Promise<ScanResult> {
  return runScan({
    target,
    json: false,
    verbose: true,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "terminal",
    width: PACING.reporterWidth,
    // Matches the committed demo.svg: quarantine-tier rules stay visible
    // at severity=info/E0 so the score band is reproducible.
    strict: true,
  });
}

/** Turns a scan into the lines the reporter would print for it. */
function renderScan(result: ScanResult, command: string): string[] {
  // ascii:false pins Unicode glyphs and isTTY:true pins color, so the
  // capture does not depend on how the generator happened to be invoked;
  // shouldUseAscii() and shouldColorize() are both host/env-dependent and
  // have made committed assets drift before.
  const rendered = renderTerminal(result, {
    isTTY: true,
    verbose: true,
    ascii: false,
    width: PACING.reporterWidth,
  });
  return [promptLine(command), ...rendered.split("\n")].map(normalize);
}

/** Semantic facts about a scan — discovered, never hand-written. */
function observed(result: ScanResult): BeatAssertions {
  return {
    score: result.score,
    errorCount: result.findings.filter((f) => f.severity === "error").length,
    findingCount: result.findings.length,
  };
}

/** Captures a command that writes to an injectable `out` sink. */
function captureOut(
  run: (io: {
    out: (...p: unknown[]) => void;
    err: (...p: unknown[]) => void;
  }) => unknown,
): string[] {
  const lines: string[] = [];
  const sink = (...parts: unknown[]): void => {
    lines.push(parts.map(String).join(" "));
  };
  run({ out: sink, err: sink });
  return lines.flatMap((l) => l.split("\n")).map(normalize);
}

/**
 * A copy of the demo repo with the fix the tool itself recommends
 * applied. `examples/demo-repo` is never mutated: the video's "after"
 * state is a real scan of a real directory, not the same scan replayed
 * with different numbers.
 */
export async function withFixedWorkflow<T>(
  use: (dir: string) => Promise<T>,
): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-video-"));
  try {
    const target = join(dir, "demo-repo");
    cpSync(DEMO_REPO, target, { recursive: true });
    writeFileSync(join(target, WORKFLOW_REL), readFileSync(FIXED_WORKFLOW));
    // Awaited inside the try: a synchronous `return use(target)` would run
    // the finally — deleting the fixture — while the scan was still
    // reading it.
    return await use(target);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const environment = (): VideoScript["environment"] => ({
  reporterWidth: PACING.reporterWidth,
  viewport: PACING.viewport,
  deviceScaleFactor: PACING.deviceScaleFactor,
  fps: PACING.fps,
  fonts: [...new Set(FONTS.map((f) => f.file))],
});

/** The ~45s hero loop: a false-green CI gate found, fixed, and re-proved. */
export async function captureDemoScript(): Promise<VideoScript> {
  const command = "npx mjolnir-qa@latest";
  const before = await scan(DEMO_REPO);
  const after = await withFixedWorkflow((dir) => scan(dir));

  const beats: Beat[] = [
    {
      id: "hero-scan",
      narrative:
        "A real suite scores 75/100 NEEDS WORK, with the CI gate itself among the findings.",
      source: "examples/demo-repo",
      command,
      ansi: renderScan(before, command),
      assertions: {
        // The findings the video points at. If either stops firing, the
        // narrative is no longer true and the spec fails.
        requiredFindings: ["QA-CI-009", "QA-CI-001"],
        ...observed(before),
      },
    },
    {
      id: "hero-fix",
      narrative:
        "The workflow gets exactly the fix the tool printed: pipefail on the piped test steps, && instead of ; , and no continue-on-error.",
      source: "assets/video/fixtures/ci.fixed.yml",
      command: "$EDITOR .github/workflows/ci.yml",
      ansi: [],
    },
    {
      id: "hero-rescan",
      narrative:
        "Re-scanned after the fix: the false-green findings are gone and the score recovers — but not to 100, because the suite's other problems are still real.",
      source: "examples/demo-repo + assets/video/fixtures/ci.fixed.yml",
      command,
      ansi: renderScan(after, command),
      assertions: {
        absentFindings: ["QA-CI-009", "QA-CI-001"],
        ...observed(after),
      },
    },
  ];

  return {
    schemaVersion: 1,
    id: "demo",
    normalization: NORMALIZATION,
    environment: environment(),
    beats,
    patch: {
      file: ".github/workflows/ci.yml",
      before: readFileSync(join(DEMO_REPO, WORKFLOW_REL), "utf8").split("\n"),
      after: readFileSync(FIXED_WORKFLOW, "utf8").split("\n"),
    },
  };
}

/** The ~2min tour: the scan, then the three commands it leads to. */
export async function captureTourScript(): Promise<VideoScript> {
  const scanCommand = "npx mjolnir-qa@latest";
  const result = await scan(DEMO_REPO);

  const explainId = "QA-CI-009";
  const beats: Beat[] = [
    {
      id: "tour-scan",
      narrative:
        "The full report: score, category breakdown, and every finding.",
      source: "examples/demo-repo",
      command: scanCommand,
      ansi: renderScan(result, scanCommand),
      assertions: { requiredFindings: [explainId], ...observed(result) },
    },
    {
      id: "tour-explain",
      narrative:
        "One rule, up close — what it found, why it matters, how to fix it, and whether its false-positive rate has been measured.",
      source: "tests/fixtures",
      command: `mjolnir explain ${explainId}`,
      ansi: captureOut((io) => runExplainCommand([explainId], io)),
    },
    {
      id: "tour-forensics",
      narrative:
        "Real run data, not static analysis: a test that only passed on attempt two is a lucky test, and gets labelled TRUE-FLAKE.",
      source: "examples/demo-repo/test-results",
      // --no-flaky-md: the command writes FLAKY.md as a side effect, and a
      // capture must not leave files behind in the repo it read.
      command: "mjolnir forensics ./test-results/",
      ansi: captureOut((io) =>
        runForensicsCommand(
          [join(DEMO_REPO, "test-results"), "--no-flaky-md"],
          io,
        ),
      ),
    },
  ];

  return {
    schemaVersion: 1,
    id: "tour",
    normalization: NORMALIZATION,
    environment: environment(),
    beats,
  };
}
