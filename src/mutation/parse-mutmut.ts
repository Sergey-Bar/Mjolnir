/**
 * mutmut junitxml ingestion (product-gap-remediation master plan P5,
 * plan 1788853205786 — flag 6, decision 8).
 *
 * mutmut reports through JUnit XML (its default `--output`): one
 * `<testcase classname="tests.foo" name="test_x">` per mutant whose
 * NAME encodes the mutant identity:
 *   name="mutmut_1_::<function>::YY-2"  (mutmut 2.x)
 *   name="tests/foo.py::<function>::<id>" (mutmut 3.x, runtime jUnit)
 *
 * What the XML carries and what it does NOT: each testcase is the
 * verdict of the FULL suite against one mutant — `<failure>`/`<error>`
 * means the suite killed the mutant, `<passed>`/clean means it
 * SURVIVED. Per-mutant line numbers are not in the report, so mutmut
 * evidence matches findings BY FILE ONLY (the file comes from the
 * classname prefix), and the derivation is correspondingly weaker:
 * file-level mutation evidence. Stryker (which emits exact mutant
 * spans) is the stronger source — see parse-stryker.ts.
 *
 * The escaped-mutant-name decode is mutmut 2.x's documented format
 * (`::<function>::YY-2` where YY is the mutation op); only the FILE is
 * extracted — parsing the op adds nothing the derivation uses.
 */

import type { MutationEvidenceSource, SurvivedMutant } from "./types.js";

const MAX_INPUT = 20 * 1024 * 1024; // 20 MB, same bound as parse-junit

interface MutantVerdict {
  file: string | null;
  survived: boolean;
}

/** Sniff: does this XML look like mutmut's junit output? */
export function looksLikeMutmutXml(xml: string): boolean {
  return xml.length <= MAX_INPUT && /mutmut/i.test(xml.slice(0, 4_000));
}

function decodeEntities(s: string): string {
  return s
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

/**
 * The file for a testcase: mutmut 2.x writes
 * `classname="tests.test_auth-mutmut0::x_mutmut_1"`-style classes whose
 * FIRST dot-separated segment before `-mutmut` is the module path;
 * mutmut 3.x writes the path directly in `classname`. Both are
 * normalized here to a repo-relative path with `.py` intact.
 */
function fileFromClassname(classname: string): string | null {
  const decoded = decodeEntities(classname);
  const cut = decoded.indexOf("-mutmut");
  const candidate = (cut !== -1 ? decoded.slice(0, cut) : decoded).trim();
  if (candidate.length === 0) return null;
  // Classnames carry dots as path separators (python packaging); the
  // module file is the path with `.py`.
  return candidate.replaceAll(".", "/") + ".py";
}

export function parseMutmutXml(xml: string): {
  tool: MutationEvidenceSource;
  survived: SurvivedMutant[];
  noCoverage: number;
  killed: number;
} {
  if (xml.length > MAX_INPUT) {
    return { tool: "mutmut", survived: [], noCoverage: 0, killed: 0 };
  }
  const survived: SurvivedMutant[] = [];
  let noCoverage = 0;
  let killed = 0;

  const startRe = /<testcase\b/gi;
  const closeRe = /<\/testcase\s*>/gi;
  let start: RegExpExecArray | null;
  while ((start = startRe.exec(xml)) !== null) {
    const gt = xml.indexOf(">", start.index);
    if (gt === -1) break;
    const attrs = xml.slice(start.index + "<testcase".length, gt);
    let inner: string;
    if (attrs.endsWith("/")) {
      inner = "";
      startRe.lastIndex = gt + 1;
    } else {
      closeRe.lastIndex = gt + 1;
      const close = closeRe.exec(xml);
      if (close === null) break; // unclosed: no later start can close either
      inner = xml.slice(gt + 1, close.index);
      startRe.lastIndex = close.index + close[0].length;
    }
    const classM = /(?:^|\s)classname\s*=\s*"([^"]*)"/i.exec(attrs);
    const classname = classM?.[1] ?? "";

    // A skipped testcase is a mutant the suite never ran against —
    // mutmut emits `skip` for infrastructure errors; that is
    // NoCoverage-shaped (unknown, not survived).
    if (/<skipped\b/i.test(inner)) {
      noCoverage++;
      continue;
    }
    const killedMutant = /<(?:failure|error)\b/i.test(inner);
    const verdict: MutantVerdict = {
      file: fileFromClassname(classname),
      survived: !killedMutant,
    };
    if (killedMutant) {
      killed++;
    } else if (verdict.file !== null) {
      survived.push({
        file: verdict.file,
        mutator: "mutmut",
        startLine: 1,
        endLine: Number.MAX_SAFE_INTEGER,
      });
    } else {
      // A survived mutant with NO file identity cannot match anything;
      // counting it as noCoverage keeps the summary honest.
      noCoverage++;
    }
  }
  return { tool: "mutmut", survived, noCoverage, killed };
}
