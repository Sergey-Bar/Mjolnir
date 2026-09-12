/**
 * Detector revision integrity engine (certification-audit Phase 3,
 * G4/D8v2/D17).
 *
 * The manifest records, per rule, a `logicHash` = source-identity hash
 * over the rule's DECLARED METADATA (the gating/participation surface)
 * plus the FULL TOKEN STREAM of its defining module (the detection
 * surface). It is deliberately NOT a behavior-equivalence hash (D17):
 * behavior-neutral edits that touch source tokens (renames, unrelated
 * imports) DO churn it — that errs in the safe direction. What it
 * mechanically guarantees: no source-token change can pass without
 * either a declared revision bump or an explicit, review-visible
 * manifest regeneration.
 *
 * Token-stream contract (G4): every non-trivia token of the module with
 * regex/string/template-literal token texts preserved EXACTLY (whitespace
 * inside a literal is semantic); comments and inter-token whitespace
 * excluded (a prettier reformat or comment edit cannot churn the hash).
 * Module-scope detection constants, control-flow edits, and metadata
 * edits all change the token stream → detected. `String(rule.run)` is
 * proven insufficient for exactly this (module-scope constants live in
 * ≥7 rule files).
 *
 * Implementation note: tokenization goes through ts-morph's bundled
 * TypeScript compiler (ts-morph is a runtime dependency — the doctor
 * computes current hashes at runtime; `typescript` itself is dev-only
 * and must not leak into the runtime surface).
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ts } from "ts-morph";
import type { QADoctorRule } from "../rules/rule.js";

/** Field order here IS the canonical serialization order (G5: explicit, not accidental). */
export interface RuleHashMetadata {
  appliesTo: unknown;
  configRule: unknown;
  configFiles: unknown;
  frameworks: unknown;
  tier: unknown;
  severity: unknown;
  confidence: unknown;
  findingType: unknown;
  evidenceLevel: unknown;
  overlapWith: unknown;
}

/** The record separator between the metadata JSON and the token stream. */
const SECTION_SEP = "\u241E";
/** The unit separator between consecutive tokens (length-agnostic, unambiguous). */
const TOKEN_SEP = "\u241F";

/**
 * A context-aware, trivia-free token walk over `moduleText`. Yields
 * {kind, text} for every non-trivia token with regex/template resolution
 * identical to the compiler:
 *   - A SlashToken is re-scanned as RegularExpressionLiteral exactly when
 *     the previous token cannot end an expression (the lexer's own
 *     context rule); a division operator stays SlashToken.
 *   - A CloseBraceToken inside a template continuation is re-scanned via
 *     reScanTemplateToken (TemplateHead opens; TemplateMiddle/Tail close
 *     a level). A brace outside a template is plain punctuation —
 *     re-scanning it would swallow the rest of the file (proven).
 * Regex/string/template bodies keep their exact internal text; comments
 * and whitespace are trivia and never yielded.
 */
export function* walkTokens(moduleText: string): Generator<{
  kind: ts.SyntaxKind;
  text: string;
}> {
  const scanner = ts.createScanner(
    ts.ScriptTarget.ES2022,
    true,
    ts.LanguageVariant.Standard,
    moduleText,
  );
  let templateDepth = 0;
  // The kind of the last NON-TRIVIA token — drives regex-vs-division.
  let prevKind: ts.SyntaxKind | undefined;

  const endsExpression = (kind: ts.SyntaxKind | undefined): boolean => {
    if (kind === undefined) return false; // statement start → regex position
    return (
      // identifiers, literals, template tails, `)`, `]`, `}`, `++`, `--`
      kind === ts.SyntaxKind.Identifier ||
      kind === ts.SyntaxKind.StringLiteral ||
      kind === ts.SyntaxKind.NumericLiteral ||
      kind === ts.SyntaxKind.RegularExpressionLiteral ||
      kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
      kind === ts.SyntaxKind.LastTemplateToken ||
      kind === ts.SyntaxKind.CloseParenToken ||
      kind === ts.SyntaxKind.CloseBracketToken ||
      kind === ts.SyntaxKind.CloseBraceToken ||
      kind === ts.SyntaxKind.PlusPlusToken ||
      kind === ts.SyntaxKind.MinusMinusToken ||
      kind === ts.SyntaxKind.ThisKeyword ||
      kind === ts.SyntaxKind.SuperKeyword ||
      kind === ts.SyntaxKind.TrueKeyword ||
      kind === ts.SyntaxKind.FalseKeyword ||
      kind === ts.SyntaxKind.NullKeyword
    );
  };

  let tok: ts.SyntaxKind = scanner.scan();
  while (tok !== ts.SyntaxKind.EndOfFileToken) {
    if (tok === ts.SyntaxKind.SlashToken && !endsExpression(prevKind)) {
      tok = (
        scanner as { reScanSlashToken(): ts.SyntaxKind }
      ).reScanSlashToken();
    } else if (tok === ts.SyntaxKind.CloseBraceToken && templateDepth > 0) {
      const s = scanner as {
        reScanTemplateToken(isTagged: boolean): ts.SyntaxKind;
      };
      tok = s.reScanTemplateToken(false);
    }
    const text = scanner.getTokenText();
    // Every non-EOF token from scan()/reScan*() has at least one character —
    // the scanner never produces zero-width tokens — so no emptiness guard.
    yield { kind: tok, text };

    // Template nesting: TemplateHead opens the template; TemplateMiddle
    // ENDS an interpolation but keeps the template open (another `${…}`
    // may follow); only the TemplateTail (LastTemplateToken) closes.
    if (tok === ts.SyntaxKind.TemplateHead) {
      templateDepth++;
    } else if (tok === ts.SyntaxKind.LastTemplateToken) {
      templateDepth = Math.max(0, templateDepth - 1);
    }
    prevKind = tok;
    tok = scanner.scan();
  }
}

/**
 * The deterministic token stream consumed by the logic hash: token texts
 * joined with the unit separator.
 */
export function moduleTokenStream(moduleText: string): string {
  const parts: string[] = [];
  for (const { text } of walkTokens(moduleText)) {
    parts.push(text);
  }
  return parts.join(TOKEN_SEP);
}

/** The canonical logic hash for one rule: metadata JSON ‖ module token stream. */
export function computeRuleLogicHash(
  metadata: RuleHashMetadata,
  moduleText: string,
): string {
  return createHash("sha256")
    .update(JSON.stringify(metadata))
    .update(SECTION_SEP)
    .update(moduleTokenStream(moduleText))
    .digest("hex");
}

export interface DetectorHashEntry {
  logicHash: string;
  detectorRevision: number;
}

export type DetectorHashManifest = Record<string, DetectorHashEntry>;

/**
 * The metadata surface a hash covers, extracted from a live rule object.
 * Field order must stay in sync with RuleHashMetadata (the object literal
 * order defines the JSON serialization).
 */
export function metadataForRule(rule: {
  appliesTo: unknown;
  configRule?: unknown;
  configFiles?: unknown;
  frameworks?: unknown;
  tier?: unknown;
  severity: unknown;
  confidence: unknown;
  findingType: unknown;
  evidenceLevel?: unknown;
  overlapWith?: unknown;
}): RuleHashMetadata {
  return {
    appliesTo: rule.appliesTo,
    configRule: rule.configRule,
    configFiles: rule.configFiles,
    frameworks: rule.frameworks,
    tier: rule.tier,
    severity: rule.severity,
    confidence: rule.confidence,
    findingType: rule.findingType,
    evidenceLevel: rule.evidenceLevel,
    overlapWith: rule.overlapWith,
  };
}

export function declaredRevision(rule: { detectorRevision?: number }): number {
  return rule.detectorRevision ?? 1;
}

/**
 * Walks the rule source tree and maps every rule to its defining module —
 * STATICALLY. A module claims a rule when its tokens contain the property
 * sequence `id` `:` `<QA-rule-id string literal>` (defineRule options and
 * family variants both have exactly this shape). No dynamic import: the
 * doctor computes current hashes at runtime (also from dist, where .ts
 * imports are neither available nor needed — only file text is hashed),
 * so a runtime import of rule sources would break the installed case and
 * tie the integrity check to the module loader.
 *
 * Each rule id must be claimed exactly once — a double claim means the
 * module layout drifted and the manifest would be ambiguous.
 */
export function collectRuleModules(
  rulesDir: string,
): Array<{ ruleId: string; modulePath: string }> {
  const claimed = new Map<string, string>();
  const files = listRuleModules(rulesDir).sort();
  const RULE_ID_LIT = /^QA-[A-Z]{1,6}-\d{3}$/;
  for (const file of files) {
    const moduleText = readFileSync(file, "utf8");
    let pendingIdKey = false;
    // The previous non-trivia token — decides defining vs referencing
    // positions for QA-ID literals.
    let prevTok: ts.SyntaxKind | undefined;
    for (const { kind: tok, text: raw } of walkTokens(moduleText)) {
      // String-literal token text includes the quotes; compare the value.
      const isStringLit = tok === ts.SyntaxKind.StringLiteral;
      const literalValue =
        isStringLit && raw.length >= 2 ? raw.slice(1, -1) : raw;
      const isRuleId = isStringLit && RULE_ID_LIT.exec(literalValue) !== null;
      // A DEFINING position is `id: "QA-…"` (defineRule/variant objects)
      // or a factory call's first argument `make…("QA-…"` (family
      // factories pass the id positionally). Everything else —
      // overlapWith arrays, dedup tables, template text — is a REFERENCE
      // and must not claim.
      const defining =
        isRuleId &&
        ((prevTok === ts.SyntaxKind.ColonToken && pendingIdKey) ||
          prevTok === ts.SyntaxKind.OpenParenToken);
      if (defining) {
        const prev = claimed.get(literalValue);
        if (prev && prev !== file) {
          throw new Error(
            `rule ${literalValue} is claimed by both ${prev} and ${file} — ` +
              `the manifest needs exactly one defining module per rule`,
          );
        }
        claimed.set(literalValue, file);
        pendingIdKey = false;
      } else if (tok === ts.SyntaxKind.Identifier && raw === "id") {
        pendingIdKey = true;
      } else if (tok !== ts.SyntaxKind.ColonToken) {
        pendingIdKey = false;
      }
      prevTok = tok;
    }
  }
  return [...claimed.entries()].map(([ruleId, modulePath]) => ({
    ruleId,
    modulePath,
  }));
}

function listRuleModules(rulesDir: string): string[] {
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        // index.ts (any depth) only re-exports, and *.generated.ts files
        // (measured-fp.generated.ts) are generated DATA keyed by rule id —
        // neither defines detectors; claiming through them would make the
        // manifest ambiguous.
        if (entry.name === "index.ts" || entry.name.endsWith(".generated.ts")) {
          continue;
        }
        out.push(full);
      }
    }
  };
  visit(rulesDir);
  return out;
}

/**
 * Computes the full manifest from the live source tree. `rules` supplies
 * the registry (for detectorRevision + metadata of every registered rule);
 * `rulesDir` supplies the defining modules. Rules present in one but not
 * the other fail loudly — the manifest must cover exactly the registry.
 */
export function computeDetectorHashes(
  rules: readonly QADoctorRule[],
  rulesDir: string,
  retiredIds: readonly string[] = [],
): DetectorHashManifest {
  const modules = collectRuleModules(rulesDir);
  const byId = new Map(modules.map((m) => [m.ruleId, m] as const));
  const registryIds = new Set(rules.map((r) => r.id));
  const retiredSet = new Set(retiredIds);

  const manifest: DetectorHashManifest = {};
  for (const rule of rules) {
    const module = byId.get(rule.id);
    if (!module) {
      throw new Error(
        `rule ${rule.id} is registered but has no defining module under ${rulesDir}`,
      );
    }
    const moduleText = readFileSync(module.modulePath, "utf8");
    manifest[rule.id] = {
      logicHash: computeRuleLogicHash(metadataForRule(rule), moduleText),
      detectorRevision: declaredRevision(rule),
    };
  }
  for (const id of byId.keys()) {
    if (!registryIds.has(id) && !retiredSet.has(id)) {
      throw new Error(
        `rule ${id} defines a module under ${rulesDir} but is not in the registry — ` +
          `the manifest must cover exactly the registry`,
      );
    }
  }
  return manifest;
}

/**
 * Serializes the manifest deterministically: sorted rule ids, stable
 * field order, trailing newline.
 */
export function serializeManifest(manifest: DetectorHashManifest): string {
  const sorted: DetectorHashManifest = {};
  for (const id of Object.keys(manifest).sort()) {
    const entry = manifest[id];
    if (!entry) continue;
    sorted[id] = {
      logicHash: entry.logicHash,
      detectorRevision: entry.detectorRevision,
    };
  }
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

export function loadManifest(path: string): DetectorHashManifest {
  return JSON.parse(readFileSync(path, "utf8")) as DetectorHashManifest;
}

/**
 * G4 check C — base-diff comparison for the CI annotation step.
 * WARN semantics: `logicHash` changed while `detectorRevision` is
 * identical means the detector's source identity moved without a
 * declared revision bump — legitimate for behavior-neutral churn, so the
 * surface is a WARN annotation ("confirm behavior-neutrality or bump"),
 * never a hard fail (a hard fail would manufacture the routine-bump
 * culture G4 prohibits).
 */
export interface BaseDiffFinding {
  ruleId: string;
  kind: "hash-changed-same-revision" | "revision-changed" | "added" | "removed";
}

export function diffManifests(
  base: DetectorHashManifest,
  head: DetectorHashManifest,
): BaseDiffFinding[] {
  const findings: BaseDiffFinding[] = [];
  const ids = new Set([...Object.keys(base), ...Object.keys(head)]);
  for (const id of [...ids].sort()) {
    const b = base[id];
    const h = head[id];
    if (b === undefined || h === undefined) {
      // Exactly one side has the id (ids come from the union of both key
      // sets), so this is either added or removed — never both-absent.
      findings.push({
        ruleId: id,
        kind: b === undefined ? "added" : "removed",
      });
      continue;
    }
    if (b.logicHash !== h.logicHash) {
      findings.push({
        ruleId: id,
        kind:
          b.detectorRevision === h.detectorRevision
            ? "hash-changed-same-revision"
            : "revision-changed",
      });
    }
  }
  return findings;
}

/** The GitHub Actions WARN annotation line for one base-diff finding. */
export function annotationFor(finding: BaseDiffFinding): string | undefined {
  if (finding.kind !== "hash-changed-same-revision") return undefined;
  return (
    `::warning::detector source identity changed without a revision bump ` +
    `(${finding.ruleId}) — confirm behavior-neutrality in the PR body, or ` +
    `bump detectorRevision and re-measure per §07`
  );
}
