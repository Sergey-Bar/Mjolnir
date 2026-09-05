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

import { existsSync, mkdirSync } from "node:fs";
import { writeFileAtomic } from "../lib/fs-atomic.js";
import { join } from "node:path";
import { sectionHeader, plainContext } from "../reporter/ui.js";

const ui = plainContext();

import { familyByToken, RULE_ID_RE } from "./rule-families.js";

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

function parseId(id: string): {
  family: string;
  dir: string;
  category: string;
  appliesTo: string;
  num: string;
  lower: string;
} | null {
  const m = RULE_ID_RE.exec(id);
  if (!m) return null;
  const token = (id.match(/^QA-([A-Z]+)-/) ?? [])[1] ?? "";
  const family = familyByToken(token);
  if (!family) return null;
  return {
    family: family.dir,
    dir: family.dir,
    category: family.category,
    appliesTo: family.appliesTo,
    num: (m[2] as string) ?? "",
    lower: id.toLowerCase(),
  };
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
        "Invalid rule ID. Expected QA-<FAMILY>-NNN with one of the registered families (TEST, TQUAL, PW, CI, PY, ENV, JV, CS, CYP, SE, WDIO, PPTR, APM).",
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

  // The family row IS the metadata source (audit M3: one table).
  const dirRel = join("src", "rules", parsed.dir);
  const ruleRel = join(dirRel, `${parsed.lower}.ts`);
  const absRule = join(rootDir, ruleRel);
  if (existsSync(absRule)) {
    return {
      ok: false,
      error: `Rule file already exists: ${ruleRel}`,
      files: [],
      registryEdit: "",
    };
  }
  mkdirSync(join(rootDir, "src", "rules", parsed.dir), { recursive: true });

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
  category: "${parsed.category}",
  title: ${JSON.stringify(input.title)},
  severity: "warning",
  confidence: "medium",
  findingType: "heuristic-risk",
  qaImpact: "HYGIENE",
  appliesTo: ${JSON.stringify(parsed.appliesTo)},
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];
    void ctx; // TODO: implement detection over ctx.path / ctx.text
    return findings;
  },
});
`;
  writeFileAtomic(absRule, ruleSrc);
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
    writeFileAtomic(join(absDir, name), content);
    files.push(join(dirRel, name));
  }

  const exportName = camel(parsed.lower);
  const registryEdit = [
    `// 1. Add import to src/rules/index.ts:`,
    `import { ${exportName} } from "./${parsed.dir}/${parsed.lower}.js";`,
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
  lines.push(sectionHeader("RULE SCAFFOLD CREATED", ui));
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
