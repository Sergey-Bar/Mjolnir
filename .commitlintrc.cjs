// @ts-check

// Conventional Commits with a required scope. The scope is the subsystem
// touched (rules, engine, cli, docs, ci, ...) — it is what the CHANGELOG
// generator keys on, so an unscope commit is a CHANGELOG-drift risk,
// not just a style nit.
//
// WIP / fixup / squash commits must never land on a branch that merges;
// they are rebased away. Rejecting them at the hook is cheaper than
// discovering them at merge time.
//
// Severity is numeric (commitlint v19): 2 = error, 1 = warning, 0 = off.

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Scope is mandatory and kebab-case — it drives the CHANGELOG.
    "scope-case": [2, "always", "lower-case"],
    "scope-empty": [2, "never"],
    // Subject is imperative, sentence-case, ≤72 chars.
    "subject-empty": [2, "never"],
    "subject-case": [
      2,
      "never",
      ["sentence-case", "start-case", "pascal-case", "upper-case"],
    ],
    "subject-max-length": [2, "always", 72],
    "subject-full-stop": [2, "never", "."],
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [2, "always"],
    "header-max-length": [2, "always", 72],
    "header-trim": [2, "always"],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "style",
        "test",
        "security",
      ],
    ],
  },
};