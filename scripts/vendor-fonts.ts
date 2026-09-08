/**
 * `npm run brand:fonts` — vendors the brand typefaces for the website.
 *
 * WHY THE SITE SELF-HOSTS. Before this, the site fetched Cinzel and
 * Inter from `fonts.googleapis.com` at runtime: two cross-origin
 * round-trips on the critical path, a third-party dependency on a page
 * whose whole argument is that you should not trust what you have not
 * verified, and — the reason that actually mattered — a completely
 * different typeface from the one the README SVGs and the demo video
 * embed. A reader who found Mjölnir through GitHub and then opened the
 * site saw two products.
 *
 * The faces are now Geist and Geist Mono, which the SVGs and the video
 * already carry as vendored TTFs, plus Cinzel for display. Same shapes
 * everywhere, no network at render time.
 *
 * DETERMINISM. This script is a vendoring TOOL, not a build step. It
 * runs by hand, writes the woff2 files into `site/public/fonts/`, and
 * records every file's sha256 in `fonts.lock.json`. The committed files
 * are what ships; `--check` re-verifies the committed bytes against that
 * manifest without touching the network, and that is what CI runs. The
 * build itself never fetches anything.
 *
 * SUBSETS. Latin and latin-ext only. The site is English and its one
 * non-ASCII glyph of consequence is the ö in Mjölnir (U+00F6, latin).
 * Pulling Cyrillic, Greek and Vietnamese would triple the payload for
 * text that does not exist.
 *
 * LICENCES. Geist and Geist Mono are SIL OFL 1.1 (Vercel); Cinzel is SIL
 * OFL 1.1 (Natanael Gama). The OFL files are vendored beside the fonts.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { format, resolveConfig } from "prettier";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT_DIR = join(ROOT, "site", "public", "fonts");
const LOCK = join(OUT_DIR, "fonts.lock.json");
const FONTS_CSS = join(
  ROOT,
  "site",
  ".vitepress",
  "theme",
  "styles",
  "fonts.css",
);

/** The subsets that carry the site's actual text. */
const WANTED_SUBSETS = new Set(["latin", "latin-ext"]);

/** A modern UA, or Google serves TTF instead of woff2. */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface Face {
  /** The family as it is named in CSS. */
  family: string;
  /** Google Fonts query, e.g. `Geist:wght@400;500;600`. */
  query: string;
  /** Short slug used in the on-disk filename. */
  slug: string;
}

const FACES: Face[] = [
  { family: "Geist", query: "Geist:wght@400;500;600", slug: "geist" },
  {
    family: "Geist Mono",
    query: "Geist+Mono:wght@400;500",
    slug: "geist-mono",
  },
  { family: "Cinzel", query: "Cinzel:wght@600", slug: "cinzel" },
];

interface Block {
  family: string;
  weight: string;
  subset: string;
  url: string;
  unicodeRange: string;
}

/** Splits a Google Fonts stylesheet into one record per `@font-face`. */
export function parseFontCss(css: string): Block[] {
  const out: Block[] = [];
  // Each face is preceded by a `/* subset */` comment naming its subset.
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([\s\S]*?)\}/g;
  for (const m of css.matchAll(re)) {
    const body = m[2] ?? "";
    const family = /font-family:\s*'([^']+)'/.exec(body)?.[1];
    const weight = /font-weight:\s*(\d+)/.exec(body)?.[1];
    const url = /src:\s*url\(([^)]+)\)/.exec(body)?.[1];
    const unicodeRange = /unicode-range:\s*([^;]+);/.exec(body)?.[1];
    if (!family || !weight || !url || !unicodeRange) continue;
    out.push({
      family,
      weight,
      subset: m[1] ?? "",
      url,
      unicodeRange: unicodeRange.trim(),
    });
  }
  return out;
}

async function get(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const sha256 = (b: Buffer): string =>
  createHash("sha256").update(b).digest("hex");

/** `geist-600-latin.woff2` — family, weight and subset, nothing volatile. */
function filename(face: Face, block: Block): string {
  return `${face.slug}-${block.weight}-${block.subset}.woff2`;
}

export async function buildFontsCss(
  entries: { file: string; family: string; weight: string; range: string }[],
): Promise<string> {
  const faces = entries
    .map(
      (e) => `@font-face {
  font-family: "${e.family}";
  font-style: normal;
  font-weight: ${e.weight};
  /* swap, not optional: these are same-origin, cached and small, so the
     flash swap risks is shorter than the wrong-typeface render optional
     would leave in place for a reader's whole first visit. */
  font-display: swap;
  src: url("/Mjolnir/fonts/${e.file}") format("woff2");
  unicode-range: ${e.range};
}`,
    )
    .join("\n\n");

  return format(
    `/**
 * GENERATED by \`npm run brand:fonts\` from the vendored woff2 files in
 * site/public/fonts. Do not edit: re-run the script.
 *
 * Self-hosted, so the page needs no third party to render its own
 * wordmark, and same-origin, so there is no extra connection on the
 * critical path. "npm run brand:fonts -- --check" verifies the
 * committed bytes against fonts.lock.json without touching the network.
 */

${faces}
`,
    { ...(await resolveConfig(FONTS_CSS)), filepath: FONTS_CSS },
  );
}

async function vendor(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const lock: Record<string, string> = {};
  const entries: {
    file: string;
    family: string;
    weight: string;
    range: string;
  }[] = [];

  for (const face of FACES) {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=${face.query}&display=swap`,
        { headers: { "User-Agent": UA } },
      )
    ).text();
    const blocks = parseFontCss(css).filter((b) =>
      WANTED_SUBSETS.has(b.subset),
    );
    if (blocks.length === 0)
      throw new Error(`no latin subsets found for ${face.family}`);

    for (const b of blocks) {
      const bytes = await get(b.url);
      const file = filename(face, b);
      writeFileSync(join(OUT_DIR, file), bytes);
      lock[file] = sha256(bytes);
      entries.push({
        file,
        family: b.family,
        weight: b.weight,
        range: b.unicodeRange,
      });
      process.stdout.write(
        `  ${file}  ${(bytes.length / 1024).toFixed(1)} KB\n`,
      );
    }
  }

  // Sorted: a manifest whose order depends on network timing is a
  // manifest that reports a false diff on every run.
  const sorted = Object.fromEntries(
    Object.entries(lock).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(LOCK, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  entries.sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(FONTS_CSS, await buildFontsCss(entries), "utf8");
  process.stdout.write(`\n  wrote ${LOCK}\n  wrote ${FONTS_CSS}\n`);
}

/** Offline verification: the committed bytes are the manifest's bytes. */
export function check(): string[] {
  if (!existsSync(LOCK))
    return [`${LOCK} is missing — run npm run brand:fonts`];
  const lock = JSON.parse(readFileSync(LOCK, "utf8")) as Record<string, string>;
  const failures: string[] = [];
  for (const [file, want] of Object.entries(lock)) {
    const p = join(OUT_DIR, file);
    if (!existsSync(p)) {
      failures.push(`${file} — in the manifest, missing on disk`);
      continue;
    }
    const got = sha256(readFileSync(p));
    if (got !== want)
      failures.push(
        `${file} — sha256 ${got.slice(0, 12)} != ${want.slice(0, 12)}`,
      );
  }
  return failures;
}

const isMain = process.argv[1]
  ? fileURLToPath(new URL(`file://${process.argv[1].replaceAll("\\", "/")}`))
  : "";
if (isMain.endsWith("vendor-fonts.ts")) {
  if (process.argv.includes("--check")) {
    const failures = check();
    for (const f of failures) process.stderr.write(`  ${f}\n`);
    process.stdout.write(
      failures.length
        ? `\n  ${failures.length} vendored font(s) do not match fonts.lock.json\n`
        : "  vendored fonts match fonts.lock.json\n",
    );
    process.exit(failures.length ? 1 : 0);
  } else {
    await vendor();
  }
}
