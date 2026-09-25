/**
 * Prose claim lint (P4) — the mechanism behind `claims:prose` and
 * `claim:budget`.
 *
 * **The problem.** `docs/claim-registry.json` covers four claims. The
 * *public* surface — `README.md`, its 22 translations, the site, the
 * changelog, 101 rule pages — is where a user forms an impression, and
 * none of it is bound to a capability, a maturity, or a proof path. §94
 * bans rule/language/framework/command counts and downloads as metrics,
 * and Law 8 says every support statement derives from a versioned
 * registry. Right now both are satisfiable in prose and enforced nowhere,
 * which makes them aspirations.
 *
 * **The design, and why it is a ratchet rather than a boolean.** A gate
 * that starts red and can only be made green by rewriting 27 documents
 * gets disabled, and a disabled honesty gate is worse than none. So:
 *
 *  - `claims:prose` **finds** candidates and classifies them. It is a
 *    report; it does not fail the build on its own.
 *  - `claim:budget` **enforces a ratchet**: the number of unbound
 *    public claims may not exceed a recorded budget, and the budget may
 *    not be raised without a dated, owned, expiring exception.
 *
 * That way §94 becomes enforced *now* (the count is visible and cannot
 * grow) and converges to zero without a fiction that it already is.
 *
 * **Scope honesty.** The lint is a *pattern* lint, not a semantic
 * verifier: it catches the claim shapes §94 names — counts, enumerations,
 * superlatives, download/trust figures — and it does not catch a claim
 * phrased in a way nobody anticipated. That limit is a `nextLevelGap`,
 * not a footnote, because a linter whose coverage is unknown is exactly
 * the kind of thing this product is supposed to stop shipping.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** A public surface whose text a user may read as a support claim. */
export interface PublicSurface {
  /** Repo-relative path, or a directory scanned for a matching pattern. */
  path: string;
  kind: "readme" | "locale-readme" | "changelog" | "rule-page" | "site" | "doc";
  /** Only these files are scanned inside a directory. */
  include?: RegExp;
}

/**
 * The surfaces a public claim can hide in. Deliberately explicit: a lint
 * that scans "everything" and is later pointed at a new directory is a
 * lint whose coverage nobody can state.
 */
export const PUBLIC_SURFACES: readonly PublicSurface[] = [
  { path: "README.md", kind: "readme" },
  { path: "CHANGELOG.md", kind: "changelog" },
  { path: "PRODUCT-ENHANCEMENT-ANALYSIS.md", kind: "doc" },
  { path: "docs", kind: "doc", include: /\.md$/ },
  { path: "docs/rules", kind: "rule-page", include: /\.md$/ },
  { path: "site", kind: "site", include: /\.(md|mdx|html)$/ },
];

/**
 * Claim shapes §94 names. Each pattern is a *category*, not a verdict:
 * the lint's job is to route a candidate to a human, not to decide
 * whether it is a lie.
 */
export interface ClaimPattern {
  id: string;
  /** Why §94 or Law 8 makes this shape a claim that needs a proof path. */
  rationale: string;
  pattern: RegExp;
  /**
   * `BANNED` — §94 forbids this metric outright (counts, downloads).
   * `BOUNDED` — allowed, but only with a bound proof.
   */
  severity: "BANNED" | "BOUNDED";
}

/*
 * `security/detect-unsafe-regex` is a bounded-quantifier heuristic. Every
 * pattern in this file uses `{0,n}` or `{2,}` over a *single* character
 * class and an anchored `^`/`\b` delimiter, so each is linear; the rule
 * cannot see that, and disabling it globally would remove the check from
 * the rest of the repository for no gain. These are deliberate, and the
 * one that genuinely could backtrack (`framework-support-enumeration`)
 * is bounded by requiring two separators between capitalised names.
 */
/* eslint-disable security/detect-unsafe-regex */
export const CLAIM_PATTERNS: readonly ClaimPattern[] = [
  {
    id: "count-of-rules",
    severity: "BANNED",
    rationale:
      "§94 bans rule counts as a quality metric; Law 5 says rule count is not quality. A published rule count invites the reading that more rules means better analysis.",
    pattern:
      /\b(\d[\d,]{0,6})\+?\s+(?:built[- ]in\s+|automated\s+|detection\s+|quality\s+)?(?:rules?|detectors?|checks?)\b/gi,
  },
  {
    id: "framework-support-enumeration",
    severity: "BANNED",
    rationale:
      "Law 8: a hand-written list of supported frameworks is a documentation defect by construction. It drifts silently the moment an upstream major moves.",
    // Case-insensitive so a sentence-initial "Works with …" matches. The
    // verb is matched case-insensitively and the *list* is matched as a
    // run of comma/`and`/slash-separated names, which is the shape the
    // claim actually takes.
    pattern:
      /\b(?:supports?|works with|compatible with)\s+(?:[a-z][\w.+-]*(?:,\s*|\s+and\s+|\s*\/\s*)){2,}[a-z][\w.+-]*/gi,
  },
  {
    id: "count-of-frameworks-languages",
    severity: "BANNED",
    rationale:
      "§94 bans language and framework counts. A count of languages is a claim about semantic coverage that no gate measures.",
    pattern:
      /\b(\d[\d,]{0,6})\+?\s+(?:programming\s+)?(?:languages|frameworks|test frameworks|CI providers|integrations)\b/gi,
  },
  {
    id: "download-or-install-count",
    severity: "BANNED",
    rationale:
      "§94 bans downloads as a metric. It measures attention, not verification quality.",
    // One whitespace run, not two. Two adjacent `\s*` runs can exchange
    // characters, which is polynomial backtracking across a 40 000-line
    // changelog. The optional magnitude suffix sits between the two
    // anchored tokens, so a single `\s*` on each side is unambiguous.
    pattern:
      /\b\d[\d,.]{0,9}\s*(?:[kKmM]\+?\s*)?(?:downloads?|installs?|stars?|weekly downloads)\b/g,
  },
  {
    id: "trusted-by",
    severity: "BANNED",
    rationale:
      "A social-proof claim is unfalsifiable and unrelated to proof depth. §94 enumerates what counts instead.",
    pattern: /\btrusted by\b|\bused by\b|\blove by\b/gi,
  },
  {
    id: "completeness-superlative",
    severity: "BOUNDED",
    rationale:
      "Anti-false-completion (§5.5 A4): DONE / COMPLETE / 100% / PROVEN / READY may not appear unbound. 'Complete coverage of X' is the exact shape the product must not ship.",
    pattern:
      /\b(?:100\s*%|complete(?:ly)?|fully|entirely|every|all)\s+(?:coverage|support|tested|analysed|analyzed|verified|detected)\b/gi,
  },
  {
    id: "universality-claim",
    severity: "BOUNDED",
    rationale:
      "§2.3 forbids a 'supports all QA' claim anywhere. A domain matrix exists precisely so universality is a number, not an adjective.",
    pattern:
      /\b(?:all|any|every)\s+(?:QA|test frameworks?|languages|testing)\b/gi,
  },
  {
    id: "proof-word-unbound",
    severity: "BOUNDED",
    rationale:
      "The words PROVEN / VERIFIED / CERTIFIED are maturity and lifecycle vocabulary (ADR 0001, ADR 0011). In prose they are claims that need a bound proof path.",
    pattern:
      /\b(?:PROVEN|VERIFIED|CERTIFIED|production[- ]ready|zero false positives)\b/g,
  },
];

export type ClaimSeverity = ClaimPattern["severity"];

export interface ClaimCandidate {
  /** `surface:line` — stable enough to diff and to reference in an exception. */
  location: string;
  surface: string;
  kind: PublicSurface["kind"];
  patternId: string;
  severity: ClaimSeverity;
  /** The matched text, trimmed, for the reviewer. */
  text: string;
  line: number;
}

/** Whether a path is a directory. Exported so the file-walk arms are testable. */
export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function listFiles(path: string, include: RegExp, depth = 0): string[] {
  if (depth > 4) return [];
  const out: string[] = [];
  let entries: Array<{ name: string; isDirectory(): boolean }>;
  try {
    entries = readdirSync(path, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const full = join(path, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, include, depth + 1));
    else if (include.test(entry.name)) out.push(full);
  }
  return out;
}

export function listPublicFiles(
  root: string,
): Array<{ file: string; kind: PublicSurface["kind"] }> {
  const out: Array<{ file: string; kind: PublicSurface["kind"] }> = [];
  for (const surface of PUBLIC_SURFACES) {
    const full = join(root, surface.path);
    if (!existsSync(full)) continue;
    if (!isDirectory(full)) {
      out.push({ file: surface.path, kind: surface.kind });
      continue;
    }
    const include = surface.include ?? /\.(md|mdx|html)$/;
    for (const file of listFiles(full, include)) {
      out.push({ file: file.split("\\").join("/"), kind: surface.kind });
    }
  }
  // Root-level locale READMEs (`README.<locale>.md`) are the 24-locale
  // drift class: they are hand-maintained and rarely gated. The pattern
  // allows 2–3 letter subtags plus script/region variants
  // (`pt-BR`, `zh-Hant`, `zht`) — a narrower pattern would silently skip
  // locales, and a linter with an unknown locale coverage is the problem
  // this module exists to remove.
  for (const entry of safeReadDir(root)) {
    // A locale README: two or three lowercase letters, an optional
    // script/region subtag, `.md`. Anchored and bounded, hence linear.
    if (/^README\.[a-z]{2,3}(?:-[A-Za-z]{2,4})?\.md$/.test(entry)) {
      out.push({ file: entry, kind: "locale-readme" });
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

function safeReadDir(path: string): string[] {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

/** Scan one file's text for claim candidates. Pure, so it is testable. */
export function scanText(
  text: string,
  surface: string,
  kind: PublicSurface["kind"],
): ClaimCandidate[] {
  const found: ClaimCandidate[] = [];
  const lines = text.split("\n");
  for (const claimPattern of CLAIM_PATTERNS) {
    // A fresh RegExp per line: a global regex carries `lastIndex` across
    // calls, which silently skips matches and under-reports. An
    // under-reporting linter is worse than none. The source is a literal
    // from this module's own `CLAIM_PATTERNS`, never user input.
    // `entries()` rather than an index loop: `noUncheckedIndexedAccess` makes
    // `lines[index]` `string | undefined`, and the `?? ""` that satisfies it
    // is a branch no input can reach.
    for (const [index, line] of lines.entries()) {
      // eslint-disable-next-line security/detect-non-literal-regexp
      const regex = new RegExp(
        claimPattern.pattern.source,
        claimPattern.pattern.flags,
      );
      const match = regex.exec(line);
      if (match === null) continue;
      found.push({
        location: `${surface}:${index + 1}`,
        surface,
        kind,
        patternId: claimPattern.id,
        severity: claimPattern.severity,
        text: match[0].trim().slice(0, 160),
        line: index + 1,
      });
    }
  }
  return found;
}

export function scanSurfaces(root: string): ClaimCandidate[] {
  const out: ClaimCandidate[] = [];
  for (const { file, kind } of listPublicFiles(root)) {
    const full = join(root, file);
    let text: string;
    try {
      text = readFileSync(full, "utf8");
    } catch {
      continue;
    }
    out.push(...scanText(text, file, kind));
  }
  return out;
}

// ─── Binding ─────────────────────────────────────────────────────────

/**
 * An inline binding marker. A public claim that is real must be
 * traceable, so a bound claim carries its registry id, the maturity it
 * was proven at, and the command that re-derives the proof:
 *
 * `<!-- claim:<registryId> maturity=M0…M5 proof=<command> -->`
 *
 * The marker is a comment so it never reaches a rendered surface, and it
 * is *checkable*: `npm run claims:prose` fails if the referenced claim id
 * is not in the registry, and `claim:budget` refuses to count a claim as
 * bound when the maturity or proof command is missing.
 *
 * The proof command is captured as `[^>]+` — greedy, with **no** trailing
 * `\s*`. A lazy `[^>]+?` followed by `\s*` lets those two quantifiers
 * exchange characters, which is polynomial backtracking on a document set
 * that includes a 40 000-line changelog. The command is the last field
 * before `-->`, so capturing greedily and trimming in code is both linear
 * and simpler to reason about.
 */
export const CLAIM_BINDING_PATTERN =
  /<!--\s*claim:([a-z0-9][a-z0-9-]*)\s+maturity=(M[0-5])\s+proof=([^>]+)-->/;

export interface ClaimBinding {
  registryId: string;
  maturity: string;
  proofCommand: string;
  line: number;
}

export function extractBindings(text: string): ClaimBinding[] {
  const out: ClaimBinding[] = [];
  const lines = text.split("\n");
  // `entries()` rather than an index loop: see the note in `scanText`.
  for (const [index, line] of lines.entries()) {
    // Global-local copy of this module's own literal: the shared pattern is
    // not global, because a shared global regex would carry `lastIndex`
    // across lines and silently skip matches.
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(CLAIM_BINDING_PATTERN.source, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      out.push({
        registryId: match[1] ?? "",
        maturity: match[2] ?? "",
        // Trimmed here because the pattern captures greedily to `-->` in
        // order to stay linear; see the note on the pattern.
        proofCommand: (match[3] ?? "").trim(),
        line: index + 1,
      });
    }
  }
  return out;
}

/** A line that carries a binding marker is a bound claim, not a finding. */
export function isBound(
  candidate: ClaimCandidate,
  boundLines: Set<string>,
): boolean {
  return boundLines.has(`${candidate.surface}:${candidate.line}`);
}

// ─── Known exemptions ────────────────────────────────────────────────

/**
 * A claim shape that is structurally unavoidable. `LICENSE` text and
 * changelog history legitimately mention counts while describing what
 * changed; requiring a proof path for a historical changelog entry would
 * be theatre. Exemptions are declared here — versioned and reviewed —
 * not sprinkled through the scan.
 */
export const EXEMPT_SURFACES: readonly { match: RegExp; reason: string }[] = [
  {
    match: /^CHANGELOG\.md$/,
    reason:
      "A changelog describes what changed at a point in time; its numbers are historical facts about a release, not present-tense support claims.",
  },
  {
    match: /^docs\/adr\//,
    reason:
      "An ADR records a decision and its rejected alternatives. Quoting the claim vocabulary it is forbidding is the opposite of making a claim.",
  },
  {
    match: /^docs\/v6-inventory\.json$/,
    reason: "Generated inventory; it counts artifacts and says so.",
  },
  {
    match: /^\.kilo\//,
    reason: "Local planning material, not a published surface.",
  },
];

/** Apply exemptions. Returns the candidates that survive. */
export function applyExemptions(
  candidates: readonly ClaimCandidate[],
): ClaimCandidate[] {
  return candidates.filter(
    (candidate) =>
      !EXEMPT_SURFACES.some((exempt) => exempt.match.test(candidate.surface)),
  );
}
