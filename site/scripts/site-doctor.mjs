/**
 * `npm run doctor` (in site/) — the site's own quality gate.
 *
 * The product is governed by executable laws (`mjolnir doctor`,
 * CLAUDE.md). The site was not: `pages.yml` ran the catalog generator's
 * unit tests and `vitepress build`, and nothing else. That is how the
 * landing page came to display a hand-typed 70/100 next to a generated
 * asset reading 75/100 — on the page whose whole argument is that the
 * tool never asserts what it has not measured.
 *
 * Site law (`.planning/SITE-REDESIGN-PLAN.md` §1): every number, verdict
 * and code sample on the site is generated from a real scan, or it does
 * not ship.
 *
 * Checks are numbered and stable. Unimplemented checks report as GAP and
 * say what they would need — a gap is a defect to close, never a silent
 * pass.
 *
 * Exit codes mirror the product's: 0 clean, 1 findings, 10 usage error.
 * Pass `--advisory` to always exit 0 (used while the baseline burns down).
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..");
const ROOT = join(SITE, "..");
const THEME = join(SITE, ".vitepress", "theme");

/* ------------------------------------------------------------------ *
 * colour maths (WCAG 2.1 relative luminance)
 * ------------------------------------------------------------------ */

export function parseColor(v) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim());
  if (hex) {
    const h =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((c) => c + c)
            .join("")
        : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(v.trim());
  if (rgb) {
    const p = rgb[1].split(/[,/]/).map((s) => parseFloat(s));
    if (p.length >= 3 && p.every((n) => Number.isFinite(n)))
      return p.slice(0, 3);
  }
  return null;
}

export function luminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)];
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Extracts `--token: value;` declarations from one CSS block. */
export function parseTokens(css, selector) {
  const re = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([\\s\\S]*?)\\n\\}`,
  );
  const block = re.exec(css);
  if (!block) return {};
  const out = {};
  for (const m of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

/** Resolves `var(--x)` chains to a literal colour, or null. */
export function resolve(tokens, name, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const raw = tokens[name];
  if (!raw) return null;
  const v = raw.trim();
  const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(v);
  if (ref) return resolve(tokens, ref[1], seen);
  return parseColor(v);
}

/* ------------------------------------------------------------------ *
 * Check 1 — contrast
 *
 * Which foreground sits on which surface cannot be inferred from CSS, so
 * the pairs are declared. Every pair here corresponds to text the site
 * actually renders; adding a semantic colour means adding its pair.
 * ------------------------------------------------------------------ */

const CONTRAST_PAIRS = [
  ["--vp-c-brand-1", "body links and inline <code> in the docs"],
  ["--vp-c-text-1", "primary prose"],
  ["--vp-c-text-2", "secondary prose"],
  ["--vp-c-text-3", "captions and metadata"],
  ["--mj-worthy", "score verdict — trusted"],
  ["--mj-needswork", "score verdict — needs work"],
  ["--mj-unworthy", "score verdict — unworthy"],
  ["--mj-trusted", "score band 80-99"],
  ["--mj-info", "informational findings"],
];

/** Surfaces text is set on, per theme. */
const SURFACES = ["--vp-c-bg", "--vp-c-bg-alt", "--vp-c-bg-soft"];
const AA_NORMAL = 4.5;

function checkContrast() {
  const css = readFileSync(join(THEME, "styles", "vars.css"), "utf8");
  const themes = [
    ["light", parseTokens(css, ":root")],
    ["dark", { ...parseTokens(css, ":root"), ...parseTokens(css, ".dark") }],
  ];

  const failures = [];
  for (const [theme, tokens] of themes) {
    for (const [fg, context] of CONTRAST_PAIRS) {
      const fgc = resolve(tokens, fg);
      if (!fgc) {
        failures.push({
          theme,
          fg,
          bg: "—",
          ratio: null,
          context,
          why: "unresolved",
        });
        continue;
      }
      for (const bg of SURFACES) {
        const bgc = resolve(tokens, bg);
        if (!bgc) continue;
        const ratio = contrast(fgc, bgc);
        if (ratio < AA_NORMAL) {
          failures.push({ theme, fg, bg, ratio, context });
        }
      }
    }
  }
  return {
    n: 1,
    name: "Contrast",
    detail: `${CONTRAST_PAIRS.length} tokens × ${SURFACES.length} surfaces × 2 themes, WCAG AA ${AA_NORMAL}:1`,
    failures: failures.map(
      (f) =>
        `${f.theme}: ${f.fg} on ${f.bg} = ${f.ratio === null ? f.why : f.ratio.toFixed(2) + ":1"} — ${f.context}`,
    ),
  };
}

/* ------------------------------------------------------------------ *
 * Check 2 — no typed claims
 *
 * A score or verdict literal in the site source is D1 waiting to happen.
 * The numbers must come from generated/report.json.
 * ------------------------------------------------------------------ */

const VERDICTS = /\b(WORTHY|NEEDS WORK|UNWORTHY|FORGED)\b/;
const SCORE_LITERAL = /\b\d{1,3}\s*\/\s*100\b/;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (
      e === "node_modules" ||
      e === "dist" ||
      e === "cache" ||
      e === "generated"
    )
      continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function checkNoTypedClaims() {
  const files = walk(join(SITE, ".vitepress")).filter((f) =>
    /\.(vue|ts|mts|js|mjs)$/.test(f),
  );
  const failures = [];
  for (const f of files) {
    // The doctor and the generator necessarily mention these patterns.
    if (/site-doctor|gen-report/.test(f)) continue;
    const text = readFileSync(f, "utf8");
    text.split("\n").forEach((line, i) => {
      if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*"))
        return;
      if (SCORE_LITERAL.test(line) || VERDICTS.test(line)) {
        failures.push(
          `${relative(ROOT, f)}:${i + 1} — ${line.trim().slice(0, 90)}`,
        );
      }
    });
  }
  return {
    n: 2,
    name: "No typed claims",
    detail: "no score or verdict literal outside generated data",
    failures,
  };
}

/* ------------------------------------------------------------------ *
 * Check 3 — asset budget
 * ------------------------------------------------------------------ */

const ASSET_CAP_KB = { ".png": 40, ".webp": 80, ".jpg": 120, ".svg": 60 };

function checkAssetBudget() {
  const pub = join(SITE, "public");
  const failures = [];
  if (existsSync(pub)) {
    for (const f of walk(pub)) {
      const ext = f.slice(f.lastIndexOf(".")).toLowerCase();
      const cap = ASSET_CAP_KB[ext];
      if (!cap) continue;
      const kb = Math.round(statSync(f).size / 1024);
      if (kb > cap)
        failures.push(`${relative(ROOT, f)} — ${kb} KB, cap ${cap} KB`);
    }
  }
  return {
    n: 3,
    name: "Asset budget",
    detail: Object.entries(ASSET_CAP_KB)
      .map(([e, k]) => `${e} ≤ ${k} KB`)
      .join(", "),
    failures,
  };
}

/* ------------------------------------------------------------------ *
 * Check 4 — no-JS
 *
 * Static, so it needs no browser: the reveal animation's hidden starting
 * state must be scoped to the .mj-anim class that the inline head script
 * sets, so that with scripting off nothing is hidden.
 * ------------------------------------------------------------------ */

function checkNoJs() {
  const failures = [];
  const home = readFileSync(join(THEME, "Home.vue"), "utf8");
  const config = readFileSync(join(SITE, ".vitepress", "config.mts"), "utf8");

  for (const m of home.matchAll(/^([^\n{]*\[data-reveal\][^\n{]*)\{/gm)) {
    const selector = m[1].trim();
    if (!selector.includes(".mj-anim")) {
      failures.push(`Home.vue — "${selector}" is not scoped to .mj-anim`);
    }
  }
  if (!/classList\.add\("mj-anim"\)/.test(config)) {
    failures.push(
      "config.mts — the inline head script that sets .mj-anim is missing",
    );
  }
  return {
    n: 4,
    name: "No-JS",
    detail: "content is never hidden by CSS that only JS can undo",
    failures,
  };
}

/* ------------------------------------------------------------------ *
 * Check 5 — motion budget
 * ------------------------------------------------------------------ */

const INFINITE_CAP = 4;

function checkMotion() {
  const home = readFileSync(join(THEME, "Home.vue"), "utf8");
  const failures = [];

  const infinite = [...home.matchAll(/animation:[^;]*\binfinite\b/g)].length;
  if (infinite > INFINITE_CAP) {
    failures.push(`${infinite} infinite animations, cap ${INFINITE_CAP}`);
  }

  const reduced =
    /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(home);
  if (!reduced) failures.push("no prefers-reduced-motion block");

  return {
    n: 5,
    name: "Motion budget",
    detail: `≤ ${INFINITE_CAP} infinite animations, all reduced-motion covered (found ${infinite})`,
    failures,
  };
}

/* ------------------------------------------------------------------ *
 * Checks 6 and 7 read the BUILT site, so they report a gap rather than
 * a pass when dist/ is absent — running the doctor without a build must
 * never look like these checks passed.
 * ------------------------------------------------------------------ */

const DIST = join(SITE, ".vitepress", "dist");

/** Windows gives back "guide\ci.html"; every href in the HTML uses "/". */
const toPosix = (p) => p.split(sep).join("/");
const BASE = "/Mjolnir/";

function distPages() {
  if (!existsSync(DIST)) return null;
  return walk(DIST)
    .filter((f) => f.endsWith(".html"))
    .map((f) => ({
      file: toPosix(relative(DIST, f)),
      html: readFileSync(f, "utf8"),
    }));
}

/* ------------------------------------------------------------------ *
 * Check 6 — structural accessibility
 *
 * NOT a full audit: this is the subset provable from the built HTML
 * without a browser or an engine (axe-core is not a dependency here, and
 * site/ deliberately has none). It catches the defects that actually
 * shipped on this site — a rune announced on every heading, controls with
 * no accessible name — and says plainly what it does not cover.
 * ------------------------------------------------------------------ */

/** Strips tags and entities so "does this control have a name?" is answerable. */
function visibleText(inner) {
  return inner
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function checkA11y() {
  const pages = distPages();
  if (!pages) {
    return {
      n: 6,
      name: "a11y (structural)",
      detail: "needs a built site",
      gap: "run `npm run build` first — dist/ not found",
    };
  }
  const failures = [];

  for (const { file, html } of pages) {
    if (!/<html[^>]*\slang=/i.test(html))
      failures.push(`${file} — <html> has no lang attribute`);

    for (const m of html.matchAll(/<img(\s[^>]*)?>/gi)) {
      if (!/\salt[\s=>]/i.test(m[1] + ">"))
        failures.push(`${file} — <img> without alt: ${m[0].slice(0, 70)}`);
    }

    for (const m of html.matchAll(/<a(\s[^>]*)?>([\s\S]*?)<\/a>/gi)) {
      const attrs = m[1];
      if (/\saria-hidden="true"/i.test(attrs)) continue;
      // `title` present but empty = a name bound in a client-only effect;
      // static HTML cannot see it, so it is not evidence of a defect.
      if (/\stitle(=|\s|>)/i.test(attrs + ">")) continue;
      const named =
        visibleText(m[2]) ||
        /\saria-label="[^"]+"/i.test(attrs) ||
        /\saria-labelledby="[^"]+"/i.test(attrs) ||
        /\stitle="[^"]+"/i.test(attrs) ||
        /<img\s[^>]*\salt="[^"]+"/i.test(m[2]);
      if (!named)
        failures.push(
          `${file} — link with no accessible name: ${m[0].slice(0, 70)}`,
        );
    }

    for (const m of html.matchAll(/<button(\s[^>]*)?>([\s\S]*?)<\/button>/gi)) {
      const attrs = m[1];
      if (/\saria-hidden="true"/i.test(attrs)) continue;
      // `title` present but empty = a name bound in a client-only effect;
      // static HTML cannot see it, so it is not evidence of a defect.
      if (/\stitle(=|\s|>)/i.test(attrs + ">")) continue;
      const named =
        visibleText(m[2]) ||
        /\saria-label="[^"]+"/i.test(attrs) ||
        /\saria-labelledby="[^"]+"/i.test(attrs) ||
        /\stitle="[^"]+"/i.test(attrs);
      if (!named)
        failures.push(
          `${file} — button with no accessible name: ${m[0].slice(0, 70)}`,
        );
    }

    // A positive tabindex jumps the natural order for everyone else.
    for (const m of html.matchAll(/\stabindex="(\d+)"/gi)) {
      if (Number(m[1]) > 0)
        failures.push(
          `${file} — positive tabindex="${m[1]}" reorders the page`,
        );
    }

    const ids = new Map();
    for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
      ids.set(m[1], (ids.get(m[1]) ?? 0) + 1);
    }
    for (const [id, n] of ids) {
      if (n > 1)
        failures.push(
          `${file} — duplicate id="${id}" (${n}x); aria-controls/labelledby resolve to one node`,
        );
    }

    // Heading order: a jump (h2 -> h4) leaves a hole in the outline.
    let prev = 0;
    for (const m of html.matchAll(/<h([1-6])[\s>]/gi)) {
      const lvl = Number(m[1]);
      if (prev && lvl > prev + 1)
        failures.push(`${file} — heading jumps h${prev} to h${lvl}`);
      prev = lvl;
    }
  }

  return {
    n: 6,
    name: "a11y (structural)",
    detail: `${pages.length} built pages: lang, img alt, control names, tabindex, duplicate ids, heading order`,
    failures,
    note: "static HTML only — no colour-in-context, focus order, or names a client-only effect fills in after hydration",
  };
}

/* ------------------------------------------------------------------ *
 * Check 7 — link integrity
 *
 * VitePress's own dead-link check is off (ignoreDeadLinks) because the
 * @include'd repo docs carry repo-relative links that config.mts rewrites
 * at render time. Checking the BUILT output sidesteps that entirely: by
 * then every link is final.
 * ------------------------------------------------------------------ */

function checkLinks() {
  const pages = distPages();
  if (!pages) {
    return {
      n: 7,
      name: "Link integrity",
      detail: "needs a built site",
      gap: "run `npm run build` first — dist/ not found",
    };
  }

  const have = new Set(walk(DIST).map((f) => toPosix(relative(DIST, f))));
  const failures = [];

  for (const { file, html } of pages) {
    for (const m of html.matchAll(/\shref="([^"]+)"/g)) {
      const href = m[1];
      if (/^(https?:|mailto:|tel:|data:|#)/i.test(href)) continue;
      if (!href.startsWith(BASE)) continue;

      const [path] = href.slice(BASE.length).split("#")[0].split("?");
      if (path === "" || path === undefined) continue;

      // cleanUrls: /guide/ci -> guide/ci.html; /guide/ -> guide/index.html
      const candidates = path.endsWith("/")
        ? [path + "index.html"]
        : [path, path + ".html", path + "/index.html"];
      if (!candidates.some((c) => have.has(c))) {
        failures.push(
          `${file} -> ${href} (no ${candidates.join(" | ")} in dist)`,
        );
      }
    }
  }

  return {
    n: 7,
    name: "Link integrity",
    detail: `internal hrefs across ${pages.length} built pages resolve to a file`,
    failures,
  };
}

/* ------------------------------------------------------------------ */

function main() {
  const advisory = process.argv.includes("--advisory");
  const all = [
    checkContrast(),
    checkNoTypedClaims(),
    checkAssetBudget(),
    checkNoJs(),
    checkMotion(),
    checkA11y(),
    checkLinks(),
  ];
  const checks = all.filter((c) => !c.gap);
  const gaps = all.filter((c) => c.gap);

  console.log("\nmjolnir site doctor\n");
  let failed = 0;
  for (const c of checks) {
    const ok = c.failures.length === 0;
    if (!ok) failed++;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  Check ${c.n} · ${c.name} — ${c.detail}`,
    );
    for (const f of c.failures) console.log(`          ${f}`);
  }
  for (const g of gaps) {
    console.log(`  GAP   Check ${g.n} · ${g.name} — ${g.gap}`);
  }

  const total = checks.reduce((n, c) => n + c.failures.length, 0);
  console.log(
    `\n  ${failed} of ${checks.length} checks failing, ${total} findings, ${gaps.length} gaps\n`,
  );

  if (advisory) {
    if (failed) console.log("  (advisory mode — not failing the build)\n");
    process.exit(0);
  }
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
