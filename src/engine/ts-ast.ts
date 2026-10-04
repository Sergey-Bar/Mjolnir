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

import { AsyncLocalStorage } from "node:async_hooks";

import { Project, type SourceFile, ts } from "ts-morph";

import type { ParsedFile } from "./adapter.js";
import { recordDegradation } from "./degradation-ledger.js";

/**
 * One shared Project PER SCAN keeps memory bounded while reusing the compiler's
 * program across files.
 *
 * "Per scan" has to mean per scan. The variable lived at module scope, so it
 * was one Project per PROCESS, and two scans running concurrently shared it —
 * `parseTsFile` calls `replaceWithText` on a cached SourceFile, so scan B
 * could overwrite the text scan A was mid-rule on. ts-morph's in-memory file
 * system and language service are not reentrant, and the observable result was
 * three of four concurrent scans reporting `rulesCrashed: 4` with
 * `rules: "partial"` — different machine-contract digests from the same tree,
 * which is the one thing this product claims cannot happen.
 *
 * An AsyncLocalStorage scope is the smallest change that makes the comment
 * true: each scan's async context carries its own Project, memory stays bounded
 * per scan exactly as intended, and the context is collected when the scan's
 * promise chain is. The loose project below remains for callers outside a scan
 * (tests, one-off parses), where there is nothing to collide with.
 */
const scanProjects = new AsyncLocalStorage<Project>();
let looseProject: Project | null = null;

function createProject(): Project {
  return new Project({
    useInMemoryFileSystem: true,
    skipAddingFilesFromTsConfig: true,
    compilerOptions: {
      allowJs: true,
      declaration: false,
      noEmit: true,
    },
  });
}

/**
 * Run `fn` with its own ts-morph Project.
 *
 * Async context propagates across `await`, so the Project stays the scan's own
 * for the whole scan without threading an argument through every adapter.
 */
export function runWithScanProject<T>(fn: () => T): T {
  return scanProjects.run(createProject(), fn);
}

/**
 * The ts-morph Project for the current scan.
 *
 * Exported so an adapter's `dispose()` can evict the file it parsed: ts-morph
 * caches by file path, so without eviction a long scan holds every parsed
 * SourceFile until the process exits (plan V5-021).
 */
export function getProject(): Project {
  const scoped = scanProjects.getStore();
  if (scoped !== undefined) return scoped;
  looseProject ??= createProject();
  return looseProject;
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
    // Uncounted, this was the worst of the fifteen: the file drops to its
    // regex path and the scan still says `analysisComplete`. Regex-only is a
    // real capability loss — it is what a reader means by "scanned with the
    // TypeScript parser" — so it is counted, and the count is reported.
    recordDegradation("ast-parse-failed");
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
    // No ranges means every mask-oracle rule that asks treats the whole file
    // as code, so a prose comment reads as an implementation. Counted, not
    // swallowed.
    recordDegradation("ast-range-scan-failed");
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
    const compiler = sf.compilerNode;
    const stringAndTemplateKinds: Record<number, true> = {
      [ts.SyntaxKind.StringLiteral]: true,
      [ts.SyntaxKind.NoSubstitutionTemplateLiteral]: true,
      [ts.SyntaxKind.TemplateHead]: true,
      [ts.SyntaxKind.TemplateMiddle]: true,
      [ts.SyntaxKind.TemplateTail]: true,
    };
    const collect = (node: ts.Node): void => {
      if (stringAndTemplateKinds[node.kind]) {
        const s = node.getStart(compiler);
        ranges.push({ start: s, end: s + node.getWidth() });
      }
      ts.forEachChild(node, collect);
    };
    ts.forEachChild(compiler, collect);
    // Comments via the scanner (ts-morph has no whole-file comment API).
    // Scanner phantoms (a `/*` inside a template literal scanned as a
    // comment running to EOF) are rejected inside commentAndStringRanges
    // against the template/string AST nodes collected above.
    for (const r of commentAndStringRanges({ ...file, ast: sf })) {
      ranges.push(r);
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
    // The raw-text fallback is the FALSE-POSITIVE FIREWALL going off for this
    // file, not merely a slower answer: a rule whose oracle is "code only"
    // now sees comments and string literals as code. It is the one site in
    // this file where degrading changes what a scan can produce, so it gets
    // its own reason rather than sharing `ast-parse-failed`.
    recordDegradation("ast-mask-unavailable");
    return file.text;
  }
}

/**
 * Release the loose ts-morph Project used outside a scan.
 *
 * Deliberately does NOT call `scanProjects.disable()`. Scan-scoped Projects are
 * released by garbage collection when the scan's async context ends, and
 * `disable()` would tear the store out from under a scan still running — the
 * exact corruption this scoping exists to remove.
 */
export function resetTsMorphProject(): void {
  looseProject = null;
}
