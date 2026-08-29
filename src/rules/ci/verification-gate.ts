/**
 * Shared "is this shell command a verification gate?" matcher for the QA-CI
 * rules. A gate is a command whose failure MUST fail the job — test runners,
 * linters, type-checkers, `audit`, `build`. Cleanup and best-effort commands
 * (`docker compose down`, `rm -rf`, `pkill`, `kill`) are deliberately not
 * gates: `docker compose down || true` is ordinary teardown, not a
 * false-green.
 *
 * This is an allowlist on purpose. A missed detection is a quiet gap; a false
 * positive on a flagship FALSE-GREEN rule is a credibility loss on the one
 * claim the product is built to make.
 *
 * The regex carries no `g` flag, so `.test()` on it is not stateful and it is
 * safe to share a single instance across rules and calls.
 */
export const VERIFICATION_GATE_RE = new RegExp(
  [
    // ── Test runners ────────────────────────────────────────────────
    String.raw`\b(?:npm|yarn|pnpm|bun)\s+(?:run\s+)?(?:test|t)\b`,
    String.raw`\bnpx\s+(?:vitest|jest|mocha|ava|playwright\s+test)\b`,
    String.raw`\b(?:vitest|jest|mocha|ava|tap)\b`,
    String.raw`\bplaywright\s+test\b`,
    String.raw`\b(?:pytest|tox|nox)\b`,
    String.raw`\bpython\s+-m\s+(?:pytest|unittest)\b`,
    String.raw`\bmvn\b[^\n]*\b(?:test|verify)\b`,
    String.raw`\b(?:\./)?gradlew?\b[^\n]*\btest\b`,
    String.raw`\bdotnet\s+test\b`,
    String.raw`\bgo\s+test\b`,
    String.raw`\bcargo\s+test\b`,
    String.raw`\b(?:rspec|phpunit)\b`,
    String.raw`\brake\s+(?:test|spec)\b`,
    String.raw`\bmake\s+[\w./-]*(?:test|check|lint|build|ci|verify|coverage|typecheck)\b`,
    // ── Other gates whose failure must not be hidden ────────────────
    String.raw`\b(?:npm|yarn|pnpm)\s+audit\b`,
    String.raw`\b(?:npm|yarn|pnpm)\s+run\s+(?:lint|typecheck|build)\b`,
    String.raw`\b(?:eslint|prettier\s+--check|tsc\b[^\n]*--noEmit)\b`,
    String.raw`\b(?:ruff|flake8|mypy|black\s+--check)\b`,
  ].join("|"),
);

/** True when `cmd` (one shell command / segment) is a verification gate. */
export function looksLikeVerificationGate(cmd: string): boolean {
  return VERIFICATION_GATE_RE.test(cmd);
}
