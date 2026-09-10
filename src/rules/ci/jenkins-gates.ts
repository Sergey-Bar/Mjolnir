/**
 * Jenkinsfile block scanner for the QA-CI Jenkins arms (product-gap
 * master plan P3c). Jenkinsfiles are Groovy text — "no new language
 * grammar required" (master plan): the scanner is a bounded, string-aware
 * delimiter matcher over the raw text.
 *
 * What it extracts:
 *  - `sh(...)` call segments (paren-balanced) — exit-code semantics and
 *    `returnStatus: true` live inside these,
 *  - `catchError(...)` blocks (paren group + brace-balanced body) — the
 *    `buildResult: 'SUCCESS'` rescue shape,
 *  - `try { ... } catch (...) { ... }` pairs — QA-CI-014's swallow shape.
 *
 * Quote awareness: parens/braces inside single-, double-, and triple-
 * quoted Groovy strings (and line comments) do not count toward balance,
 * so `sh script: 'npm test)'` cannot desynchronize the scan. There is no
 * backtracking and no recursion: a single forward pass with a depth
 * counter — hostile input is bounded by the file-size cap upstream.
 */

import { VERIFICATION_GATE_RE } from "./verification-gate.js";

interface Block {
  /** Full text of the region, including delimiters. */
  text: string;
  /** Offset of the first delimiter in the file. */
  start: number;
  /** Offset one past the final delimiter. */
  end: number;
}

const TRIPLE_QUOTES = ['"""', "'''"] as const;

/**
 * One forward pass returning the offset map that marks which characters
 * are structural (outside strings and comments). Groovy strings may
 * interpolate `${...}` — braces inside a string are still string
 * content for balance purposes (an interpolated expression cannot close
 * a block), which is the conservative reading: unbalanced look-alikes
 * inside scripts never widen a block.
 */
function structuralMap(text: string): Uint8Array {
  const structural = new Uint8Array(text.length);
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const triple = TRIPLE_QUOTES.find((q) => rest.startsWith(q));
    if (triple) {
      const close = text.indexOf(triple, i + triple.length);
      i = close === -1 ? text.length : close + triple.length;
      continue;
    }
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === "\\") {
          j += 2;
          continue;
        }
        if (text[j] === ch) break;
        j++;
      }
      i = j + 1;
      continue;
    }
    // Line comment: // (but not a Groovy regex-ish slash — we only need
    // // comments; /* */ handled below).
    if (ch === "/" && text[i + 1] === "/") {
      const nl = text.indexOf("\n", i);
      i = nl === -1 ? text.length : nl + 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const close = text.indexOf("*/", i + 2);
      i = close === -1 ? text.length : close + 2;
      continue;
    }
    structural[i] = 1;
    i++;
  }
  return structural;
}

/**
 * Balanced-region scan starting at the open delimiter at `from`.
 * Returns the block, or undefined when the region never closes
 * (a truncated/hostile file — honest no-detection beats a fabricated
 * giant block).
 */
function balancedRegion(
  text: string,
  structural: Uint8Array,
  from: number,
  open: string,
  close: string,
): Block | undefined {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (!structural[i]) continue;
    if (text[i] === open) depth++;
    else if (text[i] === close) {
      depth--;
      if (depth === 0) {
        return { text: text.slice(from, i + 1), start: from, end: i + 1 };
      }
    }
  }
  return undefined;
}

function firstStructuralIndexOf(
  text: string,
  structural: Uint8Array,
  re: RegExp,
  from = 0,
): { index: number; match: RegExpExecArray } | undefined {
  // Audit (this file): a NON-global regex cannot advance — exec always
  // returns the first file-wide match, so a first match that is
  // non-structural (e.g. a `(` inside a leading comment) would spin this
  // loop forever. Normalize to a global regex so exec walks forward.
  const g = re.global
    ? re
    : // eslint-disable-next-line security/detect-non-literal-regexp -- re is a compile-time-constant internal pattern (never scan input); the copy only adds the global flag so exec can advance past non-structural matches
      new RegExp(re.source, `${re.flags}g`);
  g.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = g.exec(text)) !== null) {
    if (structural[m.index]) return { index: m.index, match: m };
    if (m.index === g.lastIndex) g.lastIndex++;
  }
  return undefined;
}

/** The `sh` call segments in the file — both Groovy call forms:
 * `sh(script: '…', returnStatus: true)` (parenthesized) and the command
 * forms `sh 'npm test'` / `sh script: 'npm test', returnStatus: true`
 * (Groovy command-call sugar, no parens). The paren-less form ends at
 * the first newline outside string literals (or `;` / `//`), which is
 * exactly where Groovy ends a command statement; multi-line arguments
 * ride triple-quoted strings, which the string-aware walk consumes
 * whole. */
export function shSegments(text: string): Block[] {
  const structural = structuralMap(text);
  const out: Block[] = [];
  const re = /\bsh\b/g;
  let scanFrom = 0;
  for (;;) {
    const hit = firstStructuralIndexOf(text, structural, re, scanFrom);
    if (!hit) break;
    const kwEnd = hit.index + hit.match[0].length;
    // Plain whitespace skip to the first character after the keyword —
    // NOT the first structural char: the command-call form starts with a
    // string, and the walk below must see it from its opening quote.
    let after = kwEnd;
    while (after < text.length && /\s/.test(text[after] ?? "")) after++;
    let seg: Block | undefined;
    if (text[after] === "(") {
      seg = balancedRegion(text, structural, after, "(", ")");
    } else {
      // Command-call form: string-aware walk; the statement ends at a
      // newline, `;`, or `//` outside any string (triple-quoted strings
      // are consumed whole, so multi-line arguments ride through).
      let i = after;
      let end = after;
      while (i < text.length) {
        const rest = text.slice(i);
        const triple = TRIPLE_QUOTES.find((q) => rest.startsWith(q));
        if (triple) {
          const close = text.indexOf(triple, i + triple.length);
          i = close === -1 ? text.length : close + triple.length;
          end = i;
          continue;
        }
        const ch = text[i];
        if (ch === '"' || ch === "'") {
          let j = i + 1;
          while (j < text.length) {
            if (text[j] === "\\") {
              j += 2;
              continue;
            }
            if (text[j] === ch) break;
            j++;
          }
          i = j + 1;
          end = i;
          continue;
        }
        if (ch === "\n" || ch === ";") break;
        if (ch === "/" && text[i + 1] === "/") break;
        i++;
        end = i;
      }
      const body = text.slice(hit.index, end).trimEnd();
      if (body.length > 2) {
        seg = { text: body, start: hit.index, end: hit.index + body.length };
      }
    }
    if (!seg) break; // unbalanced tail — stop honestly
    out.push(seg);
    scanFrom = seg.end;
  }
  return out;
}

/** The `catchError(...)` paren groups plus their brace-balanced bodies. */
export function catchErrorBlocks(text: string): Block[] {
  const structural = structuralMap(text);
  const out: Block[] = [];
  const re = /\bcatchError\s*\(/g;
  let scanFrom = 0;
  for (;;) {
    const hit = firstStructuralIndexOf(text, structural, re, scanFrom);
    if (!hit) break;
    const paren = balancedRegion(
      text,
      structural,
      hit.index + hit.match[0].length - 1,
      "(",
      ")",
    );
    if (!paren) break;
    // The block body: the next `{` after the paren group (Groovy allows a
    // newline between). No brace → the closure form without a body.
    const braceAt = firstStructuralIndexOf(text, structural, /\{/, paren.end);
    const body =
      braceAt && braceAt.index - paren.end < 40
        ? balancedRegion(text, structural, braceAt.index, "{", "}")
        : undefined;
    if (!body) {
      scanFrom = paren.end;
      continue;
    }
    out.push({
      text: text.slice(paren.start, body.end),
      start: paren.start,
      end: body.end,
    });
    scanFrom = body.end;
  }
  return out;
}

export interface TryCatchPair {
  tryBlock: Block;
  catchBlock: Block;
}

/** `try { ... } catch (...) { ... }` pairs with brace-balanced bodies. */
export function tryCatchPairs(text: string): TryCatchPair[] {
  const structural = structuralMap(text);
  const out: TryCatchPair[] = [];
  const re = /\btry\s*\{/g;
  let scanFrom = 0;
  for (;;) {
    const hit = firstStructuralIndexOf(text, structural, re, scanFrom);
    if (!hit) break;
    const tryBlock = balancedRegion(
      text,
      structural,
      hit.index + hit.match[0].length - 1,
      "{",
      "}",
    );
    if (!tryBlock) break;
    // Groovy order is try → catch(es) → finally. A `finally` appearing
    // before any `catch` means this try has no catch (the far-away catch
    // belongs to an outer try) — skip the pair.
    const finallyHit = firstStructuralIndexOf(
      text,
      structural,
      /\bfinally\b/,
      tryBlock.end,
    );
    const catchHit = firstStructuralIndexOf(
      text,
      structural,
      /\bcatch\b/,
      tryBlock.end,
    );
    if (!catchHit || (finallyHit && finallyHit.index < catchHit.index)) {
      scanFrom = tryBlock.end;
      continue;
    }
    // catch must be reasonably adjacent (a `try` without catch is legal
    // Groovy; a far-away catch belongs to an outer try — bound the window).
    if (catchHit.index - tryBlock.end > 200) {
      scanFrom = tryBlock.end;
      continue;
    }
    const parenHit = firstStructuralIndexOf(
      text,
      structural,
      /\(/,
      catchHit.index,
    );
    if (!parenHit || parenHit.index - catchHit.index > 20) {
      scanFrom = tryBlock.end;
      continue;
    }
    const paren = balancedRegion(text, structural, parenHit.index, "(", ")");
    if (!paren) {
      scanFrom = tryBlock.end;
      continue;
    }
    const braceAt = firstStructuralIndexOf(text, structural, /\{/, paren.end);
    const catchBlock =
      braceAt && braceAt.index - paren.end < 40
        ? balancedRegion(text, structural, braceAt.index, "{", "}")
        : undefined;
    if (!catchBlock) {
      scanFrom = tryBlock.end;
      continue;
    }
    out.push({ tryBlock, catchBlock });
    scanFrom = catchBlock.end;
  }
  return out;
}

/** Gate-ness is the SAME VERIFICATION_GATE_RE allowlist as every other CI surface. */
export function textIsVerificationGate(text: string): boolean {
  return VERIFICATION_GATE_RE.test(text);
}

/** Line (1-based) of an offset — for finding anchors. */
export function lineOfOffset(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}
