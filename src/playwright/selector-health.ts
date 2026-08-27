/**
 * Selector Health Score engine (Upgrade-Plan-v2 R3, the headline feature).
 *
 * Classifies every Playwright locator call per spec:
 *   GOOD  — getByRole/getByText/getByLabel/getByTestId (resilient)
 *   OK    — data-testid attribute selectors
 *   BAD   — CSS class chains, structural selectors, XPath (brittle)
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { isDefaultIgnored, isLintFixtureDir } from "../discovery/ignores.js";
import type { LocatorClass, SelectorRisk } from "./selector-health-types.js";

export type { LocatorClass, SelectorRisk } from "./selector-health-types.js";
import { LOCATOR_RISK } from "./selector-health-types.js";

export interface SpecSelectorHealth {
  file: string;
  score: number; // 0–100
  counts: Record<LocatorClass, number>;
  weakestLine?: number;
}

export function classifyLocator(line: string): LocatorClass | null {
  if (!/locator|getBy|\$x/.test(line)) return null;
  if (/getBy(Role|Text|Label|Placeholder|AltText|Title|TestId)\s*\(/.test(line))
    return "role-based";
  if (/locator\s*\(\s*['"`]\[data-testid/.test(line)) return "testid";
  if (/\$x\s*\(|locator\s*\(\s*['"`]xpath=/.test(line)) return "xpath";
  if (/locator\s*\(\s*['"`][^'"`]*['"`]/.test(line)) {
    // Any locator with a quoted selector that isn't testid/xpath = CSS.
    const isStructural = /[.>#[]/.test(line);
    return isStructural ? "css-chain" : null;
  }
  return null;
}

/**
 * Risk-score a single locator line (0 safe → 100 critical). Extends the
 * binary class with structural signals: nth-child/nth chains, deep XPath,
 * generated-looking class names all raise the score; data-testid and role
 * selectors stay at zero.
 */
export function scoreLocatorRisk(line: string): SelectorRisk {
  const cls = classifyLocator(line);
  if (!cls) return { score: 0, reason: "not a locator" };
  let score = LOCATOR_RISK[cls];
  const reasons: string[] = [`${cls} base ${score}`];
  if (/nth-(child|of-type)\s*\(/.test(line)) {
    score += 25;
    reasons.push("nth-child positional coupling +25");
  }
  // Deep structural chains: 3+ combinators inside the selector literal.
  const sel = line.match(/['"`]([^'"`]+)['"`]/);
  if (sel?.[1] && (sel[1].match(/[>+~]\s*\w/g)?.length ?? 0) >= 2) {
    score += 15;
    reasons.push("deep combinator chain +15");
  }
  // Generated-looking classes (hash suffixes, e.g. .Button-sc-1x2yz-0).
  if (sel?.[1] && /\.\w+-sc-|__[\w-]{6,}|-[0-9a-f]{6,}\b/.test(sel[1])) {
    score += 20;
    reasons.push("generated class name +20");
  }
  if (cls === "xpath" && (sel?.[1]?.split("/").length ?? 0) > 4) {
    score += 10;
    reasons.push("deep XPath +10");
  }
  return {
    score: Math.min(100, score),
    reason: reasons.join(" · "),
  };
}

export function computeSpecHealth(
  file: string,
  lines: string[],
): SpecSelectorHealth {
  const counts: Record<LocatorClass, number> = {
    "role-based": 0,
    testid: 0,
    "css-chain": 0,
    xpath: 0,
  };
  let weakestLine: number | undefined;

  lines.forEach((line, i) => {
    const cls = classifyLocator(line);
    if (cls) {
      counts[cls]++;
      const risk = scoreLocatorRisk(line);
      if (
        risk.score >= LOCATOR_RISK["css-chain"] &&
        weakestLine === undefined
      ) {
        weakestLine = i + 1;
      }
    }
  });

  const total =
    counts["role-based"] + counts.testid + counts["css-chain"] + counts.xpath;
  // Score: role/testid = full credit, css-chain = 0.3, xpath = 0.
  const good = counts["role-based"] + counts.testid;
  const score =
    total === 0
      ? 100
      : Math.round(((good + counts["css-chain"] * 0.3) / total) * 100);

  return {
    file,
    score,
    counts,
    ...(weakestLine !== undefined ? { weakestLine } : {}),
  };
}

export function renderSelectorHealth(specs: SpecSelectorHealth[]): string {
  const lines: string[] = ["", "▚▞ SELECTOR HEALTH", ""];
  for (const spec of specs) {
    const filled = Math.round(spec.score / 5);
    const bar = "█".repeat(filled) + "░".repeat(20 - filled);
    lines.push(`${spec.file}`);
    lines.push(`  [${bar}]  ${spec.score} / 100`);
    lines.push(
      `  role/text: ${spec.counts["role-based"]} · testid: ${spec.counts.testid}` +
        ` · css-chains: ${spec.counts["css-chain"]} ⚠ · xpath: ${spec.counts.xpath}`,
    );
    lines.push("");
  }
  return lines.join("\n");
}

/** Walk a repo and compute Selector Health for every Playwright spec. */
export function computeSelectorHealth(root: string): SpecSelectorHealth[] {
  const specs: SpecSelectorHealth[] = [];

  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = full.slice(root.length + 1).replaceAll("\\", "/");
      if (isDefaultIgnored(rel)) continue;
      if (entry.isDirectory()) {
        if (!isLintFixtureDir(full)) walk(full);
      } else if (entry.isFile() && /\.spec\.ts$/.test(entry.name)) {
        try {
          const text = readFileSync(full, "utf8");
          specs.push(computeSpecHealth(rel, text.split("\n")));
        } catch {
          /* skip unreadable */
        }
      }
    }
  };

  walk(root);
  return specs.sort((a, b) => a.score - b.score); // weakest first
}
