import { readFileSync } from "node:fs";
import { defineLoader } from "vitepress";
import demo from "../../../assets/video/script.demo.json";
import rules from "../../rules/rules.data.json";
import report from "./generated/report.json";

export type Span = { t: string; c?: string; b?: boolean };
export type TermLine = Span[];
type Tone = "forged" | "trusted" | "warning" | "critical";

interface RuleRow {
  id: string;
  title: string;
  tier: string;
  rate: number;
  n: number;
  tone: "zero" | "mid" | "high";
}

export interface HomeData {
  stream: { command: string; lines: TermLine[] };
  annotation: {
    file: string;
    line: number;
    context: { n: number; s: string }[];
    rule: string;
    title: string;
    stamp: string;
    message: string;
    fix: string;
  };
  findings: TermLine[];
  legend: { where: string; evidence: string; fp: string };
  staticCard: TermLine[];
  runtimeCard: TermLine[];
  forensics: TermLine[];
  selectors: TermLine[];
  score: {
    outOf: number;
    bands: { min: number; max: number; verdict: string; tone: Tone }[];
    demo: {
      score: number;
      verdict: string;
      raw: number;
      declarations: number;
      smoothing: number;
      k: number;
      rate: number;
      cut: number;
    };
  };
  stack: { label: string; items: string[] }[];
  masks: { id: string; title: string; code: string; effect: string }[];
  rules: {
    measured: number;
    total: number;
    groups: { tier: string; label: string; rows: RuleRow[] }[];
  };
}

declare const data: HomeData;
export { data };

/** The reporter's output uses three SGR codes: reset, bold, truecolor. */
function parseAnsi(line: string): TermLine {
  const out: TermLine = [];
  const re = /\x1b\[([0-9;]*)m/g;
  let color: string | undefined;
  let bold = false;
  let last = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > last)
      out.push({ t: line.slice(last, m.index), c: color, b: bold });
    const codes = m[1].split(";").map(Number);
    for (let i = 0; i < codes.length; i++) {
      if (codes[i] === 0) {
        color = undefined;
        bold = false;
      } else if (codes[i] === 1) bold = true;
      else if (codes[i] === 38 && codes[i + 1] === 2) {
        color = `rgb(${codes[i + 2]}, ${codes[i + 3]}, ${codes[i + 4]})`;
        i += 4;
      }
    }
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ t: line.slice(last), c: color, b: bold });
  return out;
}

const text = (l: TermLine) => l.map((s) => s.t).join("");

function find(lines: TermLine[], needle: string, from = 0): number {
  for (let i = from; i < lines.length; i++)
    if (text(lines[i]).includes(needle)) return i;
  throw new Error(`home.data: "${needle}" not found in the demo output`);
}

/** One finding card: its header line through the next blank line. */
function card(lines: TermLine[], needle: string, from: number): TermLine[] {
  const start = find(lines, needle, from);
  let end = start + 1;
  while (end < lines.length && text(lines[end]).trim() !== "") end++;
  return lines.slice(start, end);
}

/** A generated sample, minus the trailer its generator's own flags add. */
function sample(file: string): TermLine[] {
  return readFileSync(new URL(`./generated/${file}`, import.meta.url), "utf8")
    .replace(/^\s*\n/, "")
    .replace(/\s+$/, "")
    .split("\n")
    .filter((l) => !l.startsWith("FLAKY.md"))
    .map((l) => [{ t: l.replace(/\s+$/, "") }]);
}

const NAMES: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  java: "Java",
  csharp: "C#",
  playwright: "Playwright",
  cypress: "Cypress",
  selenium: "Selenium",
  jest: "Jest",
  vitest: "Vitest",
  mocha: "Mocha",
  pytest: "pytest",
  junit: "JUnit",
  testng: "TestNG",
  nunit: "NUnit",
  xunit: "xUnit",
  mstest: "MSTest",
  "github-actions": "GitHub Actions",
  "azure-pipelines": "Azure Pipelines",
  jenkins: "Jenkins",
};
const CI_SYSTEMS = new Set(["github-actions", "azure-pipelines", "jenkins"]);
const NOT_SHOWN = new Set(["yaml", "groovy", "pytest-playwright"]);
const ORDER = Object.keys(NAMES);

const MASKS = [
  {
    id: "QA-CI-001",
    code: "continue-on-error: true",
    effect: "The job fails and the workflow still reports success.",
  },
  {
    id: "QA-CI-002",
    code: "npm test || true",
    effect: "The test command's exit code is thrown away.",
  },
  {
    id: "QA-CI-009",
    code: "npm test | tee results.log",
    effect: "Only the exit code of tee reaches CI.",
  },
  {
    id: "QA-TEST-001",
    code: 'test.only("checkout", ...)',
    effect: "The focused test runs and the rest are skipped.",
  },
];

const RULE_PICKS = [
  "QA-PW-002",
  "QA-PY-001",
  "QA-CS-103",
  "QA-JV-103",
  "QA-TEST-001",
];
const TIERS: Record<string, string> = {
  core: "Core",
  extended: "Extended",
  quarantine: "Quarantine",
};

const TONES: Tone[] = ["forged", "trusted", "warning", "critical"];
const BANDS_DESC = [...report.scoring.bands].sort((a, b) => b.min - a.min);
const toneOf = (score: number): Tone =>
  TONES[
    Math.max(
      0,
      BANDS_DESC.findIndex((b) => score >= b.min),
    )
  ] ?? "critical";

export default defineLoader({
  load(): HomeData {
    const beat = (id: string) => demo.beats.find((b) => b.id === id)!;
    const scan = beat("hero-scan");
    const scanLines = (scan.ansi as string[]).map(parseAnsi);
    const rescanLines = (beat("hero-rescan").ansi as string[]).map(parseAnsi);

    const top = find(scanLines, "WORTHINESS");
    const findingsAt = find(scanLines, "▍ FINDINGS");
    const staticCard = card(scanLines, "QA-CI-009", findingsAt + 1);
    const cardText = staticCard.map(text);
    const stamp = /\[(E\d · \w+) · (measured FP .+?)\]/.exec(cardText[1]);

    const byId = new Map(rules.map((r) => [r.id, r]));

    const first = JSON.parse(report.formats.json.excerpt).findings[0];
    const line: number = first.line;
    const annotation: HomeData["annotation"] = {
      file: first.file,
      line,
      context: (demo.patch.before as string[])
        .slice(line - 5, line + 1)
        .map((s, k) => ({ n: line - 4 + k, s })),
      rule: first.ruleId,
      title: byId.get(first.ruleId)?.title ?? "",
      stamp: stamp ? `${stamp[1]} · ${stamp[2]}` : "",
      message: first.message,
      fix: first.fix,
    };

    const { rawDeductions, declarations, constants } = report.scoring;
    const rate = rawDeductions / (declarations + constants.smoothing);
    const bandsAsc = [...BANDS_DESC].reverse();
    const score: HomeData["score"] = {
      outOf: report.outOf,
      bands: bandsAsc.map((b, i) => ({
        min: b.min,
        max: i < bandsAsc.length - 1 ? bandsAsc[i + 1].min - 1 : report.outOf,
        verdict: b.verdict,
        tone: toneOf(b.min),
      })),
      demo: {
        score: report.score,
        verdict: report.verdict,
        raw: rawDeductions,
        declarations,
        smoothing: constants.smoothing,
        k: constants.k,
        rate,
        cut: Math.min(report.outOf, rate * constants.k),
      },
    };

    const split = (v: string) =>
      String(v)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !NOT_SHOWN.has(s));
    const langs = new Set<string>();
    const frameworks = new Set<string>();
    const ci = new Set<string>();
    for (const r of rules) {
      split(r.languages).forEach((l) => langs.add(l));
      split(r.frameworks).forEach((f) =>
        (CI_SYSTEMS.has(f) ? ci : frameworks).add(f),
      );
    }
    const rank = (s: string) =>
      ORDER.includes(s) ? ORDER.indexOf(s) : ORDER.length;
    const show = (set: Set<string>) =>
      [...set]
        .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
        .map((s) => NAMES[s] ?? s);

    const rows: RuleRow[] = [];
    for (const id of RULE_PICKS) {
      const r = byId.get(id);
      const m = r && /^(\d+(?:\.\d+)?)%\s*\(n=(\d+)\)/.exec(r.measuredFp);
      if (!r || !m) continue;
      const rate = Number(m[1]);
      rows.push({
        id,
        title: r.title,
        tier: r.tier,
        rate,
        n: Number(m[2]),
        tone: rate === 0 ? "zero" : rate < 50 ? "mid" : "high",
      });
    }

    return {
      stream: {
        command: scan.command,
        lines: [[], ...scanLines.slice(top, findingsAt - 1)],
      },
      annotation,
      findings: scanLines.slice(
        findingsAt,
        find(scanLines, "… +", findingsAt) + 1,
      ),
      legend: {
        where: cardText[0].replace(/^\s*\S+\s+\S+\s+/, ""),
        evidence: stamp?.[1] ?? "",
        fp: stamp?.[2] ?? "",
      },
      staticCard,
      runtimeCard: card(
        rescanLines,
        "QA-PW-101",
        find(rescanLines, "▍ FINDINGS"),
      ),
      forensics: sample("forensics-sample.txt"),
      selectors: sample("selector-health-sample.txt"),
      score,
      stack: [
        { label: "Languages", items: show(langs) },
        { label: "Test frameworks", items: show(frameworks) },
        // GitLab runs it through `--format codequality` (docs/GITLAB-CI.md).
        { label: "CI", items: [...show(ci), "GitLab CI"] },
      ],
      masks: MASKS.filter((m) => byId.has(m.id)).map((m) => ({
        ...m,
        title: byId.get(m.id)!.title,
      })),
      rules: {
        measured: rules.filter((r) => r.measured).length,
        total: rules.length,
        groups: Object.entries(TIERS)
          .map(([tier, label]) => ({
            tier,
            label,
            rows: rows.filter((r) => r.tier === tier),
          }))
          .filter((g) => g.rows.length > 0),
      },
    };
  },
});
