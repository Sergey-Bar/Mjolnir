/**
 * ASCII art assets for the Mjölnir terminal experience.
 * Minimal Nordic / engineering aesthetic — professional, not fantasy.
 * All art must render identically with and without colors (NO_COLOR safety).
 */

import type { Palette } from "./theme.js";
import { gaugeColorForBand } from "./theme.js";
import type { ScoreBand, ScoreState } from "./score-state.js";

/** Block-character logo. Keep ≤ 62 cols wide. */
export const LOGO = `
 ╔═══════════╗
 ║           ║
 ╠═══════════╣    M J Ö L N I R
 ║     ║     ║
 ╚═════╩═════╝    VERIFICATION TRUST ENGINE
       ║
       ║
`;

/** Plain-ASCII fallback logo for cmd.exe/legacy consoles where the
 * block-drawing LOGO above renders as mangled "?" glyphs. */
export const LOGO_ASCII = `
 +-----------+
 |           |
 +-----------+    M J O L N I R
 |     |     |
 +-----+-----+    VERIFICATION TRUST ENGINE
       |
       |
`;

export const TROPHY = String.raw`
        ___________
       '._==_==_=_.'
       .-\:      /-.
      | (|:.     |) |
       '-|:.     |-'
         \::.    /
          '::. .'
            ) (
          _.' '._
         '-------'
`;

export const SKULL =
  String.raw`
     ______
   .-"      "-.
  /            \
 |,  .-.  .-.  ,|
 | )(_o/  \o_)( |
 |/     /\     \|
 (_     ^^     _)
  \__|IIIIII|__/
   | \IIIIII/ |
   \          /
    ` + "`--------`";

/** Small divider. */
export const DIVIDER = "\u2500".repeat(58);

/** Retro scanline strip used under the header. */
export const SCANLINES =
  "\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588\u2587\u2586\u2585\u2584\u2583\u2582\u2581";

/* ── The hammer as living score instrument ─────────────────────────
 *
 * The central metaphor finally inherits the score: one silhouette,
 * four states, drawn from ScoreState (pure function of score).
 *
 *   critical (0–49)  — cracked head (╱╲ fracture), runes absent.
 *   warning  (50–79) — runes partially lit, no sparks.
 *   trusted  (80–99) — full rune set, energy arcs flanking the head.
 *   forged   (100)   — halo row above, all runes lit, ⚡ row below.
 *
 * All rows live on one shared grid (head spans cols 3–13, haft sits
 * under its center) so states stay visually comparable. Widths ≤ 22
 * visible cols. Unicode and ASCII variants share the geometry.
 */

/** ASCII-mode state caption — the text marker that carries the state
 * when color is absent (symbols-accompany-color doctrine, R11). */
export const HAMMER_CAPTIONS: Record<ScoreBand | "unmeasured", string> = {
  critical: "[CRACKED]",
  warning: "[STRAINED]",
  trusted: "[CHARGED]",
  forged: "[FORGED]",
  unmeasured: "[UNMEASURED]",
};

export interface HammerArt {
  /** Decorative rows above the rune row (forged halo). */
  aura: string[];
  /** Lit rune row — absent runes simply are not drawn. */
  runes: string;
  /** Head top edge / face / bottom brow. */
  headTop: string;
  headFace: string;
  headBrow: string;
  /** Energy arcs flanking the head on the face row (trusted). */
  arcs: boolean;
  haft: string[];
  pommel: string;
  /** Rows below the pommel (forged lightning). */
  underglow: string[];
}

export const HAMMER_STATES: Record<
  ScoreBand,
  { unicode: HammerArt; ascii: HammerArt }
> = {
  critical: {
    unicode: {
      aura: [],
      runes: "",
      headTop: "   ▄▄▄▄▄▄▄▄▄▄▄",
      headFace: "   ████╱╲█████",
      headBrow: "   ▀▀▀▀▀▀▀▀▀▀▀",
      arcs: false,
      haft: ["        ██", "        ██", "        ██"],
      pommel: "       ▄██",
      underglow: [],
    },
    ascii: {
      aura: [],
      runes: "",
      headTop: "   ===========",
      headFace: "   ####/\\#####",
      headBrow: "   ===========",
      arcs: false,
      haft: ["        ||", "        ||", "        ||"],
      pommel: "       ###",
      underglow: [],
    },
  },
  warning: {
    unicode: {
      aura: [],
      runes: "    ᚦ       ᚹ",
      headTop: "   ▄▄▄▄▄▄▄▄▄▄▄",
      headFace: "   ███████████",
      headBrow: "   ▀▀▀▀▀▀▀▀▀▀▀",
      arcs: false,
      haft: ["        ██", "        ██", "        ██"],
      pommel: "       ▄██",
      underglow: [],
    },
    ascii: {
      aura: [],
      runes: "    *       *",
      headTop: "   ===========",
      headFace: "   ###########",
      headBrow: "   ===========",
      arcs: false,
      haft: ["        ||", "        ||", "        ||"],
      pommel: "       ###",
      underglow: [],
    },
  },
  trusted: {
    unicode: {
      aura: [],
      runes: "   ᛏ  ᚹ  ᛗ  ᚨ",
      headTop: "   ▄▄▄▄▄▄▄▄▄▄▄",
      headFace: "   ███████████",
      headBrow: "   ▀▀▀▀▀▀▀▀▀▀▀",
      arcs: true,
      haft: ["        ██", "        ██", "        ██"],
      pommel: "       ▄██",
      underglow: [],
    },
    ascii: {
      aura: [],
      runes: "   *  *  *  *",
      headTop: "   ===========",
      headFace: "   ###########",
      headBrow: "   ===========",
      arcs: true,
      haft: ["        ||", "        ||", "        ||"],
      pommel: "       ###",
      underglow: [],
    },
  },
  forged: {
    unicode: {
      aura: ["   ╭─────────╮"],
      runes: "   ᛏ  ᚹ  ᛗ  ᚨ",
      headTop: "   ▄▄▄▄▄▄▄▄▄▄▄",
      headFace: "   ███████████",
      headBrow: "   ▀▀▀▀▀▀▀▀▀▀▀",
      arcs: false,
      haft: ["        ██", "        ██", "        ██"],
      pommel: "       ▄██",
      underglow: ["     ⚡   ⚡"],
    },
    ascii: {
      aura: ["   .---------."],
      runes: "   *  *  *  *",
      headTop: "   ===========",
      headFace: "   ###########",
      headBrow: "   ===========",
      arcs: false,
      haft: ["        ||", "        ||", "        ||"],
      pommel: "       ###",
      underglow: ["     *   *"],
    },
  },
};

/** Wordmark for the 100-state celebration block. */
export const FORGED_WORDMARK = "⚡ F O R G E D ⚡";

/**
 * Render the hammer for a ScoreState. Pure function of
 * (state, palette, ascii) — same input, same output, golden-testable.
 * Every line carries the state color (via the shared band mapping) and
 * the final caption line states the state in plain text, so NO_COLOR /
 * non-TTY output keeps the state legible (R11).
 *
 * The forged band fakes a gold-hot gradient by alternating forged
 * bright with gold-dim (amber is this palette's gold) per glyph.
 */
export function renderHammer(
  state: ScoreState,
  p: Palette,
  ascii: boolean,
): string[] {
  const band = state.band;
  if (band === "unmeasured") {
    // The score section never renders without a score; keep a graceful
    // one-line state marker for direct callers anyway.
    return [p.dim(HAMMER_CAPTIONS.unmeasured)];
  }
  const art = ascii ? HAMMER_STATES[band].ascii : HAMMER_STATES[band].unicode;
  const color = gaugeColorForBand(band, p);
  const gold = p.warning; // amber = this palette's gold

  const lines: string[] = [];
  for (const aura of art.aura) lines.push(gold(aura));
  if (art.runes.length > 0) lines.push(color(art.runes));
  lines.push(color(art.headTop));
  if (art.arcs) {
    lines.push(
      ascii
        ? color(" >" + art.headFace.trimStart() + "<")
        : color(" ~>") + color(art.headFace.trimStart()) + color("<~"),
    );
  } else if (band === "forged" && !ascii) {
    // Gradient simulation: alternate forged-bright and gold-dim glyphs.
    const face = art.headFace.trimStart();
    let mixed = "";
    for (let i = 0; i < face.length; i++) {
      mixed += (i % 2 === 0 ? color : gold)(face.charAt(i));
    }
    lines.push(
      art.headFace.slice(0, art.headFace.length - face.length) + mixed,
    );
  } else {
    lines.push(color(art.headFace));
  }
  lines.push(color(art.headBrow));
  for (const haft of art.haft) lines.push(color(haft));
  lines.push(color(art.pommel));
  for (const glow of art.underglow) lines.push(gold(glow));
  // Caption carries the state without color (R11). ASCII mode stays
  // glyph-free: bare rune characters mangle on legacy consoles.
  lines.push(
    ascii
      ? p.dim(HAMMER_CAPTIONS[band])
      : p.dim(`${state.rune} ${HAMMER_CAPTIONS[band]}`),
  );
  return lines;
}
