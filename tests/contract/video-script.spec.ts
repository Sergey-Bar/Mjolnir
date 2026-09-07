/**
 * The demo videos' content contract (standing gate, Node only).
 *
 * Binary MP4s cannot be byte-compared in CI, and asserting that they
 * could would itself be the kind of false proof this project exists to
 * catch. So the lock sits one layer down: the committed scripts under
 * assets/video/ are the only thing the renderer may draw, and this spec
 * re-runs the same real Mjolnir executions and fails when either script
 * stops matching what the CLI now prints.
 *
 * Two distinct classes of claim are checked here.
 *
 *  - CONTENT: every captured line still matches current reporter output.
 *    Mirrors demo-asset-reproducibility.spec.ts.
 *  - NARRATIVE: the story the hero video tells is actually true. "The
 *    score went up" is NOT sufficient evidence that the findings shown as
 *    fixed were fixed — a score can move for unrelated reasons, and a
 *    video claiming a remediation that did not happen is exactly the
 *    false-green pattern the tool reports on other people's pipelines.
 *
 * Neither class needs ffmpeg or Chromium, which is why both run in the
 * standing gate. The media-format contract lives in video-media.spec.ts
 * and skips when the rendered artifacts are absent.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  captureDemoScript,
  captureTourScript,
} from "../../scripts/video/capture.js";
import {
  probeGlyphs,
  SELF_TEST_CHAR,
} from "../../scripts/video/check-glyphs.js";
import { requiredGlyphs } from "../../scripts/video/glyph-inventory.js";
import { stripAnsi } from "../../scripts/readme-svg.js";
import type { VideoScript } from "../../scripts/video/script-types.js";
import { readScript, serialize } from "../../scripts/video/script-io.js";
import { buildPage } from "../../scripts/video/terminal-page.js";

const ROOT = join(import.meta.dirname, "..", "..");

const committed = readScript;

const REGENERATE =
  "Run `npm run docs:video:capture` and commit the result — then re-render, " +
  "because the videos are drawn from these files and are now stale too.";

describe("committed video scripts still match what the CLI prints", () => {
  it.each([
    ["demo", captureDemoScript],
    ["tour", captureTourScript],
  ] as const)(
    "script.%s.json reproduces from a real scan",
    async (id, capture) => {
      const fresh = await capture();
      const onDisk = committed(id);

      // Compare beat by beat before the whole-file comparison: a 250-line
      // diff of ANSI escapes is unreadable, and the beat that drifted is
      // the thing a maintainer needs to know.
      expect(fresh.beats.map((b) => b.id)).toEqual(
        onDisk.beats.map((b) => b.id),
      );
      for (const [i, beat] of fresh.beats.entries()) {
        const was = onDisk.beats[i];
        expect(
          beat.ansi,
          `beat "${beat.id}" of script.${id}.json no longer matches the ` +
            `reporter's output. ${REGENERATE}`,
        ).toEqual(was?.ansi);
        expect(
          beat.assertions,
          `beat "${beat.id}" of script.${id}.json records different scan ` +
            `facts than a fresh scan produces. ${REGENERATE}`,
        ).toEqual(was?.assertions);
      }

      expect(
        serialize(fresh),
        `script.${id}.json has drifted. ${REGENERATE}`,
      ).toBe(serialize(onDisk));
    },
    60_000,
  );
});

describe("the hero video's fix-and-re-run story is true", () => {
  const demo = committed("demo");
  const beat = (id: string): VideoScript["beats"][number] => {
    const found = demo.beats.find((b) => b.id === id);
    if (!found) throw new Error(`script.demo.json has no beat "${id}"`);
    return found;
  };

  it("the before scan really does contain the findings the video points at", () => {
    const before = beat("hero-scan");
    const text = before.ansi.map(stripAnsi).join("\n");
    for (const ruleId of before.assertions?.requiredFindings ?? []) {
      expect(
        text,
        `the video opens by pointing at ${ruleId}, but the captured scan ` +
          `never reports it. ${REGENERATE}`,
      ).toContain(ruleId);
    }
    expect(before.assertions?.requiredFindings?.length ?? 0).toBeGreaterThan(0);
  });

  it("the findings shown as fixed are actually absent afterwards", () => {
    const after = beat("hero-rescan");
    const text = after.ansi.map(stripAnsi).join("\n");
    const absent = after.assertions?.absentFindings ?? [];
    expect(absent.length).toBeGreaterThan(0);
    for (const ruleId of absent) {
      expect(
        text,
        `the video claims the fix removed ${ruleId}, but the re-scan still ` +
          `reports it. The narrative is false — do not ship this video. ` +
          `${REGENERATE}`,
      ).not.toContain(ruleId);
    }
  });

  it("every finding claimed fixed was present before (no fixing of things that never fired)", () => {
    const beforeText = beat("hero-scan").ansi.map(stripAnsi).join("\n");
    for (const ruleId of beat("hero-rescan").assertions?.absentFindings ?? []) {
      expect(
        beforeText,
        `the video takes credit for removing ${ruleId}, which the BEFORE ` +
          `scan never reported. That is a claim the evidence does not carry.`,
      ).toContain(ruleId);
    }
  });

  it("the score improves, and the improvement is not a fabricated 100", () => {
    const before = beat("hero-scan").assertions;
    const after = beat("hero-rescan").assertions;
    expect(typeof before?.score).toBe("number");
    expect(typeof after?.score).toBe("number");
    expect(after?.score as number).toBeGreaterThan(before?.score as number);
    // The demo repo keeps real problems the CI fix does not touch. A
    // perfect score here would mean the fixture, the scoring, or the
    // narrative had quietly changed into an advertisement.
    expect(
      after?.score as number,
      "the fixed scan now scores 100 — the video would be showing a clean " +
        "bill of health for a suite that still has findings",
    ).toBeLessThan(100);
    expect(after?.errorCount as number).toBeLessThan(
      before?.errorCount as number,
    );
  });

  it("the patch shown on screen is the real before/after workflow", () => {
    expect(demo.patch).toBeDefined();
    const before = demo.patch?.before.join("\n") ?? "";
    const after = demo.patch?.after.join("\n") ?? "";
    expect(before).not.toBe(after);
    // The fix the tool actually printed: pipefail on the piped steps, no
    // continue-on-error left behind.
    expect(before).toContain("continue-on-error: true");
    expect(after).not.toContain("continue-on-error: true");
    expect(before).not.toContain("pipefail");
    expect(after).toContain("set -o pipefail");
    expect(
      readFileSync(
        join(ROOT, "examples", "demo-repo", ".github", "workflows", "ci.yml"),
        "utf8",
      ),
      "the canonical fixture must stay broken — the video's BEFORE state " +
        "is a real scan of examples/demo-repo, and the fix is applied to a " +
        "temporary copy only",
    ).toContain("continue-on-error: true");
  });
});

describe("every glyph the videos render resolves in a vendored font", () => {
  it("the probe still discriminates (must-not-fire control)", () => {
    // Guards the gate itself: two earlier browser-based implementations
    // reported emoji as covered by JetBrains Mono.
    const { missing } = probeGlyphs([SELF_TEST_CHAR]);
    expect(
      missing,
      "the glyph probe reports a character no vendored face contains as " +
        "covered — every coverage result it produces is untrustworthy",
    ).toEqual([SELF_TEST_CHAR]);
  });

  it("the static inventory is fully covered", () => {
    expect(probeGlyphs(requiredGlyphs()).missing).toEqual([]);
  });

  it.each(["demo", "tour"] as const)(
    "everything script.%s.json actually captured is covered",
    (id) => {
      const text = committed(id)
        .beats.flatMap((b) => b.ansi)
        .map(stripAnsi)
        .join("");
      const chars = [
        ...new Set([...text].filter((c) => (c.codePointAt(0) ?? 0) > 0x20)),
      ];
      const { missing } = probeGlyphs(chars);
      expect(
        missing,
        "the captured output contains characters no vendored face can " +
          "draw — these would render as tofu boxes in the video",
      ).toEqual([]);
    },
  );
});

describe("the render page cannot draw invisible text", () => {
  /**
   * Every line of reporter output carries its own colour from
   * ansiLineToSpans, which masked the fact that the page set no base
   * colour at all: the typed command line is bare text, so it inherited
   * the browser default — BLACK — and rendered invisible on a dark
   * window through several published renders before anyone spotted it.
   */
  it.each(["demo", "tour"] as const)(
    "script.%s.json's page declares a base text colour",
    (id) => {
      const page = buildPage(readScript(id));
      const base = /#lines\{[^}]*color:\s*(#[0-9a-fA-F]{3,8})/.exec(page);
      expect(
        base,
        "the text container sets no base `color`, so any element without " +
          "an explicit colour renders in the browser default (black) on a " +
          "dark terminal",
      ).not.toBeNull();
      expect(base?.[1]?.toLowerCase()).not.toBe("#000000");
    },
  );

  it("the typed command is styled, not left to inherit", () => {
    const page = buildPage(readScript("demo"));
    expect(page).toContain('class="cmd"');
    expect(page).toMatch(/\.cmd\{color:#[0-9a-fA-F]{3,8}/);
  });
});
