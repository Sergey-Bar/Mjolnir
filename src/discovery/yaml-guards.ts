/**
 * Shared hostile-YAML guards (product-gap master plan P3 common law —
 * `azure-pipelines.yml` detection rides the same YAML machinery as the
 * GitHub Actions workflow parser).
 *
 * Extracted from workflow-parser.ts so every CI-config parser inherits
 * the exact same attack surface defenses:
 *  - alias-count pre-check (billion-laughs: the `yaml` package expands
 *    aliases during parse, so the count happens textually BEFORE parse),
 *  - maxAliasCount on the parser itself,
 *  - an iterative nesting-depth cap over the parsed doc (the library's
 *    own alias guard does not bound NESTING depth; the walk is iterative
 *    so the check itself cannot overflow the stack on a hostile doc),
 *  - a non-null-prototype rule for downstream mapping builds.
 */

import { parse as yamlParse } from "yaml";

export const YAML_LIMITS = {
  maxAliases: 50,
  maxDepth: 40,
} as const;

export class YamlParseError extends Error {}

/** Surface-specific error wording, so every parser keeps its own messages. */
export interface YamlGuardLabels {
  /** Prefixed to third-party parse failures: `<invalidPrefix>: <msg>`. */
  invalidPrefix: string;
  /** Thrown when the document root is not a mapping. */
  rootMessage: string;
  /** Thrown when the nesting cap trips. */
  depthMessage: string;
}

const GENERIC_LABELS: YamlGuardLabels = {
  invalidPrefix: "Invalid YAML",
  rootMessage: "Document root must be a mapping",
  depthMessage: "YAML nesting depth exceeds limit",
};

/**
 * Textual alias-count guard + guarded `yaml` parse + depth cap.
 * Throws YamlParseError on any hostile shape; returns the parsed doc
 * (may be null/undefined for an empty document).
 */
export function parseYamlGuarded(
  text: string,
  labels: YamlGuardLabels = GENERIC_LABELS,
): unknown {
  const aliasMatches = text.match(/(?:^|[\s[{,])\*[^\s,\]}]+/g) ?? [];
  if (aliasMatches.length > YAML_LIMITS.maxAliases) {
    throw new YamlParseError(
      `YAML alias count ${aliasMatches.length} exceeds limit ${YAML_LIMITS.maxAliases}`,
    );
  }

  let doc: unknown;
  try {
    doc = yamlParse(text, { maxAliasCount: YAML_LIMITS.maxAliases });
  } catch (err) {
    // The yaml library throws Error subclasses, but it is third-party
    // code — degrade non-Error throwables to String() rather than trust it.
    const msg = err instanceof Error ? err.message : String(err);
    throw new YamlParseError(`${labels.invalidPrefix}: ${msg}`);
  }

  if (doc === null || doc === undefined) return doc;
  if (typeof doc !== "object") {
    throw new YamlParseError(labels.rootMessage);
  }
  enforceDepthCap(doc, YAML_LIMITS.maxDepth, labels.depthMessage);
  return doc;
}

/**
 * Iterative depth check over any parsed YAML value. Throws when any
 * path from the root is deeper than `max` nesting levels.
 */
export function enforceDepthCap(
  value: unknown,
  max: number,
  depthMessage = GENERIC_LABELS.depthMessage,
): void {
  const stack: Array<{ v: unknown; d: number }> = [{ v: value, d: 0 }];
  while (stack.length > 0) {
    const { v, d } = stack.pop() as { v: unknown; d: number };
    if (v === null || typeof v !== "object") continue;
    if (d >= max) {
      throw new YamlParseError(depthMessage);
    }
    if (Array.isArray(v)) {
      for (const item of v) stack.push({ v: item, d: d + 1 });
    } else {
      for (const item of Object.values(v as Record<string, unknown>)) {
        stack.push({ v: item, d: d + 1 });
      }
    }
  }
}
