/**
 * Terminal robustness across real environments (Master-Stabilization-
 * Plan Sprint 5, Task 22): legible output at narrow/wide widths, under
 * NO_COLOR, non-TTY, and ASCII-only fallback. Reliability, not polish —
 * garbled first-run output reads as a broken tool.
 */

import { describe, expect, it } from "vitest";
import { renderTerminal } from "../src/reporter/terminal.js";
import {
  box,
  wrapText,
  shouldUseAscii,
  measure,
  meter,
  palette,
} from "../src/reporter/theme.js";
import type { Finding, ScanResult } from "../src/types.js";

function finding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    evidenceLevel: "E2",
    file: "a-fairly-long-nested/path/to/the/spec/file.spec.ts",
    line: 42,
    column: 1,
    message:
      "A moderately long finding message that could wrap on a narrow terminal.",
    why: "w",
    fix: "f",
    ...over,
  };
}

function result(findings: Finding[] = [finding()]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 80,
    frameworks: ["vitest"],
    frameworkDetectionUnknown: false,
    dimensions: [
      { category: "QA-TEST", score: 80, errors: 1, warnings: 0, infos: 0 },
    ],
    findings,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 5,
    },
  };
}

describe.each([40, 80, 120])("renders legibly at %d columns", (width) => {
  it("produces non-empty output with no line drastically overflowing the requested width in fixed sections", () => {
    const out = renderTerminal(result(), { isTTY: false, width });
    expect(out.length).toBeGreaterThan(0);
    // The score gauge and deduction box specifically respect width —
    // free-text lines (messages, file paths) are allowed to overflow,
    // same as any real terminal wraps or truncates those naturally.
    const gaugeLine = out.split("\n").find((l) => l.includes("WORTHINESS"));
    expect(gaugeLine).toBeDefined();
  });

  it("does not throw at any of the three reference widths", () => {
    expect(() =>
      renderTerminal(result(), { isTTY: false, width }),
    ).not.toThrow();
  });
});

describe("--width override", () => {
  it("a narrower width produces a narrower score gauge than a wider one", () => {
    // Formula: max(10, min(30, width - 4)) — differs across 20 vs 40,
    // both clamp differently below the 30-wide cap. Must select the
    // WORTHINESS gauge line specifically (immediately after the "WORTHINESS" line)
    // — the per-category DIAGNOSTICS gauges below it render at a fixed
    // width regardless of the overall terminal width and also match
    // /[█#]/, so a naive "first gauge-looking line" search can silently
    // pick the wrong line and compare a constant against itself.
    const scoreGaugeLine = (s: string): string => {
      const lines = s.split("\n");
      const scoreIdx = lines.findIndex((l) => l.includes("WORTHINESS"));
      return lines[scoreIdx + 1] ?? "";
    };
    const narrow = renderTerminal(result(), { isTTY: false, width: 20 });
    const wide = renderTerminal(result(), { isTTY: false, width: 40 });
    expect(measure(scoreGaugeLine(narrow))).toBeLessThan(
      measure(scoreGaugeLine(wide)),
    );
  });

  it("floors at a minimum readable width even when given something absurd", () => {
    expect(() =>
      renderTerminal(result(), { isTTY: false, width: 1 }),
    ).not.toThrow();
  });
});

describe("NO_COLOR", () => {
  it("emits no ANSI escapes when NO_COLOR is set, even with isTTY true", () => {
    const prev = process.env["NO_COLOR"];
    process.env["NO_COLOR"] = "1";
    try {
      const out = renderTerminal(result(), { isTTY: true });
      // eslint-disable-next-line no-control-regex
      expect(/\x1b\[[0-9;]*m/.test(out)).toBe(false);
    } finally {
      if (prev === undefined) delete process.env["NO_COLOR"];
      else process.env["NO_COLOR"] = prev;
    }
  });
});

describe("non-TTY (CI logs)", () => {
  it("emits no ANSI escapes and remains fully readable plain text", () => {
    const out = renderTerminal(result(), { isTTY: false });
    // eslint-disable-next-line no-control-regex
    expect(/\x1b\[[0-9;]*m/.test(out)).toBe(false);
    expect(out).toContain("WORTHINESS");
    expect(out).toContain("QA-TEST-001");
  });
});

describe("ASCII-only fallback (cmd.exe / legacy consoles)", () => {
  it("replaces box-drawing glyphs with plain characters when ascii: true", () => {
    const out = renderTerminal(result(), { isTTY: false, ascii: true });
    expect(out).not.toContain("╭");
    expect(out).not.toContain("╮");
    expect(out).not.toContain("█");
    expect(out).not.toContain("░");
    expect(out).not.toContain("✗");
  });

  it("ascii: false forces Unicode even when the environment heuristic would choose ASCII", () => {
    const out = renderTerminal(result(), { isTTY: false, ascii: false });
    expect(out).toContain("█");
  });

  it("severity glyphs still convey severity in ASCII mode (X/!/i)", () => {
    const out = renderTerminal(result([finding({ severity: "error" })]), {
      isTTY: false,
      ascii: true,
    });
    expect(out).toMatch(/\bX\b.*ERROR/);
  });

  it("the no-tests-found empty state uses a plain '!' glyph in ASCII mode", () => {
    const noTests: ScanResult = {
      schemaVersion: 1,
      partial: false,
      score: null,
      reason: "no-tests-found",
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
    };
    const out = renderTerminal(noTests, { isTTY: false, ascii: true });
    expect(out).toContain("! NO TESTS DETECTED");
    expect(out).not.toContain("⚠");
  });
});

describe("verdict labels", () => {
  it("shows NEEDS WORK for a mid-range score", () => {
    const mid: ScanResult = {
      schemaVersion: 1,
      partial: false,
      score: 65,
      frameworks: ["vitest"],
      frameworkDetectionUnknown: false,
      dimensions: [],
      findings: [],
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
      },
    };
    expect(renderTerminal(mid, { isTTY: false })).toContain("NEEDS WORK");
  });

  it("shows UNWORTHY for a low score", () => {
    const low: ScanResult = {
      schemaVersion: 1,
      partial: false,
      score: 20,
      frameworks: ["vitest"],
      frameworkDetectionUnknown: false,
      dimensions: [],
      findings: [],
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
      },
    };
    expect(renderTerminal(low, { isTTY: false })).toContain("UNWORTHY");
  });
});

describe("shouldUseAscii()", () => {
  it("MJOLNIR_ASCII=1 forces ASCII regardless of other env vars", () => {
    const prev = process.env["MJOLNIR_ASCII"];
    process.env["MJOLNIR_ASCII"] = "1";
    try {
      expect(shouldUseAscii()).toBe(true);
    } finally {
      if (prev === undefined) delete process.env["MJOLNIR_ASCII"];
      else process.env["MJOLNIR_ASCII"] = prev;
    }
  });

  it("MJOLNIR_ASCII=0 forces Unicode regardless of other env vars", () => {
    const prev = process.env["MJOLNIR_ASCII"];
    process.env["MJOLNIR_ASCII"] = "0";
    try {
      expect(shouldUseAscii()).toBe(false);
    } finally {
      if (prev === undefined) delete process.env["MJOLNIR_ASCII"];
      else process.env["MJOLNIR_ASCII"] = prev;
    }
  });

  // The bare-cmd.exe heuristic is `process.platform === "win32" && !TERM`.
  // On a non-win32 CI host the left side short-circuits, so the right
  // side of the `&&` is never exercised there — stub the platform so
  // both arms run regardless of where the suite executes.
  it("detects bare legacy conhost (win32, no TERM, no modern-host marker)", () => {
    const saved = {
      platform: Object.getOwnPropertyDescriptor(process, "platform"),
      TERM: process.env["TERM"],
      WT: process.env["WT_SESSION"],
      TP: process.env["TERM_PROGRAM"],
      CE: process.env["ConEmuANSI"],
      ASCII: process.env["MJOLNIR_ASCII"],
    };
    Object.defineProperty(process, "platform", {
      value: "win32",
      configurable: true,
    });
    delete process.env["TERM"];
    delete process.env["WT_SESSION"];
    delete process.env["TERM_PROGRAM"];
    delete process.env["ConEmuANSI"];
    delete process.env["MJOLNIR_ASCII"];
    try {
      expect(shouldUseAscii()).toBe(true);
      process.env["TERM"] = "xterm-256color";
      expect(shouldUseAscii()).toBe(false);
    } finally {
      if (saved.platform)
        Object.defineProperty(process, "platform", saved.platform);
      for (const [k, v] of [
        ["TERM", saved.TERM],
        ["WT_SESSION", saved.WT],
        ["TERM_PROGRAM", saved.TP],
        ["ConEmuANSI", saved.CE],
        ["MJOLNIR_ASCII", saved.ASCII],
      ] as const) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});

describe("wrapText", () => {
  it("wraps on whitespace without splitting words", () => {
    const lines = wrapText("one two three four five", 11);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(11);
    expect(lines.join(" ")).toBe("one two three four five");
  });

  it("does not split a single word longer than the width", () => {
    const lines = wrapText("supercalifragilisticexpialidocious", 10);
    expect(lines).toEqual(["supercalifragilisticexpialidocious"]);
  });

  it("returns the original text unwrapped for width <= 0", () => {
    expect(wrapText("hello world", 0)).toEqual(["hello world"]);
  });
});

describe("box() with maxWidth", () => {
  it("reflows a line wider than maxWidth into multiple rows", () => {
    const rows = box(["this is a fairly long line that should wrap"], 1, {
      maxWidth: 20,
    });
    // top border + at least 2 content rows + bottom border
    expect(rows.length).toBeGreaterThan(3);
    for (const row of rows) expect(measure(row)).toBeLessThanOrEqual(20);
  });

  it("uses plain +/-/| border characters when ascii: true", () => {
    const rows = box(["short"], 1, { ascii: true });
    expect(rows[0]).toMatch(/^\+-+\+$/);
    expect(rows.every((r) => !/[╭╮╰╯│─]/.test(r))).toBe(true);
  });

  it("matches historical behavior (no maxWidth, no ascii) exactly", () => {
    const rows = box(["a", "bb"]);
    expect(rows[0]).toBe("╭────╮");
  });
});

describe("meter()", () => {
  it("is an alias for scoreGauge with a smaller default width", () => {
    const p = palette(false);
    const m = meter(80, p);
    expect(measure(m)).toBe(20);
  });

  it("respects an explicit width and ascii flag", () => {
    const p = palette(false);
    const m = meter(80, p, 10, true);
    expect(measure(m)).toBe(10);
    expect(m).not.toContain("█");
  });
});
