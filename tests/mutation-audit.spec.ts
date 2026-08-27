/**
 * Rule strength / mutation testing (Test Hardening Plan, P1).
 *
 * The fixture firewall (rules.fixtures.spec.ts) proves a rule fires on
 * ONE hand-written must-fire example and stays silent on ONE hand-written
 * must-not-fire example. It says nothing about whether that verdict
 * survives the kind of harmless variation real code has: different
 * whitespace, a blank line the author happened to add, unrelated code
 * sitting above or below the pattern that matters. A rule that only
 * fires on its exact fixture shape is not a rule a real repo can trust.
 *
 * Two mutation classes, applied to every fixture, both required to
 * preserve the original verdict:
 *
 *  - whitespace/line-ending variation (reformatting that changes nothing
 *    semantically)
 *  - unrelated-code padding before and after (the fixture is never the
 *    only thing in a real file)
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RULES } from "../src/rules/index.js";
import { computeCodeText } from "../src/engine/code-text.js";

const FIXTURES_ROOT = join(import.meta.dirname, "fixtures");

function listFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }
}

function isPython(file: string): boolean {
  return file.endsWith(".py");
}

/** Detect language from file extension for codeText computation. */
function detectLanguage(
  file: string,
): "typescript" | "python" | "java" | "csharp" {
  if (file.endsWith(".py")) return "python";
  if (file.endsWith(".java")) return "java";
  if (file.endsWith(".cs")) return "csharp";
  return "typescript";
}

/** Build a rule context with codeText populated. */
function buildCtx(file: string, text: string) {
  const parsed = { path: file, text };
  const codeText = computeCodeText(parsed, detectLanguage(file));
  return { ...parsed, codeText };
}

// Doubles blank-line gaps and converts LF -> CRLF. Safe for both
// Python (never touches leading indentation, only inter-line gaps) and
// TS/JS.
function mutateWhitespace(text: string): string {
  const withExtraBlankLines = text.replace(/\n\n/g, "\n\n\n");
  return withExtraBlankLines.replace(/\n/g, "\r\n");
}

// Realistic-looking unrelated code, one flavor per language, long enough
// to shift line/column numbers and push the real content away from
// file-start/file-end.
const TS_PADDING = Array.from(
  { length: 15 },
  (_, i) => `// unrelated helper comment line ${i}`,
).join("\n");
const PY_PADDING = Array.from(
  { length: 15 },
  (_, i) => `# unrelated helper comment line ${i}`,
).join("\n");

function padded(text: string, file: string): string {
  const padding = isPython(file) ? PY_PADDING : TS_PADDING;
  return `${padding}\n\n${text}\n\n${padding}\n`;
}

for (const rule of RULES) {
  if (rule.appliesTo !== "test-files" && rule.appliesTo !== ("python" as never))
    continue;

  const mustFire = join(FIXTURES_ROOT, rule.id, "must-fire");
  const mustNotFire = join(FIXTURES_ROOT, rule.id, "must-not-fire");
  if (!existsSync(mustFire) && !existsSync(mustNotFire)) continue;

  describe(`${rule.id} — mutation resilience`, () => {
    for (const file of listFiles(mustFire)) {
      const original = readFileSync(join(mustFire, file), "utf8");

      it(`still fires after whitespace mutation: ${file}`, () => {
        const findings = rule.run(buildCtx(file, mutateWhitespace(original)));
        expect(
          findings.length,
          `${rule.id} stopped firing on "${file}" after only whitespace ` +
            `changed (extra blank lines, CRLF line endings) — the rule is ` +
            `too tightly coupled to the fixture's exact formatting.`,
        ).toBeGreaterThan(0);
      });

      it(`still fires with unrelated code around it: ${file}`, () => {
        const findings = rule.run(buildCtx(file, padded(original, file)));
        expect(
          findings.length,
          `${rule.id} stopped firing on "${file}" once surrounded by ` +
            `unrelated code — a real file is never just the fixture.`,
        ).toBeGreaterThan(0);
      });
    }

    for (const file of listFiles(mustNotFire)) {
      const original = readFileSync(join(mustNotFire, file), "utf8");

      it(`still stays silent after whitespace mutation: ${file}`, () => {
        const findings = rule.run(buildCtx(file, mutateWhitespace(original)));
        expect(
          findings,
          `${rule.id} started firing on "${file}" once whitespace changed ` +
            `— suggests the negative fixture only stayed clean by ` +
            `formatting accident, not because the pattern genuinely ` +
            `doesn't apply.`,
        ).toHaveLength(0);
      });

      it(`still stays silent with unrelated code around it: ${file}`, () => {
        const findings = rule.run(buildCtx(file, padded(original, file)));
        expect(
          findings,
          `${rule.id} started firing on "${file}" once surrounded by ` +
            `unrelated code — check whether the padding itself ` +
            `resembles a trigger, or the rule lacks proper boundaries.`,
        ).toHaveLength(0);
      });
    }
  });
}
