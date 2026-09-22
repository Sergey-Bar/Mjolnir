import js from "@eslint/js";
import ts from "typescript-eslint";
import regexp from "eslint-plugin-regexp";
import security from "eslint-plugin-security";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default ts.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "tests/fixtures/**",
      "tests/corpus/positive-fixtures/**",
      "tests/corpus/negative-fixtures/**",
      ".kilo/worktrees/**",
      "video/**",
      "site/.vitepress/dist/**",
      "scripts/**",
      "tests/stress/*.mjs",
      "tests/golden/repo/**",
      "sync-*.mts",
      "sync-*.cjs",
      "update-mark-hashes.mjs",
      "verify-build-determinism.mjs",
      "vendor-fonts.ts",
      "typecheck-fixtures.ts",
      "verdict-census.mts",
      "unmeasured-map.mts",
      "vitest.config.ts",
      "*.mts",
      "*.mjs",
      "*.cjs",
      "*.ts",
      "!tsconfig*.json",
      "!prettier.config.*",
      "!.prettierrc*",
      "!.eslintrc*",
      "package/**",
      "packages/**",
      "lib/**",
      "e2e/**",
      "author-wave*.mts",
      "adjudicate-fixtures-0609.mts",
      "author-closure-final.mts",
      "brand-doc.ts",
      "check-changelog.ts",
      "check-managed-surfaces.mjs",
      "check-readme-translations.mjs",
      "create-all-prs.cjs",
      "generate-sbom.mjs",
      "setup-all.cjs",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    plugins: { regexp, security },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { impliedStrict: true },
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.json", "./tsconfig.test.json"],
      },
    },
    rules: {
      // Security
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-regexp": "off",

      // Regexp (ReDoS prevention)
      "regexp/no-super-linear-backtracking": "error",
      "regexp/no-dupe-disjunctions": "error",
      "regexp/no-useless-character-class": "error",

      // TypeScript
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Core
      "no-console": "warn",
    },
    files: ["**/*.ts", "**/*.mjs", "**/*.js"],
  },
);
