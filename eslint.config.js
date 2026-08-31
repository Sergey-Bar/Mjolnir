// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "coverage/",
      "node_modules/",
      // VitePress documentation site — its own package.json and toolchain,
      // built and deployed by .github/workflows/pages.yml, not part of any
      // tsconfig project here.
      "site/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
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
);
