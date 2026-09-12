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
 *   - wordmark — "MJÖLNIR" set in Cinzel 600 (the display token), the
 *     full lockup for anywhere there is room to read a word.
 *   - monogram — a single rune, for the square/tiny contexts a wordmark
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

import { BRAND, SURFACE } from "../src/brand/tokens.js";
import { resolveChromium } from "./video/fonts.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const CINZEL_PATH = join(
  ROOT,
  "site",
  "public",
  "fonts",
  "cinzel-600-latin.woff2",
);
const FREEMONO_PATH = join(ROOT, "assets", "video", "fonts", "FreeMono.ttf");

/** Mansaz — see file header for why this rune and not one of the score runes. */
export const MONOGRAM_RUNE = "ᛗ";
export const WORDMARK_TEXT = "MJÖLNIR";

function fontFaceCss(): string {
  const cinzel = readFileSync(CINZEL_PATH).toString("base64");
  const freeMono = readFileSync(FREEMONO_PATH).toString("base64");
  return `
    @font-face{font-family:"MjolnirDisplay";font-weight:600;font-style:normal;
      src:url(data:font/woff2;base64,${cinzel}) format("woff2")}
    @font-face{font-family:"MjolnirRunes";font-weight:400;font-style:normal;
      src:url(data:font/ttf;base64,${freeMono}) format("truetype")}
  `;
}

/** Full lockup: the wordmark alone, on its own ink card. */
export function wordmarkHtml(w: number, h: number): string {
  const fontSize = Math.round(h * 0.34);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fontFaceCss()}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${w}px;height:${h}px;background:${SURFACE.ink900};
      display:flex;align-items:center;justify-content:center;overflow:hidden}
    .word{font-family:"MjolnirDisplay",serif;font-weight:600;
      font-size:${fontSize}px;letter-spacing:0.08em;color:${BRAND.goldBright};
      padding-left:0.08em}
  </style></head><body><div class="word">${WORDMARK_TEXT}</div></body></html>`;
}

/** Square monogram: the rune fallback for contexts too small for the wordmark. */
export function monogramHtml(w: number, h: number): string {
  const size = Math.min(w, h);
  const fontSize = Math.round(size * 0.78);
  // A thin monospace stroke disappears under antialiasing at favicon
  // sizes (16/32px). -webkit-text-stroke fattens the glyph without
  // needing a bold weight of a font vendored only at regular.
  const strokeW = Math.max(1, Math.round(size * 0.045));
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fontFaceCss()}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${w}px;height:${h}px;background:${SURFACE.ink900};
      display:flex;align-items:center;justify-content:center;overflow:hidden}
    .rune{font-family:"MjolnirRunes",monospace;font-size:${fontSize}px;
      line-height:1;color:${BRAND.goldBright};
      -webkit-text-stroke:${strokeW}px ${BRAND.goldBright}}
  </style></head><body><div class="rune">${MONOGRAM_RUNE}</div></body></html>`;
}

/** Social card: the wordmark centered on the deepest ink, per the og:image spec. */
export function socialCardHtml(w: number, h: number): string {
  const fontSize = Math.round(h * 0.16);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fontFaceCss()}
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:${w}px;height:${h}px;background:${SURFACE.ink950};
      display:flex;align-items:center;justify-content:center;overflow:hidden}
    .word{font-family:"MjolnirDisplay",serif;font-weight:600;
      font-size:${fontSize}px;letter-spacing:0.08em;color:${BRAND.goldBright};
      padding-left:0.08em}
  </style></head><body><div class="word">${WORDMARK_TEXT}</div></body></html>`;
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

if (existsSync(CINZEL_PATH) && existsSync(FREEMONO_PATH)) {
  await main();
} else {
  process.stderr.write(
    "generate-brand-marks: vendored font(s) missing — run `npm run brand:fonts` first.\n",
  );
  process.exitCode = 1;
}
