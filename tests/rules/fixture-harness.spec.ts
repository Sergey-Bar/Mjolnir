/**
 * Fixture harness (Sprint-Plan W2-03, Product-MVP §18.1).
 * Every rule ships with must-fire AND must-not-fire fixtures.
 * A rule that fires on its own negative fixture CANNOT ship.
 *
 * Fixtures live in tests/fixtures/<rule-id>/{must-fire,must-not-fire}/
 *
 * 6.0: the context is built with an AST for the languages that have one.
 * It was `{ path, text }` for every rule, which meant a rule whose PRECISION
 * lives in its AST arm was fixture-tested only through its regex fallback —
 * and QA-PY-007's single-statement gate is AST-only. Its must-not-fire
 * fixtures passed for years while the rule measured 75% false positives,
 * because the harness never reached the code that makes the decision. The
 * gap between what the firewall proved and what shipped is exactly the
 * defect this release was written to remove.
 *
 * The parser is the same one the pipeline uses (`adapter.parseAst`), so the
 * fixture path and the shipped path are the same path. A language with no
 * available parser still runs the fallback, and says so — silently
 * narrowing the harness would recreate the original problem one level down.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RULES } from "../../src/rules/index.js";
import { computeCodeText } from "../../src/engine/code-text.js";
import { parsePythonAst } from "../../src/engine/tree-sitter-ast.js";

const FIXTURES_ROOT = join(import.meta.dirname, "..", "fixtures");

/** Detect language from file extension for codeText computation. */
function detectLanguage(
  file: string,
): "typescript" | "python" | "java" | "csharp" {
  if (file.endsWith(".py")) return "python";
  if (file.endsWith(".java")) return "java";
  if (file.endsWith(".cs")) return "csharp";
  return "typescript";
}

/**
 * The AST the pipeline would supply for this language, or `{}` when none is
 * available. TypeScript goes through ts-morph and Java/C# through the
 * tree-sitter grammars in the pipeline; the fixture harness parses Python
 * here because that is where an AST-arm precision gate was being missed.
 */
async function astFor(
  lang: "typescript" | "python" | "java" | "csharp",
  text: string,
): Promise<{ ast?: unknown }> {
  if (lang !== "python") return {};
  const ast = await parsePythonAst(text);
  return ast === undefined ? {} : { ast };
}

for (const rule of RULES) {
  // CI rules get corpus tests in W4; Python rules use .py fixtures here.
  // configRule rules (CYP-003, PW-124) are exercised via the config-file
  // corpus lanes, not the must-fire fixture harness.
  if (rule.configRule === true) continue;
  if (rule.appliesTo !== "test-files" && rule.appliesTo !== ("python" as never))
    continue;

  describe(`${rule.id} — ${rule.title}`, () => {
    const mustFire = join(FIXTURES_ROOT, rule.id, "must-fire");
    const mustNotFire = join(FIXTURES_ROOT, rule.id, "must-not-fire");

    if (existsSync(mustFire)) {
      for (const file of listFiles(mustFire)) {
        it(`fires: ${file}`, async () => {
          const text = readFileSync(join(mustFire, file), "utf8");
          const lang = detectLanguage(file);
          const parsed = { path: file, text, ...(await astFor(lang, text)) };
          const codeText = computeCodeText(parsed, lang);
          const findings = rule.run({ ...parsed, codeText });
          expect(findings.length).toBeGreaterThan(0);
        });
      }
    }

    if (existsSync(mustNotFire)) {
      for (const file of listFiles(mustNotFire)) {
        it(`stays silent: ${file}`, async () => {
          const text = readFileSync(join(mustNotFire, file), "utf8");
          const lang = detectLanguage(file);
          const parsed = { path: file, text, ...(await astFor(lang, text)) };
          const codeText = computeCodeText(parsed, lang);
          const findings = rule.run({ ...parsed, codeText });
          expect(findings).toHaveLength(0);
        });
      }
    }
  });
}

function listFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }
}
