// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import security from "eslint-plugin-security";
import regexp from "eslint-plugin-regexp";

export default tseslint.config(
  {
    // dist/ is build output; coverage/ is reports. The corpora under
    // tests/fixtures, tests/golden/repo and tests/corpus/.cache are DATA —
    // real OSS code and hand-written defect exhibits that must never be
    // held to (or block) the source linter (they deliberately contain the
    // anti-patterns the rules detect).
    ignores: [
      "dist/",
      "coverage/",
      "node_modules/",
      // Local debug artifacts (gitignored — "never committed"); a dev's
      // throwaway probe scripts must never be able to redden `npm run lint`.
      "scratch/",
      // Agent-session state (plans, worktrees, scratch notes) — not repo
      // content, matching .gitignore/.prettierignore. A nested worktree
      // here carries its own tsconfig.json, which otherwise breaks the
      // parser's tsconfigRootDir inference with "multiple candidate
      // TSConfigRootDirs".
      ".kilo/**",
      // Demo/demo-repo content is exhibit data for the README, linted by
      // nobody's CI and not part of any tsconfig project.
      "examples/**",
      // VitePress documentation site — its own package.json and toolchain,
      // built and deployed by .github/workflows/pages.yml, not part of any
      // tsconfig project here.
      "site/**",
      "tests/fixtures/**",
      "tests/golden/repo/**",
      "tests/corpus/.cache*/**",
      // Committed §08 class-B/C fixture corpora — same DATA status as
      // tests/fixtures: deliberately contain anti-patterns.
      "tests/corpus/positive-fixtures/**",
      "tests/corpus/negative-fixtures/**",
      // Workspace build output and the deliberate out-of-project example
      // config (excluded from every tsconfig on purpose).
      "packages/*/dist/**",
      "packages/*/example.config.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // Bug-audit B4.25 (ratchet step 1 of 2): type-checked linting. The plan
  // prescribes: enable as warnings + autofix sweep now, flip to errors in
  // a follow-up once the sweep lands. (Step 2: change "warn" → "error"
  // below and fix any residue.)
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: Object.fromEntries(
      Object.entries(c.rules ?? {}).map(([k, v]) => [
        k,
        typeof v === "string" ? (v === "error" ? "warn" : v) : v,
      ]),
    ),
  })),
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        // Explicit project list: the repo has two tsconfigs (src vs
        // src+tests+scripts) and every linted .ts must be in one of them.
        project: ["./tsconfig.json", "./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Type-safety ratchet: the codebase is free of `any` and non-null
      // assertions — keep them that way.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Bug-audit B4.26: the security plugin mechanically enforces the
    // audit's own conventions (object injection, unsafe regex, shell
    // interpolation). Warnings for now (ratchet step 1) — the deliberate
    // trust-boundary sites are disabled inline WITH a reason, never here
    // (§21-24). A scanner CLI legitimately reads paths from argv/config
    // and runs git; that is the product, not an injection.
    //
    // FW-LINT-01 (lint-ratchet-sweep): two of these rules produce zero
    // signal outside the trust boundary. `detect-object-injection` and
    // `detect-non-literal-fs-filename` fire on every computed key and
    // every non-literal path in src/ — but computed paths ARE the
    // product (a scanner reads files it discovered at runtime), so these
    // are turned off here and re-scoped at "warn" ONLY where untrusted
    // input actually flows: src/plugins/** (JSON rule manifests supply
    // compiled patterns and computed paths) and src/config/** (config
    // files drive path resolution). See the block below.
    files: ["src/**/*.ts"],
    plugins: { security },
    rules: Object.fromEntries(
      Object.entries(security.configs.recommended.rules).map(([k]) => [
        k,
        k === "security/detect-object-injection" ||
        k === "security/detect-non-literal-fs-filename"
          ? "off" // zero-signal outside plugins/config — re-scoped below with rationale (FW-LINT-01)
          : "warn",
      ]),
    ),
  },
  {
    // FW-LINT-01: the only src/ surfaces where untrusted input actually
    // flows into computed object keys or filesystem paths. JSON rule
    // manifests (plugins) and config files (config/) supply compiled
    // patterns and computed paths by design, so these two rules stay at
    // "warn" here. Anything they still flag in this block gets an
    // inline disable WITH a reason, not a config-level off — same
    // convention as the security block above (§21-24).
    files: ["src/plugins/**/*.ts", "src/config/**/*.ts"],
    plugins: { security },
    rules: {
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-fs-filename": "warn",
    },
  },
  {
    // Bug-audit B4.26: the regexp plugin catches catastrophic-backtracking
    // and misuse-prone regex patterns — the rule engine is regex-heavy,
    // so a ReDoS in one of these patterns is an availability bug in the
    // product itself. Warnings for now (ratchet step 1, same as the
    // type-checked config); ~50 auto-fixable findings were already fixed
    // as part of this landing and the dedicated ReDoS audit
    // (tests/redos-audit.spec.ts) stays authoritative for hot paths.
    files: ["src/**/*.ts", "tests/**/*.spec.ts"],
    plugins: { regexp },
    rules: Object.fromEntries(
      Object.entries(regexp.configs.recommended.rules).map(([k, v]) => [
        k,
        v === "off" || k === "regexp/prefer-quantifier" ? "off" : "warn",
      ]),
    ),
  },
  {
    // scripts/ ships plain CommonJS Node scripts (release tooling), not
    // the ESM `src/` codebase — they legitimately use require/__dirname
    // and the Node CJS global scope. Task 6 (Master-Stabilization-Plan
    // Sprint 1) brought this directory under lint at all; this override
    // makes that coverage correct instead of just present.
    files: ["scripts/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // scripts/**/*.mjs — ESM Node scripts (e.g. doc generators). Same
    // Node runtime as the .cjs scripts above, just the module scope
    // differs (no require/__dirname; import.meta.url instead).
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    // tests/stress/*.mjs — ESM Node scripts for the nightly stress
    // workflow (fixture generators, soak driver, concurrency driver).
    // Same Node runtime as scripts/**/*.mjs; not part of any tsconfig.
    files: ["tests/stress/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      // The generators are data factories — unused helper args are fine.
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
