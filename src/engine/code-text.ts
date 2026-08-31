/**
 * Code-only text masking (Phase 1 — Tempering Plan).
 *
 * Returns a view of the source with string literals and comments blanked
 * to spaces, preserving all newlines so line/column indices stay exact.
 * Regex-based pattern rules run against this view to avoid false
 * positives on prose inside strings or comments.
 *
 * TypeScript/JavaScript: delegates to the proven ts-morph getCodeOnlyText.
 * Python/Java/C#: lightweight synchronous scanners (no WASM, no async).
 *
 * Rules that intentionally scan comments (QA-TQUAL-011, QA-PY-009)
 * continue to use ctx.text directly.
 */

import { getCodeOnlyText } from "./ts-ast.js";
import type { ParsedFile } from "./adapter.js";

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Compute the code-only text for a parsed file based on its language.
 * Falls back to raw text if language is unknown or masking fails.
 */
export function computeCodeText(
  file: ParsedFile,
  language: "typescript" | "python" | "java" | "csharp",
): string {
  // Every branch below is total (getCodeOnlyText and the language maskers
  // catch their own failures), so no outer degradation net is needed.
  switch (language) {
    case "typescript":
      return getCodeOnlyText(file);
    case "python":
      return maskPython(file.text);
    case "java":
      return maskJava(file.text);
    case "csharp":
      return maskCSharp(file.text);
  }
}

// ─── Python masker ───────────────────────────────────────────────────

/**
 * Blanks Python string literals and comments to spaces, preserving
 * newlines. Handles:
 * - Triple-quoted strings (""" and ''')
 * - Single/double quoted strings (" and ')
 * - f-strings, b-strings, r-strings (prefix letters before quotes)
 * - Line comments (#)
 */
function maskPython(text: string): string {
  const chars = text.split("");
  const len = chars.length;
  let i = 0;

  while (i < len) {
    // Skip string prefixes: f, b, r, u, fr, rb, br, etc.
    const prefixStart = i;
    while (
      i < len &&
      "fFbBrRuU".includes(chars[i] ?? "") &&
      i - prefixStart < 3
    ) {
      i++;
    }

    // Triple-quoted strings
    if (
      i < len - 2 &&
      ((chars[i] === '"' && chars[i + 1] === '"' && chars[i + 2] === '"') ||
        (chars[i] === "'" && chars[i + 1] === "'" && chars[i + 2] === "'"))
    ) {
      // i < len - 2 above guarantees chars[i] is defined here.
      const quote = chars[i];
      // Blank from prefix start through the closing triple-quote
      const start = prefixStart;
      i += 3; // skip opening triple-quote
      while (i < len) {
        if (chars[i] === "\\" && i + 1 < len) {
          i += 2; // skip escaped char
          continue;
        }
        if (
          chars[i] === quote &&
          i + 1 < len &&
          chars[i + 1] === quote &&
          i + 2 < len &&
          chars[i + 2] === quote
        ) {
          i += 3; // skip closing triple-quote
          break;
        }
        i++;
      }
      blankRange(chars, start, i);
      continue;
    }

    // Single/double quoted strings
    if (i < len && (chars[i] === '"' || chars[i] === "'")) {
      // The guard above guarantees chars[i] is defined here.
      const quote = chars[i];
      const start = prefixStart;
      i++; // skip opening quote
      while (i < len && chars[i] !== quote && chars[i] !== "\n") {
        if (chars[i] === "\\" && i + 1 < len) {
          i += 2; // skip escaped char
          continue;
        }
        i++;
      }
      if (i < len && chars[i] === quote) i++; // skip closing quote
      blankRange(chars, start, i);
      continue;
    }

    // Reset prefix tracking if we didn't find a string
    if (prefixStart !== i) {
      // We advanced past prefix chars but found no quote — not a string prefix.
      // Don't blank anything, continue from current position.
      continue;
    }

    // Line comments
    if (chars[i] === "#") {
      const start = i;
      while (i < len && chars[i] !== "\n") i++;
      blankRange(chars, start, i);
      continue;
    }

    i++;
  }

  return chars.join("");
}

// ─── Java masker ─────────────────────────────────────────────────────

/**
 * Blanks Java string literals and comments to spaces, preserving
 * newlines. Handles:
 * - Single-line comments (//)
 * - Multi-line comments (/* ... * /)
 * - String literals ("...")
 * - Text blocks (""" ... """) — Java 15+
 * - Char literals ('.')
 */
function maskJava(text: string): string {
  const chars = text.split("");
  const len = chars.length;
  let i = 0;

  while (i < len) {
    // Single-line comment
    if (chars[i] === "/" && i + 1 < len && chars[i + 1] === "/") {
      const start = i;
      while (i < len && chars[i] !== "\n") i++;
      blankRange(chars, start, i);
      continue;
    }

    // Multi-line comment
    if (chars[i] === "/" && i + 1 < len && chars[i + 1] === "*") {
      const start = i;
      i += 2;
      while (i < len - 1) {
        if (chars[i] === "*" && chars[i + 1] === "/") {
          i += 2;
          break;
        }
        i++;
      }
      if (i >= len - 1 && !(chars[len - 2] === "*" && chars[len - 1] === "/")) {
        i = len; // unclosed comment — blank to end
      }
      blankRange(chars, start, i);
      continue;
    }

    // Text block (Java 15+): """
    if (
      chars[i] === '"' &&
      i + 2 < len &&
      chars[i + 1] === '"' &&
      chars[i + 2] === '"'
    ) {
      const start = i;
      i += 3;
      while (i < len) {
        if (chars[i] === "\\" && i + 1 < len) {
          i += 2;
          continue;
        }
        if (
          chars[i] === '"' &&
          i + 1 < len &&
          chars[i + 1] === '"' &&
          i + 2 < len &&
          chars[i + 2] === '"'
        ) {
          i += 3;
          break;
        }
        i++;
      }
      blankRange(chars, start, i);
      continue;
    }

    // String literal
    if (chars[i] === '"') {
      const start = i;
      i++;
      while (i < len && chars[i] !== '"' && chars[i] !== "\n") {
        if (chars[i] === "\\" && i + 1 < len) {
          i += 2;
          continue;
        }
        i++;
      }
      if (i < len && chars[i] === '"') i++;
      blankRange(chars, start, i);
      continue;
    }

    // Char literal
    if (chars[i] === "'") {
      const start = i;
      i++;
      if (i < len && chars[i] === "\\" && i + 1 < len) {
        i += 2; // escaped char
      } else if (i < len && chars[i] !== "'") {
        i++; // single char
      }
      if (i < len && chars[i] === "'") i++;
      blankRange(chars, start, i);
      continue;
    }

    i++;
  }

  return chars.join("");
}

// ─── C# masker ───────────────────────────────────────────────────────

/**
 * Blanks C# string literals and comments to spaces, preserving
 * newlines. Handles:
 * - Single-line comments (//)
 * - Multi-line comments (/* ... * /)
 * - Regular string literals ("...")
 * - Verbatim strings (@"...")
 * - Interpolated strings ($"..." and $@"..." / @$"...")
 * - Raw string literals ("""...""" — C# 11+)
 * - Char literals ('.')
 */
function maskCSharp(text: string): string {
  const chars = text.split("");
  const len = chars.length;
  let i = 0;

  while (i < len) {
    // Single-line comment
    if (chars[i] === "/" && i + 1 < len && chars[i + 1] === "/") {
      const start = i;
      while (i < len && chars[i] !== "\n") i++;
      blankRange(chars, start, i);
      continue;
    }

    // Multi-line comment
    if (chars[i] === "/" && i + 1 < len && chars[i + 1] === "*") {
      const start = i;
      i += 2;
      while (i < len - 1) {
        if (chars[i] === "*" && chars[i + 1] === "/") {
          i += 2;
          break;
        }
        i++;
      }
      if (i >= len - 1 && !(chars[len - 2] === "*" && chars[len - 1] === "/")) {
        i = len;
      }
      blankRange(chars, start, i);
      continue;
    }

    // Verbatim / interpolated string prefixes: @, $, $@, @$
    if ((chars[i] === "@" || chars[i] === "$") && i + 1 < len) {
      const prefixStart = i;
      let isVerbatim = false;

      if (chars[i] === "$") {
        i++;
        if (i < len && chars[i] === "@") {
          isVerbatim = true;
          i++;
        }
      } else {
        // The outer guard established "@" or "$"; "$" was handled above.
        isVerbatim = true;
        i++;
        if (i < len && chars[i] === "$") {
          // Interpolated-verbatim prefix (@$"…") — consumed; the same
          // verbatim scan applies as for @"…".
          i++;
        }
      }

      if (i < len && chars[i] === '"') {
        // The prefix branch above always set one of the flags (the "@"
        // and "$" cases each set exactly one), so a plain raw-string
        // check is unreachable here; dispatch on verbatim vs interpolated.
        if (isVerbatim) {
          // Verbatim string: @"..." or $@"..." / @$"..."
          // Escape is "" (doubled quote), no backslash escaping
          i++; // skip opening "
          while (i < len) {
            if (chars[i] === '"') {
              if (i + 1 < len && chars[i + 1] === '"') {
                i += 2; // escaped ""
                continue;
              }
              i++; // closing "
              break;
            }
            i++;
          }
          blankRange(chars, prefixStart, i);
          continue;
        }
        // Interpolated non-verbatim: $"..."
        i++; // skip opening "
        while (i < len && chars[i] !== '"' && chars[i] !== "\n") {
          if (chars[i] === "\\" && i + 1 < len) {
            i += 2;
            continue;
          }
          i++;
        }
        if (i < len && chars[i] === '"') i++;
        blankRange(chars, prefixStart, i);
        continue;
      }
      // Not followed by a quote — not a string prefix, reset
      i = prefixStart + 1;
      continue;
    }

    // Raw string literal (C# 11): """..."""
    if (
      chars[i] === '"' &&
      i + 2 < len &&
      chars[i + 1] === '"' &&
      chars[i + 2] === '"'
    ) {
      const start = i;
      i += 3;
      while (i < len) {
        if (
          chars[i] === '"' &&
          i + 1 < len &&
          chars[i + 1] === '"' &&
          i + 2 < len &&
          chars[i + 2] === '"'
        ) {
          i += 3;
          break;
        }
        i++;
      }
      blankRange(chars, start, i);
      continue;
    }

    // Regular string literal
    if (chars[i] === '"') {
      const start = i;
      i++;
      while (i < len && chars[i] !== '"' && chars[i] !== "\n") {
        if (chars[i] === "\\" && i + 1 < len) {
          i += 2;
          continue;
        }
        i++;
      }
      if (i < len && chars[i] === '"') i++;
      blankRange(chars, start, i);
      continue;
    }

    // Char literal
    if (chars[i] === "'") {
      const start = i;
      i++;
      if (i < len && chars[i] === "\\" && i + 1 < len) {
        i += 2;
      } else if (i < len && chars[i] !== "'") {
        i++;
      }
      if (i < len && chars[i] === "'") i++;
      blankRange(chars, start, i);
      continue;
    }

    i++;
  }

  return chars.join("");
}

// ─── Shared helpers ──────────────────────────────────────────────────

/**
 * Blanks a range of characters to spaces, preserving newlines so
 * line/column computations remain valid.
 */
function blankRange(chars: string[], start: number, end: number): void {
  for (let i = start; i < end && i < chars.length; i++) {
    if (chars[i] !== "\n" && chars[i] !== "\r") {
      chars[i] = " ";
    }
  }
}
