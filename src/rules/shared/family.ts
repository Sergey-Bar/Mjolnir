/**
 * Cross-language pattern rule family generator (Phase 6 — Tempering Plan).
 *
 * Nine rule families exist 3–4 times across PW/PY/JV/CS, copy-pasted
 * with different casing and messages. This module generates them from a
 * single declaration each. Rule IDs stay byte-identical.
 */

import {
  defineRule,
  tryAstQuery,
  type QADoctorRule,
  type AppliesTo,
  type AstQueryHook,
  type DetectionStrategy,
} from "../rule.js";
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
  /**
   * Rule IDs that can fire on the same root cause (R6 dedup).
   * Variant-level entry overrides the family-level one.
   */
  overlapWith?: string[];
  /** Severity override (defaults to family-level severity). */
  severity?: Severity;
  /** False-positive-risk override (defaults to family-level value). */
  falsePositiveRisk?: "low" | "medium" | "high";
  /** Tier override (defaults to family-level tier). */
  tier?: "core" | "extended" | "quarantine";
  /**
   * Detection-strategy override (defaults to family-level value).
   * A variant that migrates to L2 structural analysis declares "AST"
   * here while sibling variants stay LEXICAL (§13.3 — evidence-driven,
   * per-rule migration, never family-wide by symmetry).
   */
  detectionStrategy?: DetectionStrategy;
  /** Legacy free-text detection-notes override (family-level default). */
  detectionNotes?: string;
  /**
   * Detector-implementation revision override (§07; family-level
   * default). Bumped on any detection-logic change of THIS variant.
   */
  detectorRevision?: number;
  /**
   * L2 structural-analysis hook (§13.2). When the engine supplies a
   * parsed AST, this produces the findings and the regex patterns
   * become the mandatory fallback. See AstQueryHook on the rule
   * contract — `undefined` return (or no AST) MUST fall through to
   * the regex path, which is kept in lockstep.
   */
  astQuery?: AstQueryHook;
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
  /** Shared detection strategy enum value (defaults to LEXICAL). */
  detectionStrategy?: DetectionStrategy;
  /** Shared legacy free-text detection notes, if any. */
  detectionNotes?: string;
  /** Shared detector-implementation revision (§07; variants override). */
  detectorRevision?: number;
  /** Shared autofix flag. */
  autofix?: boolean;
  /** Shared introduced version. */
  introduced?: string;
  /** Default tier for all variants (can be overridden per variant). */
  tier?: "core" | "extended" | "quarantine";
  /**
   * Default overlapWith for all variants (R6 dedup, Bug Map M-02).
   * Only families with a fixture-proven same-root-cause pair carry
   * entries; variants override.
   */
  overlapWith?: string[];
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
      severity: v.severity ?? opts.severity,
      confidence: opts.confidence,
      findingType: opts.findingType,
      qaImpact: opts.qaImpact,
      appliesTo: v.appliesTo,
      languages: v.languages,
      frameworks: v.frameworks,
      falsePositiveRisk: v.falsePositiveRisk ?? opts.falsePositiveRisk,
      autofix: opts.autofix ?? false,
      detectionStrategy:
        v.detectionStrategy ?? opts.detectionStrategy ?? "LEXICAL",
      ...((v.detectionNotes ?? opts.detectionNotes)
        ? { detectionNotes: v.detectionNotes ?? opts.detectionNotes }
        : {}),
      ...(opts.introduced ? { introduced: opts.introduced } : {}),
      ...((v.tier ?? opts.tier) ? { tier: v.tier ?? opts.tier } : {}),
      ...((v.detectorRevision ?? opts.detectorRevision)
        ? { detectorRevision: v.detectorRevision ?? opts.detectorRevision }
        : {}),
      ...((v.overlapWith ?? opts.overlapWith)
        ? { overlapWith: v.overlapWith ?? opts.overlapWith }
        : {}),
      ...(v.astQuery ? { astQuery: v.astQuery } : {}),
      run(ctx) {
        const severity = v.severity ?? opts.severity;
        const text =
          opts.useCodeText !== false ? (ctx.codeText ?? ctx.text) : ctx.text;
        const findings: Omit<Finding, "ruleId" | "category">[] = [];
        if (!ctx.path.endsWith(v.ext)) return findings;

        // §13.2 mandatory fallback: the AST path decides when a tree is
        // available; the regex path below is the degraded fallback, kept
        // in lockstep with the structural oracle.
        const astFindings = tryAstQuery(v.astQuery, ctx);
        if (astFindings !== undefined) return astFindings;

        for (const re of v.patterns) {
          // Reset lastIndex for global regexes reused across calls
          re.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = re.exec(text)) !== null) {
            findings.push({
              severity,
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
