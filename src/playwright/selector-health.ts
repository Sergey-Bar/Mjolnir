/**
 * Selector Health Score engine (Upgrade-Plan-v2 R3, the headline feature).
 *
 * Classifies every Playwright locator call per spec:
 *   GOOD  — getByRole/getByText/getByLabel/getByTestId (resilient)
 *   OK    — data-testid attribute selectors
 *   BAD   — CSS class chains, structural selectors, XPath (brittle)
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { isLintFixtureDir } from "../discovery/ignores.js";
import type { IgnoreMatcher } from "../discovery/ignores.js";
import { DEFAULT_IGNORE_MATCHER } from "../discovery/ignores.js";
import type { LocatorClass, SelectorRisk } from "./selector-health-types.js";

export type { LocatorClass, SelectorRisk } from "./selector-health-types.js";
import { LOCATOR_RISK } from "./selector-health-types.js";
import { sectionHeader, plainContext } from "../reporter/ui.js";

const ui = plainContext();

export interface SpecSelectorHealth {
  file: string;
  score: number; // 0–100
  counts: Record<LocatorClass, number>;
  weakestLine?: number;
}

export function classifyLocator(line: string): LocatorClass | null {
  if (!/locator|getBy|\$x/.test(line)) return null;
  if (
    /getBy(?:Role|Text|Label|Placeholder|AltText|Title|TestId)\s*\(/.test(line)
  )
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
  if (/nth-(?:child|of-type)\s*\(/.test(line)) {
    score += 25;
    reasons.push("nth-child positional coupling +25");
  }
  // Deep structural chains: 3+ combinators inside the selector literal.
  const sel = line.match(/['"`]([^'"`]+)['"`]/);
  const sel1 = sel?.[1];
  if (sel1 !== undefined && (sel1.match(/[>+~]\s*\w/g)?.length ?? 0) >= 2) {
    score += 15;
    reasons.push("deep combinator chain +15");
  }
  // Generated-looking classes (hash suffixes, e.g. .Button-sc-1x2yz-0).
  if (
    sel1 !== undefined &&
    /\.\w+-sc-|__[\w-]{6,}|-[0-9a-f]{6,}\b/.test(sel1)
  ) {
    score += 20;
    reasons.push("generated class name +20");
  }
  if (cls === "xpath" && sel1 !== undefined && sel1.split("/").length > 4) {
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
  // Bug-audit L8: the old code recorded the FIRST line at-or-above the
  // css-chain threshold — a low-risk css-chain on line 5 pinned it even
  // when a risk-90 xpath appeared later. Track the MAXIMUM-risk line
  // instead (ties keep the first).
  let weakestRisk = -1;

  lines.forEach((line, i) => {
    const cls = classifyLocator(line);
    if (cls) {
      counts[cls]++;
      const risk = scoreLocatorRisk(line);
      if (risk.score >= LOCATOR_RISK["css-chain"] && risk.score > weakestRisk) {
        weakestRisk = risk.score;
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
  const lines: string[] = ["", sectionHeader("SELECTOR HEALTH", ui), ""];
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
export function computeSelectorHealth(
  root: string,
  ignoreMatcher: IgnoreMatcher = DEFAULT_IGNORE_MATCHER,
): SpecSelectorHealth[] {
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
      // Bug-audit L4 family: path.relative, not a hard slice — a drive
      // root or trailing separator produced empty/mangled relative paths.
      const rel = relative(root, full).replaceAll("\\", "/");
      if (ignoreMatcher.isIgnored(rel)) continue;
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
  // Bug-audit L9: score ties kept filesystem order — output differed
  // byte-wise per machine. Deterministic tiebreaker: path.
  return specs.sort(
    (a, b) => a.score - b.score || a.file.localeCompare(b.file),
  ); // weakest first
}

/**
 * WI-19 — Selector Health v2: runtime correlation + safe next action.
 * The v1 score (static, secondary) is NEVER weakened by runtime
 * evidence (Contract H, roadmap §5). What v2 adds is the CLAIM gate:
 * **no correlation ⇒ no claim.** `claim` is non-null only when runtime
 * facts exist and coherently bear on the static signal; otherwise the
 * pair reports insufficient/contradictory honestly and the safe action
 * points at the evidence to collect — never at asserting selector
 * health from a score alone.
 */

export type SelectorCorrelation =
  "corroborates" | "contradicts" | "insufficient";

export interface RuntimeSelectorFacts {
  /** The executed outcome for this spec (Evidence Core / run facts). */
  outcome: "passed" | "failed" | "timedOut" | "flaky";
}

export interface SelectorHealthCorrelation {
  correlation: SelectorCorrelation;
  /** Null unless the correlation supports a claim (no correlation ⇒ no claim). */
  claim: { assertion: string; safeNextAction: string } | null;
  /** The v1 static score — never altered here (Contract H). */
  staticScore: number;
}

export function correlateSelectorHealth(
  spec: SpecSelectorHealth,
  runtime: RuntimeSelectorFacts | undefined,
): SelectorHealthCorrelation {
  const brittle = spec.counts["css-chain"] + spec.counts.xpath;
  if (runtime === undefined) {
    // No runtime facts: the honest answer is NO CLAIM, not "healthy".
    return {
      correlation: "insufficient",
      claim: null,
      staticScore: spec.score,
    };
  }
  if (runtime.outcome === "passed") {
    // One green run proves nothing about future brittleness and nothing
    // about selector quality — INSUFFICIENT either way. Missing evidence
    // ≠ negative evidence (roadmap §5).
    return {
      correlation: "insufficient",
      claim: null,
      staticScore: spec.score,
    };
  }
  if (runtime.outcome === "flaky") {
    return {
      correlation: "corroborates",
      claim: {
        assertion:
          brittle > 0 && spec.score >= 40
            ? `retry-dependent execution corroborates the static brittleness signal (${brittle} brittle locator${brittle === 1 ? "" : "s"})`
            : "retry-dependent execution shows instability the selector signal does not explain",
        safeNextAction:
          brittle > 0
            ? `replace the brittle locators (weakest near line ${spec.weakestLine ?? "?"}) with role/testid anchors, then re-run with retries off`
            : "collect trace evidence — retries point outside the selector surface",
      },
      staticScore: spec.score,
    };
  }
  // failed / timedOut:
  if (brittle > 0 && spec.weakestLine !== undefined) {
    return {
      correlation: "corroborates",
      claim: {
        assertion: `execution failed while ${brittle} brittle locator${brittle === 1 ? "" : "s"} are present — the static signal is corroborated`,
        safeNextAction: `stabilize the locator near line ${spec.weakestLine} (prefer role/testid), then re-run`,
      },
      staticScore: spec.score,
    };
  }
  return {
    correlation: "contradicts",
    claim: {
      assertion:
        "execution failed while the selector surface is not brittle by the static signal — blaming selector health is unsupported",
      safeNextAction:
        "investigate non-selector causes (assertions, environment, data) — do not rewrite selectors on score alone",
    },
    staticScore: spec.score,
  };
}
