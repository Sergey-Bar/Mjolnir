/**
 * Design-system core (Terminal + CI UX Overhaul plan, M1a).
 *
 * ui.ts is the canonical visual language: one header glyph, one severity
 * vocabulary, one divider, one next-step affordance. These pins lock the
 * tokens themselves plus the new FORCE_COLOR override semantics.
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  buildFooter,
  bullet,
  divider,
  formatDuration,
  keyValue,
  nextStep,
  okIcon,
  panel,
  sectionHeader,
  severityIcon,
} from "../../src/reporter/ui.js";
import { palette, shouldColorize } from "../../src/reporter/theme.js";

const ui = {
  p: palette(false),
  ascii: false,
  width: 80,
};
const uiAscii = { ...ui, ascii: true };

const ENV_KEYS = ["FORCE_COLOR", "NO_COLOR"] as const;
const saved = new Map<string, string | undefined>();

afterEach(() => {
  for (const k of ENV_KEYS) {
    const prev = saved.get(k);
    if (prev === undefined) delete process.env[k];
    else process.env[k] = prev;
    saved.delete(k);
  }
});

function withEnv(key: string, value: string | undefined): void {
  saved.set(key, process.env[key]);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("sectionHeader", () => {
  it("renders `▚ TITLE` in unicode mode", () => {
    expect(sectionHeader("FINDINGS", ui)).toBe("  ▚ FINDINGS");
  });

  it("degrades to `= TITLE` in ascii mode (cmd.exe-safe)", () => {
    expect(sectionHeader("FINDINGS", uiAscii)).toBe("  = FINDINGS");
  });
});

describe("severityIcon", () => {
  it("uses ✗/⚠/ℹ in unicode mode", () => {
    expect(severityIcon("error", ui)).toContain("✗");
    expect(severityIcon("warning", ui)).toContain("⚠");
    expect(severityIcon("info", ui)).toContain("ℹ");
  });

  it("uses X/!/i in ascii mode", () => {
    expect(severityIcon("error", uiAscii)).toContain("X");
    expect(severityIcon("warning", uiAscii)).toContain("!");
    expect(severityIcon("info", uiAscii)).toContain("i");
  });
});

describe("nextStep", () => {
  it("renders the dim `$ command` affordance", () => {
    expect(nextStep("mjolnir fix --dry-run", ui)).toBe(
      "  $ mjolnir fix --dry-run",
    );
  });
});

describe("divider", () => {
  it("is 58 `─` glyphs in unicode, 58 `-` in ascii", () => {
    expect(divider(ui)).toBe("─".repeat(58));
    expect(divider(uiAscii)).toBe("-".repeat(58));
  });
});

describe("okIcon", () => {
  it("is ✓ in unicode and v in ascii", () => {
    expect(okIcon(ui)).toBe("✓");
    expect(okIcon(uiAscii)).toBe("v");
  });
});

describe("formatDuration", () => {
  it("keeps sub-second durations in ms", () => {
    expect(formatDuration(850)).toBe("850ms");
  });

  it("renders seconds above one second", () => {
    expect(formatDuration(1200)).toBe("1.2s");
  });

  it("answers ? when no duration is known", () => {
    expect(formatDuration(undefined)).toBe("?");
  });
});

describe("bullet", () => {
  it("prefixes with a dash", () => {
    expect(bullet("one thing", ui)).toBe("  - one thing");
  });
});

describe("keyValue", () => {
  it("pads the label to its own length by default", () => {
    expect(keyValue("K", "v", ui)).toBe("  K  v");
  });

  it("honors an explicit label width for column alignment", () => {
    expect(keyValue("K", "v", ui, 5)).toBe("  K      v");
  });
});

describe("panel", () => {
  it("wraps content in a rounded box indented two spaces", () => {
    const rows = panel(["hi"], ui);
    expect(rows).toEqual(["  ╭────╮", "  │ hi │", "  ╰────╯"]);
  });

  it("reflows overlong lines to the context width", () => {
    // Multi-word so wrapText can break on whitespace; single overlong
    // words are never split mid-word (historical wrapText semantic).
    const rows = panel(["word ".repeat(60).trim()], ui);
    for (const r of rows) expect(r.length).toBeLessThanOrEqual(80);
  });
});

describe("buildFooter", () => {
  it("renders the divider, the Analysis status line and duration", () => {
    const lines = buildFooter({ ui, complete: true, durationMs: 12 });
    expect(lines[0]).toBe("─".repeat(58));
    expect(lines[1]).toBe("  Analysis: complete · 12ms");
  });

  it("marks partial analysis and keeps the contract wording", () => {
    const lines = buildFooter({ ui, complete: false, durationMs: 5 });
    expect(lines[1]).toBe(
      "  Analysis: PARTIAL — verdict may be incomplete · 5ms",
    );
  });

  it("appends the suppressed count when present", () => {
    const lines = buildFooter({
      ui,
      complete: true,
      durationMs: 1,
      suppressedCount: 2,
    });
    expect(lines).toContain("  2 finding(s) suppressed by config");
  });

  it("appends the next action as a $ command line", () => {
    const lines = buildFooter({
      ui,
      complete: true,
      durationMs: 1,
      next: "mjolnir fix",
    });
    expect(lines[lines.length - 1]).toBe("  $ mjolnir fix");
  });
});

describe("shouldColorize FORCE_COLOR override", () => {
  it("FORCE_COLOR=0 forces plain output even on a TTY", () => {
    withEnv("FORCE_COLOR", "0");
    expect(shouldColorize(true)).toBe(false);
  });

  it("FORCE_COLOR=false and empty force plain output even on a TTY", () => {
    withEnv("FORCE_COLOR", "false");
    expect(shouldColorize(true)).toBe(false);
    withEnv("FORCE_COLOR", "");
    expect(shouldColorize(true)).toBe(false);
  });

  it("a truthy FORCE_COLOR forces color even when piped (wins over NO_COLOR)", () => {
    withEnv("FORCE_COLOR", "1");
    withEnv("NO_COLOR", "1");
    expect(shouldColorize(false)).toBe(true);
  });

  it("without FORCE_COLOR, NO_COLOR still wins on a TTY", () => {
    withEnv("FORCE_COLOR", undefined);
    withEnv("NO_COLOR", "1");
    expect(shouldColorize(true)).toBe(false);
  });

  it("without FORCE_COLOR or NO_COLOR, color follows TTY-ness", () => {
    withEnv("FORCE_COLOR", undefined);
    withEnv("NO_COLOR", undefined);
    expect(shouldColorize(true)).toBe(true);
    expect(shouldColorize(false)).toBe(false);
  });
});
