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
const INK_950 = "#0A1119"; // deepest — the page behind the window
const INK_900 = "#0C1420"; // the terminal body
const CHROME = "#111A29"; // title bar
const STEEL_DIM = "#8B939D";
const GOLD = "#C19A34";
const AURORA = "#37ABBD";

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

/**
 * Runic characters, which come from the fallback face.
 *
 * FreeMono is a noticeably lighter design than JetBrains Mono, so the
 * runes on the hammer rendered as thin specks beside the bold blocks they
 * sit on. A stroke brings their weight into line with the rest of the
 * frame; without it the one detail unique to this tool's output is also
 * the least legible thing in it.
 */
const RUNIC = /[\u16A0-\u16FF]/gu;

/** ANSI line to colored spans, via the repo's single parser. */
function lineHtml(line: string): string {
  const spans = ansiLineToSpans(line);
  if (spans.length === 0) return "<br>";
  // ansiLineToSpans already XML-escapes each span's text.
  return spans
    .map((s) => {
      const cls = SOLID_BLOCK_RUN.test(s.text) ? ' class="blocks"' : "";
      // Runes are wrapped individually so only they get the weight
      // correction — the surrounding text is already the right face.
      const text = s.text.replace(
        RUNIC,
        (ch) => `<span class="rune">${ch}</span>`,
      );
      return `<span${cls} style="color:${s.color}">${text}</span>`;
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
  // Window chrome. The terminal is inset from the frame edges so it reads
  // as a window on a surface rather than a maximised screenshot.
  const inset = 44;
  const radius = 20;
  const barHeight = 40;
  const pad = 30;
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
  const maxFont = Math.min(24, (vw - inset * 2 - pad * 2) / (cols * 0.6));
  const advance = Math.floor(maxFont * 0.6 * dpr) / dpr;
  const fontSize = advance / 0.6;
  // ~1.15 line height, snapped the same way so rows tile too.
  const lineHeight = Math.round(fontSize * 1.15 * dpr) / dpr;
  // A fixed, centred content box: sizing to the widest line leaves most
  // of the frame empty on the right, because only the honesty footer is
  // that long. Centring a box of exactly that width keeps the layout
  // balanced without shifting as lines reveal.
  const boxWidth = Math.ceil(cols * advance);

  // The scroll viewport is sized to a WHOLE number of lines.
  //
  // Scrolling to (scrollHeight - clientHeight) keeps the newest line flush
  // with the bottom, but when the viewport is not an exact multiple of the
  // line height that offset is fractional — so the top line renders sliced
  // in half against the title bar on every frame after the screen fills.
  const viewportAvail = vh - inset * 2 - barHeight - pad * 2;
  const visibleLines = Math.floor(viewportAvail / lineHeight);
  const viewportHeight = visibleLines * lineHeight;

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
html,body{width:${vw}px;height:${vh}px;overflow:hidden;background:${INK_950}}
/* The frame is a designed surface, not a maximised terminal screenshot:
   a soft brand glow behind a floating window, the way a product page
   presents a terminal rather than the way an OS does. */
#page{position:absolute;inset:0;background:
  radial-gradient(120% 90% at 50% -10%, ${GOLD}1F 0%, transparent 55%),
  radial-gradient(90% 70% at 8% 108%, ${AURORA}14 0%, transparent 60%),
  ${INK_950}}
#win{position:absolute;inset:${inset}px;display:flex;flex-direction:column;
  background:${INK_900};border-radius:${radius}px;overflow:hidden;
  box-shadow:0 0 0 1px #FFFFFF14, 0 2px 4px #00000040,
    0 18px 48px -12px #00000080, 0 48px 96px -32px #000000A6}
#bar{height:${barHeight}px;flex:0 0 ${barHeight}px;background:${CHROME};
  display:flex;align-items:center;padding:0 20px;gap:9px;
  box-shadow:inset 0 -1px 0 #FFFFFF0D}
.dot{width:12px;height:12px;border-radius:50%;background:#2B3442}
#title{flex:1;text-align:center;color:${STEEL_DIM};
  font:13px ${FONT_STACK};letter-spacing:.06em}
#screen{flex:1;overflow:hidden;padding:${pad}px;display:flex;
  justify-content:center;align-items:flex-start}
#viewport{height:${viewportHeight}px;overflow:hidden}
#lines{width:${boxWidth}px;font:${fontSize}px/${lineHeight}px ${FONT_STACK};
  white-space:pre;font-variant-ligatures:none;-webkit-font-smoothing:antialiased;
  text-rendering:geometricPrecision}
#lines div{height:${lineHeight}px}
/* JetBrains Mono's block glyphs do not span their full advance, so tiled
   runs — the hammer, the score gauge, the meters — show a hairline seam
   between every pair even at whole-pixel positions. Half a device pixel
   of stroke closes it. Shade glyphs are excluded: they are dither
   patterns, and stroking them turns the gauge's empty track into noise. */
#lines .blocks{-webkit-text-stroke:${(0.75 / dpr).toFixed(3)}px currentColor}
/* Runes come from the lighter fallback face — see the .rune note in
   lineHtml. */
#lines .rune{-webkit-text-stroke:${(1.1 / dpr).toFixed(3)}px currentColor}
.caret{color:${GOLD}}
.prompt{color:#4FB477}
.add{color:#4FB477}
.remove{color:#E5544E}
.header{color:${STEEL_DIM}}
</style>
<div id="page">
  <div id="win">
    <div id="bar">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
      <span id="title">mjolnir &#8212; demo-repo</span>
    </div>
    <div id="screen"><div id="viewport"><div id="lines"></div></div></div>
  </div>
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
  var view = document.getElementById("viewport");
  view.scrollTop = view.scrollHeight - view.clientHeight;
};
</script>
`;
}
