/**
 * The exact character inventory the demo videos must be able to render.
 *
 * Sourced from what the reporter can actually emit, not from a hand-kept
 * list: the committed `assets/readme/demo.svg` is a real `--verbose` scan
 * rendered by `renderTerminal`, and `src/reporter/{art,theme,terminal}.ts`
 * own every glyph the renderer can reach for (hammer states, gauges,
 * severity tags, box drawing). Anything in that union must resolve in the
 * vendored font stack or `probe-glyphs.ts` fails before a frame is drawn.
 *
 * A missing glyph is not cosmetic here. The hammer, the score gauge and
 * the severity tags ARE the video — a tofu box in place of `ᚦ` or `█`
 * would misrepresent what the tool prints, which is the one thing these
 * assets exist to avoid.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Reporter modules whose source contains every glyph they can print. */
const GLYPH_SOURCES = [
  join("src", "reporter", "art.ts"),
  join("src", "reporter", "theme.ts"),
  join("src", "reporter", "terminal.ts"),
  join("src", "commands", "explain.ts"),
];

/** Strips SVG markup back to the terminal text it was rendered from. */
function svgTextContent(svg: string): string {
  return (svg.match(/<text[^>]*>([\s\S]*?)<\/text>/g) ?? [])
    .map((el) =>
      el
        .replace(/<[^>]+>/g, "")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&"),
    )
    .join("");
}

/**
 * Every distinct character the videos may need, sorted by codepoint.
 * Control characters and the space are excluded: they have no glyph to
 * resolve, so asserting on them would be a false check.
 */
export function requiredGlyphs(extra = ""): string[] {
  const chars = new Set<string>();
  const add = (text: string): void => {
    for (const ch of text) chars.add(ch);
  };

  add(
    svgTextContent(
      readFileSync(join(ROOT, "assets", "readme", "demo.svg"), "utf8"),
    ),
  );
  for (const rel of GLYPH_SOURCES) add(readFileSync(join(ROOT, rel), "utf8"));
  add(extra);

  return [...chars]
    .filter((ch) => {
      const cp = ch.codePointAt(0) ?? 0;
      return cp > 0x20 && cp !== 0x7f;
    })
    .sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0));
}
