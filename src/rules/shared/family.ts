/**
 * Cross-language pattern rule family generator (Phase 6 — Tempering Plan).
 *
 * Nine rule families exist 3–4 times across PW/PY/JV/CS, copy-pasted
 * with different casing and messages. This module generates them from a
 * single declaration each. Rule IDs stay byte-identical.
 */

import { defineRule, type QADoctorRule, type AppliesTo } from "../rule.js";
import type {
  Finding,
  Confidence,
  FindingType,
  QaImpact,
  Severity,
} from "../../types.js";
import { lineAt, colAt } from "./positions.js";

export interface LanguageVariant {
  /** Rule ID, e.g. "QA-JV-102". */
  id: string;
  /** Which adapter handles this variant. */
  appliesTo: AppliesTo;
  /** File extension filter, e.g. ".java". */
  ext: string;
  /** Languages metadata, e.g. ["java"]. */
  languages: string[];
  /** Frameworks metadata. */
  frameworks: string[];
  /** Regex patterns to match in the code-only text. */
  patterns: RegExp[];
  /** Message template. Use `$0` for the matched text (truncated to 60 chars). */
  message: string;
  /** Fix suggestion specific to this language. */
  fix: string;
  /** Tier override (defaults to family-level tier). */
  tier?: "core" | "extended" | "quarantine";
}

export interface PatternFamilyOptions {
  /** Shared severity across all variants. */
  severity: Severity;
  /** Shared confidence. */
  confidence: Confidence;
  /** Shared finding type. */
  findingType: FindingType;
  /** Shared QA impact framing. */
  qaImpact: QaImpact;
  /** Shared category. */
  category: string;
  /** Shared title. */
  title: string;
  /** Shared "why" explanation. */
  why: string;
  /** Shared false-positive risk. */
  falsePositiveRisk: "low" | "medium" | "high";
  /** Shared detection strategy description. */
  detectionStrategy?: string;
  /** Shared autofix flag. */
  autofix?: boolean;
  /** Shared introduced version. */
  introduced?: string;
  /** Default tier for all variants (can be overridden per variant). */
  tier?: "core" | "extended" | "quarantine";
  /**
   * Whether to use codeText (true, default) or raw text (false).
   * Rules that need to read string content (selectors, URLs) set false.
   */
  useCodeText?: boolean;
  /** Per-language variants. */
  variants: LanguageVariant[];
}

/**
 * Generate a family of cross-language rules from a single declaration.
 * Each variant becomes a separate QADoctorRule with its own ID, sharing
 * all the common metadata and detection logic.
 */
export function definePatternFamily(
  opts: PatternFamilyOptions,
): QADoctorRule[] {
  return opts.variants.map((v) =>
    defineRule({
      id: v.id,
      category: opts.category as QADoctorRule["category"],
      title: opts.title,
      severity: opts.severity,
      confidence: opts.confidence,
      findingType: opts.findingType,
      qaImpact: opts.qaImpact,
      appliesTo: v.appliesTo,
      languages: v.languages,
      frameworks: v.frameworks,
      falsePositiveRisk: opts.falsePositiveRisk,
      autofix: opts.autofix ?? false,
      detectionStrategy: opts.detectionStrategy ?? "regex pattern",
      ...(opts.introduced ? { introduced: opts.introduced } : {}),
      ...((v.tier ?? opts.tier) ? { tier: v.tier ?? opts.tier } : {}),
      run(ctx) {
        const text =
          opts.useCodeText !== false ? (ctx.codeText ?? ctx.text) : ctx.text;
        const findings: Omit<Finding, "ruleId" | "category">[] = [];
        if (!ctx.path.endsWith(v.ext)) return findings;

        for (const re of v.patterns) {
          // Reset lastIndex for global regexes reused across calls
          re.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = re.exec(text)) !== null) {
            findings.push({
              severity: opts.severity,
              confidence: opts.confidence,
              findingType: opts.findingType,
              qaImpact: opts.qaImpact,
              file: ctx.path,
              line: lineAt(text, m.index),
              column: colAt(text, m.index),
              message: v.message.replace("$0", m[0].slice(0, 60)),
              why: opts.why,
              fix: v.fix,
            });
          }
        }
        return findings;
      },
    }),
  );
}
