/**
 * Header-claims lint (Verification Trust Evolution Plan §20.4, defect
 * class D4). Adapter/engine module headers are architectural claims, and
 * stale ones have a documented history: `java.ts` claimed to be the
 * "Second tree-sitter consumer", `python.ts` claimed tree-sitter usage
 * it never had, `engine/adapter.ts` claimed the tree-sitter parse stage
 * was unwired after Phase 0.5 wired it, and `tree-sitter-ast.ts` spent
 * two sprints calling itself dead code while it was the future parse
 * stage. This lint pins the current, verified claims so the drift class
 * cannot silently reland:
 *
 *  - banned phrases that were false the last time they shipped;
 *  - the structural truths the headers must keep claiming (the Java/C#
 *    adapters really do consume the tree-sitter parse stage; the TS
 *    adapter really does parse via ts-morph; python/github-actions really
 *    declare no parseAst).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const ADAPTERS = join(ROOT, "src", "adapters");
const ENGINE = join(ROOT, "src", "engine");

/** Header = the leading block comment of the file (before the first import). */
function headerOf(path: string): string {
  const text = readFileSync(path, "utf8");
  const firstImport = text.search(/^import\s/m);
  return firstImport === -1 ? text : text.slice(0, firstImport);
}

const adapterFiles = readdirSync(ADAPTERS)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => join(ADAPTERS, f));
const engineFiles = readdirSync(ENGINE)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => join(ENGINE, f));

describe("header-claims lint (plan §20.4, D4 class)", () => {
  // Ban-check operates on the header with quoted historical phrases
  // stripped: headers legitimately CITE old false claims (e.g.
  // tree-sitter-ast.ts's correction note quoting python.ts's old
  // "First tree-sitter consumer" line) — only a *direct* claim counts.
  const strippableQuotes = [/“[^”]*”/, /"[^"\n]*"/, /„[^“]*“/, /`[^`\n]*`/];
  function claimSurface(path: string): string {
    let header = headerOf(path);
    for (const q of strippableQuotes) header = header.replace(q, " ");
    return header.toLowerCase();
  }

  it.each(
    [...adapterFiles, ...engineFiles].map((f) => [f.replace(ROOT, ""), f]),
  )("%s — no stale claim phrases", (_label, file) => {
    const header = claimSurface(file);
    // "Second tree-sitter consumer": java.ts's historical false claim.
    expect(header).not.toContain("second tree-sitter consumer");
    // The Phase 0.5-unwired claim: false since the parse stage landed.
    expect(header).not.toContain("not yet wired into the synchronous");
    // The Sprint-8 dead-code self-description: false since D1 closed.
    expect(header).not.toContain("is dead code");
    // python.ts's historical false claim (Sprint 8 finding).
    expect(header).not.toContain("first tree-sitter consumer");
  });

  it("java.ts and csharp.ts headers claim the wired tree-sitter parse stage — and mean it", () => {
    for (const [file, parseFn] of [
      [join(ADAPTERS, "java.ts"), "parseJavaAst"],
      [join(ADAPTERS, "csharp.ts"), "parseCSharpAst"],
    ] as const) {
      const text = readFileSync(file, "utf8");
      expect(
        text.includes(parseFn),
        `${file} must consume ${parseFn} (D1 contract)`,
      ).toBe(true);
      expect(headerOf(file).toLowerCase()).toContain("parseast");
    }
  });

  it("python.ts and github-actions.ts declare no parse stage (regex/YAML adapters)", () => {
    for (const name of ["python.ts", "github-actions.ts"]) {
      const text = readFileSync(join(ADAPTERS, name), "utf8");
      expect(
        text.includes("parseAst("),
        `${name} must not declare parseAst`,
      ).toBe(false);
    }
  });
});
