/**
 * README.md structural contract.
 *
 * Validates that the English README.md is well-formed:
 *  1. every in-page (#...) anchor resolves against its own headings
 *     under the GitHub slug algorithm.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");

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
 * space becomes a hyphen.
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

const README_PATH = join(ROOT, "README.md");
const README_TEXT = readFileSync(README_PATH, "utf8");
const CANONICAL_SLUGS = headingSlugs(README_TEXT);

describe("README.md internal anchors", () => {
  it("every in-page anchor resolves to one of its own headings", () => {
    const linked = [...README_TEXT.matchAll(ANCHOR_LINK_RE)].map(
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
