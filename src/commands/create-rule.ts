/**
 * `mjolnir create-rule <ID> --title "..."` — rule scaffold generator
 * (Tier 6 #34, Contribution Surface Engineering).
 *
 * Generates the four files every rule MUST ship with (anti-creep law):
 *   src/rules/<family>/qa-<id-lower>.ts     — the rule
 *   tests/fixtures/<ID>/must-fire/          — at least one must-fire fixture
 *   tests/fixtures/<ID>/must-not-fire/      — at least one must-not fixture
 * and prints the exact registry edit to make.
 *
 * The generated rule intentionally FAILS its fixtures until the author
 * implements it — you cannot ship a stub.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Family =
  "test" | "quality" | "playwright" | "ci" | "python" | "cypress" | "selenium";

/** Map rule family prefix → source directory + default category. */
const FAMILY_META: Record<
  Family,
  { dir: string; category: string; appliesTo: string }
> = {
  test: { dir: "test", category: "QA-TEST", appliesTo: "test-files" },
  quality: { dir: "quality", category: "QA-TQUAL", appliesTo: "test-files" },
  playwright: { dir: "playwright", category: "QA-PW", appliesTo: "test-files" },
  ci: { dir: "ci", category: "QA-CI", appliesTo: "ci-workflows" },
  python: {
    dir: "python",
    category: "QA-TEST",
    appliesTo: "python",
  },
  // Phase 5 namespaces (plan §15.4): new frozen families scaffold into
  // their own directories, born quarantine.
  cypress: {
    dir: "cypress",
    category: "QA-PW",
    appliesTo: "test-files",
  },
  selenium: {
    dir: "selenium",
    category: "QA-PW",
    appliesTo: "test-files",
  },
};

export interface ScaffoldInput {
  id: string; // e.g. QA-PW-130
  title: string;
}

export interface ScaffoldResult {
  ok: boolean;
  error?: string;
  files: string[];
  registryEdit: string;
}

function parseId(
  id: string,
): { family: Family; num: string; lower: string } | null {
  const m = /^QA-(TEST|TQUAL|PW|CI|PY|CYP|SE)-(\d{3})$/.exec(id);
  if (!m?.[1] || !m[2]) return null;
  const map: Record<string, Family> = {
    TEST: "test",
    TQUAL: "quality",
    PW: "playwright",
    CI: "ci",
    PY: "python",
    CYP: "cypress",
    SE: "selenium",
  };
  // The map covers every alternation of the ID regex above.
  const family = map[m[1]] as Family;
  return { family, num: m[2], lower: id.toLowerCase() };
}

export function createRuleScaffold(
  input: ScaffoldInput,
  rootDir: string,
): ScaffoldResult {
  const parsed = parseId(input.id);
  if (!parsed) {
    return {
      ok: false,
      error:
        "Invalid rule ID. Expected QA-TEST-nnn, QA-TQUAL-nnn, QA-PW-nnn, QA-CI-nnn or QA-PY-nnn.",
      files: [],
      registryEdit: "",
    };
  }
  if (!input.title || input.title.trim().length === 0) {
    return {
      ok: false,
      error: "A --title is required.",
      files: [],
      registryEdit: "",
    };
  }

  const meta = FAMILY_META[parsed.family];
  const ruleRel = join("src", "rules", meta.dir, `${parsed.lower}.ts`);
  const absRule = join(rootDir, ruleRel);
  if (existsSync(absRule)) {
    return {
      ok: false,
      error: `Rule file already exists: ${ruleRel}`,
      files: [],
      registryEdit: "",
    };
  }
  mkdirSync(join(rootDir, "src", "rules", meta.dir), { recursive: true });

  const files: string[] = [];

  // 1. The rule itself — deliberately non-functional until implemented.
  const ruleSrc = `/**
 * ${input.id} — ${input.title}.
 *
 * TODO(implement): replace the placeholder below. The rule currently
 * returns no findings on purpose so the fixture harness FAILS until
 * real detection logic lands (anti-creep law §18.1).
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

export const ${camel(parsed.lower)} = defineRule({
  id: "${input.id}",
  category: "${meta.category}",
  title: ${JSON.stringify(input.title)},
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: ${JSON.stringify(meta.appliesTo)},
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    void ctx; // TODO: implement detection over ctx.path / ctx.text
    return findings;
  },
});
`;
  writeFileSync(absRule, ruleSrc);
  files.push(ruleRel);

  // 2+3. Fixture skeletons in both directions.
  for (const direction of ["must-fire", "must-not-fire"] as const) {
    const dirRel = join("tests", "fixtures", input.id, direction);
    const absDir = join(rootDir, dirRel);
    mkdirSync(absDir, { recursive: true });
    const isPy = parsed.family === "python";
    const name = isPy ? `example.${direction}.py` : `example.${direction}.ts`;
    const content = isPy
      ? `# ${input.id} ${direction} fixture — replace with a real case.\n`
      : `// ${input.id} ${direction} fixture — replace with a real case.\n`;
    writeFileSync(join(absDir, name), content);
    files.push(join(dirRel, name));
  }

  const exportName = camel(parsed.lower);
  const registryEdit = [
    `// 1. Add import to src/rules/index.ts:`,
    `import { ${exportName} } from "./${meta.dir}/${parsed.lower}.js";`,
    `// 2. Add to the RULES array:`,
    `  ${exportName},`,
  ].join("\n");

  return { ok: true, files, registryEdit };
}

function camel(idLower: string): string {
  // qa-pw-130 → qaPw130
  return idLower.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function renderScaffoldReport(result: ScaffoldResult): string {
  if (!result.ok) {
    return `create-rule failed: ${result.error}`;
  }
  const lines: string[] = [];
  lines.push("▚▞ RULE SCAFFOLD CREATED");
  lines.push("");
  for (const f of result.files) lines.push(`  + ${f}`);
  lines.push("");
  lines.push(result.registryEdit);
  lines.push("");
  lines.push(
    "Next steps:",
    "  1. Implement detection logic in the rule's run()",
    "  2. Replace both fixture skeletons with real cases",
    "  3. Run: npm test — must-fire AND must-not-fire must pass",
    "  4. A rule whose fixtures fail CANNOT ship (anti-creep law)",
  );
  lines.push("");
  lines.push(
    "Note: running the test suite right now will show the new fixtures " +
      "FAILING. This is intentional, not a bug in the scaffold — the " +
      "rule above returns zero findings on purpose, so its must-fire " +
      "fixture cannot pass until you implement real detection logic. A " +
      "rule that ships as a silent no-op stub would violate the " +
      "fixture-firewall law without anyone noticing.",
  );
  return lines.join("\n");
}
