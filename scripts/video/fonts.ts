/**
 * The vendored font stack for the demo videos, and how to resolve the
 * Chromium that renders it.
 *
 * Both faces are committed under assets/video/fonts/ WITH their licenses
 * and embedded into the render page as base64 data: URIs. Nothing is
 * fetched at render time and nothing is taken from the host's installed
 * fonts: a video that renders differently depending on what the machine
 * happens to have installed is not a reproducible artifact.
 *
 * Two faces are required, not one. JetBrains Mono is the brand's code
 * face (assets/brand/README.md) and covers the box drawing, block
 * elements and severity marks the reporter draws. It does NOT cover the
 * Runic block — and `src/reporter/art.ts` puts ᚦ and ᚹ on the hammer in
 * every score state above critical. GNU FreeMono supplies those — and U+2139 ℹ, the INFO severity mark, which
 * JetBrains Mono also lacks. FreeMono is itself monospace, so the runes
 * land on the same character grid as everything around them; a
 * proportional fallback would knock the hammer art out of alignment.
 * `probe-glyphs.ts` proves this split rather than assuming it; if either
 * file changes, the probe is the thing that catches it.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
export const FONT_DIR = join(ROOT, "assets", "video", "fonts");

export interface VendoredFont {
  /** The @font-face family name used inside the render page. */
  family: string;
  file: string;
  weight: number;
  mime: string;
}

/** Absolute path to a vendored face on disk. */
export function fontPath(f: VendoredFont): string {
  return join(FONT_DIR, f.file);
}

export const FONTS: VendoredFont[] = [
  {
    family: "MjolnirMono",
    file: "JetBrainsMono-Regular.ttf",
    weight: 400,
    mime: "font/ttf",
  },
  {
    family: "MjolnirMono",
    file: "JetBrainsMono-Bold.ttf",
    weight: 700,
    mime: "font/ttf",
  },
  {
    family: "MjolnirRunes",
    file: "FreeMono.ttf",
    weight: 400,
    mime: "font/ttf",
  },
];

/** The CSS font stack. Order matters: runes fall through to DejaVu. */
export const FONT_STACK = `"MjolnirMono", "MjolnirRunes", monospace`;

/** `@font-face` rules with the files inlined — no network, no system fonts. */
export function fontFaceCss(): string {
  return FONTS.map((f) => {
    const b64 = readFileSync(join(FONT_DIR, f.file)).toString("base64");
    return `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:normal;font-display:block;src:url(data:${f.mime};base64,${b64}) format("truetype")}`;
  }).join("\n");
}

/**
 * The Chromium to render with. Prefers an explicit override, then the
 * Playwright browser pool the container already provides; never downloads.
 */
export function resolveChromium(): string {
  const explicit = process.env["MJOLNIR_CHROMIUM"];
  if (explicit) return explicit;
  const pool = process.env["PLAYWRIGHT_BROWSERS_PATH"] ?? "/opt/pw-browsers";
  return join(pool, "chromium-1194", "chrome-linux", "chrome");
}
