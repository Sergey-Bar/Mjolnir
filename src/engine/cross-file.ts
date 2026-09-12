/**
 * Cross-file analysis (Upgrade-Plan-v3 Phase 6, tier-3 item #2).
 *
 * First cross-file signal: duplicate test names across files in the same
 * suite. A duplicated test name means two tests report under one label —
 * CI dashboards, flake trackers, and forensics all conflate them. This is
 * undetectable per-file by design (each file alone is consistent), which
 * is exactly why it belongs in a cross-file pass.
 *
 * Pure function over discovered test files: no I/O beyond what the caller
 * already read; deterministic output ordered by first occurrence.
 */

export interface DuplicateTestNames {
  /** test name → files declaring it */
  name: string;
  files: string[];
}

const JS_TEST_NAME_RE = /\b(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g;
const PY_TEST_NAME_RE = /^def\s+(test_\w+)\s*\(/gm;

/** Collect declared test names from one file's text. */
export function collectTestNames(path: string, text: string): string[] {
  const names: string[] = [];
  if (path.endsWith(".py")) {
    let m: RegExpExecArray | null;
    // eslint-disable-next-line security/detect-non-literal-regexp -- clone of a compile-time literal's .source for flag control — not scan input
    const re = new RegExp(PY_TEST_NAME_RE.source, "gm");
    while ((m = re.exec(text)) !== null) names.push(m[1] as string);
    return names;
  }
  if (/\.(?:spec|test)\.[tj]sx?$/.test(path)) {
    let m: RegExpExecArray | null;
    // eslint-disable-next-line security/detect-non-literal-regexp -- clone of a compile-time literal's .source for flag control — not scan input
    const re = new RegExp(JS_TEST_NAME_RE.source, "g");
    // The capture group uses a + quantifier, so every match carries it.
    while ((m = re.exec(text)) !== null) names.push(m[1] as string);
  }
  return names;
}

/** Find test names declared in more than one file. */
export function findDuplicateTestNames(
  files: ReadonlyArray<{ path: string; text: string }>,
): DuplicateTestNames[] {
  const byName = new Map<string, Set<string>>();
  for (const { path, text } of files) {
    for (const name of collectTestNames(path, text)) {
      const set = byName.get(name) ?? new Set<string>();
      set.add(path);
      byName.set(name, set);
    }
  }
  const out: DuplicateTestNames[] = [];
  for (const [name, filesSet] of byName) {
    if (filesSet.size > 1) out.push({ name, files: [...filesSet].sort() });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
