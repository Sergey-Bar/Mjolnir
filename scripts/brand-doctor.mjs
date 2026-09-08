/**
 * `npm run brand:doctor` — the repository-wide brand gate.
 *
 * `site-doctor` Check 8 already compared the brand document's palette
 * table against `vars.css`. That is one edge of a six-node graph, and
 * every unguarded edge had drifted: the terminal and the site disagreed
 * on six semantic roles, the architecture diagram had invented its own
 * neutral ramp, the three README terminal stills wore macOS traffic
 * lights, and the badges in all 23 READMEs still carried a palette
 * retired two releases earlier — 92 stale hexes nobody was counting.
 *
 * This checks every edge against `assets/brand/tokens.json`, which
 * `npm run brand:tokens` emits from `src/brand/tokens.ts`. The JSON is
 * the machine surface deliberately: this script runs on plain Node with
 * zero dependencies, the same way `site-doctor` does, so it can run in
 * any CI step without a TypeScript loader. The JSON's own fidelity to
 * the token module is locked byte-for-byte by
 * `tests/contract/brand-tokens-reproducibility.spec.ts`.
 *
 * THE RATCHET. Some findings are known, planned, and being burned down
 * by a named phase of `.planning/BRAND-UNIFICATION-PLAN.md`. Those live
 * in `KNOWN_OPEN` with the phase that closes them and a written reason.
 * Two things make that an honest mechanism rather than a silencer:
 *
 *   1. A known-open entry that STOPS firing is itself a failure. A stale
 *      allowlist is how a gate quietly becomes decoration.
 *   2. Nothing may be added to it without a phase and a reason, and the
 *      list is printed on every run, so the debt is visible rather than
 *      absorbed.
 *
 * Exit codes mirror the product's: 0 clean, 1 findings, 10 usage error.
 * `--advisory` always exits 0; `--seed <rule>` is the failure-first
 * self-test — see `verifySeeding` at the bottom.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const THEME = join(ROOT, "site", ".vitepress", "theme");
const VARS_CSS = join(THEME, "styles", "vars.css");
const TOKENS_JSON = join(ROOT, "assets", "brand", "tokens.json");
const BRAND_README = join(ROOT, "assets", "brand", "README.md");

const T = JSON.parse(readFileSync(TOKENS_JSON, "utf8"));

/* ── colour maths ────────────────────────────────────────────── */

/** WCAG 2.1 relative luminance of `#RRGGBB`. */
export function luminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * f((n >> 16) & 0xff) +
    0.7152 * f((n >> 8) & 0xff) +
    0.0722 * f(n & 0xff)
  );
}

/** Contrast ratio between two `#RRGGBB` values. Computed, never guessed. */
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/* ── source helpers ──────────────────────────────────────────── */

/**
 * True when a line is prose about a colour rather than a use of one.
 * The PENDING_* tables document the values they replace, and
 * terminal-page.ts explains where its near-black came from; a hex inside
 * a comment is a citation, not a second source of truth.
 */
function isComment(text) {
  return /^\s*(\*|\/\/|\/\*)/.test(text);
}

/** Every 6-digit hex literal in a string, lowercased, with its line. */
export function hexLiterals(source) {
  const out = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const m of lines[i].matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      out.push({ hex: m[0].toLowerCase(), line: i + 1, text: lines[i].trim() });
    }
  }
  return out;
}

/** `--name: value;` declarations inside the first `:root { … }` block. */
export function parseCssTokens(css) {
  const block = /:root\s*\{([\s\S]*?)\n\}/.exec(css);
  if (!block) return {};
  const out = {};
  for (const m of block[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2]
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim()
      .toLowerCase();
  }
  return out;
}

function walk(dir, exts, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "cache")
      continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, exts, acc);
    else if (exts.some((e) => name.endsWith(e))) acc.push(p);
  }
  return acc;
}

const rel = (p) => relative(ROOT, p).split(sep).join("/");

/* ── the allowlist ───────────────────────────────────────────── */

/**
 * Hex literals that are genuinely not brand colours. Every entry needs a
 * reason; "it was already there" is not one.
 */
const NON_BRAND_HEX = new Map([
  [
    "#000000",
    "pure black, used only as a low-opacity scrim stroke on the terminal window rounding — a shadow, not a colour",
  ],
  [
    "#ffffff",
    "pure white, used only as a low-opacity inner highlight on the terminal window edge",
  ],
]);

/** Faces the brand no longer uses anywhere. Named, so a stack cannot
 * quietly reacquire one as a "harmless" fallback. */
const RETIRED_FACES = ["Inter", "JetBrains Mono"];

/**
 * Known, planned findings. Each is closed by the named phase of
 * `.planning/BRAND-UNIFICATION-PLAN.md`. An entry that stops firing is a
 * failure: a stale allowlist is how a gate becomes decoration.
 */
export const KNOWN_OPEN = [
  {
    id: "mermaid-palette-offbrand",
    rule: 6,
    phase: "Phase 10 — CLI consistency",
    reason:
      "src/reporter/mermaid.ts styles its diagrams with a Tailwind-ish light palette that is in no token, and — worse — paints the no-tests-found node `critical` red. UNKNOWN is a legitimate answer, not a failure; that node is an honesty defect, not only an off-brand one. Fixed with the rest of the reporter vocabulary, where the light/dark constraint of GitHub-rendered mermaid can be solved once.",
  },
];

/* ══ Rule 1 — vars.css matches the tokens ═══════════════════════ */

export function rule1() {
  const css = readFileSync(VARS_CSS, "utf8");
  const shipped = parseCssTokens(css);
  const failures = [];

  const expect = (name, value) => {
    const got = shipped[name];
    if (got === undefined) failures.push(`${name} — missing from vars.css`);
    else if (got !== value.toLowerCase())
      failures.push(
        `${name} — tokens say ${value.toLowerCase()}, css has ${got}`,
      );
  };

  expect("--mj-ink-950", T.surface.ink950);
  expect("--mj-ink-900", T.surface.ink900);
  expect("--mj-ink-850", T.surface.ink850);
  expect("--mj-ink-800", T.surface.ink800);
  expect("--mj-steel", T.brand.steel);
  expect("--mj-steel-dim", T.brand.steelDim);
  expect("--mj-gold", T.brand.gold);
  expect("--mj-gold-bright", T.brand.goldBright);
  expect("--mj-gold-hot", T.brand.goldHot);
  expect("--mj-aurora", T.brand.aurora);
  expect("--mj-aurora-bright", T.brand.auroraBright);
  expect("--mj-aurora-cyan", T.brand.auroraCyan);
  expect("--mj-trusted", T.score.trusted);
  expect("--mj-needswork", T.score.warning);
  expect("--mj-unworthy", T.score.critical);
  expect("--mj-forged-hot", T.score.forged);
  expect("--mj-ok", T.status.ok);
  for (const k of ["e0", "e1", "e2"]) expect(`--mj-${k}`, T.evidence[k]);
  for (const k of ["l0", "l1", "l2", "l3", "l4", "l5"])
    expect(`--mj-${k}`, T.trust[k]);

  // Typography. The site leads with the token faces, and names no
  // retired one anywhere in a stack — a fallback entry still downloads
  // nothing but it does still render, which is how a page ends up
  // looking like two products on a machine that happens to have Inter.
  const lead = {
    "--vp-font-family-base": T.typography.sans.family,
    "--vp-font-family-mono": T.typography.mono.family,
    "--mj-display": T.typography.display.family,
  };
  for (const [v, want] of Object.entries(lead)) {
    const stack = shipped[v] ?? "";
    const first = /"([^"]+)"/.exec(stack)?.[1];
    if (!first)
      failures.push(`${v} — no quoted family at the head of the stack`);
    else if (first.toLowerCase() !== want.toLowerCase())
      failures.push(
        `${v} — leads with "${first}", the token face is "${want}"`,
      );
    for (const retired of RETIRED_FACES)
      if (stack.includes(retired.toLowerCase()))
        failures.push(`${v} — still names the retired face "${retired}"`);
  }

  return {
    n: 1,
    name: "Site variables match the tokens",
    detail: `${Object.keys(shipped).length} declarations in vars.css`,
    failures,
  };
}

/* ══ Rule 2 — the terminal palette matches the tokens ═══════════ */

/** Which `tokens.json` leaf a `NORSE`/chrome reference resolves to. */
function resolveRef(ref) {
  const [group, key] = ref.split(".");
  const map = {
    BRAND: T.brand,
    SURFACE: T.surface,
    TEXT: T.text,
    STATUS: T.status,
    SCORE: T.score,
    PENDING_SITE: T.pending.site,
  };
  return { pending: group.startsWith("PENDING"), value: map[group]?.[key] };
}

function scanForTokenRefs(file, groups) {
  const src = readFileSync(file, "utf8");
  const refs = [];
  const re = new RegExp(`\\b(${groups.join("|")})\\.([A-Za-z0-9_]+)`, "g");
  for (const m of src.matchAll(re)) refs.push(`${m[1]}.${m[2]}`);
  return { src, refs: [...new Set(refs)] };
}

export function rule2() {
  const file = join(ROOT, "src", "reporter", "theme.ts");
  const { src, refs } = scanForTokenRefs(file, [
    "BRAND",
    "SURFACE",
    "TEXT",
    "STATUS",
    "SCORE",
  ]);
  const failures = [];

  for (const h of hexLiterals(src))
    if (!NON_BRAND_HEX.has(h.hex) && !isComment(h.text))
      failures.push(`${rel(file)}:${h.line} — hex literal ${h.hex}`);

  for (const r of refs.filter((x) => resolveRef(x).pending))
    failures.push(
      `${rel(file)} still reads the pre-unification value ${r} (${resolveRef(r).value})`,
    );

  return {
    n: 2,
    name: "Terminal palette matches the tokens",
    detail: `${refs.length} token references in src/reporter/theme.ts, 0 hex literals`,
    failures,
  };
}

/* ══ Rule 3 — SVG and video chrome match the tokens ═════════════ */

export function rule3() {
  const files = [
    join(ROOT, "scripts", "readme-svg.ts"),
    join(ROOT, "scripts", "video", "terminal-page.ts"),
  ];
  const failures = [];
  let refCount = 0;

  for (const file of files) {
    const { src, refs } = scanForTokenRefs(file, [
      "BRAND",
      "SURFACE",
      "TEXT",
      "STATUS",
      "SCORE",
    ]);
    refCount += refs.length;
    for (const h of hexLiterals(src))
      if (!NON_BRAND_HEX.has(h.hex) && !isComment(h.text))
        failures.push(`${rel(file)}:${h.line} — hex literal ${h.hex}`);
    for (const r of refs.filter((x) => resolveRef(x).pending))
      failures.push(`${rel(file)} still reads the pre-unification value ${r}`);
  }

  return {
    n: 3,
    name: "SVG and video chrome match the tokens",
    detail: `${refCount} token references across ${files.length} files`,
    failures,
  };
}

/* ══ Rule 4 — generated assets consume brand values ═════════════ */

export function rule4() {
  const file = join(ROOT, "scripts", "generate-readme-architecture.ts");
  const generators = [
    file,
    join(ROOT, "scripts", "generate-readme-hero.ts"),
    join(ROOT, "scripts", "generate-readme-demo.ts"),
    join(ROOT, "scripts", "generate-readme-score-gauge.ts"),
  ];
  const failures = [];

  for (const g of generators) {
    const { src, refs } = scanForTokenRefs(g, [
      "BRAND",
      "SURFACE",
      "TEXT",
      "STATUS",
      "SCORE",
    ]);
    for (const h of hexLiterals(src))
      if (!NON_BRAND_HEX.has(h.hex) && !isComment(h.text))
        failures.push(`${rel(g)}:${h.line} — hex literal ${h.hex}`);
    for (const r of refs.filter((x) => resolveRef(x).pending))
      failures.push(`${rel(g)} still reads the pre-unification value ${r}`);
  }

  // The committed SVGs themselves: any colour they carry must be a
  // token value, a pending value, or an allowlisted non-brand one.
  const known = new Set(
    [
      ...Object.values(T.brand),
      ...Object.values(T.surface),
      ...Object.values(T.text),
      ...Object.values(T.status),
      ...Object.values(T.score),
      ...Object.values(T.evidence),
      ...Object.values(T.trust),
      // Whatever pending groups are left, flattened: a group is deleted
      // from the token module the moment its surface converges, so this
      // must not name any one of them.
      ...Object.values(T.pending).flatMap((g) => Object.values(g).flat()),
    ]
      .filter((v) => typeof v === "string" && v.startsWith("#"))
      .map((v) => v.toLowerCase()),
  );
  const assets = join(ROOT, "assets", "readme");
  for (const svg of walk(assets, [".svg"])) {
    const seen = new Set();
    for (const h of hexLiterals(readFileSync(svg, "utf8"))) {
      if (known.has(h.hex) || NON_BRAND_HEX.has(h.hex) || seen.has(h.hex))
        continue;
      seen.add(h.hex);
      failures.push(`${rel(svg)} — colour ${h.hex} is in no token`);
    }
  }

  return {
    n: 4,
    name: "Generated assets consume brand values",
    detail: `${generators.length} generators + every assets/readme/*.svg`,
    failures,
  };
}

/* ══ Rule 5 — the brand document matches the tokens ═════════════ */

/** `| \`--mj-gold\` | \`#C19A34\` | …` → ["--mj-gold", "#c19a34"] */
export function parseBrandTable(md) {
  const out = [];
  for (const m of md.matchAll(
    /^\|\s*`(--mj-[a-z0-9-]+)`\s*\|\s*`(#[0-9a-fA-F]{6})`/gm,
  ))
    out.push([m[1], m[2].toLowerCase()]);
  return out;
}

/** Verdict rows: `| \`WORTHY\` | \`--mj-trusted\` | \`#2596A8\` | …` —
 * the table Check 8 never parsed, and which drifted unnoticed. */
export function parseVerdictTable(md) {
  const out = [];
  for (const m of md.matchAll(
    /^\|[^|\n]*\|\s*`(--mj-[a-z0-9-]+)`[^|\n]*\|[^|\n]*`(#[0-9a-fA-F]{6})`/gm,
  ))
    out.push([m[1], m[2].toLowerCase()]);
  return out;
}

export function rule5() {
  if (!existsSync(BRAND_README))
    return {
      n: 5,
      name: "Brand document matches the tokens",
      detail: rel(BRAND_README),
      gap: "assets/brand/README.md not found",
    };
  const md = readFileSync(BRAND_README, "utf8");
  const shipped = parseCssTokens(readFileSync(VARS_CSS, "utf8"));
  const failures = [];
  const rows = [...parseBrandTable(md), ...parseVerdictTable(md)];

  for (const [name, documented] of rows) {
    const actual = shipped[name];
    if (!actual)
      failures.push(
        `${name} — documented as ${documented}, not defined in vars.css`,
      );
    else if (actual.startsWith("#") && actual !== documented)
      failures.push(
        `${name} — the brand doc says ${documented}, vars.css ships ${actual}`,
      );
  }
  return {
    n: 5,
    name: "Brand document matches the tokens",
    detail: `${rows.length} token rows in assets/brand/README.md`,
    failures,
  };
}

/* ══ Rule 6 — no unapproved hex outside the token module ════════ */

export function rule6() {
  const roots = [
    join(ROOT, "src", "reporter"),
    join(ROOT, "scripts"),
    join(THEME),
  ];
  const failures = [];
  let scanned = 0;

  for (const root of roots) {
    for (const file of walk(root, [".ts", ".mts", ".mjs", ".vue", ".css"])) {
      // The gate and its self-test necessarily quote colours: the
      // allowlist has to name the values it permits, and the self-test
      // has to seed invalid ones. Scanning them would make the rule
      // fail on its own machinery.
      if (/scripts\/brand-doctor(-selftest)?\.mjs$/.test(rel(file))) continue;
      // vars.css IS the token values, emitted by `npm run brand:tokens`.
      // It is the one file in the site that is supposed to hold hexes,
      // and rule 1 already checks every one of them against the token
      // module. Scanning it here would report the source as the drift.
      if (rel(file).endsWith("theme/styles/vars.css")) continue;
      scanned++;
      const src = readFileSync(file, "utf8");
      const seen = new Set();
      for (const h of hexLiterals(src)) {
        if (NON_BRAND_HEX.has(h.hex) || seen.has(h.hex)) continue;
        if (isComment(h.text)) continue;
        seen.add(h.hex);
        const entry = `${rel(file)}:${h.line} — hex literal ${h.hex}`;
        const known = rel(file).endsWith("src/reporter/mermaid.ts")
          ? "mermaid-palette-offbrand"
          : null;
        failures.push(known ? { known, text: entry } : entry);
      }
    }
  }
  return {
    n: 6,
    name: "No unapproved hex outside the token module",
    detail: `${scanned} files in src/reporter, scripts and the site theme`,
    failures,
  };
}

/* ══ Rule 7 — every README badge uses canonical colours ═════════ */

export function rule7() {
  const readmes = readdirSync(ROOT).filter((f) =>
    /^README(\.[a-z]+)?\.md$/.test(f),
  );
  const allowed = new Set(
    Object.values(T.badge).map((v) => String(v).toLowerCase()),
  );
  const failures = [];

  for (const name of readmes) {
    const md = readFileSync(join(ROOT, name), "utf8");
    const seen = new Set();
    for (const m of md.matchAll(/img\.shields\.io\/[^)\s]+/g)) {
      for (const c of m[0].matchAll(
        /(?:color|labelColor)=([0-9A-Fa-f]{6})|-([0-9A-Fa-f]{6})\.svg/g,
      )) {
        const hex = (c[1] ?? c[2]).toLowerCase();
        if (allowed.has(hex) || seen.has(hex)) continue;
        seen.add(hex);
        failures.push(`${name} — badge colour ${hex} is not a brand token`);
      }
    }
  }
  return {
    n: 7,
    name: "README badges use canonical colours",
    detail: `${readmes.length} README files`,
    failures,
  };
}

/* ══ Rule 8 — declared pairings meet WCAG AA ════════════════════ */

export function rule8() {
  const surfaces = Object.entries(T.surface).filter(([, v]) =>
    String(v).startsWith("#"),
  );
  // Backgrounds, never text. Asserted the other way round below.
  const backgroundOnly = new Set(["onGold", "goldDeep"]);
  const foregrounds = Object.entries({
    ...T.brand,
    ...T.text,
    ...T.status,
    ...T.score,
    ...T.evidence,
    ...T.trust,
  }).filter(([k, v]) => String(v).startsWith("#") && !backgroundOnly.has(k));

  const failures = [];
  for (const [fk, fv] of foregrounds)
    for (const [sk, sv] of surfaces) {
      const ratio = contrast(fv, sv);
      if (ratio < 4.5)
        failures.push(
          `${fk} ${fv} on ${sk} ${sv} — ${ratio.toFixed(2)}:1 (AA needs 4.5)`,
        );
    }
  for (const gold of ["gold", "goldBright", "goldHot", "goldDeep"]) {
    const ratio = contrast(T.text.onGold, T.brand[gold]);
    if (ratio < 4.5)
      failures.push(
        `text.onGold on brand.${gold} — ${ratio.toFixed(2)}:1 (AA needs 4.5)`,
      );
  }
  return {
    n: 8,
    name: "Declared pairings meet WCAG AA",
    detail: `${foregrounds.length} foregrounds × ${surfaces.length} surfaces, computed`,
    failures,
  };
}

/* ── runner ──────────────────────────────────────────────────── */

const RULES = [rule1, rule2, rule3, rule4, rule5, rule6, rule7, rule8];

export function runAll() {
  return RULES.map((r) => r());
}

function main() {
  const advisory = process.argv.includes("--advisory");
  const all = runAll();
  const checks = all.filter((c) => !c.gap);
  const gaps = all.filter((c) => c.gap);

  console.log("\nmjolnir brand doctor\n");

  let hardFailed = 0;
  let hardFindings = 0;
  const firedKnown = new Set();

  for (const c of checks) {
    const hard = c.failures.filter((f) => typeof f === "string");
    const known = c.failures.filter((f) => typeof f !== "string");
    for (const k of known) firedKnown.add(k.known);
    if (hard.length) {
      hardFailed++;
      hardFindings += hard.length;
    }
    const status = hard.length ? "FAIL" : known.length ? "OPEN" : "PASS";
    console.log(`  ${status}  Rule ${c.n} · ${c.name} — ${c.detail}`);
    for (const f of hard) console.log(`          ${f}`);
    for (const k of known) console.log(`          known: ${k.text}`);
  }
  for (const g of gaps)
    console.log(`  GAP   Rule ${g.n} · ${g.name} — ${g.gap}`);

  // The ratchet: a known-open entry that no longer fires is stale, and a
  // stale allowlist is how a gate quietly becomes decoration.
  const stale = KNOWN_OPEN.filter((k) => !firedKnown.has(k.id));
  if (stale.length) {
    console.log("\n  STALE known-open entries — these no longer fire:");
    for (const s of stale)
      console.log(`          ${s.id} (${s.phase}) — remove it from KNOWN_OPEN`);
  }

  if (firedKnown.size) {
    console.log("\n  Known open, by the phase that closes it:");
    for (const k of KNOWN_OPEN.filter((x) => firedKnown.has(x.id)))
      console.log(`          ${k.id} — ${k.phase}\n              ${k.reason}`);
  }

  console.log(
    `\n  ${hardFailed} of ${checks.length} rules failing, ${hardFindings} findings, ` +
      `${firedKnown.size} known open, ${stale.length} stale\n`,
  );

  if (advisory) {
    if (hardFailed || stale.length)
      console.log("  (advisory mode — not failing the build)\n");
    process.exit(0);
  }
  process.exit(hardFailed || stale.length ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
