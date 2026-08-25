/**
 * ASCII art assets for the retro CRT/arcade terminal experience.
 * All art must be plain ASCII/box-drawing so it renders identically
 * with and without colors (NO_COLOR safety).
 */

/** Big figlet-style logo. Keep ≤ 62 cols wide. */
export const LOGO = `
  ██████╗  █████╗      ██████╗  ██████╗  ██████╗████████╗ ██████╗ ██████╗
 ██╔═══██╗██╔══██╗    ██╔═══██╗██╔═══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗
 ██║   ██║███████║    ██║   ██║██║   ██║██║        ██║   ██║   ██║██████╔╝
 ██║▄▄ ██║██╔══██║    ██║▄▄▄██║██║   ██║██║        ██║   ██║   ██║██╔══██╗
 ╚██████╔╝██║  ██║    ╚██████╔╝╚██████╔╝╚██████╗   ██║   ╚██████╔╝██║  ██║
  ╚══▀▀═╝ ╚═╝  ╚═╝     ╚══▀▀═╝  ╚══▀▀═╝  ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝
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

/** Small CRT-style divider. */
export const DIVIDER = "─".repeat(58);

/** Retro scanline strip used under the header. */
export const SCANLINES = "▁▂▃▄▅▆▇█▇▆▅▄▃▂▁";
