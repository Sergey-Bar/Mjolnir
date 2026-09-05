/**
 * Mask-derived helpers for rules that must read raw text (Phase 1 follow-up).
 *
 * Rules whose evidence lives inside a string literal — selectors, URLs, OS
 * paths — cannot run against `codeText`, because masking would blank the very
 * thing they judge. That leaves them exposed to a specific false-positive
 * class: a code expression written as test DATA looks identical to a live
 * call when you only read raw text.
 *
 * `codeText` is offset-preserving, so it can still be used as an ORACLE about
 * a position rather than as the match surface. These helpers expose that.
 */

interface MaskCtx {
  text: string;
  codeText?: string;
}

/** True when the offset was blanked in codeText (inside a string or comment). */
export function isMasked(ctx: MaskCtx, index: number): boolean {
  const mask = ctx.codeText;
  if (!mask || mask.length !== ctx.text.length) return false;
  return mask[index] === " " && ctx.text[index] !== " ";
}

/**
 * The raw text of the masked run (string literal or comment) containing the
 * offset, or null when the offset is live code or no mask is available.
 *
 * Newlines are preserved by the masker, so a multi-line literal yields only
 * the line containing the offset — sufficient for the shape checks below.
 */
export function enclosingMaskedRun(ctx: MaskCtx, index: number): string | null {
  const mask = ctx.codeText;
  if (!mask || mask.length !== ctx.text.length) return null;
  if (!isMasked(ctx, index)) return null;

  // Bug-audit QA-2026-08-30 QA-3: the expansion used to stop at
  // `isMasked(...) === false` — but isMasked cannot distinguish a masked
  // whitespace char from live code whitespace (both read " "), so a run
  // was silently truncated at the first space inside a literal.
  // `'test(" foo", function () {})'` yielded the run `'test("'`; the
  // trailing nested `"` was then stripped as if it were the delimiter,
  // no nested quote remained, and embedded test-data was classified as a
  // live call (QA-TEST-003 fired 6 FP times on eslint-plugin-playwright's
  // ruleTester tables). Expand while the MASK reads " " — masked chars of
  // any kind and masked/live whitespace — and stop only at live
  // non-whitespace, which always ends a literal.
  let start = index;
  let end = index;
  while (start > 0 && mask[start - 1] === " ") start--;
  while (end < ctx.text.length - 1 && mask[end + 1] === " ") end++;
  return ctx.text.slice(start, end + 1);
}

/**
 * True when the offset sits inside a string literal whose contents are
 * themselves source code rather than a plain value.
 *
 * A real value is `'http://localhost:3000'` — no quotes, no call syntax.
 * Test data is `'page.navigate("http://localhost:3000/checkout")'` — it holds
 * both a nested quote and a call, because it IS code being passed to the
 * function under test.
 *
 * Requiring BOTH signals keeps ordinary values with an apostrophe or a
 * parenthesis in prose from being discarded.
 */
export function isInsideEmbeddedCode(ctx: MaskCtx, index: number): boolean {
  const run = enclosingMaskedRun(ctx, index);
  if (!run) return false;
  // Strip the literal's own delimiters before looking for nested ones.
  // Audit masking:72: the edge-strips (`^['"`]` + `['"`]$`) assumed the
  // run's FIRST and LAST characters are the literal's delimiters — but a
  // run can BEGIN or END with a nested quote of its own (e.g. the value
  // `(x)"` inside a single-quoted literal: the run's last char is a
  // nested `"`, which the end-strip removed, leaving the nested-quote
  // signal lost and the value misclassified as a plain value). Find the
  // OUTER delimiters within the run instead: the first character that
  // matches a quote kind and its LAST same-kind occurrence delimit the
  // literal; anything between them is nested content.
  const quoteKinds = ["'", '"', "`"] as const;
  let open = -1;
  let kind: string | undefined;
  for (const q of quoteKinds) {
    const at = run.indexOf(q);
    if (at !== -1 && (open === -1 || at < open)) {
      open = at;
      kind = q;
    }
  }
  if (open === -1 || kind === undefined) return false;
  const close = run.lastIndexOf(kind);
  if (close <= open) return false;
  const inner = run.slice(open + 1, close);
  const hasNestedQuote = /['"`]/.test(inner);
  const hasCallSyntax = /\w\s*\(/.test(inner);
  return hasNestedQuote && hasCallSyntax;
}
