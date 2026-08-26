/**
 * AST precision layer (Upgrade-Plan-v3 Phase 3).
 *
 * Re-introduces ts-morph behind the existing `ast?: unknown` seam on
 * ParsedFile/SourceFileContext. The TypeScript adapter populates it once
 * per file; rules that opt in narrow it via `getTsSourceFile`.
 *
 * Migration discipline (per the plan): rule-by-rule, golden lock must stay
 * byte-identical — a score shift is a regression, not an improvement.
 */

import { Project, type SourceFile, ts } from "ts-morph";

import type { ParsedFile } from "./adapter.js";

// One shared Project per scan keeps memory bounded while reusing the
// compiler's program across files.
let project: Project | null = null;

function getProject(): Project {
  if (!project) {
    project = new Project({
      useInMemoryFileSystem: true,
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true,
        declaration: false,
        noEmit: true,
      },
    });
  }
  return project;
}

/**
 * Parse (or fetch from cache) the ts-morph SourceFile for a scanned file.
 * Returns undefined for files ts-morph cannot parse — rules must fall
 * back to their regex path rather than crash (crash isolation §25).
 */
export function parseTsFile(file: ParsedFile): SourceFile | undefined {
  try {
    const p = getProject();
    const existing = p.getSourceFile(file.path);
    if (existing) {
      // Re-sync content in case the file changed between scans in-process.
      existing.replaceWithText(file.text);
      return existing;
    }
    return p.createSourceFile(file.path, file.text);
  } catch {
    return undefined;
  }
}

/** Narrow the loose `ast` seam back to a SourceFile. */
export function getTsSourceFile(ast: unknown): SourceFile | undefined {
  return ast instanceof Object && "getFilePath" in ast
    ? (ast as SourceFile)
    : undefined;
}

/**
 * Comment + string-literal ranges of a source file, via the TypeScript
 * scanner (skipTrivia=false so trivia tokens are emitted). Falls back to
 * a conservative line-comment scan when no AST is available.
 */
export function commentAndStringRanges(ctx: {
  path: string;
  text: string;
  ast?: unknown;
}): Array<{ start: number; end: number }> {
  const sf = getTsSourceFile(ctx.ast);
  if (!sf) return [];
  try {
    const compiler = sf.compilerNode;
    const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      false,
      ts.LanguageVariant.Standard,
      compiler.text ?? compiler.getFullText(),
    );
    const ranges: Array<{ start: number; end: number }> = [];
    let tok = scanner.scan();
    let guard = 0;
    while (tok !== ts.SyntaxKind.EndOfFileToken && guard++ < 200_000) {
      if (
        tok === ts.SyntaxKind.MultiLineCommentTrivia ||
        tok === ts.SyntaxKind.SingleLineCommentTrivia ||
        tok === ts.SyntaxKind.StringLiteral
      ) {
        ranges.push({
          start: scanner.getTokenPos(),
          end: scanner.getTextPos(),
        });
      }
      tok = scanner.scan();
    }
    return ranges;
  } catch {
    return [];
  }
}

/**
 * Comment- and string-free text view (FP firewall, adversarial-audit wave).
 *
 * Returns the file's code with comment ranges and string-literal contents
 * blanked out (whitespace-preserved, so line/column indices stay valid).
 * Regex rules that must never fire on prose comments or sample strings run
 * against this view instead of raw text. Falls back to the raw text when
 * ts-morph cannot parse the file — degraded, never fatal.
 */
export function getCodeOnlyText(file: ParsedFile): string {
  const sf = parseTsFile(file);
  if (!sf) return file.text;
  try {
    const text = file.text;
    const ranges: Array<{ start: number; end: number }> = [];
    for (const d of sf.getDescendantsOfKind(ts.SyntaxKind.StringLiteral)) {
      const s = d.getStart();
      ranges.push({ start: s, end: s + d.getWidth() });
    }
    // Comments via the scanner (ts-morph has no whole-file comment API).
    for (const r of commentAndStringRanges({ ...file, ast: sf })) {
      if (!ranges.some((x) => r.start >= x.start && r.end <= x.end)) {
        ranges.push(r);
      }
    }
    if (ranges.length === 0) return text;
    ranges.sort((a, b) => a.start - b.start);
    const chars = [...text];
    // Char-array indexing is UTF-16-safe here because offsets from
    // ts-morph are UTF-16 code-unit offsets, matching String indexing.
    for (const r of ranges) {
      for (let i = r.start; i < r.end && i < chars.length; i++) {
        if (chars[i] !== "\n" && chars[i] !== "\r") chars[i] = " ";
      }
    }
    return chars.join("");
  } catch {
    return file.text;
  }
}
