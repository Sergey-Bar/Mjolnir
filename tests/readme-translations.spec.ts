/**
 * Multi-language README structural contract (translations plan).
 *
 * English README.md is canonical; every README.<code>.md must stay a
 * faithful structural mirror so future sync PRs can diff sections.
 * These checks are deliberately cheap (pure fs/string, no rendering):
 *
 *  1. the switcher line lists all 23 languages in canonical order and
 *     every switcher link resolves to an existing sibling file;
 *  2. each translation unlinks exactly its own language's entry
 *     (English README.md leaves only "English" unlinked);
 *  3. each translation carries the machine-assisted-translation
 *     staleness marker with a parseable date, immediately after the
 *     switcher — and README.md carries none;
 *  4. the set of frozen rule IDs (QA-<FAMILY>-NNN) in a translation
 *     equals the set in README.md — catches dropped/duplicated IDs;
 *  5. every in-page (#…) anchor in a file resolves against that same
 *     file's headings under the GitHub slug algorithm (lowercased,
 *     punctuation/emoji stripped, spaces → hyphens).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");

/** Canonical switcher order — English first, then the 22 translations. */
const CANON: ReadonlyArray<readonly [code: string, label: string]> = [
  ["", "English"],
  ["zh", "简体中文"],
  ["zht", "繁體中文"],
  ["ko", "한국어"],
  ["de", "Deutsch"],
  ["es", "Español"],
  ["fr", "Français"],
  ["it", "Italiano"],
  ["da", "Dansk"],
  ["ja", "日本語"],
  ["pl", "Polski"],
  ["ru", "Русский"],
  ["no", "Norsk"],
  ["br", "Português (Brasil)"],
  ["th", "ไทย"],
  ["tr", "Türkçe"],
  ["uk", "Українська"],
  ["bn", "বাংলা"],
  ["gr", "Ελληνικά"],
  ["vi", "Tiếng Việt"],
  ["he", "עברית"],
  ["ar", "العربية"],
  ["bs", "Bosanski"],
];

const TRANSLATIONS = CANON.filter(([code]) => code !== "");

/** `README.<code>.md` for a translation code; README.md for "". */
function fileName(code: string): string {
  return code === "" ? "README.md" : `README.${code}.md`;
}

type FileContent = { name: string; text: string };

const FILES: ReadonlyMap<string, FileContent> = new Map(
  CANON.map(([code]): [string, FileContent | null] => {
    const name = fileName(code);
    const path = join(ROOT, name);
    return [
      code,
      existsSync(path) ? { name, text: readFileSync(path, "utf8") } : null,
    ];
  }).flatMap((entry): Array<[string, FileContent]> =>
    entry[1] === null ? [] : [[entry[0], entry[1]]],
  ),
);

type SwitcherEntry = { label: string; target: string | null };

const LINKED_ENTRY_RE = /^\[([^\]]+)\]\(([^)]+)\)$/;

/**
 * Extracts the switcher line (it starts with either the linked or the
 * unlinked English entry — the file's own entry is always unlinked) and
 * parses its pipe-separated entries.
 */
function parseSwitcher(
  text: string,
  name: string,
): {
  entries: SwitcherEntry[];
  lineIndex: number;
} {
  const lines = text.split("\n");
  const matches = lines
    .map((line, index) => ({ line, index }))
    .filter(
      ({ line }) =>
        /^\[English\]\(README\.md\) \| /.test(line) ||
        /^English \| /.test(line),
    );
  expect(
    matches,
    `${name}: expected exactly one switcher line listing all 23 languages`,
  ).toHaveLength(1);
  const { line, index } = matches[0] ?? { line: "", index: -1 };
  const entries = line
    .split("|")
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0)
    .map((raw): SwitcherEntry => {
      const m = LINKED_ENTRY_RE.exec(raw);
      return m
        ? { label: m[1] ?? "", target: m[2] ?? "" }
        : { label: raw, target: null };
    });
  return { entries, lineIndex: index };
}

/** Lines outside fenced code blocks (headings/anchors live there only). */
function linesOutsideFences(text: string): string[] {
  const out: string[] = [];
  let inFence = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) out.push(line);
  }
  return out;
}

/**
 * GitHub's heading-slug algorithm: lowercase, strip everything that is
 * not a Unicode letter/number/mark/space/hyphen (emoji and punctuation
 * vanish; variation selectors are stripped explicitly), then every
 * space becomes a hyphen — runs are NOT collapsed.
 */
function githubSlug(headingText: string): string {
  return headingText
    .toLowerCase()
    .replace(/[\uFE0E\uFE0F]/g, "")
    .replace(/[^\p{L}\p{N}\p{M} -]/gu, "")
    .replace(/ /g, "-");
}

/** Slug set for every `#`-heading in the file (outside code fences). */
function headingSlugs(text: string): Map<string, number> {
  const slugs = new Map<string, number>();
  for (const line of linesOutsideFences(text)) {
    const m = /^#{1,6} (.+)$/.exec(line);
    if (!m) continue;
    const slug = githubSlug(m[1] ?? "");
    slugs.set(slug, (slugs.get(slug) ?? 0) + 1);
  }
  return slugs;
}

const ANCHOR_LINK_RE = /\]\(#([^)\s]+)\)/g;
const RULE_ID_RE = /QA-[A-Z]+-\d+/g;
const STALENESS_MARKER_RE =
  /^> 🤖 Machine-assisted translation\. The \[English README\]\(README\.md\) is canonical\. Last synced: (\d{4})-(\d{2})-(\d{2})\.$/;

function ruleIdSet(text: string): Set<string> {
  return new Set(text.match(RULE_ID_RE) ?? []);
}

const README = FILES.get("");
if (!README) throw new Error("README.md vanished — nothing to compare against");
const CANONICAL_RULE_IDS = ruleIdSet(README.text);
const CANONICAL_SLUGS = headingSlugs(README.text);

describe("README.md language switcher", () => {
  const { entries } = parseSwitcher(README.text, README.name);

  it("has all 23 entries in the canonical order with correct labels", () => {
    expect(entries.map((e) => e.label)).toEqual(
      CANON.map(([, label]) => label),
    );
  });

  it("unlinks only the English entry and links all 22 translations", () => {
    expect(entries.map((e) => e.target)).toEqual(
      CANON.map(([code]) => (code === "" ? null : fileName(code))),
    );
  });

  it("every switcher link resolves to an existing file", () => {
    for (const entry of entries) {
      if (entry.target === null) continue;
      expect(existsSync(join(ROOT, entry.target)), entry.target).toBe(true);
    }
  });

  it("carries no staleness marker (English is canonical)", () => {
    expect(STALENESS_MARKER_RE.test(README.text)).toBe(false);
  });
});

describe("README.md internal anchors", () => {
  it("every in-page anchor resolves to one of its own headings", () => {
    const linked = [...README.text.matchAll(ANCHOR_LINK_RE)].map(
      (m) => m[1] ?? "",
    );
    expect(linked.length).toBeGreaterThan(0);
    for (const anchor of linked) {
      expect(
        CANONICAL_SLUGS.has(anchor),
        `README.md links #${anchor} but headings produce: ${[...CANONICAL_SLUGS.keys()].join(", ")}`,
      ).toBe(true);
    }
  });
});

for (const [code] of TRANSLATIONS) {
  const name = fileName(code);

  describe(name, () => {
    const file = FILES.get(code);

    it("exists next to README.md", () => {
      expect(
        file,
        `${name} is missing — see the translations plan`,
      ).toBeDefined();
    });
    if (!file) return;

    const { entries, lineIndex } = parseSwitcher(file.text, name);

    it("mirrors all 23 switcher entries in canonical order with correct labels", () => {
      expect(entries.map((e) => e.label)).toEqual(CANON.map(([, l]) => l));
    });

    it("unlinks exactly its own language entry and links the other 22", () => {
      const expected = CANON.map(([c]) => (c === code ? null : fileName(c)));
      expect(entries.map((e) => e.target)).toEqual(expected);
    });

    it("every switcher link resolves to an existing file", () => {
      for (const entry of entries) {
        if (entry.target === null) continue;
        expect(existsSync(join(ROOT, entry.target)), entry.target).toBe(true);
      }
    });

    it("carries the staleness marker with a parseable date right after the switcher", () => {
      const lines = file.text.split("\n");
      let markerIndex = -1;
      for (
        let i = lineIndex + 1;
        i < Math.min(lineIndex + 5, lines.length);
        i++
      ) {
        if (STALENESS_MARKER_RE.test(lines[i] ?? "")) {
          markerIndex = i;
          break;
        }
      }
      const m = STALENESS_MARKER_RE.exec(lines[markerIndex] ?? "");
      expect(
        m,
        `${name}: staleness marker must follow the switcher line verbatim`,
      ).not.toBeNull();
      const [, y, mo, d] = m ?? [];
      expect(
        new Date(`${y}-${mo}-${d}T00:00:00Z`).toISOString().slice(0, 10),
      ).toBe(`${y}-${mo}-${d}`);
    });

    it("frozen rule IDs match README.md exactly (set equality)", () => {
      const ids = ruleIdSet(file.text);
      expect([...ids].sort()).toEqual([...CANONICAL_RULE_IDS].sort());
    });

    it("every in-page anchor resolves to one of its own translated headings", () => {
      const slugs = headingSlugs(file.text);
      const linked = [...file.text.matchAll(ANCHOR_LINK_RE)].map(
        (m) => m[1] ?? "",
      );
      const readmeAnchors = [...README.text.matchAll(ANCHOR_LINK_RE)].map(
        (m) => m[1] ?? "",
      );
      expect(
        linked.length,
        `${name} must carry the same in-page nav as README.md`,
      ).toBe(readmeAnchors.length);
      for (const anchor of linked) {
        expect(
          slugs.has(anchor),
          `${name} links #${anchor} but its headings produce: ${[...slugs.keys()].join(", ")}`,
        ).toBe(true);
      }
    });
  });
}
