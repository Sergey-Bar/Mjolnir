/**
 * Live scan progress (Terminal + CI UX Overhaul plan, M3).
 *
 * The determinism contract: frames advance and lines repaint ONLY on
 * onProgress events — a fake stream drives everything, no fake timers.
 * The disable matrix (non-TTY, --no-progress, machine formats,
 * GITHUB_ACTIONS/CI) keeps stdout purity and CI logs untouched.
 */

import { describe, expect, it } from "vitest";
import {
  ProgressRenderer,
  renderProgressLine,
  shouldRenderProgress,
  type ProgressEvent,
} from "../../src/reporter/progress.js";

function fakeStream() {
  const chunks: string[] = [];
  return {
    chunks,
    text: () => chunks.join(""),
    lines: () => chunks.join("").split("\n"),
    write(s: string): void {
      chunks.push(s);
    },
  };
}

const ev = (over: Partial<ProgressEvent>): ProgressEvent => ({
  phase: "rules",
  ...over,
});

describe("render-on-event determinism", () => {
  it("no timers: nothing is written until an event arrives", () => {
    const s = fakeStream();
    new ProgressRenderer({ stream: s, isTTY: true });
    expect(s.text()).toBe("");
  });

  it("each event paints exactly one line and advances the frame", () => {
    const s = fakeStream();
    const r = new ProgressRenderer({ stream: s, isTTY: true });
    r.onEvent(ev({ phase: "discover", done: 0, total: 10 }));
    r.onEvent(ev({ phase: "discover", done: 10, total: 10 }));
    const out = s.text();
    // Two events → two painted lines (plus their newline terminators).
    expect(out.match(/⠋|⠙/g)).toHaveLength(2);
    expect(r.frame).toBe(2);
  });

  it("the frame sequence follows the braille cycle per event", () => {
    const s = fakeStream();
    const r = new ProgressRenderer({ stream: s, isTTY: true });
    const frames = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
    for (let i = 0; i < 12; i++) {
      r.onEvent(ev({ phase: "rules", done: i, total: 12 }));
      expect(s.chunks[s.chunks.length - 1]).toContain(frames[i % 10]);
    }
  });

  it("ASCII mode uses |/-\\ frames instead of braille", () => {
    const s = fakeStream();
    const r = new ProgressRenderer({ stream: s, isTTY: true, ascii: true });
    r.onEvent(ev({ phase: "score" }));
    r.onEvent(ev({ phase: "score" }));
    expect(s.text()).toContain("|");
    expect(s.text()).toContain("/");
    expect(s.text()).not.toMatch(/[\u2800-\u28ff]/);
  });

  it("carries counts and detail: `⠙ Running rules… (3/12 · a.spec.ts)`", () => {
    const line = renderProgressLine(
      { phase: "rules", done: 3, total: 12, detail: "a.spec.ts" },
      1,
    );
    expect(line).toContain("Running rules…");
    expect(line).toContain("3/12");
    expect(line).toContain("a.spec.ts");
  });

  it("strips ANSI/OSC escape sequences from the detail (QA-10: hostile filenames)", () => {
    const line = renderProgressLine(
      {
        phase: "rules",
        detail: "a\x1b[2Jclear\x1b]0;title\x07b.spec.ts",
      },
      0,
    );
    expect(line).not.toContain("\x1b");
    expect(line).toContain("aclearb.spec.ts");
  });

  it("phase labels cover all four phases", () => {
    expect(renderProgressLine({ phase: "discover" }, 0)).toContain(
      "Discovering files",
    );
    expect(renderProgressLine({ phase: "parse" }, 0)).toContain(
      "Parsing frameworks",
    );
    expect(renderProgressLine({ phase: "rules" }, 0)).toContain(
      "Running rules",
    );
    expect(renderProgressLine({ phase: "score" }, 0)).toContain("Scoring");
  });
});

describe("disable matrix (shouldRenderProgress)", () => {
  const base = { isTTY: true };

  it("renders on an interactive TTY", () => {
    expect(shouldRenderProgress(base)).toBe(true);
  });

  it("never renders when stderr is not a TTY", () => {
    expect(shouldRenderProgress({ ...base, isTTY: false })).toBe(false);
  });

  it("--no-progress wins over everything", () => {
    expect(shouldRenderProgress({ ...base, noProgress: true })).toBe(false);
  });

  it("machine formats (--json/--format sarif|mermaid) disable it", () => {
    expect(shouldRenderProgress({ ...base, machineFormat: true })).toBe(false);
  });

  it("GITHUB_ACTIONS=true and CI=true disable it", () => {
    expect(
      shouldRenderProgress({ ...base, env: { GITHUB_ACTIONS: "true" } }),
    ).toBe(false);
    expect(shouldRenderProgress({ ...base, env: { CI: "true" } })).toBe(false);
    expect(shouldRenderProgress({ ...base, env: { CI: "false" } })).toBe(true);
  });
});

describe("non-TTY renderer is fully inert", () => {
  it("writes nothing, ever — even with events and done()", () => {
    const s = fakeStream();
    const r = new ProgressRenderer({ stream: s, isTTY: false });
    r.onEvent(ev({ phase: "parse", done: 1, total: 2 }));
    r.onEvent(ev({ phase: "rules", done: 2, total: 2 }));
    r.done();
    expect(s.text()).toBe("");
    expect(r.active).toBe(false);
  });
});

describe("stream discipline (stderr only, TTY-gated)", () => {
  it("done() erases the painted line so the final report starts clean", () => {
    const s = fakeStream();
    const r = new ProgressRenderer({ stream: s, isTTY: true });
    r.onEvent(ev({ phase: "score" }));
    r.done();
    const out = s.text();
    // Cursor-up + erase sequence is present; no stray frame remains.
    expect(out).toContain("\x1b[");
    expect(out.endsWith("\r")).toBe(true);
  });

  it("done() on a renderer that painted nothing writes nothing", () => {
    const s = fakeStream();
    const r = new ProgressRenderer({ stream: s, isTTY: true });
    r.done();
    expect(s.text()).toBe("");
  });

  it("events with total but no done render a 0/total count", () => {
    const line = renderProgressLine({ phase: "discover", total: 5 }, 0);
    expect(line).toContain("0/5");
  });
});
