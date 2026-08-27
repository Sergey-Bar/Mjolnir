/**
 * Fixture harness (Sprint-Plan W2-03, Product-MVP §18.1).
 * Every rule ships with must-fire AND must-not-fire fixtures.
 * A rule that fires on its own negative fixture CANNOT ship.
 *
 * Fixtures live in tests/fixtures/<rule-id>/{must-fire,must-not-fire}/
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RULES } from "../src/rules/index.js";
import { computeCodeText } from "../src/engine/code-text.js";

const FIXTURES_ROOT = join(import.meta.dirname, "fixtures");

/** Detect language from file extension for codeText computation. */
function detectLanguage(
  file: string,
): "typescript" | "python" | "java" | "csharp" {
  if (file.endsWith(".py")) return "python";
  if (file.endsWith(".java")) return "java";
  if (file.endsWith(".cs")) return "csharp";
  return "typescript";
}

for (const rule of RULES) {
  // CI rules get corpus tests in W4; Python rules use .py fixtures here.
  if (rule.appliesTo !== "test-files" && rule.appliesTo !== ("python" as never))
    continue;

  describe(`${rule.id} — ${rule.title}`, () => {
    const mustFire = join(FIXTURES_ROOT, rule.id, "must-fire");
    const mustNotFire = join(FIXTURES_ROOT, rule.id, "must-not-fire");

    if (existsSync(mustFire)) {
      for (const file of listFiles(mustFire)) {
        it(`fires: ${file}`, () => {
          const text = readFileSync(join(mustFire, file), "utf8");
          const lang = detectLanguage(file);
          const parsed = { path: file, text };
          const codeText = computeCodeText(parsed, lang);
          const findings = rule.run({ ...parsed, codeText });
          expect(findings.length).toBeGreaterThan(0);
        });
      }
    }

    if (existsSync(mustNotFire)) {
      for (const file of listFiles(mustNotFire)) {
        it(`stays silent: ${file}`, () => {
          const text = readFileSync(join(mustNotFire, file), "utf8");
          const lang = detectLanguage(file);
          const parsed = { path: file, text };
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
