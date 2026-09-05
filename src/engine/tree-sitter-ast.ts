/**
 * Tree-sitter WASM AST layer for Java and C# — Sprint 8 Task 36
 * (Master-Stabilization-Plan.md).
 *
 * DEPENDENCY PIN — real, found bug, not theoretical: `web-tree-sitter`
 * is pinned to the EXACT version `0.25.6` in package.json (no caret),
 * deliberately. `web-tree-sitter@0.26.x` (this repo's previously
 * installed, caret-ranged version) fails to load `tree-sitter-wasms`'s
 * prebuilt grammar files at all — `Language.load()` throws inside
 * `getDylinkMetadata` for every grammar, confirmed by direct
 * reproduction during this task. `tree-sitter-wasms` has no newer
 * release that fixes this (its latest, 0.1.13, is already what this
 * repo depends on) and declares no compatible-version contract with
 * `web-tree-sitter` at all. `web-tree-sitter@0.25.6` was empirically
 * verified compatible (both grammars parse real Java/C# source
 * correctly) via an isolated scratch install before this pin was
 * applied — not guessed. A caret range here would silently reintroduce
 * this exact breakage on the next `npm install`.
 *
 * IMPORTANT — corrects a real, previously-undetected false claim found
 * while implementing this task: `src/adapters/python.ts`'s own header
 * comment says "First tree-sitter consumer. Uses web-tree-sitter (WASM)"
 * and `src/engine/adapter.ts`'s header says "Tree-sitter arrives in R2
 * with Python, where it's actually required." Neither is true — grep
 * confirms zero tree-sitter usage anywhere in python.ts or any Python
 * rule; every Python rule is pure regex over raw text, architecturally
 * identical to the Java/C# rules this same sprint ported. THIS FILE is
 * the first real tree-sitter consumer in this codebase for any
 * language, not a port of an existing pattern.
 *
 * GRAMMAR-LIFECYCLE CONTRACT (Verification Trust Evolution Plan Phase 0.5,
 * §10.2–10.3): as of the Phase 0.5 parse stage this module IS wired into
 * the scan pipeline — the file loop awaits `parseJavaAst`/`parseCSharpAst`
 * and rules receive the tree via `ParsedFile.ast` (defect D1 closed). The
 * contract that made the earlier "unwired" caveat honest still binds:
 *
 * 1. Parse-or-fallback: `parseJavaAst`/`parseCSharpAst` return `undefined`
 *    on ANY failure (missing grammar file, WASM load failure, parser
 *    rejecting the input) — never throw — so the pipeline can always fall
 *    back to the regex path, exactly like ts-ast.ts's `parseTsFile`
 *    contract.
 * 2. One parser per language: a `Parser` is memoized per grammar and
 *    reused across files (§10.2); per-file trees are independent objects.
 * 3. Bounded concurrency: parses are serialized through a fixed-size slot
 *    semaphore (`MAX_CONCURRENT_PARSES`, §10.3) so a future parallel
 *    driver cannot fan out unbounded WASM parse memory.
 * 4. Explicit disposal: every parsed tree MUST be released via
 *    `disposeTree` (a `tree.delete()` call) in a finally-equivalent path
 *    that does not depend on rules completing successfully — the scan
 *    pipeline owns that path; this module only supplies the helper.
 *    `releaseTreeSitterResources` tears down the memoized parsers
 *    (process teardown / post-scan cleanup).
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Parser, Language, type Tree } from "web-tree-sitter";

let parserInitPromise: Promise<void> | null = null;

/**
 * Audit W3: counted degradation when a memoized parser creation fails
 * twice. A rejected memoized promise used to stay cached forever, so the
 * first transient WASM-load failure permanently disabled the AST path
 * while every scan still looked "complete". On rejection the promise is
 * nulled (next call retries); on a SECOND failure the retry is counted
 * here so operators can see the degradation instead of guessing.
 */
let parserRetryDegradations = 0;

export function parserRetryDegradationCount(): number {
  return parserRetryDegradations;
}

/**
 * §10.3 concurrency cap. The current pipeline parses files sequentially
 * (one parse in flight), so this only binds when a future driver —
 * parallel pre-parsing, plugin scan, library consumer — fans out; the
 * cap exists so that path cannot allocate unbounded WASM parse memory.
 */
export const MAX_CONCURRENT_PARSES = 2;

let activeParses = 0;
const parseWaiters: Array<() => void> = [];

async function withParseSlot<T>(fn: () => Promise<T>): Promise<T> {
  // Audit W2: re-check loop. The single `if` let two callers that both
  // observed an open slot proceed together (activeParses could exceed
  // the cap); a while-loop re-evaluates after EVERY wake-up, so the cap
  // holds under concurrent fan-out.
  while (activeParses >= MAX_CONCURRENT_PARSES) {
    await new Promise<void>((resolve) => parseWaiters.push(resolve));
  }
  activeParses++;
  try {
    return await fn();
  } finally {
    activeParses--;
    const next = parseWaiters.shift();
    if (next) next();
  }
}

function grammarPath(fileName: string): string {
  // Resolve relative to this module's own location so it works whether
  // the caller runs from source (tsx) or the built dist/ bundle.
  const here = dirname(fileURLToPath(import.meta.url));
  // From src/engine/ (or dist/), node_modules is two levels up from src,
  // one level up from dist — probe both, since this file ships in dist
  // as a single bundled file with no nested directory structure.
  const candidates = [
    join(
      here,
      "..",
      "..",
      "node_modules",
      "tree-sitter-wasms",
      "out",
      fileName,
    ),
    join(here, "..", "node_modules", "tree-sitter-wasms", "out", fileName),
  ] as const;
  const found = candidates.find((p) => existsSync(p));
  // The tuple always has a first element: when neither candidate exists
  // on disk, hand it to Language.load anyway so the failure surfaces as
  // an honest grammar-load error, not a config crash.
  return found ?? candidates[0];
}

async function ensureParserInitialized(): Promise<void> {
  parserInitPromise ??= Parser.init();
  await parserInitPromise;
}

/**
 * Audit W3: memoize the parser CREATION promise, not its failure. When
 * creation rejects, the memoized entry is nulled so the NEXT call
 * retries from scratch (a transient WASM-load hiccup used to disable
 * the AST path for the rest of the process); once a failure has
 * happened, every further failure increments the counted degradation
 * (parserRetryDegradationCount) so persistent breakage is visible
 * instead of silently absorbed by the regex fallback.
 */
function memoizeParser(
  slot: { promise: Promise<Parser> | null; failedOnce: boolean },
  create: () => Promise<Parser>,
): Promise<Parser> {
  if (slot.promise !== null) return slot.promise;
  const attempt = create();
  slot.promise = attempt;
  attempt.then(
    () => {
      // Recovered — a later failure is a fresh transient, not a repeat.
      if (slot.promise === attempt) slot.failedOnce = false;
    },
    () => {
      if (slot.promise === attempt) {
        slot.promise = null;
        if (slot.failedOnce) parserRetryDegradations++;
        slot.failedOnce = true;
      }
    },
  );
  return slot.promise;
}

interface ParserSlot {
  promise: Promise<Parser> | null;
  failedOnce: boolean;
}

const javaParserSlot: ParserSlot = { promise: null, failedOnce: false };
const csharpParserSlot: ParserSlot = { promise: null, failedOnce: false };

async function getJavaParser(): Promise<Parser> {
  await ensureParserInitialized();
  return memoizeParser(javaParserSlot, async () => {
    const language = await Language.load(grammarPath("tree-sitter-java.wasm"));
    const parser = new Parser();
    parser.setLanguage(language);
    return parser;
  });
}

async function getCSharpParser(): Promise<Parser> {
  await ensureParserInitialized();
  return memoizeParser(csharpParserSlot, async () => {
    const language = await Language.load(
      grammarPath("tree-sitter-c_sharp.wasm"),
    );
    const parser = new Parser();
    parser.setLanguage(language);
    return parser;
  });
}

/**
 * Parses Java source into a tree-sitter Tree. Returns undefined on any
 * failure (missing grammar file, WASM init failure, parser rejecting
 * the input) — callers must fall back to the regex path, exactly like
 * ts-ast.ts's parseTsFile contract. Never throws.
 */
export async function parseJavaAst(text: string): Promise<Tree | undefined> {
  try {
    return await withParseSlot(async () => {
      const parser = await getJavaParser();
      return parser.parse(text) ?? undefined;
    });
  } catch {
    return undefined;
  }
}

/**
 * Parses C# source into a tree-sitter Tree. Same fallback contract as
 * parseJavaAst.
 */
export async function parseCSharpAst(text: string): Promise<Tree | undefined> {
  try {
    return await withParseSlot(async () => {
      const parser = await getCSharpParser();
      return parser.parse(text) ?? undefined;
    });
  } catch {
    return undefined;
  }
}

/**
 * Releases a parsed tree's WASM memory (`tree.delete()`, §10.3). Safe to
 * call on anything — non-trees, already-deleted trees, null — so the
 * pipeline's finally-path can never turn a cleanup into a crash.
 */
export function disposeTree(tree: unknown): void {
  const t = tree as { delete?: unknown } | null | undefined;
  if (t && typeof t.delete === "function") {
    try {
      t.delete.call(t);
    } catch {
      /* already freed — cleanup must never throw */
    }
  }
}

/**
 * Tears down the memoized per-language parsers (§10.3 "parser disposal …
 * process teardown"). Idempotent; safe on partially-initialized state
 * (a failed WASM load resolves to nothing and is skipped). The next
 * parse after this re-creates the parser from scratch.
 */
export async function releaseTreeSitterResources(): Promise<void> {
  const slots = [javaParserSlot, csharpParserSlot];
  for (const slot of slots) {
    const p = slot.promise;
    slot.promise = null;
    slot.failedOnce = false;
    if (!p) continue;
    try {
      const parser = await p;
      parser.delete();
    } catch {
      /* grammar never loaded — nothing to free */
    }
  }
}

/**
 * Test-only escape hatch: resets memoized init/load state so tests can
 * exercise the "grammar failed to load" fallback path deterministically
 * without process-wide WASM state leaking between test files.
 */
export function _resetForTests(): void {
  parserInitPromise = null;
  for (const slot of [javaParserSlot, csharpParserSlot]) {
    slot.promise = null;
    slot.failedOnce = false;
  }
}
