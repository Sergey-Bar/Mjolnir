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
/**
 * Comment + string-literal ranges of a source file, via the TypeScript
 * scanner (skipTrivia=false so trivia tokens are emitted). Falls back to
 * a conservative line-comment scan when no AST is available.
 *
 * Bug-audit 2026-08-31 (grafana corpus): the flat scanner has no parser
 * context, so a `/*` sequence inside a template literal (e.g. a route
 * pattern `` `${ROUTES.Base}/*` ``) opened a phantom multi-line comment
 * that ran to end-of-file — every live `test(` after it was classified as
 * comment content. Ranges overlapping REAL string/template AST nodes are
 * now rejected: in valid TypeScript a true comment can never overlap a
 * string/template range, and the phantom ranges always do (the template
 * AST node spans the `/*` inside it). Same overlap-rejection principle
 * getCodeOnlyText already applies for the inverse direction.
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
    // AST-truth ranges: template literals (head/middle/tail) and string
    // literals — collected from the PARSED tree, so parser context is
    // correct and a `/*` inside a template never escapes it.
    const astRanges: Array<{ start: number; end: number }> = [];
    const collect = (node: ts.Node): void => {
      if (
        node.kind === ts.SyntaxKind.StringLiteral ||
        node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
        node.kind === ts.SyntaxKind.TemplateHead ||
        node.kind === ts.SyntaxKind.TemplateMiddle ||
        node.kind === ts.SyntaxKind.TemplateTail
      ) {
        astRanges.push({ start: node.getStart(compiler), end: node.getEnd() });
      }
      ts.forEachChild(node, collect);
    };
    ts.forEachChild(compiler, collect);

    const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      false,
      ts.LanguageVariant.Standard,
      // SourceFile.text is always populated for parsed files.
      compiler.text,
    );
    const ranges: Array<{ start: number; end: number }> = [];
    let tok = scanner.scan();
    let guard = 0;
    while (tok !== ts.SyntaxKind.EndOfFileToken && guard++ < 200_000) {
      const r = { start: scanner.getTokenPos(), end: scanner.getTextPos() };
      if (
        (tok === ts.SyntaxKind.MultiLineCommentTrivia ||
          tok === ts.SyntaxKind.SingleLineCommentTrivia ||
          tok === ts.SyntaxKind.StringLiteral) &&
        // Reject scanner phantoms that pierce a real template/string node.
        !astRanges.some((x) => r.start < x.end && r.end > x.start)
      ) {
        ranges.push(r);
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
    // Template literals without substitutions (e.g. `hello world`).
    for (const d of sf.getDescendantsOfKind(
      ts.SyntaxKind.NoSubstitutionTemplateLiteral,
    )) {
      const s = d.getStart();
      ranges.push({ start: s, end: s + d.getWidth() });
    }
    // Template literal parts (head/middle/tail) — blank the static parts
    // but NOT the interpolated expressions (those are live code).
    for (const d of sf.getDescendantsOfKind(ts.SyntaxKind.TemplateHead)) {
      const s = d.getStart();
      ranges.push({ start: s, end: s + d.getWidth() });
    }
    for (const d of sf.getDescendantsOfKind(ts.SyntaxKind.TemplateMiddle)) {
      const s = d.getStart();
      ranges.push({ start: s, end: s + d.getWidth() });
    }
    for (const d of sf.getDescendantsOfKind(ts.SyntaxKind.TemplateTail)) {
      const s = d.getStart();
      ranges.push({ start: s, end: s + d.getWidth() });
    }
    // Comments via the scanner (ts-morph has no whole-file comment API).
    // Reject any scanner-emitted range that OVERLAPS an already-collected
    // AST range. The scanner runs flat (no parser context) so it emits
    // phantom StringLiteral tokens when it sees a quote inside a template
    // expression — those phantoms start inside the template but extend
    // past it, blanking real code. Overlap rejection is safe: comments
    // never overlap string/template ranges in valid TypeScript.
    for (const r of commentAndStringRanges({ ...file, ast: sf })) {
      const overlaps = ranges.some((x) => r.start < x.end && r.end > x.start);
      if (!overlaps) {
        ranges.push(r);
      }
    }
    if (ranges.length === 0) return text;
    ranges.sort((a, b) => a.start - b.start);
    // Bug-audit QA-2026-08-30 QA-15: this used to be `[...text]`, which
    // iterates CODE POINTS — an astral char (emoji, surrogate pair)
    // collapsed to one element, so the mask array was shorter than the
    // text and every ts-morph offset after it was misaligned. isMasked's
    // length guard then silently disabled masking for the entire file.
    // split("") indexes UTF-16 code units, matching String offsets.
    const chars = text.split("");
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
