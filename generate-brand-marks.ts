/// <reference lib="dom" />
/**
 * `npm run brand:marks` — renders the brand marks from vector source
 * instead of shipping hand-provided PNG masters.
 *
 * WHY THIS REPLACES THE PROVIDED ARTWORK. The prior masters
 * (`assets/brand/logo.png`, `mark.png`) were an illustrated war-hammer —
 * the one asset in the whole system exempted from `brand-doctor`'s "no
 * unapproved ornament" rule (see the old `assets/brand/README.md`: "the
 * master mark's own engraving is grandfathered"). Replacing it with a
 * typographic wordmark removes that exemption instead of relying on it:
 * the logo is now made of the same two things everything else in this
 * system is made of — a token colour and a vendored typeface — so it is
 * regeneratable, not archival.
 *
 * THE TWO MARKS.
 *   - wordmark — "MJÖLNIR" set in Geist 500 (the one text face), tracked
 *     0.3em in primary text, the full lockup for anywhere there is room
 *     to read a word.
 *   - monogram — a single rune drawn as a path (`MONOGRAM_PATH`) and
 *     stroked in the aurora, for the square/tiny contexts a wordmark
 *     cannot survive (favicons, the npm/social icon). The rune is ᛗ
 *     (Mansaz) — already the "M" of MJÖLNIR in the hero runefield's own
 *     Elder Futhark spelling of the name (ᛗ ᛃ ᛟ ᛚ ᚾ ᛁ ᚱ, see
 *     docs/design/BRAND-SYSTEM.md), so the monogram is not a new choice,
 *     it is the initial the brand already spells itself with. It is
 *     deliberately NOT one of `RUNES` in src/reporter/score-state.ts (ᚲ
 *     ᚦ ᛏ ᛟ ᛁ) — the single glyph placed beside an actual verdict.
 *     Reusing one of those on the permanent logo would make the brand
 *     mark itself look like a standing verdict ("this product is always
 *     FORGED"), which is exactly the epistemic-honesty failure the
 *     scoring system exists to avoid. ᛗ only ever appears as ambient
 *     four-rune flourish decoration in src/reporter/art.ts, never as a
 *     single-glyph state indicator, so it carries no score meaning on
 *     its own.
 *
 * RENDERING. Both marks are laid out as HTML/CSS and shot with the same
 * Chromium the demo video uses (`resolveChromium`, `MJOLNIR_CHROMIUM`),
 * so no new dependency and no network at render time. Each output size
 * is rendered natively at its own target resolution rather than
 * downscaled from one raster — the old mark.png->favicon-16.png path
 * lost real fidelity at 16px; a vector source does not need to.
 *
 * DETERMINISM. A pure function of `src/brand/tokens.ts` + the vendored
 * font files + this file: same inputs, same output pixels every run on
 * the same Chromium build. There is deliberately no CI test that
 * re-invokes Chromium to prove that byte-for-byte — the video pipeline
 * already carries the cost of Chromium-path resolution differing between
 * platforms (see `MJOLNIR_CHROMIUM` in scripts/video/fonts.ts), and
 * duplicating that fragility into the normal test run for a check rule 9
 * already makes unnecessary — sha256, checked below — is not a trade
 * worth making.
 *
 * THE LOCK. `assets/brand/marks.lock.json` still pins every output by
 * sha256 and `brand-doctor` rule 9 still fails on drift — this script
 * changed HOW the pinned bytes are produced, not the fact that a change
 * to them must be deliberate. Run `npm run brand:marks:update` after
 * regenerating to re-pin.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

import { BRAND, SURFACE, TEXT } from "../src/brand/tokens.ts";
import { resolveChromium } from "./video/fonts.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const fontPath = (weight: number) =>
  join(ROOT, "site", "public", "fonts", `geist-${weight}-latin.woff2`);
const FONT_PATHS = [fontPath(400), fontPath(500)];

/** Mansaz — see file header for why this rune and not one of the score runes. */
export const MONOGRAM_RUNE = "ᛗ";
export const WORDMARK_TEXT = "MJÖLNIR";

/**
 * The rune, drawn rather than typeset: two staves, each with a diagonal
 * from its head to the middle of the other. A font glyph was the old
 * source, and its hairline stroke had to be fattened with text-stroke to
 * survive 16px at all. On a 48×64 grid, the stroke is set per size, so
 * the favicon gets a heavier cut instead of a blurrier one.
 */
export const MONOGRAM_PATH = "M11 60V14L37 36M37 60V14L11 36";

/** The aurora across the rune: green at the foot, violet at the head. */
function monogramSvg(px: number, stroke: number, join = "miter"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64"
    width="${(px * 48) / 64}" height="${px}" aria-hidden="true">
    <defs><linearGradient id="a" gradientUnits="userSpaceOnUse"
      x1="7" y1="60" x2="41" y2="6">
      <stop offset="0" stop-color="${BRAND.auroraGreen}"/>
      <stop offset="0.5" stop-color="${BRAND.auroraCyan}"/>
      <stop offset="1" stop-color="${BRAND.auroraViolet}"/>
    </linearGradient></defs>
    <path d="${MONOGRAM_PATH}" fill="none" stroke="url(#a)"
      stroke-width="${stroke}" stroke-linejoin="${join}" stroke-miterlimit="4"/>
  </svg>`;
}

function fontFaceCss(): string {
  return [400, 500]
    .map(
      (w) => `@font-face{font-family:"MjolnirSans";font-weight:${w};
      font-style:normal;src:url(data:font/woff2;base64,${readFileSync(
        fontPath(w),
      ).toString("base64")}) format("woff2")}`,
    )
    .join("\n");
}

const page = (w: number, h: number, ground: string, body: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fontFaceCss()}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${w}px;height:${h}px;background:${ground};overflow:hidden}
    body{display:flex;flex-direction:column;align-items:center;
      justify-content:center;font-family:"MjolnirSans",sans-serif}
    .word{font-weight:500;letter-spacing:0.3em;color:${TEXT.primary};
      padding-left:0.3em;line-height:1}
    .line{font-weight:400;color:${TEXT.secondary};letter-spacing:0.01em}
  </style></head><body>${body}</body></html>`;

/** Full lockup: the wordmark alone, on its own ink card. */
export function wordmarkHtml(w: number, h: number): string {
  return page(
    w,
    h,
    SURFACE.ink900,
    `<div class="word" style="font-size:${Math.round(h * 0.2)}px">${WORDMARK_TEXT}</div>`,
  );
}

/** Square monogram: the rune for contexts too small for the wordmark. */
export function monogramHtml(w: number, h: number): string {
  const size = Math.min(w, h);
  // Heavier at favicon sizes, where a hairline antialiases to nothing.
  // Below 64px the mitred heads spike past the pixel grid, so the small
  // cuts are bevelled: a flat head reads cleaner than a blurred point.
  const stroke = size <= 16 ? 9 : size <= 32 ? 8 : size <= 64 ? 7 : 5;
  const join = size < 64 ? "bevel" : "miter";
  return page(
    w,
    h,
    SURFACE.ink900,
    monogramSvg(Math.round(size * (size <= 32 ? 0.8 : 0.74)), stroke, join),
  );
}

/** Social card: rune over wordmark over one line, per the og:image spec. */
export function socialCardHtml(w: number, h: number): string {
  const glow = (c: string, a: number) =>
    `color-mix(in oklch, ${c} ${a}%, transparent)`;
  return page(
    w,
    h,
    `radial-gradient(60% 70% at 30% 0%, ${glow(BRAND.auroraGreen, 16)}, transparent 70%),
     radial-gradient(55% 65% at 72% 0%, ${glow(BRAND.auroraViolet, 16)}, transparent 70%),
     radial-gradient(40% 50% at 50% 0%, ${glow(BRAND.auroraCyan, 14)}, transparent 70%),
     ${SURFACE.ink950}`,
    `${monogramSvg(Math.round(h * 0.2), 5)}
     <div class="word" style="font-size:${Math.round(h * 0.1)}px;margin-top:${Math.round(h * 0.075)}px">${WORDMARK_TEXT}</div>
     <div class="line" style="font-size:${Math.round(h * 0.042)}px;margin-top:${Math.round(h * 0.06)}px">Checks whether your tests and CI can be trusted.</div>`,
  );
}

interface Target {
  file: string;
  html: (w: number, h: number) => string;
  w: number;
  h: number;
  jpeg?: boolean;
  webp?: boolean;
}

const TARGETS: Target[] = [
  { file: "assets/brand/logo.png", html: wordmarkHtml, w: 1800, h: 504 },
  { file: "assets/brand/mark.png", html: monogramHtml, w: 1235, h: 1235 },
  { file: "assets/readme/logo.png", html: wordmarkHtml, w: 1000, h: 280 },
  {
    file: "assets/readme/logo.webp",
    html: wordmarkHtml,
    w: 1000,
    h: 280,
    webp: true,
  },
  { file: "assets/brand/icon.png", html: monogramHtml, w: 512, h: 512 },
  {
    file: "site/public/apple-touch-icon.png",
    html: monogramHtml,
    w: 180,
    h: 180,
  },
  { file: "site/public/favicon-32.png", html: monogramHtml, w: 32, h: 32 },
  { file: "site/public/favicon-16.png", html: monogramHtml, w: 16, h: 16 },
  { file: "site/public/mark-64.png", html: monogramHtml, w: 64, h: 64 },
  {
    file: "site/public/logo.webp",
    html: wordmarkHtml,
    w: 1000,
    h: 280,
    webp: true,
  },
  {
    file: "site/public/social-card.jpg",
    html: socialCardHtml,
    w: 1200,
    h: 630,
    jpeg: true,
  },
];

async function main(): Promise<void> {
  const browser = await chromium.launch({ executablePath: resolveChromium() });
  try {
    const page = await browser.newPage();
    for (const t of TARGETS) {
      await page.setViewportSize({ width: t.w, height: t.h });
      await page.setContent(t.html(t.w, t.h), { waitUntil: "networkidle" });
      const outPath = join(ROOT, t.file);
      mkdirSync(dirname(outPath), { recursive: true });
      if (t.webp) {
        // Playwright's screenshot() only emits png/jpeg. Chromium's own
        // canvas can encode webp, so shoot a PNG buffer and re-encode it
        // in-page rather than mislabel a PNG with a .webp extension.
        const pngBuffer = await page.screenshot({ type: "png" });
        // This callback runs in the browser (Chromium can encode webp,
        // Node's Buffer cannot) — the file-level `dom` lib reference
        // above types it properly without pulling `lib: "dom"` into the
        // tsconfig for a script that otherwise never touches a window.
        const dataUrl = await page.evaluate<
          string,
          { b64: string; w: number; h: number }
        >(
          async ({ b64, w, h }) => {
            const img = new Image();
            const loaded = new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error("image decode failed"));
            });
            img.src = `data:image/png;base64,${b64}`;
            await loaded;
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("no 2d context");
            ctx.drawImage(img, 0, 0);
            return canvas.toDataURL("image/webp", 0.92);
          },
          { b64: pngBuffer.toString("base64"), w: t.w, h: t.h },
        );
        const webpBuffer = Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
        writeFileSync(outPath, webpBuffer);
      } else if (t.jpeg) {
        await page.screenshot({ path: outPath, type: "jpeg", quality: 92 });
      } else {
        await page.screenshot({ path: outPath, type: "png" });
      }
      process.stdout.write(`  wrote  ${t.file}  (${t.w}x${t.h})\n`);
    }
  } finally {
    await browser.close();
  }
}

if (FONT_PATHS.every((p) => existsSync(p))) {
  await main();
} else {
  process.stderr.write(
    "generate-brand-marks: vendored font(s) missing — run `npm run brand:fonts` first.\n",
  );
  process.exitCode = 1;
}
