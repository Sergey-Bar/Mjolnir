/**
 * WI-9/WI-10 CI-surface additions: the GitHub Action's Trust Report
 * consumption (pr-comment / annotations / trust-artifact — plan §13)
 * and the reporter version-sync gate (plan §14, advisory ramp).
 */

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  readFileSync,
  writeFileSync,
  rmSync,
  mkdtempSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  renderTrustReportMarkdown,
  TRUST_REPORT_MARKER,
} from "../../src/commands/trust-report.js";
import type { ScanResult } from "../../src/types.js";

const ROOT = join(import.meta.dirname, "..", "..");
const ACTION = parse(readFileSync(join(ROOT, "action.yml"), "utf8")) as {
  inputs: Record<string, { description: string; default?: string }>;
  outputs?: Record<string, { description: string; value: string }>;
  runs: {
    steps: Array<{
      name?: string;
      uses?: string;
      run?: string;
      if?: string;
      with?: Record<string, string>;
      env?: Record<string, string>;
    }>;
  };
};

describe("action.yml Trust Report consumption (WI-9, plan §13)", () => {
  it("declares the three consumption inputs with safe defaults", () => {
    for (const input of ["annotations", "pr-comment", "trust-artifact"]) {
      expect(ACTION.inputs[input], `missing input ${input}`).toBeDefined();
      expect(ACTION.inputs[input]?.default).toBe("true");
    }
  });

  it("exposes the trust-report-file output", () => {
    expect(ACTION.outputs?.["trust-report-file"]).toBeDefined();
  });

  it("renders from a saved JSON report, never a second gate scan", () => {
    const gen = ACTION.runs.steps.find(
      (s) => s.name === "Generate Trust Report",
    );
    expect(gen?.run).toContain("trust-report --from mjolnir.json");
    expect(gen?.if).toContain(
      "inputs.annotations == 'true' || inputs.pr-comment == 'true' ||",
    );
  });

  it("the capture scan can never change the gate (--blocking none)", () => {
    const capture = ACTION.runs.steps.find(
      (s) => s.name === "Capture JSON report for reporting",
    );
    expect(capture?.run).toContain("--blocking none");
    expect(capture?.if).toContain("inputs.format != 'json'");
  });

  it("annotations stream through the CLI's own summary verb (zero action-side semantics)", () => {
    const step = ACTION.runs.steps.find(
      (s) => s.name === "Emit annotations + step summary",
    );
    expect(step?.run).toContain("summary mjolnir.json");
  });

  it("PR comment upserts by marker, only on pull_request events", () => {
    const step = ACTION.runs.steps.find((s) =>
      s.name?.startsWith("Post Trust Report"),
    );
    expect(step?.if).toContain("github.event_name == 'pull_request'");
    expect(step?.run).toContain(TRUST_REPORT_MARKER);
    expect(step?.run).toContain("PATCH");
    expect(step?.env?.GH_TOKEN).toBe("${{ github.token }}");
    // audit S-5: event data through env, never interpolation in run bodies
    expect(step?.run).not.toContain("${{");
  });

  it("uploads the Trust Report as an artifact via a SHA-pinned action", () => {
    const step = ACTION.runs.steps.find((s) =>
      s.name?.startsWith("Upload Trust Report"),
    );
    expect(step?.uses).toMatch(/^actions\/upload-artifact@[0-9a-f]{40}/);
    expect(step?.with?.path).toContain("mjolnir-trust-report.md");
  });

  it("the MD artifact begins with the upsert marker", () => {
    const r = {} as ScanResult;
    void r;
    const md = renderTrustReportMarkdown(
      {
        schemaVersion: 1,
        partial: false,
        score: 100,
        frameworks: [],
        frameworkDetectionUnknown: false,
        dimensions: [],
        findings: [],
        analysisStatus: {
          discovery: "complete",
          rules: "complete",
          skippedFiles: 0,
          durationMs: 1,
        },
      },
      "x",
    );
    expect(md.startsWith(TRUST_REPORT_MARKER)).toBe(true);
  });
});

describe("reporter version-sync gate (WI-10, plan §14)", () => {
  it("the gate script exists and is wired as an npm script", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts["reporter:version-check"]).toContain(
      "check-reporter-version",
    );
  });

  it("the reporter keeps the ingestion contract: default output is mjolnir.report.json", () => {
    const src = readFileSync(
      join(ROOT, "packages", "playwright-reporter", "src", "index.ts"),
      "utf8",
    );
    expect(src).toContain("mjolnir.report.json");
  });

  it("advisory mode: a trailing reporter version still exits 0", () => {
    // Run the gate against the real repo — the reporter (0.1.0) trails
    // the root package, which is the documented advisory posture.
    const r = spawnSync(
      process.execPath,
      [
        join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
        join(ROOT, "scripts", "check-reporter-version.ts"),
        ROOT,
      ],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("advisory mode");
  });

  it("hard drift: a reporter version AHEAD of the root package exits 1 even in advisory mode", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ver-sync-"));
    try {
      // Synthetic repo: real root package.json, reporter 9.9.9 — a
      // leading independent line is drift no matter the mode.
      mkdirSync(join(dir, "packages", "playwright-reporter", "src"), {
        recursive: true,
      });
      const rootPkg = JSON.parse(
        readFileSync(join(ROOT, "package.json"), "utf8"),
      ) as object;
      writeFileSync(join(dir, "package.json"), JSON.stringify(rootPkg));
      const reporterPkg = JSON.parse(
        readFileSync(
          join(ROOT, "packages", "playwright-reporter", "package.json"),
          "utf8",
        ),
      ) as { version: string };
      reporterPkg.version = "9.9.9";
      writeFileSync(
        join(dir, "packages", "playwright-reporter", "package.json"),
        JSON.stringify(reporterPkg),
      );
      writeFileSync(
        join(dir, "packages", "playwright-reporter", "src", "index.ts"),
        'export const out = "mjolnir.report.json";',
      );
      const r = spawnSync(
        process.execPath,
        [
          join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
          join(ROOT, "scripts", "check-reporter-version.ts"),
          dir,
        ],
        { encoding: "utf8" },
      );
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("AHEAD of the root package");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("hard drift: breaking the ingestion contract exits 1 even in advisory mode", () => {
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-ver-sync2-"));
    try {
      mkdirSync(join(dir, "packages", "playwright-reporter", "src"), {
        recursive: true,
      });
      const rootPkg = JSON.parse(
        readFileSync(join(ROOT, "package.json"), "utf8"),
      ) as object;
      writeFileSync(join(dir, "package.json"), JSON.stringify(rootPkg));
      const reporterPkg = JSON.parse(
        readFileSync(
          join(ROOT, "packages", "playwright-reporter", "package.json"),
          "utf8",
        ),
      ) as Record<string, unknown>;
      writeFileSync(
        join(dir, "packages", "playwright-reporter", "package.json"),
        JSON.stringify(reporterPkg),
      );
      writeFileSync(
        join(dir, "packages", "playwright-reporter", "src", "index.ts"),
        'export const out = "some-other-file.json";',
      );
      const r = spawnSync(
        process.execPath,
        [
          join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
          join(ROOT, "scripts", "check-reporter-version.ts"),
          dir,
        ],
        { encoding: "utf8" },
      );
      expect(r.status).toBe(1);
      expect(r.stderr).toContain("ingestion contract");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
