/**
 * Builds the HTML terminal the videos are rendered in.
 *
 * The ANSI-to-colored-span translation is NOT reimplemented here: it
 * comes from scripts/readme-svg.ts, the same module generate-readme-hero
 * and generate-readme-demo use. One parser, one palette, every asset —
 * when src/reporter/theme.ts changes, all of them move together or the
 * reproducibility specs fail. A second parser would be a second thing to
 * drift.
 *
 * The page exposes `window.__renderFrame(n)`, which paints exactly the
 * state of frame n. There is no requestAnimationFrame, no timer and no
 * wall clock anywhere in it: the render is a pure function of the
 * committed script, the pinned pacing, and the frame index. That is what
 * makes the timeline reproducible rather than merely repeatable.
 */

import { ansiLineToSpans, stripAnsi } from "../readme-svg.js";
import { fontFaceCss, FONT_STACK } from "./fonts.js";
import { pacingFor } from "./pacing.js";
import type { VideoScript } from "./script-types.js";

/** Brand tokens, from assets/brand/README.md. */
const INK = "#0A1119";
const CHROME = "#111A29";
const STEEL_DIM = "#8B939D";
const GOLD = "#C19A34";

/** One rendered step of the timeline: what is on screen at frame n. */
export interface Frame {
  /** Index of the beat being shown. */
  beat: number;
  /** Characters of the command line typed so far. */
  typed: number;
  /** Output lines revealed so far. */
  lines: number;
  /** Patch lines revealed so far, for the fix beat. */
  patch: number;
}

/**
 * Expands a script into its full frame list under the pinned pacing.
 * Exported because the media contract checks the rendered video's
 * duration against exactly this count — the encoder is not trusted to
 * report back what it was asked to produce.
 */
export function planFrames(script: VideoScript): Frame[] {
  const pacing = pacingFor(script.id);
  const frames: Frame[] = [];
  const push = (f: Frame, times: number): void => {
    for (let i = 0; i < times; i++) frames.push({ ...f });
  };

  script.beats.forEach((beat, beatIndex) => {
    const patchLines = patchLineCount(script, beat.id);
    const at = (typed: number, lines: number, patch: number): Frame => ({
      beat: beatIndex,
      typed,
      lines,
      patch,
    });

    for (let c = 1; c <= beat.command.length; c++) {
      push(at(c, 0, 0), pacing.framesPerTypedChar);
    }
    for (let l = 1; l <= beat.ansi.length; l++) {
      const line = stripAnsi(beat.ansi[l - 1] ?? "");
      const linger = pacing.lingerOn.some((m) => line.includes(m));
      push(
        at(beat.command.length, l, 0),
        pacing.framesPerOutputLine + (linger ? pacing.lingerFrames : 0),
      );
    }
    for (let l = 1; l <= patchLines; l++) {
      push(
        at(beat.command.length, beat.ansi.length, l),
        pacing.framesPerPatchLine,
      );
    }

    const last = beatIndex === script.beats.length - 1;
    push(
      at(beat.command.length, beat.ansi.length, patchLines),
      last ? pacing.finalHoldFrames : pacing.holdFrames,
    );
  });
  return frames;
}

/**
 * The frame that best represents the video: the first one holding on a
 * lingered line (the score section). Chosen by content rather than by a
 * hardcoded index, so it stays correct when the report changes length.
 */
export function posterFrame(script: VideoScript): number {
  const pacing = pacingFor(script.id);
  const frames = planFrames(script);
  for (const [i, frame] of frames.entries()) {
    if (frame.lines === 0) continue;
    const beat = script.beats[frame.beat];
    const line = stripAnsi(beat?.ansi[frame.lines - 1] ?? "");
    if (pacing.lingerOn.some((m) => line.includes(m))) {
      // Midway through the hold, well clear of the reveal edge.
      return i + Math.floor(pacing.lingerFrames / 2);
    }
  }
  return Math.floor(frames.length / 2);
}

/** The fix beat renders the real before/after workflow instead of CLI output. */
export function patchLineCount(script: VideoScript, beatId: string): number {
  if (!beatId.endsWith("-fix") || !script.patch) return 0;
  return diffLines(script.patch).length;
}

export interface DiffLine {
  kind: "context" | "add" | "remove" | "header";
  text: string;
}

/**
 * A plain line-level diff of the two real workflow files. Deliberately
 * simple: both sides are committed, short, and shown in full, so there is
 * nothing for a smarter algorithm to earn here.
 */
export function diffLines(
  patch: NonNullable<VideoScript["patch"]>,
): DiffLine[] {
  const out: DiffLine[] = [{ kind: "header", text: `--- ${patch.file}` }];
  const before = new Set(patch.before);
  const after = new Set(patch.after);
  for (const line of patch.before) {
    if (!after.has(line)) out.push({ kind: "remove", text: line });
  }
  for (const line of patch.after) {
    if (!before.has(line)) out.push({ kind: "add", text: line });
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Spans made only of SOLID block glyphs, which tile edge to edge and need
 * the seam-closing stroke.
 *
 * Shade characters (U+2591 ░, U+2592 ▒, U+2593 ▓) are deliberately
 * excluded: they are dither patterns, and stroking them thickens every
 * dot until the gauge's unfilled portion reads as noise rather than as
 * empty track.
 */
const SOLID_BLOCK_RUN = /^[\u2580\u2584\u2588\u258C\u2590\u2596-\u259F\s]+$/;

/** ANSI line to colored spans, via the repo's single parser. */
function lineHtml(line: string): string {
  const spans = ansiLineToSpans(line);
  if (spans.length === 0) return "<br>";
  // ansiLineToSpans already XML-escapes each span's text.
  return spans
    .map((s) => {
      const cls = SOLID_BLOCK_RUN.test(s.text) ? ' class="blocks"' : "";
      return `<span${cls} style="color:${s.color}">${s.text}</span>`;
    })
    .join("");
}

/**
 * The widest line any beat prints, in characters. The font size is
 * derived from this so the content fills the frame at its natural size —
 * upscaling a small render is what makes terminal video look soft.
 */
export function widestLine(script: VideoScript): number {
  let widest = 0;
  for (const beat of script.beats) {
    widest = Math.max(widest, beat.command.length + 2);
    for (const line of beat.ansi) {
      widest = Math.max(widest, stripAnsi(line).length);
    }
  }
  if (script.patch) {
    for (const d of diffLines(script.patch)) {
      widest = Math.max(widest, d.text.length + 2);
    }
  }
  return widest;
}

export function buildPage(script: VideoScript): string {
  const pacing = pacingFor(script.id);
  const [vw, vh] = pacing.viewport;
  const pad = 28;
  const cols = widestLine(script);
  // JetBrains Mono advances 0.6em per character. The font is sized so the
  // widest real line fills the frame at its natural size — upscaling a
  // small render is what makes terminal video look soft.
  //
  // Both metrics are then snapped so that one character cell is a WHOLE
  // number of device pixels. Block-drawing glyphs (the hammer, the score
  // gauge) tile edge to edge, and at a fractional advance each cell lands
  // on a different sub-pixel offset — antialiasing then draws a seam
  // between every pair of blocks and the hammer reads as a brick wall.
  const dpr = pacing.deviceScaleFactor;
  const maxFont = Math.min(17, (vw - pad * 2) / (cols * 0.6));
  const advance = Math.floor(maxFont * 0.6 * dpr) / dpr;
  const fontSize = advance / 0.6;
  // ~1.15 line height, snapped the same way so rows tile too.
  const lineHeight = Math.round(fontSize * 1.15 * dpr) / dpr;
  // A fixed, centred content box: sizing to the widest line leaves most
  // of the frame empty on the right, because only the honesty footer is
  // that long. Centring a box of exactly that width keeps the layout
  // balanced without shifting as lines reveal.
  const boxWidth = Math.ceil(cols * advance);

  const beats = script.beats.map((beat) => ({
    command: beat.command,
    lines: beat.ansi.map(lineHtml),
    patch:
      script.patch && beat.id.endsWith("-fix")
        ? diffLines(script.patch).map((d) => ({
            kind: d.kind,
            text: escapeHtml(d.text) || " ",
          }))
        : [],
  }));

  return `<!doctype html>
<meta charset="utf-8">
<style>
${fontFaceCss()}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${vw}px;height:${vh}px;overflow:hidden;background:${INK}}
#win{position:absolute;inset:0;display:flex;flex-direction:column;background:${INK}}
#bar{height:34px;flex:0 0 34px;background:${CHROME};display:flex;align-items:center;padding:0 14px;gap:8px}
.dot{width:11px;height:11px;border-radius:50%}
#title{flex:1;text-align:center;color:${STEEL_DIM};font:12px ${FONT_STACK};letter-spacing:.08em}
#screen{flex:1;overflow:hidden;padding:${pad}px;display:flex;justify-content:center;align-items:flex-start}
#lines{width:${boxWidth}px;font:${fontSize}px/${lineHeight}px ${FONT_STACK};white-space:pre;font-variant-ligatures:none;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
#lines div{height:${lineHeight}px}
/* JetBrains Mono's block glyphs (U+2580-259F) do not span their full
   advance, so tiled runs — the hammer, the score gauge, the category
   meters — show a hairline seam between every pair even at whole-pixel
   positions. A stroke of half a device pixel closes the gap without
   disturbing the character grid. Applied only to spans that are pure
   block art, so ordinary text is untouched. */
#lines .blocks{-webkit-text-stroke:${(0.75 / pacing.deviceScaleFactor).toFixed(3)}px currentColor}
.caret{color:${GOLD}}
.prompt{color:#4FB477}
.add{color:#4FB477}
.remove{color:#E5544E}
.header{color:${STEEL_DIM}}
</style>
<div id="win">
  <div id="bar">
    <span class="dot" style="background:#ff5f56"></span>
    <span class="dot" style="background:#ffbd2e"></span>
    <span class="dot" style="background:#27c93f"></span>
    <span id="title">demo-repo &#8212; mjolnir</span>
  </div>
  <div id="screen"><div id="lines"></div></div>
</div>
<script>
window.__BEATS__ = ${JSON.stringify(beats)};
window.__renderFrame = function (frame) {
  var screen = document.getElementById("lines");
  var html = "";
  for (var b = 0; b <= frame.beat; b++) {
    var beat = window.__BEATS__[b];
    var current = b === frame.beat;
    var typed = current ? frame.typed : beat.command.length;
    var shown = current ? frame.lines : beat.lines.length;
    var patched = current ? frame.patch : beat.patch.length;
    if (typed > 0) {
      var caret = current && typed < beat.command.length
        ? '<span class="caret">█</span>'
        : "";
      var cmd = beat.command.slice(0, typed)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      html += '<div><span class="prompt">$</span> ' + cmd + caret + "</div>";
    }
    for (var i = 0; i < shown; i++) html += "<div>" + beat.lines[i] + "</div>";
    for (var j = 0; j < patched; j++) {
      var d = beat.patch[j];
      var mark = d.kind === "add" ? "+" : d.kind === "remove" ? "-" : " ";
      html += '<div class="' + d.kind + '">' +
        (d.kind === "header" ? "" : mark + " ") + d.text + "</div>";
    }
  }
  screen.innerHTML = html;
  // Keep the newest line in view with no scroll animation: what is
  // visible is a pure function of how many lines are showing.
  var view = screen.parentNode;
  view.scrollTop = view.scrollHeight - view.clientHeight;
};
</script>
`;
}
