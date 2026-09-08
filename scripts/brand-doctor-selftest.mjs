/**
 * `npm run brand:doctor:selftest` — proves the brand gate can fail.
 *
 * A check that has never been observed rejecting an invalid state is not
 * evidence. This repository already learned that the expensive way: four
 * accessibility sub-checks in the site redesign passed vacuously because
 * a stray backspace byte had turned their input into something that
 * could not fail, and nobody had watched one fail on purpose.
 *
 * So for every rule, and for the stale-allowlist ratchet:
 *
 *   1. seed a deliberate violation in a real file
 *   2. run `brand-doctor` and require it to reject
 *   3. restore the file byte-for-byte
 *   4. run again and require it to pass
 *
 * The transcript is written to `docs/design/gate-evidence/` so the
 * demonstration is a committed artifact rather than a claim in a commit
 * message.
 *
 * SAFETY. Every seed is restored in a `finally`, the original bytes are
 * held in memory for the whole run, and the script re-reads each file at
 * the end and refuses to exit 0 if any byte differs from what it started
 * with. It never runs git, so it cannot discard anyone's work.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DOCTOR = join(HERE, "brand-doctor.mjs");
const OUT_DIR = join(ROOT, "docs", "design", "gate-evidence");

const p = (...seg) => join(ROOT, ...seg);

/** Runs the doctor. Returns `{ code, out }`. */
function runDoctor() {
  const r = spawnSync(process.execPath, [DOCTOR], {
    encoding: "utf8",
    cwd: ROOT,
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

/**
 * Each seed names the rule it must trip, the file it edits, and the
 * substring the doctor's output must contain. Requiring the message and
 * not merely a non-zero exit is deliberate: an exit code alone cannot
 * tell "the rule I meant fired" from "something else broke".
 */
const SEEDS = [
  {
    rule: 1,
    what: "a site variable drifts from the token",
    file: p("site", ".vitepress", "theme", "styles", "vars.css"),
    edit: (s) => s.replace("--mj-gold: #c19a34;", "--mj-gold: #ff0000;"),
    expect: "--mj-gold — tokens say #c19a34, css has #ff0000",
  },
  {
    rule: "1 (retired face)",
    what: "a retired typeface creeps back into a stack",
    file: p("site", ".vitepress", "theme", "styles", "vars.css"),
    // A fallback entry downloads nothing but it still RENDERS, which is
    // exactly how a page ends up looking like two products on a machine
    // that happens to have Inter installed.
    edit: (s) => s.replace('"Geist", ui-sans-serif', '"Geist", "Inter"'),
    expect: 'still names the retired face "Inter"',
  },
  {
    rule: 2,
    what: "the terminal palette names a colour of its own",
    file: p("src", "reporter", "theme.ts"),
    edit: (s) =>
      s.replace(
        "export const NORSE = {",
        'export const NORSE = {\n  seeded: fromHex("#ABCDEF"),',
      ),
    expect: "src/reporter/theme.ts:",
  },
  {
    rule: 3,
    what: "the SVG chrome names a colour of its own",
    file: p("scripts", "readme-svg.ts"),
    edit: (s) =>
      s.replace(
        "export const FONT_SIZE = 13;",
        'export const SEEDED = "#ABCDEF";\nexport const FONT_SIZE = 13;',
      ),
    expect: "scripts/readme-svg.ts:",
  },
  {
    rule: 4,
    what: "a committed SVG carries a colour that is in no token",
    file: p("assets", "readme", "terminal-hero.svg"),
    // Anchored on the window dot, which is a token value now that the
    // macOS traffic lights are gone. The seed that named #ff5f56
    // directly went stale the moment they were removed and reported
    // itself as a broken seed — which is the self-test doing its job:
    // an anchor that stops matching is a check that stopped checking.
    edit: (s) => s.replace('r="6" fill="#18243A"', 'r="6" fill="#ABCDEF"'),
    expect: "assets/readme/terminal-hero.svg — colour #abcdef is in no token",
  },
  {
    rule: 5,
    what: "the brand document states a value the code does not ship",
    file: p("assets", "brand", "README.md"),
    edit: (s) =>
      s.replace(
        "| `--mj-gold`          | `#C19A34`",
        "| `--mj-gold`          | `#FF0000`",
      ),
    expect: "--mj-gold — the brand doc says #ff0000",
  },
  {
    rule: 6,
    what: "an unapproved hex appears outside the token module",
    file: p("src", "reporter", "ui.ts"),
    edit: (s) => `const SEEDED_BRAND_HEX = "#ABCDEF";\n${s}`,
    expect: "src/reporter/ui.ts:1 — hex literal #abcdef",
  },
  {
    rule: 7,
    what: "a README badge uses a colour that is neither token nor known debt",
    file: p("README.md"),
    edit: (s) => s.replace("color=C9A227", "color=ABCDEF"),
    expect: "README.md — badge colour abcdef is not a brand token",
  },
  {
    rule: 8,
    what: "a declared pairing drops below WCAG AA",
    file: p("assets", "brand", "tokens.json"),
    // Same luminance family as the surface it must sit on: the ratio
    // collapses and rule 8's arithmetic has to say so.
    edit: (s) => s.replace('"steel": "#C8CBCF"', '"steel": "#141F33"'),
    expect: "steel #141F33 on",
  },
  {
    rule: "ratchet",
    what: "a known-open entry that no longer fires is reported as stale",
    file: DOCTOR,
    edit: (s) =>
      s.replace(
        "const KNOWN_OPEN = [",
        'const KNOWN_OPEN = [\n  {\n    id: "seeded-never-fires",\n    rule: 0,\n    phase: "self-test",\n    reason: "seeded by brand-doctor-selftest.mjs",\n  },',
      ),
    expect: "seeded-never-fires (self-test) — remove it from KNOWN_OPEN",
  },
];

function main() {
  const originals = new Map();
  for (const s of SEEDS)
    if (!originals.has(s.file))
      originals.set(s.file, readFileSync(s.file, "utf8"));

  const log = [];
  const say = (line) => {
    log.push(line);
    console.log(line);
  };

  say("mjolnir brand doctor — failure-first self-test\n");

  const before = runDoctor();
  say(`  baseline: exit ${before.code} (expected 0)`);
  if (before.code !== 0) {
    say("\n  ABORT: the gate is not green to begin with; nothing to prove.");
    process.exit(1);
  }

  let failed = 0;
  try {
    for (const seed of SEEDS) {
      const original = originals.get(seed.file);
      const seeded = seed.edit(original);
      if (seeded === original) {
        say(`  Rule ${seed.rule}: BROKEN SEED — the edit changed nothing`);
        failed++;
        continue;
      }
      writeFileSync(seed.file, seeded, "utf8");
      const r = runDoctor();
      writeFileSync(seed.file, original, "utf8");

      const rejected = r.code !== 0;
      const named = r.out.includes(seed.expect);
      const ok = rejected && named;
      if (!ok) failed++;
      say(
        `  Rule ${seed.rule}: ${ok ? "PROVEN" : "NOT PROVEN"} — ${seed.what}\n` +
          `           seeded ${seed.file.slice(ROOT.length + 1)} → exit ${r.code}` +
          `${named ? ", named the finding" : `, DID NOT report "${seed.expect}"`}`,
      );
    }
  } finally {
    for (const [file, original] of originals)
      writeFileSync(file, original, "utf8");
  }

  // Belt and braces: prove every seeded file is byte-identical to how it
  // started before claiming anything.
  for (const [file, original] of originals) {
    if (readFileSync(file, "utf8") !== original) {
      say(`\n  ABORT: ${file} was not restored. Restore it from git.`);
      process.exit(1);
    }
  }

  const after = runDoctor();
  say(`\n  restored: exit ${after.code} (expected 0)`);
  if (after.code !== 0) failed++;

  say(
    `\n  ${SEEDS.length - failed} of ${SEEDS.length} rules observed rejecting an invalid state\n`,
  );

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "brand-doctor-selftest.txt"),
    `${log.join("\n")}\n`,
    "utf8",
  );
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
