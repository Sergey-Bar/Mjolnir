/**
 * W1.3: one error helper, one `isRecord`, one crash-isolation path.
 *
 * Three duplications, all of the same kind — a helper written once and then
 * copied, where each copy is a chance for the copies to disagree:
 *
 *   `isRecord`      eight declarations, seven of them byte-identical. It is
 *                   the predicate every JSON reader in the tree leans on to
 *                   decide "this is an object I can index into", so a copy
 *                   that widened or narrowed it would change what a hostile
 *                   saved report is allowed to claim.
 *
 *   error rendering four declarations under two names. Two were
 *                   byte-identical; the other two were NOT, and the
 *                   difference was the defect: `String(someObject)` renders
 *                   `[object Object]`, so the thinner copies turned a real
 *                   Node failure shape — `throw { code: "EISDIR" }` — into a
 *                   message naming nothing. The richer body survived.
 *
 *   crash isolation seven copies of
 *                   `try { for (const f of rule.run(x)) emit(...) } catch
 *                   (error) { onCrash?.(rule.id, error) }`. This is the
 *                   mechanism the `rulesCrashed` count is built on, so a copy
 *                   that lost the `onCrash` call would silently un-count a
 *                   failing detector.
 *
 * A source audit, not a runtime one, so it runs on every platform and needs
 * no failure to be reproducible. Modelled on
 * `tests/contract/no-bare-process-exec.spec.ts`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = join(import.meta.dirname, "..", "..", "src");

/** The files allowed to DECLARE each helper. Exactly one each. */
const IS_RECORD_HOME = "lib/safe-json.ts";
const ERROR_MESSAGE_HOME = "cli-io.ts";

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".spec.ts")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Comments are stripped, and removed content keeps its newline count so line
 * numbers survive. Both details are load-bearing: a header that CITES the old
 * copy must not read as a declaration, and a shifted line number would make
 * every failure message point at the wrong code.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const sources = listSourceFiles(SRC_ROOT).map((full) => ({
  full,
  rel: full.slice(SRC_ROOT.length + 1).replaceAll("\\", "/"),
  code: stripComments(readFileSync(full, "utf8")),
}));

function declaringFiles(pattern: RegExp): string[] {
  return sources.filter((s) => pattern.test(s.code)).map((s) => s.rel);
}

describe("W1.3: exactly one isRecord, in the module that owns JSON safety", () => {
  it("is declared exactly once across src/", () => {
    // `function isRecord(`, `const isRecord =` and an arrow form, so a copy
    // written in a different style does not slip past.
    const declared = declaringFiles(
      /function isRecord\s*\(|const isRecord\s*[:=]|let isRecord\s*[:=]|isRecord\s*=\s*\(/,
    );
    expect(declared, `isRecord is declared in: ${declared.join(", ")}`).toEqual(
      [IS_RECORD_HOME],
    );
  });

  it("the declaration is exported, so consumers import rather than re-declare", () => {
    const home = sources.find((s) => s.rel === IS_RECORD_HOME);
    expect(home).toBeDefined();
    expect(home?.code).toMatch(/export function isRecord\(/);
  });

  it("every isRecord in src/ is an import or a call, never a re-implementation", () => {
    const reimplemented = sources
      .filter(
        (s) =>
          s.rel !== IS_RECORD_HOME &&
          /typeof \w+ === "object" && \w+ !== null && !Array\.isArray\(\w+\)/.test(
            s.code,
          ),
      )
      .map((s) => s.rel);
    expect(
      reimplemented,
      "these files inline the isRecord predicate instead of importing it. A " +
        "second copy of the predicate is a second answer to " +
        '"is this a JSON object I may index into", which is a question a ' +
        "hostile saved report gets to ask.",
    ).toEqual([]);
  });
});

describe("W1.3: exactly one error-to-message derivation", () => {
  it("is declared exactly once across src/, under one name", () => {
    const declared = declaringFiles(
      /function errorMessage\s*\(|const errorMessage\s*[:=]|function errorText\s*\(|const errorText\s*[:=]/,
    );
    expect(
      declared,
      `error rendering is declared in: ${declared.join(", ")}. One ` +
        "derivation means a non-Error throw renders the same way in a " +
        "doctor detail, an MCP tool result and a summary line - and it is " +
        "the difference between naming a failure and printing " +
        "[object Object].",
    ).toEqual([ERROR_MESSAGE_HOME]);
  });

  it("keeps the object arm, which is the arm the copies disagreed on", () => {
    // The one behavioural assertion in this file, and the reason the collapse
    // was not a pure refactor. `String({})` is `[object Object]`.
    const home = sources.find((s) => s.rel === ERROR_MESSAGE_HOME);
    const body = home?.code ?? "";
    expect(body).toMatch(/JSON\.stringify\(err\)/);
    expect(body).toMatch(/err instanceof Error/);
    expect(body).toMatch(/typeof err === "string"/);
  });

  it("a re-export keeps its historical name without becoming a second copy", () => {
    // `summary.ts` still exports `errorText` because a spec imports it under
    // that name. A re-export is not a declaration; the declaration count above
    // is what proves it stayed one.
    const summary = sources.find((s) => s.rel === "commands/summary.ts");
    expect(summary?.code).toMatch(/export \{ errorMessage as errorText \}/);
  });
});

describe("W1.3: exactly one crash-isolation path for adapters", () => {
  const adapters = sources.filter((s) => s.rel.startsWith("adapters/"));

  it("audited the adapters (sanity check on the scan itself)", () => {
    expect(adapters.length).toBeGreaterThan(5);
  });

  it("no adapter calls rule.run() outside the shared helper", () => {
    // The duplication this replaces was seven literal copies of the same
    // try/catch. Any adapter that grows one back has re-opened the seam.
    const inline = adapters
      .filter((s) => /rule\.run\(/.test(s.code))
      .map((s) => s.rel);
    expect(
      inline,
      "these adapters call rule.run() directly. Crash isolation is the " +
        "mechanism the rulesCrashed count is built on; route the call " +
        "through runRuleIsolated in src/engine/shared-run-rules.ts.",
    ).toEqual([]);
  });

  it("no adapter hand-rolls an onCrash call", () => {
    const inline = adapters
      .filter((s) => /onCrash\?\.\(/.test(s.code))
      .map((s) => s.rel);
    expect(
      inline,
      "these adapters report a rule crash themselves. That is the counted " +
        "sink, and it belongs in one place so a copy cannot lose it.",
    ).toEqual([]);
  });

  it("every adapter that runs rules reaches the shared helper", () => {
    const reaching = adapters
      .filter((s) => /runRuleIsolated/.test(s.code))
      .map((s) => s.rel)
      .sort();
    expect(reaching.length).toBeGreaterThanOrEqual(7);
    // Named, so adding an eighth language adapter without the helper is a
    // visible diff rather than a silent eighth copy.
    for (const rel of reaching) {
      expect(rel).toMatch(
        /^adapters\/(typescript|python|java|csharp|github-actions|azure-pipelines|jenkins)\.ts$/,
      );
    }
  });

  it("the helper distinguishes a crash from a rule that abstained", () => {
    // `null` vs `[]` is the whole contract. Collapsing them would turn a
    // broken detector into a silent one again - the W1.1 defect class, one
    // layer down.
    const home = sources.find((s) => s.rel === "engine/shared-run-rules.ts");
    expect(home?.code).toMatch(
      /export function runRuleIsolated\([\s\S]*?\): Array<Omit<Finding, "ruleId" \| "category">> \| null/,
    );
  });
});
