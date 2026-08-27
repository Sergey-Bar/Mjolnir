/**
 * ASCII art assets for the Mjölnir terminal experience.
 * Minimal Nordic / engineering aesthetic — professional, not fantasy.
 * All art must render identically with and without colors (NO_COLOR safety).
 */

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
